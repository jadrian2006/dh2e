import type { XPCostData } from "./types.ts";

/** Hardcoded fallback if dh2e-data module is not installed */
const FALLBACK_COSTS: XPCostData = {
    characteristicAptitudes: {
        ws:  ["Weapon Skill", "Offence"],
        bs:  ["Ballistic Skill", "Finesse"],
        s:   ["Strength", "Offence"],
        t:   ["Toughness", "Defence"],
        ag:  ["Agility", "Finesse"],
        int: ["Intelligence", "Knowledge"],
        per: ["Perception", "Fieldcraft"],
        wp:  ["Willpower", "Psyker"],
        fel: ["Fellowship", "Social"],
    },
    characteristicCosts: [
        [100, 250, 500],
        [250, 500, 750],
        [500, 750, 1000],
        [750, 1000, 1500],
    ],
    skillCosts: [
        [100, 200, 300],
        [200, 400, 600],
        [300, 600, 900],
        [400, 800, 1200],
    ],
    talentCosts: [
        [200, 300, 600],
        [300, 450, 900],
        [400, 600, 1200],
    ],
};

let _cached: XPCostData | null = null;

/** Load XP cost data from the data module, with singleton cache and hardcoded fallback */
export async function loadXPCostData(): Promise<XPCostData> {
    if (_cached) return _cached;

    try {
        const resp = await fetch("modules/dh2e-data/data/advancement/xp-costs.json");
        if (resp.ok) {
            _cached = (await resp.json()) as XPCostData;
            return _cached;
        }
    } catch {
        // Fall through to fallback
    }

    console.warn("DH2E | xp-costs.json not found in data module, using hardcoded fallback");
    _cached = FALLBACK_COSTS;
    return _cached;
}

/** Count how many of the required aptitude pair the character possesses (0, 1, or 2) */
export function countAptitudeMatches(
    charAptitudes: string[],
    requiredPair: [string, string],
): 0 | 1 | 2 {
    let count = 0;
    if (charAptitudes.includes(requiredPair[0])) count++;
    if (charAptitudes.includes(requiredPair[1])) count++;
    return count as 0 | 1 | 2;
}

/** Get XP cost for a characteristic advance */
export function getCharacteristicCost(
    costs: XPCostData,
    advanceIndex: number,
    matchCount: 0 | 1 | 2,
): number {
    const col = 2 - matchCount; // col 0 = 2 matches, col 2 = 0 matches
    return costs.characteristicCosts[advanceIndex]?.[col] ?? 9999;
}

/** Get XP cost for a skill rank */
export function getSkillCost(
    costs: XPCostData,
    rankIndex: number,
    matchCount: 0 | 1 | 2,
): number {
    const col = 2 - matchCount;
    return costs.skillCosts[rankIndex]?.[col] ?? 9999;
}

/** Get XP cost for a talent by tier (1-indexed tier → 0-indexed row) */
export function getTalentCost(
    costs: XPCostData,
    tier: number,
    matchCount: 0 | 1 | 2,
): number {
    const col = 2 - matchCount;
    return costs.talentCosts[tier - 1]?.[col] ?? 9999;
}

/** Get the aptitude pair for a characteristic */
export function getCharacteristicAptitudes(
    costs: XPCostData,
    charKey: string,
): [string, string] {
    return costs.characteristicAptitudes[charKey] ?? ["General", "General"];
}

/**
 * Get the aptitude pair for a skill advance.
 * The pair is: [skill's own aptitude, characteristic name aptitude].
 * The characteristic name aptitude is charApts[0] (e.g. "Weapon Skill" for ws).
 */
export function getSkillAptitudes(
    costs: XPCostData,
    skillAptitude: string,
    linkedCharKey: string,
): [string, string] {
    const charApts = costs.characteristicAptitudes[linkedCharKey];
    const charName = charApts?.[0] ?? "General";
    return [skillAptitude, charName];
}
