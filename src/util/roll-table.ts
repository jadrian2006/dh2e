/**
 * Get a RollTable from the dh2e-data.tables compendium by its dh2e.tableKey flag.
 * Returns null if the compendium or table is not found.
 */
async function getCompendiumTable(tableKey: string): Promise<RollTable | null> {
    const pack = game.packs.get("dh2e-data.tables");
    if (!pack) return null;
    const index = await pack.getIndex({ fields: ["flags.dh2e.tableKey"] });
    const entry = index.find((e: any) => e.flags?.dh2e?.tableKey === tableKey);
    if (!entry) return null;
    return pack.getDocument(entry._id) as Promise<RollTable>;
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
