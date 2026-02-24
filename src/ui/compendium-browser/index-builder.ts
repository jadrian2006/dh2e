/**
 * Builds a searchable index from all compendium packs for the DH2E system.
 *
 * Indexes items from all packs, extracting filterable fields
 * (type, availability, weapon class, damage type, etc.)
 */

export interface IndexEntry {
    uuid: string;
    name: string;
    img: string;
    type: string;
    pack: string;
    /** Flattened system fields for filtering */
    availability?: string;
    weaponClass?: string;
    damageType?: string;
    weight?: number;
    tier?: number;
    characteristic?: string;
    discipline?: string;
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
    };
}

/** Build the compendium index from all DH2E packs */
export async function buildCompendiumIndex(): Promise<CompendiumIndex> {
    const g = game as any;
    const entries: IndexEntry[] = [];

    const facetSets = {
        types: new Set<string>(),
        availability: new Set<string>(),
        weaponClass: new Set<string>(),
        damageType: new Set<string>(),
        characteristic: new Set<string>(),
        discipline: new Set<string>(),
    };

    // Iterate all compendium packs belonging to this system
    for (const pack of g.packs) {
        if (pack.metadata.packageType === "system" && pack.metadata.packageName !== SYSTEM_ID) continue;

        const index = await pack.getIndex({ fields: [
            "system.availability", "system.class", "system.damageType",
            "system.weight", "system.tier", "system.characteristic",
            "system.discipline",
        ] });

        for (const entry of index) {
            const sys = (entry as any).system ?? {};
            const ie: IndexEntry = {
                uuid: `Compendium.${pack.collection}.${entry._id}`,
                name: entry.name ?? "Unknown",
                img: (entry as any).img ?? "icons/svg/item-bag.svg",
                type: entry.type ?? "unknown",
                pack: pack.metadata.label ?? pack.collection,
            };

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
            entries.push(ie);
        }
    }

    return {
        entries,
        facets: {
            types: [...facetSets.types].sort(),
            availability: [...facetSets.availability],
            weaponClass: [...facetSets.weaponClass].sort(),
            damageType: [...facetSets.damageType].sort(),
            characteristic: [...facetSets.characteristic].sort(),
            discipline: [...facetSets.discipline].sort(),
        },
    };
}
