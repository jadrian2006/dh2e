import { ActorDH2e } from "@actor/base.ts";
import type { LootSection, LootItemEntry, LootSystemSource } from "./data.ts";

/** Loot actor — GM-placed containers with DoS-gated sections */
class LootDH2e extends ActorDH2e {
    /** Type-safe system accessor */
    get lootSystem(): LootSystemSource {
        return this.system as unknown as LootSystemSource;
    }

    get isSearched(): boolean {
        return this.lootSystem.searched;
    }

    /** Get sections unlocked at the given DoS threshold */
    getUnlockedSections(dos: number): LootSection[] {
        return this.lootSystem.sections.filter(s => s.dosRequired <= dos);
    }

    /** Add a new section */
    async addSection(label: string, dosRequired: number): Promise<void> {
        const sections = fu.deepClone(this.lootSystem.sections);
        sections.push({
            id: fu.randomID(),
            label,
            dosRequired,
            items: [],
        });
        await this.update({ "system.sections": sections });
    }

    /** Remove a section by ID */
    async removeSection(sectionId: string): Promise<void> {
        const sections = fu.deepClone(this.lootSystem.sections).filter(s => s.id !== sectionId);
        await this.update({ "system.sections": sections });
    }

    /** Add serialized item data to a section */
    async addItemToSection(sectionId: string, itemData: Record<string, unknown>, quantity = 1): Promise<void> {
        const sections = fu.deepClone(this.lootSystem.sections);
        const section = sections.find(s => s.id === sectionId);
        if (!section) return;

        section.items.push({
            itemData,
            quantity,
            claimed: false,
        });
        await this.update({ "system.sections": sections });
    }

    /** Remove an item from a section by index */
    async removeItemFromSection(sectionId: string, itemIndex: number): Promise<void> {
        const sections = fu.deepClone(this.lootSystem.sections);
        const section = sections.find(s => s.id === sectionId);
        if (!section || itemIndex < 0 || itemIndex >= section.items.length) return;

        section.items.splice(itemIndex, 1);
        await this.update({ "system.sections": sections });
    }

    /** Mark an item as claimed */
    async claimItem(sectionId: string, itemIndex: number, claimedBy: string): Promise<void> {
        const sections = fu.deepClone(this.lootSystem.sections);
        const section = sections.find(s => s.id === sectionId);
        if (!section || itemIndex < 0 || itemIndex >= section.items.length) return;

        section.items[itemIndex].claimed = true;
        section.items[itemIndex].claimedBy = claimedBy;
        await this.update({ "system.sections": sections });
    }

    /** Mark this loot actor as searched */
    async markSearched(): Promise<void> {
        await this.update({ "system.searched": true });
    }

    /** Reset the searched flag (GM action) */
    async resetSearched(): Promise<void> {
        await this.update({ "system.searched": false });
    }
}

export { LootDH2e };
