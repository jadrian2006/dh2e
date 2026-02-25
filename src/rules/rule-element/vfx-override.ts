import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics } from "../synthetics.ts";

/** Source data for a VFXOverride rule element */
interface VFXOverrideSource extends RuleElementSource {
    key: "VFXOverride";
    /** JB2A Sequencer database path (dot notation) */
    effectPath: string;
    /** How the effect is played (default: "projectile") */
    effectType?: "projectile" | "melee" | "cone" | "impact" | "aura";
    /** Scale multiplier (default 1.0) */
    scale?: number;
}

/**
 * A Rule Element that overrides the VFX effect path for an item.
 *
 * When attached to a weapon or psychic power, this RE injects a custom
 * JB2A effect path into the actor's synthetics, which the VFXResolver
 * checks before falling back to effect-map.ts defaults.
 *
 * Example on a laspistol:
 * ```yaml
 * - key: VFXOverride
 *   label: "Blue Lasbeam"
 *   effectPath: "jb2a.lasershot.blue"
 *   effectType: projectile
 * ```
 */
class VFXOverrideRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as VFXOverrideSource;
        if (!src.effectPath) return;

        synthetics.vfxOverrides[this.item.id] = {
            effectPath: src.effectPath,
            effectType: src.effectType ?? "projectile",
            scale: src.scale,
            sourceItemId: this.item.id,
            source: src.label ?? this.item.name,
        };
    }
}

export { VFXOverrideRE };
export type { VFXOverrideSource };
