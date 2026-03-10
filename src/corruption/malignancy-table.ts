import { getCompendiumTable, lookupTableResult } from "@util/index.ts";
import { rollMutation } from "./mutation-table.ts";

interface MalignancyEntry {
    min: number;
    max: number;
    title: string;
    description: string;
    effect: string;
    mutation?: boolean;
    rules?: any[];
}

// Compendium table cache
let malignancyRT: RollTable | null = null;

// JSON fallback cache
let malignancyTable: MalignancyEntry[] | null = null;

/** Load and cache the malignancy d100 table (JSON fallback) */
async function loadMalignancyTable(): Promise<MalignancyEntry[]> {
    if (malignancyTable) return malignancyTable;
    try {
        const resp = await fetch(`systems/${SYSTEM_ID}/data/tables/malignancies.json`);
        malignancyTable = (await resp.json()) as MalignancyEntry[];
    } catch (e) {
        console.error("DH2E | Failed to load malignancy table", e);
        malignancyTable = [];
    }
    return malignancyTable;
}

/** Roll on malignancy table and create a malignancy item on the actor */
async function rollMalignancy(actor: Actor): Promise<MalignancyEntry | undefined> {
    const roll = new foundry.dice.Roll("1d100");
    await roll.evaluate();
    const result = roll.total ?? 1;

    let entry: MalignancyEntry | undefined;

    // Try compendium RollTable first
    if (!malignancyRT) malignancyRT = await getCompendiumTable("malignancies");
    if (malignancyRT) {
        const tr = lookupTableResult(malignancyRT, result);
        if (tr) {
            const flags = tr.flags?.dh2e ?? {};
            entry = {
                min: tr.range[0],
                max: tr.range[1],
                title: tr.text,
                description: flags.description ?? "",
                effect: flags.effect ?? "",
                rules: flags.rules,
            };
        }
    }

    // Fallback to JSON
    if (!entry) {
        const table = await loadMalignancyTable();
        entry = table.find((e) => result >= e.min && result <= e.max);
    }

    // Malignancy result 96-100: "Mutation!" — chain to Mutations table (CRB Table 8-15)
    if (entry?.mutation) {
        const mutEntry = await rollMutation(actor);
        // Return a synthetic entry so the caller knows it was a mutation
        if (mutEntry) {
            return {
                min: entry.min,
                max: entry.max,
                title: `Mutation: ${mutEntry.title}`,
                description: mutEntry.description,
                effect: mutEntry.effect,
                mutation: true,
            };
        }
        return entry;
    }

    if (entry) {
        await actor.createEmbeddedDocuments("Item", [{
            name: entry.title,
            type: "malignancy",
            system: {
                description: `${entry.description}\n\n${entry.effect}`,
                threshold: (actor as any).system?.corruption ?? 0,
                rules: entry.rules ?? [],
                visible: true,
            },
        }]);
    }

    return entry;
}

export { loadMalignancyTable, rollMalignancy };
export type { MalignancyEntry };
