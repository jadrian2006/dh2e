import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import { CreationWizard } from "../../character-creation/wizard.ts";
import { AdvancementShop } from "../../advancement/shop.ts";
import { getSetting } from "../../ui/settings/settings.ts";
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
        // No dragDrop config — we use native event listeners instead,
        // because Foundry's DragDrop bindings break when Svelte remounts.
    });

    protected override root = SheetRoot;

    /** Persisted tab state — survives Svelte remounts */
    #activeTab = "summary";

    /** Whether native drop listeners have been attached */
    #dropListenersBound = false;

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
                canEditXP: this.isEditable && ((game as any).user.isGM || getSetting<boolean>("allowPlayerXPEdit")),
                items: {
                    weapons: actor.items.filter((i: Item) => i.type === "weapon"),
                    armour: actor.items.filter((i: Item) => i.type === "armour"),
                    gear: actor.items.filter((i: Item) => i.type === "gear"),
                    skills: actor.items.filter((i: Item) => i.type === "skill"),
                    talents: actor.items.filter((i: Item) => i.type === "talent"),
                    powers: actor.items.filter((i: Item) => i.type === "power"),
                    conditions: actor.items.filter((i: Item) => i.type === "condition"),
                    homeworlds: actor.items.filter((i: Item) => i.type === "homeworld"),
                    backgrounds: actor.items.filter((i: Item) => i.type === "background"),
                    roles: actor.items.filter((i: Item) => i.type === "role"),
                    traits: actor.items.filter((i: Item) => i.type === "trait"),
                    criticalInjuries: actor.items.filter((i: Item) => i.type === "critical-injury"),
                    malignancies: actor.items.filter((i: Item) => i.type === "malignancy"),
                    mentalDisorders: actor.items.filter((i: Item) => i.type === "mental-disorder"),
                    ammunition: actor.items.filter((i: Item) => i.type === "ammunition"),
                    cybernetics: actor.items.filter((i: Item) => i.type === "cybernetic"),
                },
                openWizard: () => CreationWizard.open(actor),
                openShop: () => AdvancementShop.open(actor),
                activeTab: this.#activeTab,
                setActiveTab: (tab: string) => { this.#activeTab = tab; },
            },
        };
    }

    /**
     * Attach native drag-drop listeners after each render.
     * We bind directly to the content element because Foundry's DragDrop
     * system doesn't survive Svelte remounts (content.replaceChildren()).
     */
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

    /** Origin item types that enforce one-per-actor */
    static #ORIGIN_TYPES = new Set(["homeworld", "background", "role"]);

    /** Display-field mapping for origin types */
    static #ORIGIN_DETAIL_KEYS: Record<string, string> = {
        homeworld: "system.details.homeworld",
        background: "system.details.background",
        role: "system.details.role",
    };

    /** Handle item drops from compendium or sidebar */
    async #handleDrop(event: DragEvent): Promise<void> {
        if (!this.isEditable) return;

        let data: Record<string, unknown> | null = null;

        const rawData = event.dataTransfer?.getData("text/plain");
        if (rawData) {
            try {
                data = JSON.parse(rawData);
            } catch {
                return;
            }
        }

        if (!data || data.type !== "Item") return;

        const actor = this.document as unknown as AcolyteDH2e;

        // Resolve the item from UUID or drop data
        let item: any = null;
        if (data.uuid) {
            item = await fromUuid(data.uuid as string);
        } else {
            try {
                item = await (Item as any).implementation.fromDropData(data);
            } catch {
                console.warn("DH2E | Failed to resolve dropped item", data);
                return;
            }
        }
        if (!item) return;

        const itemData = item.toObject();
        const itemType = itemData.type as string;

        // Enforce singleton for origin items
        if (AcolyteSheetDH2e.#ORIGIN_TYPES.has(itemType)) {
            const existing = actor.items.filter((i: Item) => i.type === itemType);
            if (existing.length > 0) {
                await actor.deleteEmbeddedDocuments("Item", existing.map((i: Item) => i.id!));
            }
            await actor.createEmbeddedDocuments("Item", [itemData]);
            // Also update the details string for display
            const detailKey = AcolyteSheetDH2e.#ORIGIN_DETAIL_KEYS[itemType];
            if (detailKey) {
                await actor.update({ [detailKey]: itemData.name });
            }
            return;
        }

        await actor.createEmbeddedDocuments("Item", [itemData]);
    }
}

export { AcolyteSheetDH2e };
