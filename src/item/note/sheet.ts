import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { NoteDH2e } from "./document.ts";
import SheetRoot from "./note-sheet-root.svelte";

/** Note item sheet — personal journal entry with rich text */
class NoteSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "item", "note"],
        position: { width: 520, height: 500 },
        window: { resizable: true },
    });

    protected override root = SheetRoot;

    override get title(): string {
        return this.document.name;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const item = this.document as unknown as NoteDH2e;
        return {
            ctx: {
                item,
                name: item.name,
                img: item.img,
                system: item.system,
                editable: this.isEditable,
            },
        };
    }
}

export { NoteSheetDH2e };
