import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { PsykerMode } from "./types.ts";
import DialogRoot from "./focus-dialog-root.svelte";

interface FocusDialogResult {
    cancelled: boolean;
    mode: PsykerMode;
    /** Chosen PR level (1 to max). Only meaningful for Unfettered. */
    selectedPR: number;
}

/**
 * Dialog for selecting Focus Power mode (Unfettered/Pushed).
 * Shows PR display, power description, and mode toggle.
 */
class FocusPowerDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-focus-power-dialog",
        classes: ["dh2e", "dialog", "focus-power-dialog"],
        position: { width: 380, height: "auto" as const },
        window: {
            resizable: false,
            minimizable: false,
        },
    });

    protected override root = DialogRoot;

    #powerName: string;
    #psyRating: number;
    #description: string;
    #resolve: ((result: FocusDialogResult) => void) | null = null;

    constructor(options: {
        powerName: string;
        psyRating: number;
        description?: string;
    }) {
        super({});
        this.#powerName = options.powerName;
        this.#psyRating = options.psyRating;
        this.#description = options.description ?? "";
    }

    override get title(): string {
        return this.#powerName;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                powerName: this.#powerName,
                psyRating: this.#psyRating,
                description: this.#description,
                onConfirm: (mode: PsykerMode, selectedPR: number) => this.#confirm(mode, selectedPR),
                onCancel: () => this.#cancel(),
            },
        };
    }

    #confirm(mode: PsykerMode, selectedPR: number): void {
        this.#resolve?.({ cancelled: false, mode, selectedPR });
        this.close();
    }

    #cancel(): void {
        this.#resolve?.({ cancelled: true, mode: "unfettered", selectedPR: this.#psyRating });
        this.close();
    }

    protected override _onClose(): void {
        this.#resolve?.({ cancelled: true, mode: "unfettered", selectedPR: this.#psyRating });
        this.#resolve = null;
    }

    static async prompt(options: {
        powerName: string;
        psyRating: number;
        description?: string;
    }): Promise<FocusDialogResult> {
        const dialog = new FocusPowerDialog(options);
        return new Promise((resolve) => {
            dialog.#resolve = resolve;
            dialog.render(true);
        });
    }
}

export { FocusPowerDialog };
export type { FocusDialogResult };
