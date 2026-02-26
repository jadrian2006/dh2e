import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { LootDH2e } from "@actor/loot/document.ts";
import type { LootSection } from "@actor/loot/data.ts";
import SalvageLootRoot from "./salvage-loot-root.svelte";

/**
 * Dialog for claiming items from a salvage search.
 * Shows only unlocked sections based on DoS.
 */
class SalvageLootDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-salvage-loot",
        classes: ["dh2e", "dialog", "salvage-loot-dialog"],
        position: { width: 420, height: "auto" as const },
        window: { resizable: true, minimizable: false },
    });

    protected override root = SalvageLootRoot;

    #searcher: Actor;
    #lootActor: LootDH2e;
    #dos: number;

    constructor(searcher: Actor, lootActor: LootDH2e, dos: number, options?: Partial<ApplicationConfiguration>) {
        super(options ?? {});
        this.#searcher = searcher;
        this.#lootActor = lootActor;
        this.#dos = dos;
    }

    override get title(): string {
        return `${game.i18n.localize("DH2E.Loot.SearchContainer")} — ${this.#lootActor.name}`;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const unlockedSections = this.#lootActor.getUnlockedSections(this.#dos);

        return {
            ctx: {
                lootActorName: this.#lootActor.name,
                searcherName: this.#searcher.name,
                dos: this.#dos,
                sections: unlockedSections,
                onClaim: (sectionId: string, itemIndices: number[]) =>
                    this.#claimItems(sectionId, itemIndices),
            },
        };
    }

    /** Transfer claimed items to the searcher's inventory */
    async #claimItems(sectionId: string, itemIndices: number[]): Promise<void> {
        const section = this.#lootActor.lootSystem.sections.find(s => s.id === sectionId);
        if (!section) return;

        const itemDatas: object[] = [];
        for (const idx of itemIndices) {
            const entry = section.items[idx];
            if (!entry || entry.claimed) continue;
            itemDatas.push(entry.itemData);
        }

        if (itemDatas.length === 0) return;

        // Create items on searcher
        await this.#searcher.createEmbeddedDocuments("Item", itemDatas);

        // Mark items as claimed in loot actor
        for (const idx of itemIndices) {
            await this.#lootActor.claimItem(sectionId, idx, this.#searcher.name!);
        }

        // Post chat
        await ChatMessage.create({
            content: `<div class="dh2e salvage-claim-chat">
                <p>${game.i18n.format("DH2E.Loot.TransferComplete", {
                    actor: this.#searcher.name!,
                    count: String(itemDatas.length),
                    source: this.#lootActor.name!,
                })}</p>
            </div>`,
            speaker: ChatMessage.getSpeaker({ actor: this.#searcher }),
        });

        // Re-render to show claimed state
        this.render(true);
    }

    static open(searcher: Actor, lootActor: LootDH2e, dos: number): void {
        new SalvageLootDialog(searcher, lootActor, dos).render(true);
    }
}

export { SalvageLootDialog };
