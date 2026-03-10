import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import HudRoot from "./hud-root.svelte";
import { getSetting } from "../../ui/settings/settings.ts";
import { autoPopulateSlots, validateSlots } from "./hud-slots.ts";

/**
 * Compact Combat HUD — draggable panel.
 *
 * Shows portrait, stats grid, configurable hotbar, and pop-out panels
 * for weapons, skill actions, and quick actions.
 * Only visible during active combat. Auto show/hide with combat lifecycle.
 * Position is persisted to a client setting; dragging handled via CSS in hud-root.svelte.
 */
class CombatHUD extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-combat-hud",
        classes: ["dh2e", "combat-hud"],
        position: { width: 0, height: 0 },
        window: {
            frame: false,
            positioned: false,
            resizable: false,
            minimizable: false,
        },
    });

    protected override root = HudRoot;

    /** Singleton instance */
    static #instance: CombatHUD | null = null;

    /** Persist open panel state across Svelte remounts */
    #openPanel: "weapons" | "actions" | "quick" | null = null;

    /** Debounce timer for re-renders */
    #renderTimer: ReturnType<typeof setTimeout> | null = null;

    /** Module-level position state — survives Svelte re-mounts */
    hudPosition: { left: number; top: number } | null = null;

    /** Whether position is locked (disables dragging) */
    hudLocked: boolean = false;

    /** Whether a drag is currently in progress — suppresses re-renders */
    dragging: boolean = false;

    static get instance(): CombatHUD {
        if (!CombatHUD.#instance) {
            CombatHUD.#instance = new CombatHUD();
        }
        return CombatHUD.#instance;
    }

    /** Register combat lifecycle hooks */
    static init(): void {
        if (!getSetting<boolean>("enableCombatHUD")) return;

        Hooks.on("combatStart", () => CombatHUD.instance.show());
        Hooks.on("deleteCombat", () => CombatHUD.instance.hide());
        Hooks.on("updateCombat", () => CombatHUD.instance.show());
        Hooks.on("updateActor", () => CombatHUD.#debouncedRender());
        Hooks.on("updateItem", () => CombatHUD.#debouncedRender());
        Hooks.on("createItem", () => CombatHUD.#debouncedRender());
        Hooks.on("deleteItem", () => CombatHUD.#debouncedRender());
        Hooks.on("targetToken", () => CombatHUD.#debouncedRender());

        // Show immediately if combat is already active (page reload / mid-combat join)
        if ((game as any).combat?.started) {
            CombatHUD.instance.show();
        }
    }

    /** Debounced re-render — 100ms delay, suppressed during drag */
    static #debouncedRender(): void {
        if (!CombatHUD.#instance?.rendered) return;
        if (CombatHUD.#instance.dragging) return; // never re-render mid-drag
        if (CombatHUD.#instance.#renderTimer) {
            clearTimeout(CombatHUD.#instance.#renderTimer);
        }
        CombatHUD.#instance.#renderTimer = setTimeout(() => {
            if (CombatHUD.#instance?.dragging) return;
            CombatHUD.#instance?.render(true);
        }, 100);
    }

    async show(): Promise<void> {
        if (!getSetting<boolean>("enableCombatHUD")) return;

        // Always re-read position from setting (user may have cleared it via console)
        this.#loadPositionFromSetting();

        await this.render(true);

        // Apply position to the ApplicationV2 wrapper element AFTER render
        // (can't use position:fixed on inner panel because zoom/transform creates containing block)
        this.applyPosition();
    }

    /** Load position + lock state from client setting into instance state */
    #loadPositionFromSetting(): void {
        const saved = getSetting<string>("combatHUDDragPosition");
        if (saved) {
            try {
                const pos = JSON.parse(saved);
                if (typeof pos.left === "number" && typeof pos.top === "number") {
                    this.hudPosition = { left: pos.left, top: pos.top };
                } else {
                    this.hudPosition = null;
                }
                this.hudLocked = typeof pos.locked === "boolean" ? pos.locked : false;
            } catch {
                this.hudPosition = null;
                this.hudLocked = false;
            }
        } else {
            this.hudPosition = null;
            this.hudLocked = false;
        }
    }

    /** Apply hudPosition to the outer ApplicationV2 element */
    applyPosition(): void {
        const el = this.element as HTMLElement | undefined;
        if (!el) return;

        el.style.position = "fixed";
        el.style.zIndex = "100";

        if (this.hudPosition) {
            // Positions are stored in pre-zoom space; clamp to viewport / zoom
            const zoom = parseFloat(el.style.zoom || "1") || 1;
            const maxLeft = Math.max(0, (window.innerWidth / zoom) - 100);
            const maxTop = Math.max(0, (window.innerHeight / zoom) - 100);
            el.style.left = `${Math.max(0, Math.min(this.hudPosition.left, maxLeft))}px`;
            el.style.top = `${Math.max(0, Math.min(this.hudPosition.top, maxTop))}px`;
            el.style.bottom = "auto";
        } else {
            // Default: bottom-left
            el.style.left = "16px";
            el.style.bottom = "16px";
            el.style.top = "auto";
        }
    }

    /** Save drag position + lock state to client setting */
    savePosition(left: number, top: number): void {
        this.hudPosition = { left, top };
        const g = game as any;
        g.settings?.set?.(SYSTEM_ID, "combatHUDDragPosition", JSON.stringify({
            left, top, locked: this.hudLocked,
        }));
    }

    /** Toggle lock state and re-render to update UI */
    async toggleLock(): Promise<void> {
        this.hudLocked = !this.hudLocked;
        // Save lock state with current position
        const pos = this.hudPosition;
        if (pos) {
            this.savePosition(pos.left, pos.top);
        } else {
            const g = game as any;
            g.settings?.set?.(SYSTEM_ID, "combatHUDDragPosition", JSON.stringify({
                locked: this.hudLocked,
            }));
        }
        // Re-render so Svelte picks up new _hudLocked
        await this.render(true);
        this.applyPosition();
    }

    async hide(): Promise<void> {
        if (this.rendered) {
            await this.close();
        }
    }

    protected override async _prepareContext(
        _options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const g = game as any;
        const combat = g.combat;

        // Show the player's own actor (not just the current turn combatant)
        const actor = this.#resolvePlayerActor(combat);
        const actorSys = (actor as any)?.system;

        // Find player's combatant (for action economy)
        const combatant = combat?.combatants?.find(
            (c: any) => c.actor?.id === actor?.id,
        ) ?? combat?.combatant;

        // Get equipped weapons
        const weapons = actor?.items?.filter((i: Item) => {
            const sys = (i as any).system;
            return i.type === "weapon" && sys?.equipped;
        }) ?? [];

        // Get skills (for actions popout)
        const skills = actor?.items?.filter((i: Item) => i.type === "skill") ?? [];

        // Get psychic powers (for powers tab in actions popout)
        const powers = actor?.items?.filter((i: Item) => i.type === "power") ?? [];

        // Get active conditions
        const conditions = actor?.items?.filter((i: Item) => i.type === "condition") ?? [];

        // Action economy
        const actions = combatant?.actionsUsed ?? {
            half: false, full: false, free: false, reactionsUsed: 0,
        };

        // Characteristics
        const characteristics = actorSys?.characteristics ?? {};

        // HUD slots: use stored flags or auto-populate
        const storedSlots = (actor as any)?.getFlag?.("dh2e", "hudSlots");
        const hudSlots = storedSlots
            ? validateSlots(actor, storedSlots)
            : autoPopulateSlots(actor);

        // Token image
        const tokenImg = this.#getTokenImage(actor);

        // Get targeted token info
        const targets = [...(g.user?.targets ?? [])];
        const targetActor = targets[0]?.actor;
        const targetInfo = targetActor ? {
            name: targetActor.name,
            type: targetActor.type,
            wounds: (targetActor as any).system?.wounds,
            magnitude: (targetActor as any).system?.magnitude,
            si: (targetActor as any).system?.structuralIntegrity,
        } : null;

        return {
            ctx: {
                actor,
                system: actorSys,
                weapons,
                skills,
                powers,
                conditions,
                actions,
                combat,
                combatant,
                round: combat?.round ?? 0,
                targetInfo,
                characteristics,
                hudSlots,
                tokenImg,
                isMyTurn: combatant?.isOwner && combat?.combatant?.id === combatant?.id,
                _openPanel: this.#openPanel,
                _hudLocked: this.hudLocked,
            },
        };
    }

    /**
     * Resolve the player's own actor for display.
     * Priority: assigned character (if in combat) > first owned combatant > current combatant
     */
    #resolvePlayerActor(combat: any): Actor | null {
        const g = game as any;

        // If user has assigned character and it's in this combat, use it
        const character = g.user?.character;
        if (character && combat?.combatants?.some((c: any) => c.actor?.id === character.id)) {
            return character;
        }

        // Find first owned combatant
        const ownedCombatant = combat?.combatants?.find(
            (c: any) => c.isOwner && c.actor,
        );
        if (ownedCombatant?.actor) return ownedCombatant.actor;

        // Fallback to current turn combatant
        return combat?.combatant?.actor ?? null;
    }

    /** Get the token image for an actor in the current scene */
    #getTokenImage(actor: any): string {
        if (!actor) return "icons/svg/mystery-man.svg";
        const token = canvas?.tokens?.placeables?.find(
            (t: any) => t.actor?.id === actor.id,
        );
        return token?.document?.texture?.src ?? actor.prototypeToken?.texture?.src ?? actor.img ?? "icons/svg/mystery-man.svg";
    }
}

export { CombatHUD };
