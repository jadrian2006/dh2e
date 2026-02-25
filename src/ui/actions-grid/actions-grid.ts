import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import ActionsGridRoot from "./actions-grid-root.svelte";

/**
 * Standalone Actions Grid popup window.
 *
 * Displays the full SkillActionsView for the player's character,
 * accessible via keybind, HUD button, or `game.dh2e.actionsGrid()`.
 *
 * Singleton pattern — only one instance can be open at a time.
 */
class ActionsGrid extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-actions-grid",
        classes: ["dh2e", "actions-grid"],
        position: { width: 420, height: 560 },
        window: {
            title: "DH2E.ActionsGrid.Title",
            icon: "fa-solid fa-bolt",
            resizable: true,
            minimizable: true,
        },
    });

    protected override root = ActionsGridRoot;

    /** Singleton instance */
    static #instance: ActionsGrid | null = null;

    /** Toggle open/close */
    static open(): void {
        if (!ActionsGrid.#instance) {
            ActionsGrid.#instance = new ActionsGrid();
        }
        if (ActionsGrid.#instance.rendered) {
            ActionsGrid.#instance.close();
        } else {
            ActionsGrid.#instance.render(true);
        }
    }

    /** Re-render when actor updates (if open) */
    static {
        Hooks.on("updateActor", () => {
            if (ActionsGrid.#instance?.rendered) {
                ActionsGrid.#instance.render(true);
            }
        });
    }

    protected override async _prepareContext(
        _options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const g = game as any;
        const actor = g.user?.character
            ?? canvas?.tokens?.controlled?.[0]?.actor
            ?? null;

        // Get skills from actor
        const skills = actor?.items?.filter((i: Item) => i.type === "skill") ?? [];

        return {
            ctx: {
                actor,
                skills,
            },
        };
    }
}

export { ActionsGrid };
