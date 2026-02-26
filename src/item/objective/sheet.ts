import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { ObjectiveDH2e } from "./document.ts";
import SheetRoot from "./objective-sheet-root.svelte";

/** Objective item sheet — mission card styled */
class ObjectiveSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "item", "objective", "mission-card"],
        position: { width: 440, height: 380 },
        window: { resizable: true },
    });

    protected override root = SheetRoot;

    override get title(): string {
        return this.document.name;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const item = this.document as unknown as ObjectiveDH2e;
        return {
            ctx: {
                item,
                name: item.name,
                img: item.img,
                system: item.system,
                editable: this.isEditable,
                complete: () => item.complete(),
                fail: () => item.fail(),
                reactivate: () => item.reactivate(),
                updateField: (path: string, value: unknown) => item.update({ [path]: value }),
                isGM: (game as any).user?.isGM ?? false,
            },
        };
    }
}

export { ObjectiveSheetDH2e };
