import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { ModifierDH2e } from "@rules/modifier.ts";
import DialogRoot from "./dialog-root.svelte";

interface CheckDialogResult {
    cancelled: boolean;
    modifiers: ModifierDH2e[];
}

/**
 * Roll dialog for DH2E d100 checks.
 *
 * Shows modifiers with toggles, allows adding situational modifiers,
 * and returns the final modifier list when the user confirms.
 */
class CheckDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-check-dialog",
        classes: ["dh2e", "dialog", "check-dialog"],
        position: { width: 400, height: "auto" as const },
        window: {
            resizable: false,
            minimizable: false,
        },
    });

    protected override root = DialogRoot;

    #label: string;
    #baseTarget: number;
    #modifiers: ModifierDH2e[];
    #resolve: ((result: CheckDialogResult) => void) | null = null;

    constructor(options: {
        label: string;
        baseTarget: number;
        modifiers: ModifierDH2e[];
    }) {
        super({});
        this.#label = options.label;
        this.#baseTarget = options.baseTarget;
        this.#modifiers = options.modifiers;
    }

    override get title(): string {
        return this.#label;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                label: this.#label,
                baseTarget: this.#baseTarget,
                modifiers: this.#modifiers,
                onRoll: () => this.#confirm(),
                onCancel: () => this.#cancel(),
                onAddModifier: (mod: ModifierDH2e) => this.#addModifier(mod),
            },
        };
    }

    #confirm(): void {
        this.#resolve?.({ cancelled: false, modifiers: this.#modifiers });
        this.close();
    }

    #cancel(): void {
        this.#resolve?.({ cancelled: true, modifiers: [] });
        this.close();
    }

    #addModifier(mod: ModifierDH2e): void {
        this.#modifiers.push(mod);
        this.render();
    }

    protected override _onClose(): void {
        // If closed without confirming, treat as cancelled
        this.#resolve?.({ cancelled: true, modifiers: [] });
        this.#resolve = null;
    }

    /** Show dialog and wait for user input */
    static async prompt(options: {
        label: string;
        baseTarget: number;
        modifiers: ModifierDH2e[];
    }): Promise<CheckDialogResult> {
        const dialog = new CheckDialog(options);
        return new Promise((resolve) => {
            dialog.#resolve = resolve;
            dialog.render(true);
        });
    }
}

export { CheckDialog };
export type { CheckDialogResult };
