import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import { getDiceOverrides, type DH2eSynthetics, type DiceOverrideEntry } from "../synthetics.ts";

/** Source data for a DiceOverride rule element */
interface DiceOverrideSource extends RuleElementSource {
    key: "DiceOverride";
    /** Domain to apply the override to, e.g. "damage:melee" */
    domain: string;
    /** Override mode: rerollLowest (Tearing), minimumDie (Proven), maximizeDie (Force) */
    mode: DiceOverrideEntry["mode"];
    /** Numeric parameter (e.g., minimum value for Proven(3) = 3) */
    value?: number;
}

/**
 * Modifies damage dice behavior for a domain.
 *
 * Examples:
 * - Tearing: `{ "key": "DiceOverride", "domain": "damage:melee", "mode": "rerollLowest" }`
 *   Re-roll the lowest damage die and take the new result.
 *
 * - Proven(3): `{ "key": "DiceOverride", "domain": "damage:ranged", "mode": "minimumDie", "value": 3 }`
 *   Any die that rolls below 3 counts as 3.
 */
class DiceOverrideRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as DiceOverrideSource;
        if (!src.domain || !src.mode) return;

        getDiceOverrides(synthetics, src.domain).push({
            mode: src.mode,
            value: src.value,
            source: src.label ?? this.item.name,
        });
    }
}

export { DiceOverrideRE };
export type { DiceOverrideSource };
