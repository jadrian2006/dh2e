import type { HitLocationKey } from "@actor/types.ts";

/** Fire mode for ranged weapons */
type FireMode = "single" | "semi" | "full" | "suppressive";

/** Melee attack mode: standard (single hit), swift, or lightning */
type MeleeMode = "standard" | "swift" | "lightning";

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
    /** Melee attack mode (standard/swift/lightning) */
    meleeMode?: MeleeMode;
    /** Weapon name */
    weaponName: string;
    /** Roll options active during the attack (for damage modifier predicates) */
    attackRollOptions?: string[];
    /** Extra penetration bonus from weapon modifications (passed to rollDamage) */
    penetrationBonus?: number;
    /** Whether this is a dual-wield attack */
    isDualWield?: boolean;
    /** Whether this is the off-hand weapon in a dual-wield */
    isOffHand?: boolean;
}

/** A labelled modifier contribution shown in damage breakdown */
interface DamageModifierEntry {
    label: string;
    value: number;
    source: string;
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
    /** Modifier breakdown for GM damage card (optional) */
    modifiers?: DamageModifierEntry[];
}

export type { FireMode, MeleeMode, HitResult, AttackResult, DamageResult, DamageModifierEntry };
