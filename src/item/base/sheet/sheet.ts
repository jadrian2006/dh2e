import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import { getSetting } from "../../../ui/settings/settings.ts";
import SheetRoot from "./sheet-root.svelte";

/** Base item sheet for all DH2E item types */
class ItemSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "item"],
        position: { width: 520, height: 480 },
        window: {
            resizable: true,
        },
    });

    protected override root = SheetRoot;

    override get title(): string {
        return this.document.name;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const item = this.document;
        return {
            ctx: {
                item,
                name: item.name,
                img: item.img,
                type: item.type,
                system: item.system,
                editable: this.isEditable,
                ruleEditingAllowed: getSetting<boolean>("allowRuleEditing"),
                sendViaVox: async () => {
                    const { VoxComposeDialog } = await import("@ui/vox-terminal/vox-compose-dialog.ts");
                    VoxComposeDialog.openWithItem(item.uuid);
                },
                isGM: (game as any).user?.isGM ?? false,
            },
        };
    }
}

export { ItemSheetDH2e };
