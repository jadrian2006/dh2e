import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { ModifierDH2e } from "@rules/modifier.ts";
import type { HitLocationKey } from "@actor/types.ts";
import DialogRoot from "./dialog-root.svelte";

interface CheckDialogResult {
    cancelled: boolean;
    modifiers: ModifierDH2e[];
    calledShot?: HitLocationKey;
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
    #skillDescription: string;
    #isAttack: boolean;
    #fireMode: string;
    #calledShot: HitLocationKey | null = null;
    #resolve: ((result: CheckDialogResult) => void) | null = null;

    constructor(options: {
        label: string;
        baseTarget: number;
        modifiers: ModifierDH2e[];
        skillDescription?: string;
        isAttack?: boolean;
        fireMode?: string;
    }) {
        super({});
        this.#label = options.label;
        this.#baseTarget = options.baseTarget;
        this.#modifiers = options.modifiers;
        this.#skillDescription = options.skillDescription ?? "";
        this.#isAttack = options.isAttack ?? false;
        this.#fireMode = options.fireMode ?? "single";
    }

    override get title(): string {
        return this.#label;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        // Called shots only available for single-fire attack rolls
        const canCalledShot = this.#isAttack && this.#fireMode === "single";

        return {
            ctx: {
                label: this.#label,
                baseTarget: this.#baseTarget,
                modifiers: this.#modifiers,
                skillDescription: this.#skillDescription,
                isAttack: this.#isAttack,
                canCalledShot,
                calledShot: this.#calledShot,
                onRoll: () => this.#confirm(),
                onCancel: () => this.#cancel(),
                onAddModifier: (mod: ModifierDH2e) => this.#addModifier(mod),
                onCalledShotChange: (location: HitLocationKey | null) => {
                    this.#calledShot = location;
                },
            },
        };
    }

    #confirm(): void {
        this.#resolve?.({
            cancelled: false,
            modifiers: this.#modifiers,
            calledShot: this.#calledShot ?? undefined,
        });
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
        skillDescription?: string;
        isAttack?: boolean;
        fireMode?: string;
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
