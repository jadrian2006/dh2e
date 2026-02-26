import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { LootDH2e } from "./document.ts";
import SheetRoot from "./sheet-root.svelte";

/** GM sheet for configuring loot containers with DoS-gated sections */
class LootSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "actor", "loot"],
        position: { width: 520, height: 600 },
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
        const actor = this.document as unknown as LootDH2e;
        return {
            ctx: {
                actor,
                name: actor.name,
                img: actor.img,
                system: actor.lootSystem,
                editable: this.isEditable,
                onAddSection: (label: string, dosRequired: number) =>
                    actor.addSection(label, dosRequired),
                onRemoveSection: (sectionId: string) =>
                    actor.removeSection(sectionId),
                onRemoveItem: (sectionId: string, itemIndex: number) =>
                    actor.removeItemFromSection(sectionId, itemIndex),
                onResetSearched: () => actor.resetSearched(),
                onDropItem: (sectionId: string, itemData: Record<string, unknown>) =>
                    actor.addItemToSection(sectionId, itemData),
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

        // Find which section the drop landed on
        const target = (event.target as HTMLElement)?.closest("[data-section-id]");
        const sectionId = target?.getAttribute("data-section-id");

        const actor = this.document as unknown as LootDH2e;
        const sections = actor.lootSystem.sections;

        // Default to first section if no section targeted
        const targetSectionId = sectionId ?? sections[0]?.id;
        if (!targetSectionId) {
            ui.notifications.warn("Add a section first before dropping items.");
            return;
        }

        await actor.addItemToSection(targetSectionId, item.toObject());
    }
}

export { LootSheetDH2e };
