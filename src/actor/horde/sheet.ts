import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { HordeDH2e } from "./document.ts";
import SheetRoot from "./sheet-root.svelte";

/** Horde actor sheet */
class HordeSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "actor", "horde"],
        position: { width: 620, height: 600 },
        window: { resizable: true },
    });

    protected override root = SheetRoot;

    /** Drop listeners bound flag */
    #dropListenersBound = false;

    override get title(): string {
        return this.document.name;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const actor = this.document as unknown as HordeDH2e;
        return {
            ctx: {
                actor,
                name: actor.name,
                img: actor.img,
                system: actor.system,
                editable: this.isEditable,
                items: {
                    weapons: actor.items.filter((i: Item) => i.type === "weapon"),
                    traits: actor.items.filter((i: Item) => i.type === "trait"),
                },
            },
        };
    }

    protected override _onRender(
        context: Record<string, unknown>,
        options: fa.ApplicationRenderOptions,
    ): void {
        super._onRender(context, options);
        if (this.#dropListenersBound) return;

        const content = this.element?.querySelector(".window-content");
        if (!content) return;

        content.addEventListener("dragover", (e: Event) => {
            e.preventDefault();
            (e as DragEvent).dataTransfer!.dropEffect = "copy";
        });
        content.addEventListener("drop", (e: Event) => {
            e.preventDefault();
            this.#handleDrop(e as DragEvent);
        });
        this.#dropListenersBound = true;
    }

    async #handleDrop(event: DragEvent): Promise<void> {
        if (!this.isEditable) return;

        let data: Record<string, unknown> | null = null;
        const rawData = event.dataTransfer?.getData("text/plain");
        if (rawData) {
            try { data = JSON.parse(rawData); } catch { return; }
        }
        if (!data || data.type !== "Item") return;

        let item: any = null;
        if (data.uuid) {
            item = await fromUuid(data.uuid as string);
        }
        if (!item) return;

        const itemData = item.toObject();
        await (this.document as any).createEmbeddedDocuments("Item", [itemData]);
    }
}

export { HordeSheetDH2e };
