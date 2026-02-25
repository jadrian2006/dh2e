import type { CharacteristicAbbrev } from "@actor/types.ts";

/** A specific use/sub-action of a skill (e.g. Medicae → First Aid) */
export interface SkillUse {
    slug: string;
    label: string;
    description: string;
    characteristicOverride?: CharacteristicAbbrev;
    defaultModifier?: number;
    defaultModifierLabel?: string;
    passive?: boolean;
    actionTime?: string;
    tags?: string[];
}

export interface SkillSystemSource {
    description: string;
    linkedCharacteristic: CharacteristicAbbrev;
    /** Advancement tier: 0 = untrained, 1 = known, 2 = trained (+10), 3 = experienced (+20), 4 = veteran (+30) */
    advancement: 0 | 1 | 2 | 3 | 4;
    isSpecialist: boolean;
    specialization: string;
    /** Skill aptitude for XP cost calculations (e.g. "General", "Fieldcraft", "Social") */
    aptitude: string;
    /** Skill uses / sub-actions (e.g. Stealth → Sneak, Hide, Shadow) */
    uses: SkillUse[];
}

/** Advancement tier bonus mapping */
export const ADVANCEMENT_BONUS = [0, 0, 10, 20, 30] as const;
