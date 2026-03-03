import { getCompendiumTable, lookupTableResult } from "@util/index.ts";

interface MutationEntry {
    min: number;
    max: number;
    title: string;
    description: string;
    effect: string;
}

// Compendium table cache
let mutationRT: RollTable | null = null;

// JSON fallback cache
let mutationTable: MutationEntry[] | null = null;

/** Load and cache the mutation d100 table (JSON fallback) */
async function loadMutationTable(): Promise<MutationEntry[]> {
    if (mutationTable) return mutationTable;
    try {
        const resp = await fetch(`systems/${SYSTEM_ID}/data/tables/mutations.json`);
        mutationTable = (await resp.json()) as MutationEntry[];
    } catch (e) {
        console.error("DH2E | Failed to load mutation table", e);
        mutationTable = [];
    }
    return mutationTable;
}

/** Roll on mutation table and create a mutation (malignancy-type) item on the actor */
async function rollMutation(actor: Actor, formula = "1d100"): Promise<MutationEntry | undefined> {
    const roll = new foundry.dice.Roll(formula);
    await roll.evaluate();
    const result = roll.total ?? 1;

    let entry: MutationEntry | undefined;

    // Try compendium RollTable first
    if (!mutationRT) mutationRT = await getCompendiumTable("mutations");
    if (mutationRT) {
        const tr = lookupTableResult(mutationRT, result);
        if (tr) {
            const flags = tr.flags?.dh2e ?? {};
            entry = {
                min: tr.range[0],
                max: tr.range[1],
                title: tr.text,
                description: flags.description ?? "",
                effect: flags.effect ?? "",
            };
        }
    }

    // Fallback to JSON
    if (!entry) {
        const table = await loadMutationTable();
        entry = table.find((e) => result >= e.min && result <= e.max);
    }

    if (entry) {
        await actor.createEmbeddedDocuments("Item", [{
            name: `Mutation: ${entry.title}`,
            type: "malignancy",
            system: {
                description: `${entry.description}\n\n${entry.effect}`,
                threshold: (actor as any).system?.corruption ?? 0,
                rules: [],
                visible: true,
            },
        }]);
    }

    return entry;
}

export { loadMutationTable, rollMutation };
export type { MutationEntry };
