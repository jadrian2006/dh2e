import type { PhenomenaEntry, PerilsEntry } from "./types.ts";
import { getCompendiumTable, lookupTableResult } from "@util/index.ts";

// Compendium table cache
let phenomenaRT: RollTable | null = null;
let perilsRT: RollTable | null = null;

// JSON fallback cache
let phenomenaTable: PhenomenaEntry[] | null = null;
let perilsTable: PerilsEntry[] | null = null;

/** Load and cache the psychic phenomena d100 table (JSON fallback) */
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

/** Load and cache the perils of the warp d100 table (JSON fallback) */
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
    const baseRoll = new foundry.dice.Roll("1d100");
    await baseRoll.evaluate();
    let roll = baseRoll.total ?? 1;
    if (pushed) roll = Math.min(100, roll + 25);

    // Try compendium RollTable first
    if (!phenomenaRT) phenomenaRT = await getCompendiumTable("psychic-phenomena");
    if (phenomenaRT) {
        const result = lookupTableResult(phenomenaRT, roll);
        if (result) {
            const flags = result.flags?.dh2e ?? {};
            return {
                roll,
                entry: {
                    min: result.range[0],
                    max: result.range[1],
                    title: result.text,
                    description: flags.description ?? "",
                    effect: flags.effect ?? result.text,
                    escalate: flags.escalate ?? false,
                },
            };
        }
    }

    // Fallback to JSON
    const table = await loadPhenomenaTable();
    return { roll, entry: d100Lookup(table, roll) };
}

/** Roll on the Perils of the Warp table */
async function rollPerils(): Promise<{ roll: number; entry: PerilsEntry | undefined }> {
    const baseRoll = new foundry.dice.Roll("1d100");
    await baseRoll.evaluate();
    const roll = baseRoll.total ?? 1;

    // Try compendium RollTable first
    if (!perilsRT) perilsRT = await getCompendiumTable("perils-of-the-warp");
    if (perilsRT) {
        const result = lookupTableResult(perilsRT, roll);
        if (result) {
            const flags = result.flags?.dh2e ?? {};
            return {
                roll,
                entry: {
                    min: result.range[0],
                    max: result.range[1],
                    title: result.text,
                    description: flags.description ?? "",
                    effect: flags.effect ?? result.text,
                    damage: flags.damage ?? "",
                    conditions: flags.conditions ?? [],
                },
            };
        }
    }

    // Fallback to JSON
    const table = await loadPerilsTable();
    return { roll, entry: d100Lookup(table, roll) };
}

export {
    loadPhenomenaTable,
    loadPerilsTable,
    d100Lookup,
    rollPhenomena,
    rollPerils,
};
