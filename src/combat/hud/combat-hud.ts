import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import HudRoot from "./hud-root.svelte";
import { getSetting } from "../../ui/settings/settings.ts";

/**
 * Argon-style Combat HUD — fixed viewport bottom bar.
 *
 * Shows weapon tray, action economy, quick actions, conditions, and target info.
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
        Hooks.on("updateCombat", () => {
            if (CombatHUD.#instance?.rendered) {
                CombatHUD.#instance.render(true);
            }
        });
        Hooks.on("updateActor", () => {
            if (CombatHUD.#instance?.rendered) {
                CombatHUD.#instance.render(true);
            }
        });
        Hooks.on("targetToken", () => {
            if (CombatHUD.#instance?.rendered) {
                CombatHUD.#instance.render(true);
            }
        });
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
        const combatant = combat?.combatant;
        const actor = combatant?.actor;
        const actorSys = actor?.system;

        // Get equipped weapons
        const weapons = actor?.items?.filter((i: Item) => {
            const sys = (i as any).system;
            return i.type === "weapon" && sys?.equipped;
        }) ?? [];

        // Get active conditions
        const conditions = actor?.items?.filter((i: Item) => i.type === "condition") ?? [];

        // Action economy
        const actions = combatant?.actionsUsed ?? {
            half: false, full: false, free: false, reaction: false,
        };

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
                conditions,
                actions,
                combat,
                combatant,
                round: combat?.round ?? 0,
                targetInfo,
                isMyTurn: combatant?.isOwner ?? false,
            },
        };
    }
}

export { CombatHUD };
