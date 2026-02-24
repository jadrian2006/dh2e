import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { VehicleDH2e } from "./document.ts";
import SheetRoot from "./sheet-root.svelte";

/** Vehicle actor sheet */
class VehicleSheetDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "actor", "vehicle"],
        position: { width: 680, height: 720 },
        window: { resizable: true },
    });

    protected override root = SheetRoot;
    #dropListenersBound = false;

    override get title(): string {
        return this.document.name;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const actor = this.document as unknown as VehicleDH2e;
        return {
            ctx: {
                actor,
                name: actor.name,
                img: actor.img,
                system: actor.system,
                editable: this.isEditable,
                items: {
                    weapons: actor.items.filter((i: Item) => i.type === "weapon"),
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
        if (!data) return;

        const actor = this.document as unknown as VehicleDH2e;

        // Handle Actor drops for crew positions
        if (data.type === "Actor" && data.uuid) {
            const droppedActor = await fromUuid(data.uuid as string) as any;
            if (!droppedActor) return;

            // Find first empty crew position
            const positions = actor.system.crewPositions ?? [];
            const emptyIdx = positions.findIndex((p) => !p.actorId);
            if (emptyIdx >= 0) {
                await actor.assignCrew(emptyIdx, droppedActor.id, droppedActor.name);
            }
            return;
        }

        // Handle Item drops
        if (data.type === "Item" && data.uuid) {
            const item = await fromUuid(data.uuid as string) as any;
            if (!item) return;
            await actor.createEmbeddedDocuments("Item", [item.toObject()]);
        }
    }
}

export { VehicleSheetDH2e };
