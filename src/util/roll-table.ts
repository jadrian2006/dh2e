import { getPacksOfType } from "./pack-discovery.ts";

/**
 * Get a RollTable by its dh2e.tableKey flag, scanning all dh2e module table packs.
 * Returns null if the table is not found in any module.
 */
async function getCompendiumTable(tableKey: string): Promise<RollTable | null> {
    for (const packId of getPacksOfType("tables")) {
        const pack = game.packs.get(packId);
        if (!pack) continue;
        const index = await pack.getIndex({ fields: ["flags.dh2e.tableKey"] });
        const entry = index.find((e: any) => e.flags?.dh2e?.tableKey === tableKey);
        if (entry) return pack.getDocument(entry._id) as Promise<RollTable>;
    }
    return null;
}

/**
 * Look up a specific result from a RollTable by d100 roll value.
 * Returns the matching TableResult or undefined.
 */
function lookupTableResult(table: RollTable, roll: number): any | undefined {
    return (table as any).results.find((r: any) => {
        const [lo, hi] = r.range;
        return roll >= lo && roll <= hi;
    });
}

export { getCompendiumTable, lookupTableResult };
