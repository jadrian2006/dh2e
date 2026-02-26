import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics } from "../synthetics.ts";

/** Source data for an AttributeOverride rule element */
interface AttributeOverrideSource extends RuleElementSource {
    key: "AttributeOverride";
    /** Target domain, e.g. "initiative", "skill:dodge", "requisition" */
    domain: string;
    /** Replacement characteristic abbreviation, e.g. "int", "wp", "fel" */
    characteristic: string;
}

/**
 * A Rule Element that overrides which characteristic is used for a test domain.
 *
 * Examples:
 * - Constant Vigilance: use Int instead of Ag for initiative
 * - Contact Network: use Fel instead of Influence for requisition
 * - Deny the Witch: use WP instead of Ag for dodge vs psychic attacks
 *
 * ```json
 * {
 *   "key": "AttributeOverride",
 *   "domain": "initiative",
 *   "characteristic": "int",
 *   "label": "Constant Vigilance"
 * }
 * ```
 */
class AttributeOverrideRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as AttributeOverrideSource;
        if (!src.domain || !src.characteristic) return;

        synthetics.attributeOverrides.push({
            domain: src.domain,
            characteristic: src.characteristic,
            predicate: Array.isArray(src.predicate)
                ? src.predicate.filter((p): p is string => typeof p === "string")
                : [],
            source: src.label ?? this.item.name,
        });
    }
}

export { AttributeOverrideRE };
export type { AttributeOverrideSource };
