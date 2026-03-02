import { RuleElementDH2e } from "./base.ts";
import type { DH2eSynthetics } from "../synthetics.ts";

/**
 * No-op rule element for creation-time data.
 *
 * Keys: CreationBonus, CreationFate, CreationWounds, CreationCorruption,
 *       GrantAptitude, Grant
 *
 * These REs are structured data consumed by the character creation wizard,
 * not runtime effects. They exist so origin items (homeworld, background, role)
 * can express all mechanical grants via the rules[] array, making them fully
 * data-driven and extensible by homebrew.
 */
class CreationDataRE extends RuleElementDH2e {
    override onPrepareData(_synthetics: DH2eSynthetics): void {
        // No-op — creation data is read directly from source by the wizard
    }
}

export { CreationDataRE };
