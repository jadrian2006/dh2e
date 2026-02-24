import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics, ToughnessAdjustment } from "../synthetics.ts";

/** Source data for an AdjustToughness rule element */
interface AdjustToughnessSource extends RuleElementSource {
    key: "AdjustToughness";
    /** The adjustment value, or "rating" to resolve from the parent item's system.rating */
    value: number | "rating";
    /** "add" = add to TB, "multiply" = multiply TB */
    mode?: "add" | "multiply";
}

/**
 * Modifies the effective Toughness Bonus for damage soak calculations.
 *
 * Used for Unnatural Toughness and similar effects that increase
 * the TB used when reducing incoming damage.
 *
 * Examples:
 * - Unnatural Toughness (2): `{ "key": "AdjustToughness", "value": 2, "mode": "add" }`
 *   Adds 2 to the effective TB when soaking damage.
 *
 * - Unnatural Toughness (×2): `{ "key": "AdjustToughness", "value": 2, "mode": "multiply" }`
 *   Doubles the TB for damage soak.
 */
class AdjustToughnessRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as AdjustToughnessSource;

        // Resolve "rating" to the parent item's system.rating
        const value = src.value === "rating"
            ? (this.item.system as any)?.rating ?? 0
            : src.value;

        if (typeof value !== "number") return;

        const adjustment: ToughnessAdjustment = {
            value,
            mode: src.mode ?? "add",
            source: src.label ?? this.item.name,
        };

        synthetics.toughnessAdjustments.push(adjustment);
    }
}

export { AdjustToughnessRE };
export type { AdjustToughnessSource };
