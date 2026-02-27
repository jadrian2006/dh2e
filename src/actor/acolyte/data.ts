import type { CharacteristicAbbrev, HitLocationKey } from "@actor/types.ts";
import type { NpcDH2e } from "@actor/npc/document.ts";

/** Companion entry stored on acolyte */
export interface CompanionEntry {
    actorId: string;
    behavior: "follow" | "stay";
}

/** A single characteristic's source data (stored in DB) */
export interface CharacteristicSource {
    base: number;
    advances: number;
}

/** A single characteristic's derived data (computed) */
export interface CharacteristicData extends CharacteristicSource {
    value: number; // base + (advances × 5)
    bonus: number; // Math.floor(value / 10)
}

/** Derived movement rates */
export interface MovementData {
    half: number;
    full: number;
    charge: number;
    run: number;
}

/** Per-location armour values */
export type ArmourByLocation = Record<HitLocationKey, number>;

/** Acolyte system source data (what's stored in the database) */
export interface AcolyteSystemSource {
    characteristics: Record<CharacteristicAbbrev, CharacteristicSource>;
    wounds: {
        value: number;
        max: number;
    };
    fate: {
        value: number;
        max: number;
    };
    corruption: number;
    insanity: number;
    influence: number;
    xp: {
        total: number;
        spent: number;
    };
    aptitudes: string[];
    eliteAdvances: string[];
    companions: CompanionEntry[];
    armour: ArmourByLocation;
    details: {
        homeworld: string;
        background: string;
        role: string;
        divination: string;
        notes: string;
        biography: string;
        appearance: string;
        age: string;
        sex: string;
        height: string;
        weight: string;
    };
}

/** Encumbrance derived data */
export interface EncumbranceData {
    /** Total weight of carried items (kg) */
    current: number;
    /** Maximum carry weight without penalty: SB + TB (kg) */
    carry: number;
    /** Maximum lift weight (carry × 2) */
    lift: number;
    /** Maximum push/drag weight (carry × 4) */
    push: number;
    /** true when current > carry */
    overloaded: boolean;
    /** true when current > lift (cannot move) */
    overencumbered: boolean;
}

/** Acolyte system data (includes computed/derived fields) */
export interface AcolyteSystemData extends Omit<AcolyteSystemSource, "characteristics"> {
    characteristics: Record<CharacteristicAbbrev, CharacteristicData>;
    xp: {
        total: number;
        spent: number;
        available: number;
    };
    movement: MovementData;
    encumbrance: EncumbranceData;
    resolvedCompanions: NpcDH2e[];
}
