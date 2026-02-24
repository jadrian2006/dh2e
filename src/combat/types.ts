import type { HitLocationKey } from "@actor/types.ts";

/** Fire mode for ranged weapons */
type FireMode = "single" | "semi" | "full" | "suppressive";

/** Result of a single hit within an attack */
interface HitResult {
    location: HitLocationKey;
    locationLabel: string;
    /** The reversed d100 value used to determine location */
    locationRoll: number;
}

/** Result of the attack roll phase */
interface AttackResult {
    /** Whether the attack succeeded */
    success: boolean;
    /** Degrees of success (if hit) or failure */
    degrees: number;
    /** The d100 roll */
    roll: number;
    /** The target number after modifiers */
    target: number;
    /** Number of hits */
    hitCount: number;
    /** Individual hit details */
    hits: HitResult[];
    /** Fire mode used */
    fireMode: FireMode;
    /** Weapon name */
    weaponName: string;
}

/** Result of damage calculation for a single hit */
interface DamageResult {
    /** Location hit */
    location: HitLocationKey;
    locationLabel: string;
    /** Raw damage rolled */
    rawDamage: number;
    /** Armour points at location */
    armourPoints: number;
    /** Weapon penetration */
    penetration: number;
    /** Effective AP after penetration: max(0, AP - pen) */
    effectiveAP: number;
    /** Toughness bonus of target */
    toughnessBonus: number;
    /** Wounds dealt: max(0, raw - effectiveAP - TB) */
    woundsDealt: number;
    /** Damage formula used */
    formula: string;
}

export type { FireMode, HitResult, AttackResult, DamageResult };
