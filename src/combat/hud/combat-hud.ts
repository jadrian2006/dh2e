import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import HudRoot from "./hud-root.svelte";
import { getSetting } from "../../ui/settings/settings.ts";
import { autoPopulateSlots, validateSlots } from "./hud-slots.ts";

/**
 * Compact Combat HUD — fixed bottom-left panel.
 *
 * Shows portrait, stats grid, configurable hotbar, and pop-out panels
 * for weapons, skill actions, and quick actions.
 * Only visible during active combat. Auto show/hide with combat lifecycle.
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
        Hooks.on("updateCombat", () => CombatHUD.#debouncedRender());
        Hooks.on("updateActor", () => CombatHUD.#debouncedRender());
        Hooks.on("updateItem", () => CombatHUD.#debouncedRender());
        Hooks.on("createItem", () => CombatHUD.#debouncedRender());
        Hooks.on("deleteItem", () => CombatHUD.#debouncedRender());
        Hooks.on("targetToken", () => CombatHUD.#debouncedRender());
    }

    /** Debounced re-render — 100ms delay to prevent mid-drag interruptions */
    static #debouncedRender(): void {
        if (!CombatHUD.#instance?.rendered) return;
        if (CombatHUD.#instance.#renderTimer) {
            clearTimeout(CombatHUD.#instance.#renderTimer);
        }
        CombatHUD.#instance.#renderTimer = setTimeout(() => {
            CombatHUD.#instance?.render(true);
        }, 100);
    }

    async show(): Promise<void> {
        if (!getSetting<boolean>("enableCombatHUD")) return;
        await this.render(true);
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

        // Get active conditions
        const conditions = actor?.items?.filter((i: Item) => i.type === "condition") ?? [];

        // Action economy
        const actions = combatant?.actionsUsed ?? {
            half: false, full: false, free: false, reaction: false,
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
