import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics } from "../synthetics.ts";

/** Source data for a FateOption rule element */
interface FateOptionSource extends RuleElementSource {
    key: "FateOption";
    slug: string;
    label: string;
    description: string;
    effectType: "autoSucceed" | "bonusDamage" | "substituteDos" | "gainHatred";
    dosCharacteristic?: string;
}

/**
 * Injects a dynamic fate spend option into the actor's synthetics.
 *
 * Role abilities like "Sure Kill" (Assassin) or "Quest for Knowledge" (Sage)
 * appear as additional buttons in the fate dialog.
 *
 * ```json
 * {
 *     "key": "FateOption",
 *     "slug": "quest-for-knowledge",
 *     "label": "Quest for Knowledge",
 *     "description": "Auto-succeed Logic or any Lore test (DoS = Int Bonus)",
 *     "effectType": "autoSucceed",
 *     "dosCharacteristic": "int"
 * }
 * ```
 */
class FateOptionRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as FateOptionSource;
        if (src.slug && src.effectType) {
            synthetics.fateOptions.push({
                slug: src.slug,
                label: src.label ?? src.slug,
                description: src.description ?? "",
                effectType: src.effectType,
                dosCharacteristic: src.dosCharacteristic,
                source: this.item.name ?? "Unknown",
            });
        }
    }
}

export { FateOptionRE };
export type { FateOptionSource };
