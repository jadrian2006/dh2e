/**
 * Central utility for discovering compendium packs from any dh2e-compatible module.
 * Replaces hardcoded "dh2e-data.X" references with dynamic discovery.
 *
 * Scans `game.packs` for packs belonging to modules with `system: "dh2e"`,
 * grouping them by pack name (e.g. "talents" → ["dh2e-data.talents", "dh2e-enemies-beyond.talents"]).
 */

/** Valid pack types used for discovery */
export type PackType =
    | "skills" | "talents" | "weapons" | "armour" | "gear"
    | "powers" | "homeworlds" | "backgrounds" | "roles"
    | "ammunition" | "cybernetics" | "traits" | "npcs"
    | "tables" | "treasure" | "conditions" | "macros" | "guides";

interface DiscoveredPacks {
    /** Map from pack name (e.g. "talents") to array of full pack IDs sorted alphabetically */
    byType: Map<PackType, string[]>;
    /** All discovered module IDs */
    moduleIds: string[];
}

let _cache: DiscoveredPacks | null = null;

/**
 * Scan game.packs for all packs belonging to active modules with system="dh2e".
 * Results are cached; call `invalidatePackCache()` when modules change.
 */
export function discoverPacks(): DiscoveredPacks {
    if (_cache) return _cache;

    const byType = new Map<PackType, string[]>();
    const moduleIds = new Set<string>();
    const g = game as any;

    if (!g.packs) {
        _cache = { byType, moduleIds: [] };
        return _cache;
    }

    for (const pack of g.packs) {
        const metadata = pack.metadata ?? {};
        // Only include packs from modules targeting this system
        if (metadata.packageType !== "module") continue;

        // Check if the module declares system compatibility with dh2e
        const moduleData = g.modules?.get(metadata.packageName);
        if (!moduleData?.active) continue;

        // Check system compatibility — module must list dh2e
        const systems: string[] | Set<string> = moduleData.systems ?? moduleData.system ?? [];
        const systemList = systems instanceof Set ? [...systems] : Array.isArray(systems) ? systems : [systems];
        // Also accept modules whose pack IDs start with "dh2e-"
        const isDH2eModule = systemList.includes("dh2e")
            || metadata.packageName?.startsWith("dh2e-");

        if (!isDH2eModule) continue;

        moduleIds.add(metadata.packageName);
        const packName = metadata.name as PackType;
        const fullId = pack.collection; // e.g. "dh2e-data.talents"

        if (!byType.has(packName)) {
            byType.set(packName, []);
        }
        byType.get(packName)!.push(fullId);
    }

    // Sort each array alphabetically for stable priority (dh2e-data before dh2e-enemies-beyond)
    for (const arr of byType.values()) {
        arr.sort();
    }

    _cache = { byType, moduleIds: [...moduleIds].sort() };
    return _cache;
}

/**
 * Get all pack IDs of a given type across all dh2e modules.
 * Returns an empty array if no packs of that type exist.
 */
export function getPacksOfType(type: PackType): string[] {
    return discoverPacks().byType.get(type) ?? [];
}

/**
 * Search all packs of a given type for an item by name (case-insensitive).
 * Returns the first match found, checking packs in alphabetical module order.
 */
export async function findInAllPacks(type: PackType, name: string): Promise<any | null> {
    const packIds = getPacksOfType(type);
    const lc = name.toLowerCase();

    for (const packId of packIds) {
        const pack = game.packs.get(packId);
        if (!pack) continue;

        const index = await pack.getIndex();
        const entry = index.find((e: any) => e.name?.toLowerCase() === lc);
        if (entry) {
            return pack.getDocument(entry._id);
        }
    }

    return null;
}

/**
 * Get a merged index across all packs of a given type.
 * Entries are tagged with their source pack ID.
 * If duplicate names exist across modules, all are included.
 */
export async function getAllIndexesOfType(type: PackType): Promise<IndexEntry[]> {
    const packIds = getPacksOfType(type);
    const results: IndexEntry[] = [];

    for (const packId of packIds) {
        const pack = game.packs.get(packId);
        if (!pack) continue;

        const index = await pack.getIndex({ fields: ["system"] });
        for (const entry of index) {
            results.push({
                _id: entry._id,
                name: entry.name ?? "",
                img: (entry as any).img ?? "",
                system: (entry as any).system ?? {},
                packId,
                uuid: `Compendium.${packId}.${entry._id}`,
            });
        }
    }

    return results;
}

/**
 * Get all full documents from all packs of a given type.
 * Useful for creation data loading where we need full item data.
 */
export async function getAllDocumentsOfType(type: PackType): Promise<any[]> {
    const packIds = getPacksOfType(type);
    const results: any[] = [];

    for (const packId of packIds) {
        const pack = game.packs.get(packId);
        if (!pack) continue;
        const docs = await pack.getDocuments();
        results.push(...docs);
    }

    return results;
}

/**
 * Find the first pack of a given type that exists.
 * Useful as a drop-in for single-pack lookups.
 */
export function getFirstPackOfType(type: PackType): any | null {
    const packIds = getPacksOfType(type);
    if (packIds.length === 0) return null;
    return game.packs.get(packIds[0]) ?? null;
}

/**
 * Construct a Compendium UUID for an item found in a pack.
 * Uses the actual pack the item was found in rather than hardcoding.
 */
export function buildCompendiumUuid(packId: string, itemId: string): string {
    return `Compendium.${packId}.${itemId}`;
}

/**
 * Search multiple pack types for an item by name.
 * Useful for equipment lookups where the item could be in weapons, armour, gear, etc.
 */
export async function findInMultipleTypes(types: PackType[], name: string): Promise<any | null> {
    for (const type of types) {
        const doc = await findInAllPacks(type, name);
        if (doc) return doc;
    }
    return null;
}

/**
 * Scan all dh2e-* module data directories for JSON creation data.
 * Returns base paths for modules that have a data/creation/ directory.
 */
export function getCreationDataPaths(): string[] {
    const { moduleIds } = discoverPacks();
    return moduleIds.map(id => `modules/${id}/data/creation`);
}

/** Clear the cached pack discovery results. Call when modules are activated/deactivated. */
export function invalidatePackCache(): void {
    _cache = null;
}

/** Index entry with source pack metadata */
export interface IndexEntry {
    _id: string;
    name: string;
    img: string;
    system: Record<string, any>;
    packId: string;
    uuid: string;
}
