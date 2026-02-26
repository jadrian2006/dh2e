/**
 * Builds a searchable index from all compendium packs for the DH2E system.
 *
 * Indexes items from all packs, extracting filterable fields
 * (type, availability, weapon class, damage type, etc.)
 * Includes homebrew pack items with visibility filtering.
 */

import { HOMEBREW_PACK_COLLECTION } from "../../homebrew/homebrew-pack.ts";

export interface IndexEntry {
    uuid: string;
    name: string;
    img: string;
    type: string;
    pack: string;
    /** The Foundry document class (Item, Macro, etc.) */
    documentName?: string;
    /** Flattened system fields for filtering */
    availability?: string;
    weaponClass?: string;
    damageType?: string;
    weight?: number;
    tier?: number;
    characteristic?: string;
    discipline?: string;
    /** Whether this macro is GM-only */
    gmOnly?: boolean;
    /** Whether this entry comes from the homebrew compendium */
    isHomebrew: boolean;
    /** Visibility flag for homebrew items */
    homebrewVisibility?: "public" | "private";
}

/** Full index of all compendium entries */
export interface CompendiumIndex {
    entries: IndexEntry[];
    /** Unique values per field for populating filter dropdowns */
    facets: {
        types: string[];
        availability: string[];
        weaponClass: string[];
        damageType: string[];
        characteristic: string[];
        discipline: string[];
        source: string[];
    };
}

/** Module-level index cache */
let _cachedIndex: CompendiumIndex | null = null;

/** Invalidate the cached index, forcing a rebuild on next access */
export function invalidateCompendiumIndex(): void {
    _cachedIndex = null;
}

/** Build the compendium index from all DH2E packs */
export async function buildCompendiumIndex(): Promise<CompendiumIndex> {
    if (_cachedIndex) return _cachedIndex;

    const g = game as any;
    const isGM = g.user?.isGM ?? false;
    const entries: IndexEntry[] = [];

    const facetSets = {
        types: new Set<string>(),
        availability: new Set<string>(),
        weaponClass: new Set<string>(),
        damageType: new Set<string>(),
        characteristic: new Set<string>(),
        discipline: new Set<string>(),
        source: new Set<string>(),
    };

    for (const pack of g.packs) {
        // Skip system packs not belonging to DH2E
        if (pack.metadata.packageType === "system" && pack.metadata.packageName !== SYSTEM_ID) continue;

        // Skip module packs not belonging to DH2E data modules
        if (pack.metadata.packageType === "module" && !pack.metadata.packageName?.startsWith("dh2e")) continue;

        // For world packs, only include the homebrew pack
        const isHomebrew = pack.collection === HOMEBREW_PACK_COLLECTION;
        if (pack.metadata.packageType === "world" && !isHomebrew) continue;

        const documentName = pack.documentName ?? "Item";

        // Only index Item and Macro packs — skip JournalEntry, Scene, etc.
        if (documentName !== "Item" && documentName !== "Macro") continue;

        const indexFields = [
            "system.availability", "system.class", "system.damageType",
            "system.weight", "system.tier", "system.characteristic",
            "system.discipline",
        ];

        // Request homebrew visibility flags for the homebrew pack
        if (isHomebrew) {
            indexFields.push(`flags.${SYSTEM_ID}.homebrewVisibility`);
        }

        // Request gmOnly flag for macro packs
        if (documentName === "Macro") {
            indexFields.push(`flags.${SYSTEM_ID}.gmOnly`);
        }

        const index = await pack.getIndex({ fields: indexFields });

        for (const entry of index) {
            const sys = (entry as any).system ?? {};
            const flags = (entry as any).flags?.[SYSTEM_ID] ?? {};
            const visibility: "public" | "private" = isHomebrew
                ? (flags.homebrewVisibility ?? "public")
                : "public";

            // Privacy gate: non-GM users cannot see private homebrew items
            if (isHomebrew && visibility === "private" && !isGM) continue;

            // Normalize macro type: Foundry stores "script" but we display "macro"
            const rawType = entry.type ?? "unknown";
            const normalizedType = documentName === "Macro" ? "macro" : rawType;

            const ie: IndexEntry = {
                uuid: `Compendium.${pack.collection}.${entry._id}`,
                name: entry.name ?? "Unknown",
                img: (entry as any).img ?? "icons/svg/item-bag.svg",
                type: normalizedType,
                pack: pack.metadata.label ?? pack.collection,
                documentName,
                isHomebrew,
                homebrewVisibility: isHomebrew ? visibility : undefined,
            };

            // Extract gmOnly flag for macros
            if (documentName === "Macro") {
                ie.gmOnly = flags.gmOnly === true;
            }

            if (sys.availability) {
                ie.availability = sys.availability;
                facetSets.availability.add(sys.availability);
            }
            if (sys.class) {
                ie.weaponClass = sys.class;
                facetSets.weaponClass.add(sys.class);
            }
            if (sys.damageType) {
                ie.damageType = sys.damageType;
                facetSets.damageType.add(sys.damageType);
            }
            if (sys.weight != null) ie.weight = sys.weight;
            if (sys.tier != null) ie.tier = sys.tier;
            if (sys.characteristic) {
                ie.characteristic = sys.characteristic;
                facetSets.characteristic.add(sys.characteristic);
            }
            if (sys.discipline) {
                ie.discipline = sys.discipline;
                facetSets.discipline.add(sys.discipline);
            }

            facetSets.types.add(ie.type);
            facetSets.source.add(isHomebrew ? "Homebrew" : "Official");
            entries.push(ie);
        }
    }

    const result: CompendiumIndex = {
        entries,
        facets: {
            types: [...facetSets.types].sort(),
            availability: [...facetSets.availability],
            weaponClass: [...facetSets.weaponClass].sort(),
            damageType: [...facetSets.damageType].sort(),
            characteristic: [...facetSets.characteristic].sort(),
            discipline: [...facetSets.discipline].sort(),
            source: [...facetSets.source].sort(),
        },
    };

    _cachedIndex = result;
    return result;
}
