import { getCompendiumTable, lookupTableResult } from "@util/index.ts";

interface MutationWeapon {
    name: string;
    class: string;
    range?: number;
    damage: { formula: string; type: string; bonus: number };
    penetration: number;
    qualities: string[];
}

interface MutationEntry {
    min: number;
    max: number;
    title: string;
    description: string;
    effect: string;
    rules?: any[];
    weapons?: MutationWeapon[];
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

/**
 * Resolve any "roll:XdY:negate" placeholders in rule element values.
 * E.g. "roll:1d5:negate" → evaluate 1d5, return negative result.
 */
async function resolveRollValues(rules: any[]): Promise<any[]> {
    const resolved: any[] = [];
    for (const rule of rules) {
        if (typeof rule.value === "string" && rule.value.startsWith("roll:")) {
            const parts = rule.value.split(":");
            const formula = parts[1] ?? "1d5";
            const negate = parts[2] === "negate";
            const roll = new foundry.dice.Roll(formula);
            await roll.evaluate();
            let val = roll.total ?? 1;
            if (negate) val = -val;
            resolved.push({ ...rule, value: val, label: `${rule.label ?? ""} (${Math.abs(val)})`.trim() });
        } else {
            resolved.push(rule);
        }
    }
    return resolved;
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
                rules: flags.rules,
                weapons: flags.weapons,
            };
        }
    }

    // Fallback to JSON
    if (!entry) {
        const table = await loadMutationTable();
        entry = table.find((e) => result >= e.min && result <= e.max);
    }

    if (entry) {
        // Resolve any random roll placeholders in rules
        const rules = entry.rules?.length ? await resolveRollValues(entry.rules) : [];

        // Build items to create — malignancy + any natural weapons
        const items: Record<string, unknown>[] = [{
            name: `Mutation: ${entry.title}`,
            type: "malignancy",
            system: {
                description: `${entry.description}\n\n${entry.effect}`,
                threshold: (actor as any).system?.corruption ?? 0,
                rules,
                visible: true,
            },
        }];

        // Create natural weapons alongside mutation
        if (entry.weapons?.length) {
            for (const w of entry.weapons) {
                items.push({
                    name: `${w.name} (Mutation)`,
                    type: "weapon",
                    system: {
                        description: `Natural weapon from mutation: ${entry.title}.`,
                        class: w.class,
                        range: w.range ?? 0,
                        rof: { single: true, semi: 0, full: 0 },
                        damage: w.damage,
                        penetration: w.penetration,
                        magazine: { value: 0, max: 0 },
                        reload: "",
                        weight: 0,
                        qualities: w.qualities,
                        equipped: true,
                        loadType: "",
                        loadedMagazineName: "",
                        loadedRounds: [],
                        weaponGroup: "natural",
                    },
                });
            }
        }

        await actor.createEmbeddedDocuments("Item", items);
    }

    return entry;
}

export { loadMutationTable, rollMutation };
export type { MutationEntry };
