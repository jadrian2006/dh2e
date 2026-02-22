import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { AcolyteDH2e } from "./document.ts";
import SheetRoot from "./sheet-root.svelte";

/** Acolyte character sheet — Svelte-based ApplicationV2 */
class AcolyteSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "actor", "acolyte"],
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
        const actor = this.document as unknown as AcolyteDH2e;
        const system = actor.system;

        return {
            ctx: {
                actor,
                name: actor.name,
                img: actor.img,
                system,
                editable: this.isEditable,
                items: {
                    weapons: actor.items.filter((i: Item) => i.type === "weapon"),
                    armour: actor.items.filter((i: Item) => i.type === "armour"),
                    gear: actor.items.filter((i: Item) => i.type === "gear"),
                    skills: actor.items.filter((i: Item) => i.type === "skill"),
                    talents: actor.items.filter((i: Item) => i.type === "talent"),
                    conditions: actor.items.filter((i: Item) => i.type === "condition"),
                },
            },
        };
    }
}

export { AcolyteSheetDH2e };
