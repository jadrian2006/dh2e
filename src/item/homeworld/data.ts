export interface HomeworldSystemSource {
    description: string;
    characteristicBonuses: {
        positive: string[];  // CharacteristicAbbrev | "inf"
        negative: string[];
    };
    fate: { threshold: number; blessing: number };
    woundsFormula: string;    // e.g., "9+1d5"
    aptitude: string;
    homeSkill: string;
    bonus: string;
    bonusDescription: string;
    recommendedBackgrounds: string[];
}
