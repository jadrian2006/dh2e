import type { PhenomenaEntry, PerilsEntry } from "./types.ts";

let phenomenaTable: PhenomenaEntry[] | null = null;
let perilsTable: PerilsEntry[] | null = null;

/** Load and cache the psychic phenomena d100 table */
async function loadPhenomenaTable(): Promise<PhenomenaEntry[]> {
    if (phenomenaTable) return phenomenaTable;
    try {
        const resp = await fetch(`systems/${SYSTEM_ID}/data/tables/psychic-phenomena.json`);
        phenomenaTable = (await resp.json()) as PhenomenaEntry[];
    } catch (e) {
        console.error("DH2E | Failed to load psychic phenomena table", e);
        phenomenaTable = [];
    }
    return phenomenaTable;
}

/** Load and cache the perils of the warp d100 table */
async function loadPerilsTable(): Promise<PerilsEntry[]> {
    if (perilsTable) return perilsTable;
    try {
        const resp = await fetch(`systems/${SYSTEM_ID}/data/tables/perils-of-the-warp.json`);
        perilsTable = (await resp.json()) as PerilsEntry[];
    } catch (e) {
        console.error("DH2E | Failed to load perils of the warp table", e);
        perilsTable = [];
    }
    return perilsTable;
}

/** Look up an entry from a d100 table by roll value */
function d100Lookup<T extends { min: number; max: number }>(table: T[], roll: number): T | undefined {
    return table.find((e) => roll >= e.min && roll <= e.max);
}

/** Roll on the Psychic Phenomena table. If pushed, add +25 to the roll. */
async function rollPhenomena(pushed: boolean): Promise<{ roll: number; entry: PhenomenaEntry | undefined }> {
    const table = await loadPhenomenaTable();
    const baseRoll = new foundry.dice.Roll("1d100");
    await baseRoll.evaluate();
    let roll = baseRoll.total ?? 1;
    if (pushed) roll = Math.min(100, roll + 25);
    const entry = d100Lookup(table, roll);
    return { roll, entry };
}

/** Roll on the Perils of the Warp table */
async function rollPerils(): Promise<{ roll: number; entry: PerilsEntry | undefined }> {
    const table = await loadPerilsTable();
    const baseRoll = new foundry.dice.Roll("1d100");
    await baseRoll.evaluate();
    const roll = baseRoll.total ?? 1;
    const entry = d100Lookup(table, roll);
    return { roll, entry };
}

export {
    loadPhenomenaTable,
    loadPerilsTable,
    d100Lookup,
    rollPhenomena,
    rollPerils,
};
