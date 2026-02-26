import type { LootSection } from "@actor/loot/data.ts";

/** Item types that are lootable equipment */
const EQUIPMENT_TYPES = new Set(["weapon", "armour", "gear", "ammunition"]);

/**
 * Generate a loot actor from a defeated NPC's inventory.
 * Creates three sections:
 * - DoS 0: "Carried Items" — non-equipped gear, spare ammo
 * - DoS 1: "Equipped Gear" — equipped weapons and armour
 * - DoS 2+: "Hidden Items" — empty (GM fills in)
 */
async function createLootFromNpc(npc: Actor): Promise<Actor | null> {
    const g = game as any;

    const carriedItems: object[] = [];
    const equippedItems: object[] = [];

    for (const item of npc.items) {
        if (!EQUIPMENT_TYPES.has(item.type)) continue;
        const sys = item.system as any;
        const data = item.toObject();

        if (sys.equipped) {
            equippedItems.push(data);
        } else {
            carriedItems.push(data);
        }
    }

    const sections: LootSection[] = [
        {
            id: fu.randomID(),
            label: "Carried Items",
            dosRequired: 0,
            items: carriedItems.map(d => ({
                itemData: d as Record<string, unknown>,
                quantity: (d as any).system?.quantity ?? 1,
                claimed: false,
            })),
        },
        {
            id: fu.randomID(),
            label: "Equipped Gear",
            dosRequired: 1,
            items: equippedItems.map(d => ({
                itemData: d as Record<string, unknown>,
                quantity: (d as any).system?.quantity ?? 1,
                claimed: false,
            })),
        },
        {
            id: fu.randomID(),
            label: "Hidden Items",
            dosRequired: 2,
            items: [],
        },
    ];

    const actorData = {
        name: `${npc.name} — Loot`,
        type: "loot",
        img: npc.img,
        system: {
            sections,
            salvageSkill: g.settings?.get(SYSTEM_ID, "defaultSalvageSkill") ?? "awareness",
            salvageModifier: 0,
            searched: false,
            details: { notes: "" },
        },
    };

    const created = await (Actor as any).create(actorData);
    if (created) {
        ui.notifications.info(`Created loot actor: ${created.name}`);
    }
    return created;
}

/**
 * Create an empty supply cache loot actor for the GM to fill.
 */
async function createSupplyCache(name = "Supply Cache"): Promise<Actor | null> {
    const g = game as any;

    const sections: LootSection[] = [
        {
            id: fu.randomID(),
            label: "Surface Items",
            dosRequired: 0,
            items: [],
        },
        {
            id: fu.randomID(),
            label: "Hidden Compartment",
            dosRequired: 2,
            items: [],
        },
    ];

    const actorData = {
        name,
        type: "loot",
        img: "icons/svg/chest.svg",
        system: {
            sections,
            salvageSkill: g.settings?.get(SYSTEM_ID, "defaultSalvageSkill") ?? "awareness",
            salvageModifier: 0,
            searched: false,
            details: { notes: "" },
        },
    };

    const created = await (Actor as any).create(actorData);
    if (created) {
        ui.notifications.info(`Created loot actor: ${created.name}`);
    }
    return created;
}

export { createLootFromNpc, createSupplyCache };
