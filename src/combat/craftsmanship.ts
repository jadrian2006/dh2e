import type { RuleElementSource } from "@rules/rule-element/base.ts";

/**
 * Craftsmanship modifier synthesis.
 *
 * Synthesized at attack/prep time (same pattern as weapon-qualities.ts).
 * NOT stored as item REs — derived from the craftsmanship field.
 *
 * Per Core Rulebook p.163:
 * - Poor: -10 to hit (WS/BS)
 * - Common: baseline (no modifier)
 * - Good: +5 to hit (WS/BS)
 * - Best: +10 to hit (WS/BS)
 */

type Craftsmanship = "poor" | "common" | "good" | "best";

/**
 * Generate RE sources for a weapon's craftsmanship grade.
 * Injected into attack synthetics alongside weapon quality REs.
 */
function getCraftsmanshipRuleElements(craftsmanship: string): RuleElementSource[] {
    switch (craftsmanship) {
        case "poor":
            return [
                { key: "RollOption", option: "weapon:craftsmanship:poor", label: "Poor Craftsmanship" },
                { key: "FlatModifier", domain: "attack:melee", value: -10, label: "Poor Craftsmanship", source: "equipment" },
                { key: "FlatModifier", domain: "attack:ranged", value: -10, label: "Poor Craftsmanship", source: "equipment" },
            ];
        case "good":
            return [
                { key: "RollOption", option: "weapon:craftsmanship:good", label: "Good Craftsmanship" },
                { key: "FlatModifier", domain: "attack:melee", value: 5, label: "Good Craftsmanship", source: "equipment" },
                { key: "FlatModifier", domain: "attack:ranged", value: 5, label: "Good Craftsmanship", source: "equipment" },
            ];
        case "best":
            return [
                { key: "RollOption", option: "weapon:craftsmanship:best", label: "Best Craftsmanship" },
                { key: "FlatModifier", domain: "attack:melee", value: 10, label: "Best Craftsmanship", source: "equipment" },
                { key: "FlatModifier", domain: "attack:ranged", value: 10, label: "Best Craftsmanship", source: "equipment" },
            ];
        default: // "common"
            return [];
    }
}

/**
 * Get armour AP bonus from craftsmanship grade.
 *
 * Per Core Rulebook p.163:
 * - Poor: -1 AP per location
 * - Common: baseline
 * - Good: no change
 * - Best: +1 AP per location
 */
function getArmourCraftsmanshipBonus(craftsmanship: string): number {
    switch (craftsmanship) {
        case "poor": return -1;
        case "best": return 1;
        default: return 0;
    }
}

export { getCraftsmanshipRuleElements, getArmourCraftsmanshipBonus };
export type { Craftsmanship };
