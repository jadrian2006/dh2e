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
export type { CriticalEntry, CriticalPenalty } from "./critical.ts";
export type { FireMode, AttackResult, DamageResult, HitResult } from "./types.ts";
