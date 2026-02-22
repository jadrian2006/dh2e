import type { CharacteristicAbbrev, HitLocationKey } from "@actor/types.ts";

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
    armour: ArmourByLocation;
    details: {
        homeworld: string;
        background: string;
        role: string;
        divination: string;
        notes: string;
    };
}

/** Acolyte system data (includes computed/derived fields) */
export interface AcolyteSystemData extends Omit<AcolyteSystemSource, "characteristics"> {
    characteristics: Record<CharacteristicAbbrev, CharacteristicData>;
    xp: {
        total: number;
        spent: number;
        available: number;
    };
}
