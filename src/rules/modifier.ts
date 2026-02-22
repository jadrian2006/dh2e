import { Predicate, type PredicateStatement } from "./predicate.ts";

/**
 * A single modifier in the DH2E modifier pipeline.
 *
 * Uses "Tagged Stacking + Exclusion Groups":
 * - Every modifier has a source tag (e.g. "equipment", "talent", "condition")
 * - Modifiers in the same exclusion group compete: best bonus wins, worst penalty wins
 * - Ungrouped modifiers always stack
 */
interface ModifierParams {
    /** Human-readable label, e.g. "Weapon Skill Advance" */
    label: string;
    /** Numeric modifier value (positive = bonus, negative = penalty) */
    value: number;
    /** Source tag: "equipment", "talent", "condition", "situational", etc. */
    source: string;
    /** Optional exclusion group. Modifiers in the same group compete. */
    exclusionGroup?: string;
    /** Predicate that must pass for this modifier to apply */
    predicate?: PredicateStatement[];
    /** Whether this modifier is user-toggleable and currently enabled */
    enabled?: boolean;
    /** Whether this modifier can be toggled by the user in the roll dialog */
    toggleable?: boolean;
}

class ModifierDH2e {
    label: string;
    value: number;
    source: string;
    exclusionGroup: string | null;
    predicate: Predicate;
    enabled: boolean;
    toggleable: boolean;

    constructor(params: ModifierParams) {
        this.label = params.label;
        this.value = params.value;
        this.source = params.source;
        this.exclusionGroup = params.exclusionGroup ?? null;
        this.predicate = Predicate.from(params.predicate);
        this.enabled = params.enabled ?? true;
        this.toggleable = params.toggleable ?? false;
    }

    /** Is this a bonus (positive value)? */
    get isBonus(): boolean {
        return this.value > 0;
    }

    /** Is this a penalty (negative value)? */
    get isPenalty(): boolean {
        return this.value < 0;
    }

    clone(): ModifierDH2e {
        return new ModifierDH2e({
            label: this.label,
            value: this.value,
            source: this.source,
            exclusionGroup: this.exclusionGroup ?? undefined,
            predicate: [...this.predicate.statements],
            enabled: this.enabled,
            toggleable: this.toggleable,
        });
    }
}

/**
 * Apply exclusion group rules to a list of modifiers.
 *
 * For each exclusion group:
 * - Among bonuses, only the highest value applies
 * - Among penalties, only the lowest (most negative) value applies
 * - Ungrouped modifiers always stack
 */
function applyExclusionGroups(modifiers: ModifierDH2e[]): ModifierDH2e[] {
    const ungrouped: ModifierDH2e[] = [];
    const groups = new Map<string, ModifierDH2e[]>();

    for (const mod of modifiers) {
        if (mod.exclusionGroup) {
            const group = groups.get(mod.exclusionGroup) ?? [];
            group.push(mod);
            groups.set(mod.exclusionGroup, group);
        } else {
            ungrouped.push(mod);
        }
    }

    const resolved: ModifierDH2e[] = [...ungrouped];

    for (const [, groupMods] of groups) {
        const bonuses = groupMods.filter((m) => m.isBonus);
        const penalties = groupMods.filter((m) => m.isPenalty);

        // Best bonus wins
        if (bonuses.length > 0) {
            bonuses.sort((a, b) => b.value - a.value);
            resolved.push(bonuses[0]);
        }
        // Worst penalty wins
        if (penalties.length > 0) {
            penalties.sort((a, b) => a.value - b.value);
            resolved.push(penalties[0]);
        }
    }

    return resolved;
}

/**
 * The full modifier pipeline:
 * 1. Filter by predicate (only modifiers whose predicates pass)
 * 2. Filter by enabled state
 * 3. Apply exclusion groups
 * 4. Sum values
 * 5. Clamp to ±cap
 */
function resolveModifiers(
    modifiers: ModifierDH2e[],
    rollOptions: Set<string>,
    cap: number = 60,
): { total: number; applied: ModifierDH2e[]; all: ModifierDH2e[] } {
    // Step 1 & 2: Filter by predicate and enabled state
    const applicable = modifiers.filter(
        (m) => m.enabled && m.predicate.test(rollOptions),
    );

    // Step 3: Apply exclusion groups
    const resolved = applyExclusionGroups(applicable);

    // Step 4: Sum
    const rawTotal = resolved.reduce((sum, m) => sum + m.value, 0);

    // Step 5: Clamp
    const total = Math.max(-cap, Math.min(cap, rawTotal));

    return { total, applied: resolved, all: modifiers };
}

export { ModifierDH2e, resolveModifiers, applyExclusionGroups };
export type { ModifierParams };
