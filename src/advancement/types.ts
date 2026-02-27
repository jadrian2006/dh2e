import type { CharacteristicAbbrev } from "@actor/types.ts";

/** Shape of the xp-costs.json data file */
export interface XPCostData {
    characteristicAptitudes: Record<string, [string, string]>;
    /** [advanceIndex][matchColumn] — col 0 = 2 matches, col 2 = 0 matches */
    characteristicCosts: number[][];
    /** [rankIndex][matchColumn] */
    skillCosts: number[][];
    /** [tierIndex][matchColumn] */
    talentCosts: number[][];
}

export type AdvanceCategory = "characteristic" | "skill" | "talent" | "elite" | "power";

export interface AdvanceOption {
    category: AdvanceCategory;
    label: string;
    sublabel: string;
    /** Characteristic abbreviation, or item ID / compendium UUID */
    key: string;
    cost: number;
    matchCount: 0 | 1 | 2;
    aptitudes: [string, string];
    currentLevel: number;
    nextLevel: number;
    maxLevel: number;
    affordable: boolean;
    alreadyMaxed: boolean;
    prerequisites?: string;
    prereqsMet: boolean;
    prereqsUnmet: string[];
    /** Embedded item ID (for existing skills) */
    sourceItemId?: string;
    /** Compendium UUID (for unowned skills/talents) */
    compendiumUuid?: string;
    /** True when elite advance requires GM approval before purchase */
    needsApproval?: boolean;
    /** True while waiting for GM response to an approval request */
    pendingApproval?: boolean;
    /** Item description text for display in advancement UI */
    description?: string;
}

export interface XPTransaction {
    timestamp: number;
    category: AdvanceCategory;
    label: string;
    cost: number;
    matchCount: 0 | 1 | 2;
}
