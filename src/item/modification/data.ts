import type { RuleElementSource } from "@rules/rule-element/base.ts";

/** Valid modification target types */
const MOD_TYPES = ["weapon", "armour"] as const;
type ModType = typeof MOD_TYPES[number];

/** Valid modification slot (exclusion group) */
const MOD_SLOTS = ["sight", "grip", "edge", "barrel", "general"] as const;
type ModSlot = typeof MOD_SLOTS[number];

export interface ModificationSystemSource {
    description: string;
    source: string;
    availability: string;
    craftsmanship: string;
    weight: number;
    /** What item type this modification can attach to */
    modType: ModType;
    /** Exclusion group — only one mod per slot on a weapon/armour */
    slot: ModSlot;
    /** Skill key for the installation test */
    installTest: string;
    /** Modifier for the installation test */
    installDifficulty: number;
    /** Descriptive installation time */
    installTime: string;
    /** Rule elements for mechanical effects */
    rules: RuleElementSource[];
}

export { MOD_TYPES, MOD_SLOTS };
export type { ModType, ModSlot };
