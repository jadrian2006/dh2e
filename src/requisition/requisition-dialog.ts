import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import DialogRoot from "./requisition-dialog-root.svelte";

interface RequisitionDialogResult {
    cancelled: boolean;
    availability: string;
    extraModifier: number;
}

/**
 * Dialog for requisition tests.
 * Shows item name, availability dropdown, situational modifier, and roll button.
 */
class RequisitionDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-requisition-dialog",
        classes: ["dh2e", "dialog", "requisition-dialog"],
        position: { width: 380, height: "auto" as const },
        window: {
            resizable: false,
            minimizable: false,
        },
    });

    protected override root = DialogRoot;

    #itemName: string;
    #defaultAvailability: string;
    #resolve: ((result: RequisitionDialogResult) => void) | null = null;

    constructor(options: { itemName: string; defaultAvailability?: string }) {
        super({});
        this.#itemName = options.itemName;
        this.#defaultAvailability = options.defaultAvailability ?? "common";
    }

    override get title(): string {
        return game.i18n?.localize("DH2E.Requisition.Title") ?? "Requisition";
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        // Build availability options from config
        const tiers = CONFIG.DH2E?.availabilityTiers ?? {};
        const availOptions = Object.entries(tiers).map(([key, val]: [string, any]) => ({
            key,
            label: game.i18n?.localize(val.label) ?? key,
            modifier: val.modifier ?? 0,
        }));

        return {
            ctx: {
                itemName: this.#itemName,
                defaultAvailability: this.#defaultAvailability,
                availOptions,
                onConfirm: (availability: string, extraModifier: number) =>
                    this.#confirm(availability, extraModifier),
                onCancel: () => this.#cancel(),
            },
        };
    }

    #confirm(availability: string, extraModifier: number): void {
        this.#resolve?.({ cancelled: false, availability, extraModifier });
        this.close();
    }

    #cancel(): void {
        this.#resolve?.({ cancelled: true, availability: "common", extraModifier: 0 });
        this.close();
    }

    protected override _onClose(): void {
        this.#resolve?.({ cancelled: true, availability: "common", extraModifier: 0 });
        this.#resolve = null;
    }

    static async prompt(options: {
        itemName: string;
        defaultAvailability?: string;
    }): Promise<RequisitionDialogResult> {
        const dialog = new RequisitionDialog(options);
        return new Promise((resolve) => {
            dialog.#resolve = resolve;
            dialog.render(true);
        });
    }
}

export { RequisitionDialog };
export type { RequisitionDialogResult };
