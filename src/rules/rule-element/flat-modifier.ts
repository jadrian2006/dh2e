import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import { ModifierDH2e } from "../modifier.ts";
import { getModifiers, type DH2eSynthetics } from "../synthetics.ts";

/** Source data for a FlatModifier rule element */
interface FlatModifierSource extends RuleElementSource {
    key: "FlatModifier";
    domain: string;
    value: number;
    source?: string;
    exclusionGroup?: string;
}

/**
 * A Rule Element that adds a flat numeric modifier to a domain.
 *
 * Example on a talent:
 * ```json
 * {
 *   "key": "FlatModifier",
 *   "domain": "characteristic:bs",
 *   "value": 10,
 *   "label": "Marksman",
 *   "source": "talent",
 *   "predicate": ["self:aim:full"]
 * }
 * ```
 */
class FlatModifierRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as FlatModifierSource;
        const modifier = new ModifierDH2e({
            label: src.label ?? this.item.name,
            value: src.value,
            source: src.source ?? "rule-element",
            exclusionGroup: src.exclusionGroup,
            predicate: src.predicate,
        });

        getModifiers(synthetics, src.domain).push(modifier);
    }
}

export { FlatModifierRE };
export type { FlatModifierSource };
