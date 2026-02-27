import type { CharacteristicAbbrev } from "@actor/types.ts";

/** A selectable homeworld option (matches dh2e-data JSON) */
interface HomeworldOption {
    name: string;
    description: string;
    /** Characteristic bonuses: positive keys get +5, negative keys get -5 */
    characteristicBonuses: {
        positive: CharacteristicAbbrev[];
        negative: CharacteristicAbbrev[];
    };
    /** Fate points */
    fate: { threshold: number; blessing: number };
    /** Starting wounds (legacy flat value) */
    wounds: number;
    /** Wounds formula (e.g., "9+1d5") — used for rolling */
    woundsFormula?: string;
    /** Aptitude granted */
    aptitude: string;
    /** Home skill granted */
    homeSkill: string;
    /** Bonus ability name */
    bonus: string;
    /** Bonus ability description */
    bonusDescription: string;
    /** Source book identifier (e.g., "core-rulebook", "enemies-beyond") */
    source?: string;
    /** Carries the full compendium item data for embedding on actor */
    _itemData?: Record<string, unknown>;
}

/** A selectable background option (matches dh2e-data JSON) */
interface BackgroundOption {
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
    /** Bonus ability name */
    bonus: string;
    /** Bonus ability description */
    bonusDescription: string;
    /** Source book identifier (e.g., "core-rulebook", "enemies-beyond") */
    source?: string;
    /** Carries the full compendium item data for embedding on actor */
    _itemData?: Record<string, unknown>;
}

/** A selectable role option (matches dh2e-data JSON) */
interface RoleOption {
    name: string;
    description: string;
    /** Aptitudes granted */
    aptitudes: string[];
    /** Talent name granted */
    talent: string;
    /** Elite advances granted immediately (e.g., Mystic grants "psyker") */
    eliteAdvances?: string[];
    /** Bonus ability name */
    bonus: string;
    /** Bonus ability description */
    bonusDescription: string;
    /** Source book identifier (e.g., "core-rulebook", "enemies-beyond") */
    source?: string;
    /** Carries the full compendium item data for embedding on actor */
    _itemData?: Record<string, unknown>;
}

/** A divination result (matches dh2e-data JSON) */
interface DivinationResult {
    /** Roll range [min, max] */
    roll: [number, number];
    text: string;
    effect: string;
}

/** All loaded creation data from the data pack */
interface CreationData {
    homeworlds: HomeworldOption[];
    backgrounds: BackgroundOption[];
    roles: RoleOption[];
    divinations: DivinationResult[];
}

/** A purchase made during the wizard advancement step */
interface WizardPurchase {
    category: "characteristic" | "skill" | "talent";
    label: string;
    sublabel: string;
    key: string;
    cost: number;
    /** For characteristics: the new advance level */
    nextLevel?: number;
    /** For skills/talents from compendium */
    compendiumUuid?: string;
    /** For existing embedded skills */
    sourceItemId?: string;
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
    CreationData,
    CreationState,
    WizardPurchase,
};
