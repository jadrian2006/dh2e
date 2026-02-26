import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics, DosAdjustment } from "../synthetics.ts";

/** Source data for an AdjustDegree rule element */
interface AdjustDegreeSource extends RuleElementSource {
    key: "AdjustDegree";
    /** Positive = bonus DoS, negative = bonus DoF. String "actor:path" resolves dynamically. */
    amount: number | string;
    /** Predicate strings that must all be present in roll options */
    predicate?: string[];
}

/**
 * Adjusts Degrees of Success or Failure after a check is resolved.
 *
 * Applied post-roll before chat card creation.
 *
 * Supports static numeric amounts or dynamic actor-path lookups:
 * ```json
 * { "key": "AdjustDegree", "amount": 1, "predicate": ["self:aim:full"], "label": "Accurate" }
 * { "key": "AdjustDegree", "amount": "actor:system.characteristics.wp.bonus", "predicate": [{"or": ["check:fear", "check:pinning"]}], "label": "Adamantium Faith" }
 * ```
 */
class AdjustDegreeRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as AdjustDegreeSource;

        let amount: number;
        if (typeof src.amount === "number") {
            amount = src.amount;
        } else if (typeof src.amount === "string" && src.amount.startsWith("actor:")) {
            const path = src.amount.slice(6); // strip "actor:" prefix
            const resolved = AdjustDegreeRE.#resolvePath(this.actor, path);
            if (typeof resolved !== "number") return;
            amount = resolved;
        } else {
            return;
        }

        const adjustment: DosAdjustment = {
            amount,
            predicate: src.predicate ?? [],
            source: src.label ?? this.item.name,
        };

        synthetics.dosAdjustments.push(adjustment);
    }

    /** Traverse a dot-separated path on an object */
    static #resolvePath(obj: any, path: string): unknown {
        let current = obj;
        for (const segment of path.split(".")) {
            if (current == null) return undefined;
            current = current[segment];
        }
        return current;
    }
}

export { AdjustDegreeRE };
export type { AdjustDegreeSource };
