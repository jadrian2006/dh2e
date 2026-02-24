import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import SheetRoot from "./sheet-root.svelte";

class CyberneticSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "item", "cybernetic"],
        position: { width: 520, height: 520 },
        window: { resizable: true },
    });

    protected override root = SheetRoot;

    override get title(): string {
        return this.document.name;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                item: this.document,
                name: this.document.name,
                img: this.document.img,
                type: this.document.type,
                system: this.document.system,
                editable: this.isEditable,
            },
        };
    }
}

export { CyberneticSheetDH2e };
