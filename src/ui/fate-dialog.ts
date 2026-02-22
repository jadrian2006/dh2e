import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import FateDialogRoot from "./fate-dialog-root.svelte";

type FateAction = "reroll" | "plus10" | "halfWounds" | "survive" | "autoPass";

interface FateDialogResult {
    cancelled: boolean;
    action?: FateAction;
    burn?: boolean;
}

/**
 * Fate Point dialog — presents spend/burn options.
 *
 * Spend (costs 1 current fate):
 * - Reroll a failed test
 * - Add +10 before a test
 * - Halve damage after being hit
 *
 * Burn (permanently reduces max fate by 1):
 * - Survive certain death
 * - Auto-pass a test (counts as 1 DoS)
 */
class FateDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-fate-dialog",
        classes: ["dh2e", "dialog", "fate-dialog"],
        position: { width: 340, height: "auto" as const },
        window: { resizable: false, minimizable: false },
    });

    protected override root = FateDialogRoot;

    #actor: Actor;
    #resolve: ((result: FateDialogResult) => void) | null = null;

    constructor(actor: Actor) {
        super({});
        this.#actor = actor;
    }

    override get title(): string {
        return "Invoke the Emperor's Grace";
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const sys = (this.#actor as any).system;
        return {
            ctx: {
                actorName: this.#actor.name,
                fateValue: sys?.fate?.value ?? 0,
                fateMax: sys?.fate?.max ?? 0,
                onAction: (action: FateAction, burn: boolean) => this.#select(action, burn),
                onCancel: () => this.#cancel(),
            },
        };
    }

    #select(action: FateAction, burn: boolean): void {
        this.#resolve?.({ cancelled: false, action, burn });
        this.close();
    }

    #cancel(): void {
        this.#resolve?.({ cancelled: true });
        this.close();
    }

    protected override _onClose(): void {
        this.#resolve?.({ cancelled: true });
        this.#resolve = null;
    }

    /** Execute a fate action on the actor */
    static async execute(actor: Actor): Promise<FateDialogResult> {
        const dialog = new FateDialog(actor);
        return new Promise((resolve) => {
            dialog.#resolve = resolve;
            dialog.render(true);
        });
    }

    /** Spend fate (reduce current value by 1) */
    static async spendFate(actor: Actor): Promise<boolean> {
        const sys = (actor as any).system;
        if ((sys?.fate?.value ?? 0) <= 0) {
            ui.notifications.warn("No fate points remaining!");
            return false;
        }
        await actor.update({ "system.fate.value": sys.fate.value - 1 });
        return true;
    }

    /** Burn fate (permanently reduce max by 1, also reduce current) */
    static async burnFate(actor: Actor): Promise<boolean> {
        const sys = (actor as any).system;
        if ((sys?.fate?.max ?? 0) <= 0) {
            ui.notifications.warn("No fate points to burn!");
            return false;
        }
        await actor.update({
            "system.fate.max": sys.fate.max - 1,
            "system.fate.value": Math.min(sys.fate.value, sys.fate.max - 1),
        });
        return true;
    }
}

export { FateDialog };
export type { FateAction, FateDialogResult };
