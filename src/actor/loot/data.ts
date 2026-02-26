/** Serialized item data stored in a loot section (NOT embedded documents) */
interface LootItemEntry {
    /** Serialized item source data */
    itemData: Record<string, unknown>;
    quantity: number;
    claimed: boolean;
    claimedBy?: string;
}

/** A DoS-gated section within a loot actor */
interface LootSection {
    id: string;
    label: string;
    dosRequired: number;
    items: LootItemEntry[];
}

/** System data for the loot actor type */
interface LootSystemSource {
    sections: LootSection[];
    salvageSkill: string;
    salvageModifier: number;
    searched: boolean;
    details: { notes: string };
}

export type { LootItemEntry, LootSection, LootSystemSource };
