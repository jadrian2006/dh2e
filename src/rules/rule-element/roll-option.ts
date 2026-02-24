import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics } from "../synthetics.ts";

/** Source data for a RollOption rule element */
interface RollOptionSource extends RuleElementSource {
    key: "RollOption";
    /** The roll option string to inject, e.g. "weapon:reliable" */
    option: string;
}

/**
 * Injects a roll option string into the actor's synthetics.
 *
 * Roll options are used by predicates to conditionally activate modifiers.
 * Example: A Reliable weapon adds `weapon:reliable` so that jam-prevention
 * predicates can check for it.
 *
 * ```json
 * { "key": "RollOption", "option": "weapon:reliable" }
 * ```
 */
class RollOptionRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as RollOptionSource;
        if (src.option) {
            synthetics.rollOptions.add(src.option);
        }
    }
}

export { RollOptionRE };
export type { RollOptionSource };
