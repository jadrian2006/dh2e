import type { RuleElementSource } from "@rules/rule-element/base.ts";

/**
 * Attacker bonuses derived from target conditions.
 *
 * Synthesized at attack time (same pattern as weapon-qualities.ts).
 * These are NOT stored on items — they are injected into the attack
 * synthetics when a target has specific conditions.
 */

interface TargetConditionBonus {
    /** RE sources to inject into attacker synthetics */
    modifiers: RuleElementSource[];
    /** Additional roll options to inject */
    rollOptions: string[];
}

/**
 * Get attacker bonuses based on target actor's conditions.
 *
 * @param targetActor The target of the attack
 * @param isMelee Whether this is a melee attack
 * @returns Bonus modifiers and roll options for the attacker
 */
function getTargetConditionBonuses(targetActor: Actor, isMelee: boolean): TargetConditionBonus {
    const modifiers: RuleElementSource[] = [];
    const rollOptions: string[] = [];

    // Collect target's condition slugs
    const conditions = new Set<string>();
    for (const item of targetActor.items) {
        if (item.type !== "condition") continue;
        const slug = (item.system as any)?.slug;
        if (slug) conditions.add(slug);
    }

    // Also check target synthetics rollOptions for conditions granted by other conditions
    // (e.g., unconscious grants self:helpless)
    const targetSynthetics = (targetActor as any).synthetics;
    if (targetSynthetics?.rollOptions) {
        for (const opt of targetSynthetics.rollOptions) {
            if (opt.startsWith("self:")) {
                rollOptions.push(`target:${opt.slice(5)}`);
            }
        }
    }

    // Add target:<slug> for each condition
    for (const slug of conditions) {
        rollOptions.push(`target:${slug}`);
    }

    // Stunned: +20 WS, +20 BS
    if (conditions.has("stunned")) {
        modifiers.push(
            { key: "FlatModifier", domain: "attack:melee", value: 20, label: "Target Stunned", source: "situational" },
            { key: "FlatModifier", domain: "attack:ranged", value: 20, label: "Target Stunned", source: "situational" },
        );
    }

    // Prone: +10 melee WS, -10 ranged BS (not point-blank)
    if (conditions.has("prone")) {
        if (isMelee) {
            modifiers.push(
                { key: "FlatModifier", domain: "attack:melee", value: 10, label: "Target Prone", source: "situational" },
            );
        } else {
            modifiers.push(
                { key: "FlatModifier", domain: "attack:ranged", value: -10, label: "Target Prone", source: "situational", predicate: ["not:range:point-blank"] },
            );
        }
    }

    // Surprised: +30 WS, +30 BS (+3 DoS equivalent)
    if (conditions.has("surprised")) {
        modifiers.push(
            { key: "FlatModifier", domain: "attack:melee", value: 30, label: "Target Surprised (+3 DoS)", source: "situational" },
            { key: "FlatModifier", domain: "attack:ranged", value: 30, label: "Target Surprised (+3 DoS)", source: "situational" },
        );
    }

    // Grappled: +20 WS, +20 BS (from third parties attacking into grapple)
    if (conditions.has("grappled")) {
        modifiers.push(
            { key: "FlatModifier", domain: "attack:melee", value: 20, label: "Target Grappled", source: "situational" },
            { key: "FlatModifier", domain: "attack:ranged", value: 20, label: "Target Grappled", source: "situational" },
        );
    }

    return { modifiers, rollOptions };
}

export { getTargetConditionBonuses };
export type { TargetConditionBonus };
