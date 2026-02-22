import type { CharacteristicAbbrev } from "@actor/types.ts";

/** A selectable homeworld option */
interface HomeworldOption {
    id: string;
    name: string;
    description: string;
    /** Characteristic bonuses: e.g., { ws: 5, t: 5 } */
    characteristicBonuses: Partial<Record<CharacteristicAbbrev, number>>;
    /** Characteristic penalties: e.g., { fel: -5 } */
    characteristicPenalties: Partial<Record<CharacteristicAbbrev, number>>;
    /** Fate threshold */
    fateThreshold: number;
    /** Starting wounds modifier */
    woundsModifier: number;
    /** Aptitude granted */
    aptitude: string;
}

/** A selectable background option */
interface BackgroundOption {
    id: string;
    name: string;
    description: string;
    /** Skill names granted */
    skills: string[];
    /** Talent names granted */
    talents: string[];
    /** Starting equipment names */
    equipment: string[];
    /** Aptitude granted */
    aptitude: string;
}

/** A selectable role option */
interface RoleOption {
    id: string;
    name: string;
    description: string;
    /** Aptitudes granted */
    aptitudes: string[];
    /** Talent name granted */
    talent: string;
    /** Special ability description */
    special: string;
}

/** A divination result */
interface DivinationResult {
    id: string;
    roll: number;
    text: string;
    effect: string;
}

/** State accumulated during character creation */
interface CreationState {
    step: number;
    homeworld: HomeworldOption | null;
    background: BackgroundOption | null;
    role: RoleOption | null;
    divination: DivinationResult | null;
    /** Manually entered characteristic values for manual mode */
    characteristics: Record<CharacteristicAbbrev, number>;
    /** Whether using guided or manual mode */
    mode: "guided" | "manual";
}

export type {
    HomeworldOption,
    BackgroundOption,
    RoleOption,
    DivinationResult,
    CreationState,
};
