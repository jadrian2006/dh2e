import type { CharacteristicAbbrev } from "@actor/types.ts";

export interface SkillSystemSource {
    description: string;
    linkedCharacteristic: CharacteristicAbbrev;
    /** Advancement tier: 0 = untrained, 1 = known, 2 = trained (+10), 3 = experienced (+20), 4 = veteran (+30) */
    advancement: 0 | 1 | 2 | 3 | 4;
    isSpecialist: boolean;
    specialization: string;
}

/** Advancement tier bonus mapping */
export const ADVANCEMENT_BONUS = [0, 0, 10, 20, 30] as const;
