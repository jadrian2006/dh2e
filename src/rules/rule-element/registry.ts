import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import { FlatModifierRE } from "./flat-modifier.ts";
import { RollOptionRE } from "./roll-option.ts";
import { DiceOverrideRE } from "./dice-override.ts";
import { AdjustDegreeRE } from "./adjust-degree.ts";
import { GrantItemRE } from "./grant-item.ts";
import { ResistanceRE } from "./resistance.ts";
import { AdjustToughnessRE } from "./adjust-toughness.ts";
import { ChoiceSetRE } from "./choice-set.ts";
import { VFXOverrideRE } from "./vfx-override.ts";

/** Map of RE key strings to their constructor classes */
const RE_REGISTRY: Record<string, typeof RuleElementDH2e> = {
    FlatModifier: FlatModifierRE,
    RollOption: RollOptionRE,
    DiceOverride: DiceOverrideRE,
    AdjustDegree: AdjustDegreeRE,
    GrantItem: GrantItemRE,
    Resistance: ResistanceRE,
    AdjustToughness: AdjustToughnessRE,
    ChoiceSet: ChoiceSetRE,
    VFXOverride: VFXOverrideRE,
};

/**
 * Instantiate a Rule Element from its source data.
 *
 * @param source The raw JSON source for the rule element
 * @param item The item this rule element belongs to
 * @returns The instantiated RE, or null if the key is unknown
 */
function instantiateRuleElement(source: RuleElementSource, item: Item): RuleElementDH2e | null {
    const Constructor = RE_REGISTRY[source.key];
    if (!Constructor) {
        console.warn(`DH2E | Unknown rule element key: "${source.key}"`);
        return null;
    }
    return new (Constructor as any)(source, item);
}

export { RE_REGISTRY, instantiateRuleElement };
