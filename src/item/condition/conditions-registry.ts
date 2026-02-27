/**
 * In-memory registry of all core conditions.
 * Loaded from static/data/conditions.json (shipped with the system, not a module).
 * This replaces the former dependency on the dh2e-data.conditions compendium pack.
 */

export interface ConditionData {
    name: string;
    slug: string;
    description: string;
    img: string;
    stackable: boolean;
    rules: Record<string, unknown>[];
    remainingRounds: number;
    duration: string;
}

const CONDITIONS = new Map<string, ConditionData>();
let _loaded = false;

/** Load conditions from the system's static data file */
async function ensureLoaded(): Promise<void> {
    if (_loaded) return;
    _loaded = true;

    try {
        const resp = await fetch(`systems/${SYSTEM_ID}/data/conditions.json`);
        if (!resp.ok) {
            console.warn("DH2E | Could not load conditions.json from system data");
            return;
        }
        const data: any[] = await resp.json();
        for (const entry of data) {
            const sys = entry.system ?? {};
            const slug = sys.slug ?? entry.name?.toLowerCase().replace(/\s+/g, "-") ?? "";
            if (!slug) continue;
            CONDITIONS.set(slug, {
                name: entry.name ?? slug,
                slug,
                description: sys.description ?? "",
                img: entry.img ?? `systems/dh2e/icons/conditions/${slug}.svg`,
                stackable: sys.stackable ?? false,
                rules: sys.rules ?? [],
                remainingRounds: sys.remainingRounds ?? 0,
                duration: sys.duration ?? "",
            });
        }
    } catch (e) {
        console.error("DH2E | Failed to load conditions registry", e);
    }
}

/** Initialize the registry — call from the init or ready hook */
export async function initConditionsRegistry(): Promise<void> {
    await ensureLoaded();
}

/** Get a condition by its slug (e.g. "stunned", "on-fire") */
export function getConditionBySlug(slug: string): ConditionData | null {
    return CONDITIONS.get(slug) ?? null;
}

/** Get all registered conditions */
export function getAllConditions(): ConditionData[] {
    return [...CONDITIONS.values()];
}

/**
 * Create a condition item data object suitable for `createEmbeddedDocuments`.
 * Sources from the registry for full rules data, with optional duration override.
 */
export function createConditionItemData(
    slug: string,
    remainingRounds: number = 0,
): Record<string, unknown> {
    const condition = CONDITIONS.get(slug);

    if (condition) {
        return {
            name: condition.name,
            type: "condition",
            img: condition.img,
            system: {
                description: condition.description,
                slug: condition.slug,
                duration: remainingRounds > 0 ? `${remainingRounds} rounds` : condition.duration,
                stackable: condition.stackable,
                rules: condition.rules,
                remainingRounds: remainingRounds > 0 ? remainingRounds : condition.remainingRounds,
            },
        };
    }

    // Fallback: inline condition (not in registry)
    const titleName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return {
        name: titleName,
        type: "condition",
        img: `systems/dh2e/icons/conditions/${slug}.svg`,
        system: {
            description: "Applied by critical injury",
            slug,
            duration: remainingRounds > 0 ? `${remainingRounds} rounds` : "",
            stackable: false,
            rules: [],
            remainingRounds,
        },
    };
}
