import type { RuleElementSource } from "@rules/rule-element/base.ts";

/** Raw system data as stored in template.json / packs */
export interface BackgroundSystemSource {
    description: string;
    source: string;
    bonus: string;
    bonusDescription: string;
    rules: RuleElementSource[];
}

/** A single entry in a derived list (skill, talent, equipment) */
export interface GrantEntry {
    /** Display label — single name or "X or Y" */
    label: string;
    /** Individual item names (length > 1 = choice) */
    names: string[];
    /** Item type for compendium lookup */
    type: string;
    /** Whether this requires the player to pick one */
    isChoice: boolean;
}

/** Derived system data added during prepareDerivedData */
export interface BackgroundDerivedData {
    skills: GrantEntry[];
    talents: GrantEntry[];
    equipment: GrantEntry[];
    aptitude: string;
}
