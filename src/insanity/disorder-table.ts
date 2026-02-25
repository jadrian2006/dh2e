import { getCompendiumTable, lookupTableResult } from "@util/index.ts";

interface DisorderEntry {
    min: number;
    max: number;
    title: string;
    description: string;
    effect: string;
    triggers: string;
}

// Compendium table cache
let disorderRT: RollTable | null = null;

// JSON fallback cache
let disorderTable: DisorderEntry[] | null = null;

/** Load and cache the mental disorder d100 table (JSON fallback) */
async function loadDisorderTable(): Promise<DisorderEntry[]> {
    if (disorderTable) return disorderTable;
    try {
        const resp = await fetch(`systems/${SYSTEM_ID}/data/tables/mental-disorders.json`);
        disorderTable = (await resp.json()) as DisorderEntry[];
    } catch (e) {
        console.error("DH2E | Failed to load mental disorders table", e);
        disorderTable = [];
    }
    return disorderTable;
}

/** Roll on disorder table and create a mental-disorder item on the actor */
async function rollDisorder(
    actor: Actor,
    severity: "minor" | "severe" | "acute",
): Promise<DisorderEntry | undefined> {
    const roll = new foundry.dice.Roll("1d100");
    await roll.evaluate();
    const result = roll.total ?? 1;

    let entry: DisorderEntry | undefined;

    // Try compendium RollTable first
    if (!disorderRT) disorderRT = await getCompendiumTable("mental-disorders");
    if (disorderRT) {
        const tr = lookupTableResult(disorderRT, result);
        if (tr) {
            const flags = tr.flags?.dh2e ?? {};
            entry = {
                min: tr.range[0],
                max: tr.range[1],
                title: tr.text,
                description: flags.description ?? "",
                effect: flags.effect ?? "",
                triggers: flags.triggers ?? "",
            };
        }
    }

    // Fallback to JSON
    if (!entry) {
        const table = await loadDisorderTable();
        entry = table.find((e) => result >= e.min && result <= e.max);
    }

    if (entry) {
        await actor.createEmbeddedDocuments("Item", [{
            name: entry.title,
            type: "mental-disorder",
            system: {
                description: `${entry.description}\n\n${entry.effect}`,
                threshold: (actor as any).system?.insanity ?? 0,
                severity,
                rules: [],
                triggers: entry.triggers,
            },
        }]);
    }

    return entry;
}

export { loadDisorderTable, rollDisorder };
export type { DisorderEntry };
