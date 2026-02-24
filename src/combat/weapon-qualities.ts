import type { RuleElementSource } from "@rules/rule-element/base.ts";

/**
 * Maps weapon quality slug strings to Rule Element source arrays.
 *
 * Each quality generates one or more REs that modify attacks/damage
 * when the weapon is used. These are synthesized at attack time,
 * not stored on the weapon item itself.
 */

/** Parse a quality string like "Proven(3)" into { slug, rating } */
function parseQuality(quality: string): { slug: string; rating: number } {
    const match = quality.match(/^(.+?)\((\d+)\)$/);
    if (match) {
        return { slug: match[1].toLowerCase().trim(), rating: parseInt(match[2], 10) };
    }
    return { slug: quality.toLowerCase().trim(), rating: 0 };
}

/**
 * Generate RE sources for a set of weapon qualities.
 *
 * @param qualities Array of quality strings, e.g. ["Accurate", "Tearing", "Proven(3)"]
 * @returns Array of RuleElementSource objects
 */
function getQualityRuleElements(qualities: string[]): RuleElementSource[] {
    const results: RuleElementSource[] = [];

    for (const raw of qualities) {
        const { slug, rating } = parseQuality(raw);
        const res = QUALITY_RE_MAP[slug];
        if (res) {
            results.push(...res(rating));
        } else {
            // Unknown quality — inject as a roll option so predicates can reference it
            results.push({
                key: "RollOption",
                option: `weapon:quality:${slug}`,
                label: raw,
            });
        }
    }

    return results;
}

type QualityGenerator = (rating: number) => RuleElementSource[];

/** Map of quality slugs to RE generator functions */
const QUALITY_RE_MAP: Record<string, QualityGenerator> = {
    accurate: () => [
        { key: "RollOption", option: "weapon:accurate", label: "Accurate" },
        { key: "FlatModifier", domain: "attack:ranged", value: 10, label: "Accurate (Aim)", source: "quality", predicate: ["self:aim"] },
        { key: "AdjustDegree", amount: 1, predicate: ["self:aim:full"], label: "Accurate (Full Aim DoS)" },
    ],
    balanced: () => [
        { key: "RollOption", option: "weapon:balanced", label: "Balanced" },
        { key: "FlatModifier", domain: "skill:parry", value: 10, label: "Balanced", source: "quality" },
    ],
    tearing: () => [
        { key: "RollOption", option: "weapon:tearing", label: "Tearing" },
        { key: "DiceOverride", domain: "damage:*", mode: "rerollLowest", label: "Tearing" },
    ],
    proven: (n: number) => [
        { key: "RollOption", option: "weapon:proven", label: `Proven(${n})` },
        { key: "DiceOverride", domain: "damage:*", mode: "minimumDie", value: n || 3, label: `Proven(${n})` },
    ],
    reliable: () => [
        { key: "RollOption", option: "weapon:reliable", label: "Reliable" },
    ],
    unreliable: () => [
        { key: "RollOption", option: "weapon:unreliable", label: "Unreliable" },
    ],
    "razor sharp": () => [
        { key: "RollOption", option: "weapon:razor-sharp", label: "Razor Sharp" },
        // Razor Sharp: on 3+ DoS, double pen. Handled in damage calculation.
    ],
    crippling: (n: number) => [
        { key: "RollOption", option: "weapon:crippling", label: `Crippling(${n})` },
        // Crippling: if damage dealt, target suffers penalties. Handled in damage application.
    ],
    corrosive: () => [
        { key: "RollOption", option: "weapon:corrosive", label: "Corrosive" },
        // Corrosive: reduces AP at location permanently. Handled in damage application.
    ],
    toxic: (n: number) => [
        { key: "RollOption", option: "weapon:toxic", label: `Toxic(${n})` },
        // Toxic: on hit, target must pass T test or take extra damage. Handled in damage.
    ],
    felling: (n: number) => [
        { key: "RollOption", option: "weapon:felling", label: `Felling(${n})` },
        // Felling: reduce target's Unnatural Toughness by N. Handled in damage calc.
        { key: "AdjustToughness", value: -(n || 1), mode: "add", label: `Felling(${n})` },
    ],
    flame: () => [
        { key: "RollOption", option: "weapon:flame", label: "Flame" },
        // Flame: AoE cone, no BS test, Ag test to dodge. Handled by exotic qualities.
    ],
    blast: (n: number) => [
        { key: "RollOption", option: `weapon:blast:${n}`, label: `Blast(${n})` },
        // Blast: AoE radius. Handled by exotic qualities.
    ],
    haywire: () => [
        { key: "RollOption", option: "weapon:haywire", label: "Haywire" },
        // Haywire: special effects vs machines. Handled by exotic qualities.
    ],
    spray: () => [
        { key: "RollOption", option: "weapon:spray", label: "Spray" },
        // Spray: cone attack, no BS test. Handled by exotic qualities.
    ],
    recharge: () => [
        { key: "RollOption", option: "weapon:recharge", label: "Recharge" },
    ],
    overheats: () => [
        { key: "RollOption", option: "weapon:overheats", label: "Overheats" },
    ],
    primitive: (n: number) => [
        { key: "RollOption", option: "weapon:primitive", label: `Primitive(${n})` },
        // Primitive: damage dice cap at N. Handled in damage roll.
        { key: "DiceOverride", domain: "damage:*", mode: "maximizeDie", value: n || 7, label: `Primitive(${n})` },
    ],
    sanctified: () => [
        { key: "RollOption", option: "weapon:sanctified", label: "Sanctified" },
    ],
    force: () => [
        { key: "RollOption", option: "weapon:force", label: "Force" },
        // Force: psyker can channel PR as bonus damage. Handled in psychic system.
    ],
};

/** Check if a quality is an "exotic" quality that requires special attack flow */
function isExoticQuality(slug: string): boolean {
    return EXOTIC_QUALITY_SLUGS.has(slug);
}

const EXOTIC_QUALITY_SLUGS = new Set(["blast", "flame", "haywire", "spray"]);

export { getQualityRuleElements, parseQuality, isExoticQuality };
