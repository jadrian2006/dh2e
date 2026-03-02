import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { RuleElementSource } from "../rules/rule-element/base.ts";

/** Common interface for all origin items (homeworld, background, role) */
interface OriginOption {
    name: string;
    description: string;
    /** Bonus ability name */
    bonus: string;
    /** Bonus ability description */
    bonusDescription: string;
    /** Source book identifier (e.g., "core-rulebook", "enemies-beyond") */
    source?: string;
    /** Rule elements — all mechanical data lives here */
    rules: RuleElementSource[];
    /** Carries the full compendium item data for embedding on actor */
    _itemData?: Record<string, unknown>;
}

type HomeworldOption = OriginOption;
type BackgroundOption = OriginOption;
type RoleOption = OriginOption;

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
    OriginOption,
    HomeworldOption,
    BackgroundOption,
    RoleOption,
    DivinationResult,
    CreationData,
    CreationState,
    WizardPurchase,
};
