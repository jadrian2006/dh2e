export { AttackResolver } from "./attack.ts";
export { determineHitLocation } from "./hit-location.ts";
export { calculateHits } from "./fire-modes.ts";
export { calculateDamage, getLocationAP } from "./damage.ts";
export { getQualityRuleElements, parseQuality, isExoticQuality } from "./weapon-qualities.ts";
export { getBlastTargets, lookupHaywireEffect } from "./exotic-qualities.ts";
export {
    loadCriticalTable,
    lookupCritical,
    applyCriticalInjury,
    applyConditionBySlug,
} from "./critical.ts";
export { CombatDH2e } from "./combat-dh2e.ts";
export { CombatantDH2e } from "./combatant-dh2e.ts";
export { CombatTrackerDH2e } from "./tracker.ts";
export type { CriticalEntry, CriticalPenalty } from "./critical.ts";
export type { FireMode, AttackResult, DamageResult, HitResult } from "./types.ts";
