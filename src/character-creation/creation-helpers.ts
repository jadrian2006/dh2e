import type { RuleElementSource } from "../rules/rule-element/base.ts";

/**
 * Grant RE source — structured item/talent/skill/equipment grant for creation.
 */
interface GrantSource {
    key: "Grant";
    type: "talent" | "skill" | "trait" | "weapon" | "armour" | "gear" | "cybernetic" | "companion" | "eliteAdvance";
    name?: string;
    options?: string[];
    optionSets?: Array<{ label: string; items: Array<{ type: string; name: string }> }>;
    advancement?: number;
    rating?: number;
    quantity?: number;
    equipped?: boolean;
    installed?: boolean;
    pick?: boolean;
}

/** Extract CreationBonus REs → array of { characteristic, value } */
function getCharBonuses(rules: RuleElementSource[]): Array<{ characteristic: string; value: number }> {
    return rules
        .filter((r) => r.key === "CreationBonus")
        .map((r) => ({
            characteristic: r.characteristic as string,
            value: (r.value as number) ?? 0,
        }));
}

/** Extract CreationFate RE → { threshold, blessing } or null */
function getFateConfig(rules: RuleElementSource[]): { threshold: number; blessing: number } | null {
    const re = rules.find((r) => r.key === "CreationFate");
    if (!re) return null;
    return {
        threshold: (re.threshold as number) ?? 2,
        blessing: (re.blessing as number) ?? 1,
    };
}

/** Extract CreationWounds RE → formula string or null */
function getWoundsFormula(rules: RuleElementSource[]): string | null {
    const re = rules.find((r) => r.key === "CreationWounds");
    return re ? (re.formula as string) ?? null : null;
}

/** Extract CreationCorruption RE → formula string or null */
function getCorruptionFormula(rules: RuleElementSource[]): string | null {
    const re = rules.find((r) => r.key === "CreationCorruption");
    return re ? (re.formula as string) ?? null : null;
}

/**
 * Extract GrantAptitude REs → array of aptitudes.
 * Single aptitude = string, choice = string[] (e.g., ["Knowledge", "Social"]).
 */
function getAptitudes(rules: RuleElementSource[]): Array<string | string[]> {
    return rules
        .filter((r) => r.key === "GrantAptitude")
        .map((r) => {
            if (r.options && Array.isArray(r.options)) return r.options as string[];
            return (r.aptitude as string) ?? "";
        });
}

/** Extract all Grant REs */
function getGrants(rules: RuleElementSource[]): GrantSource[] {
    return rules.filter((r) => r.key === "Grant") as unknown as GrantSource[];
}

/** Extract Grant REs of a specific type */
function getGrantsOfType(rules: RuleElementSource[], type: string): GrantSource[] {
    return getGrants(rules).filter((g) => g.type === type);
}

/** Extract elite advance names from Grant REs */
function getEliteAdvances(rules: RuleElementSource[]): string[] {
    return getGrantsOfType(rules, "eliteAdvance")
        .map((g) => g.name ?? "")
        .filter(Boolean);
}

/** True if a Grant RE requires player choice (has options or optionSets) */
function hasChoices(grant: GrantSource): boolean {
    return (grant.options != null && grant.options.length > 1) ||
           (grant.optionSets != null && grant.optionSets.length > 1);
}

export { getCharBonuses, getFateConfig, getWoundsFormula, getCorruptionFormula, getAptitudes, getGrants, getGrantsOfType, getEliteAdvances, hasChoices };
export type { GrantSource };
