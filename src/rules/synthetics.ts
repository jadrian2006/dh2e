import type { ModifierDH2e } from "./modifier.ts";

/**
 * Domain-based modifier registry.
 *
 * Synthetics are collected from Rule Elements during data preparation
 * and stored here for retrieval during rolls.
 *
 * Domains are namespaced strings like:
 * - "characteristic:ws" — modifiers to Weapon Skill tests
 * - "skill:athletics" — modifiers to Athletics tests
 * - "attack:melee" — modifiers to melee attack rolls
 * - "damage:ranged" — modifiers to ranged damage
 */

/** Adjustment to Degrees of Success/Failure after a check */
interface DosAdjustment {
    /** Positive = add DoS, negative = add DoF */
    amount: number;
    /** Predicate string that must be in rollOptions for this to apply */
    predicate: string[];
    source: string;
}

/** Override applied to damage dice (e.g., Tearing, Proven) */
interface DiceOverrideEntry {
    /** "rerollLowest" (Tearing), "minimumDie" (Proven), "maximizeDie" (Force) */
    mode: "rerollLowest" | "minimumDie" | "maximizeDie";
    /** Numeric parameter (e.g., minimum value for Proven) */
    value?: number;
    source: string;
}

/** Adjustment to effective Toughness Bonus for damage soak */
interface ToughnessAdjustment {
    value: number;
    mode: "add" | "multiply";
    source: string;
}

/** VFX override injected by VFXOverride rule elements */
interface VFXOverrideEntry {
    /** JB2A Sequencer database path (dot notation) */
    effectPath: string;
    /** How the effect is played */
    effectType: "projectile" | "melee" | "cone" | "impact" | "aura";
    /** Scale multiplier (default 1.0) */
    scale?: number;
    /** Source item ID (auto-set by the RE) */
    sourceItemId: string;
    /** Source label for tooltips */
    source: string;
}

/** Damage resistance entry */
interface ResistanceEntry {
    damageType: string;
    value: number;
    mode: "flat" | "half";
    source: string;
}

interface DH2eSynthetics {
    /** Modifiers keyed by domain string */
    modifiers: Record<string, ModifierDH2e[]>;
    /** Roll option strings injected by RollOption REs */
    rollOptions: Set<string>;
    /** DoS/DoF adjustments from AdjustDegree REs */
    dosAdjustments: DosAdjustment[];
    /** Dice overrides keyed by domain (e.g. "damage:melee") */
    diceOverrides: Record<string, DiceOverrideEntry[]>;
    /** Toughness Bonus adjustments for damage soak */
    toughnessAdjustments: ToughnessAdjustment[];
    /** Damage resistances by type */
    resistances: ResistanceEntry[];
    /** VFX overrides keyed by item ID */
    vfxOverrides: Record<string, VFXOverrideEntry>;
}

function createSynthetics(): DH2eSynthetics {
    return {
        modifiers: {},
        rollOptions: new Set(),
        dosAdjustments: [],
        diceOverrides: {},
        toughnessAdjustments: [],
        resistances: [],
        vfxOverrides: {},
    };
}

/** Get or create a modifier array for the given domain */
function getModifiers(synthetics: DH2eSynthetics, domain: string): ModifierDH2e[] {
    return (synthetics.modifiers[domain] ??= []);
}

/** Get or create a dice override array for the given domain */
function getDiceOverrides(synthetics: DH2eSynthetics, domain: string): DiceOverrideEntry[] {
    return (synthetics.diceOverrides[domain] ??= []);
}

export { createSynthetics, getModifiers, getDiceOverrides };
export type {
    DH2eSynthetics,
    DosAdjustment,
    DiceOverrideEntry,
    ToughnessAdjustment,
    ResistanceEntry,
    VFXOverrideEntry,
};
