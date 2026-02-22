import type { ModifierDH2e } from "./modifier.ts";

/**
 * Domain-based modifier registry.
 *
 * Synthetics are collected from Rule Elements during data preparation
 * and stored here for retrieval during rolls.
 *
 * Domains are namespaced strings like:
 * - "characteristic:ws" — modifiers to Weapon Skill tests
 * - "skill:athletics" — modifiers to Athletics tests
 * - "attack:melee" — modifiers to melee attack rolls
 * - "damage:ranged" — modifiers to ranged damage
 */
interface DH2eSynthetics {
    /** Modifiers keyed by domain string */
    modifiers: Record<string, ModifierDH2e[]>;
}

function createSynthetics(): DH2eSynthetics {
    return {
        modifiers: {},
    };
}

/** Get or create a modifier array for the given domain */
function getModifiers(synthetics: DH2eSynthetics, domain: string): ModifierDH2e[] {
    return (synthetics.modifiers[domain] ??= []);
}

export { createSynthetics, getModifiers };
export type { DH2eSynthetics };
