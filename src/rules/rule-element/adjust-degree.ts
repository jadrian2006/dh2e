import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics, DosAdjustment } from "../synthetics.ts";

/** Source data for an AdjustDegree rule element */
interface AdjustDegreeSource extends RuleElementSource {
    key: "AdjustDegree";
    /** Positive = bonus DoS, negative = bonus DoF */
    amount: number;
    /** Predicate strings that must all be present in roll options */
    predicate?: string[];
}

/**
 * Adjusts Degrees of Success or Failure after a check is resolved.
 *
 * Applied post-roll before chat card creation.
 * Common uses: Accurate (+10 bonus to hit at certain DoS thresholds
 * in the book is actually implemented as a flat modifier, but this RE
 * handles cases where the adjustment is to *degrees* not the target number).
 *
 * ```json
 * { "key": "AdjustDegree", "amount": 1, "predicate": ["self:aim:full"], "label": "Accurate" }
 * ```
 */
class AdjustDegreeRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as AdjustDegreeSource;
        if (typeof src.amount !== "number") return;

        const adjustment: DosAdjustment = {
            amount: src.amount,
            predicate: src.predicate ?? [],
            source: src.label ?? this.item.name,
        };

        synthetics.dosAdjustments.push(adjustment);
    }
}

export { AdjustDegreeRE };
export type { AdjustDegreeSource };
