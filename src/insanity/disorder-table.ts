interface DisorderEntry {
    min: number;
    max: number;
    title: string;
    description: string;
    effect: string;
    triggers: string;
}

let disorderTable: DisorderEntry[] | null = null;

/** Load and cache the mental disorder d100 table */
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
    const table = await loadDisorderTable();
    const roll = new foundry.dice.Roll("1d100");
    await roll.evaluate();
    const result = roll.total ?? 1;
    const entry = table.find((e) => result >= e.min && result <= e.max);

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
