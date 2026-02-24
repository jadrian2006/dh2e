/**
 * Foundry VTT V13 CONFIG Type Declarations
 */

declare const CONFIG: FoundryConfig;

interface FoundryConfig {
    Actor: {
        documentClass: typeof Actor;
        collection: typeof Collection;
        defaultType: string;
        typeIcons: Record<string, string>;
        typeLabels: Record<string, string>;
        dataModels: Record<string, unknown>;
    };
    Item: {
        documentClass: typeof Item;
        defaultType: string;
        typeIcons: Record<string, string>;
        typeLabels: Record<string, string>;
        dataModels: Record<string, unknown>;
    };
    ActiveEffect: {
        documentClass: typeof ActiveEffect;
    };
    ChatMessage: {
        documentClass: typeof ChatMessage;
    };
    Combat: {
        documentClass: typeof Combat;
    };
    Combatant: {
        documentClass: typeof Combatant;
    };
    Dice: {
        rolls: (typeof Roll)[];
    };
    DH2E: DH2EConfig;
}

interface DH2EConfig {
    Actor: {
        documentClasses: Record<string, typeof Actor>;
    };
    Item: {
        documentClasses: Record<string, typeof Item>;
    };
    characteristics: Record<string, CharacteristicConfig>;
    hitLocations: Record<string, HitLocationConfig>;
    skills: Record<string, SkillConfig>;
    damageTypes: Record<string, string>;
    weaponClasses: Record<string, string>;
    fireModes: Record<string, string>;
    availabilityTiers: Record<string, { label: string; modifier: number }>;
    craftsmanshipTiers: Record<string, { label: string; modifier: number }>;
    modifierCap: number;
}

interface CharacteristicConfig {
    label: string;
    abbreviation: string;
}

interface HitLocationConfig {
    label: string;
    range: [number, number];
}

interface SkillConfig {
    label: string;
    characteristic: string;
    specialist: boolean;
}
