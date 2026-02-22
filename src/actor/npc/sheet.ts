import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import SheetRoot from "./sheet-root.svelte";

/** NPC sheet — same as Acolyte with GM toggle for compact view (future) */
class NpcSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "actor", "npc"],
        position: { width: 720, height: 800 },
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
        const actor = this.document;
        return {
            state: {
                actor,
                name: actor.name,
                img: actor.img,
                system: actor.system,
                editable: this.isEditable,
            },
        };
    }
}

export { NpcSheetDH2e };
