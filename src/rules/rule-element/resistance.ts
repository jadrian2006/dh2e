import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics, ResistanceEntry } from "../synthetics.ts";

/** Source data for a Resistance rule element */
interface ResistanceSource extends RuleElementSource {
    key: "Resistance";
    /** Damage type to resist (e.g., "energy", "impact", "all") */
    damageType: string;
    /** Resistance value (flat subtraction amount, or ignored for "half" mode) */
    value?: number;
    /** "flat" = subtract value from damage, "half" = halve damage of this type */
    mode?: "flat" | "half";
}

/**
 * Provides damage reduction against a specific damage type.
 *
 * Examples:
 * - `{ "key": "Resistance", "damageType": "energy", "value": 2, "mode": "flat" }`
 *   Subtract 2 from all energy damage received.
 *
 * - `{ "key": "Resistance", "damageType": "impact", "mode": "half" }`
 *   Halve all impact damage received.
 */
class ResistanceRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as ResistanceSource;
        if (!src.damageType) return;

        const entry: ResistanceEntry = {
            damageType: src.damageType,
            value: src.value ?? 0,
            mode: src.mode ?? "flat",
            source: src.label ?? this.item.name,
        };

        synthetics.resistances.push(entry);
    }
}

export { ResistanceRE };
export type { ResistanceSource };
