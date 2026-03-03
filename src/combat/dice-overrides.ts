/** Dice override entry from weapon quality rule elements */
interface DiceOverride {
    mode: string;
    value?: number;
    source: string;
}

/**
 * Apply dice override effects (Tearing, Proven, Primitive, etc.) to a damage roll.
 *
 * Shared by both weapon attacks and psychic power damage.
 */
function applyDiceOverrides(
    roll: any,
    overrides: DiceOverride[],
): number {
    const dice = roll.dice ?? [];
    if (dice.length === 0) return roll.total ?? 0;

    // Get all individual die results
    let results: number[] = [];
    for (const die of dice) {
        results.push(...(die.results?.map((r: any) => r.result) ?? []));
    }

    for (const override of overrides) {
        if (override.mode === "rerollLowest" && results.length > 0) {
            // Tearing: re-roll the lowest die
            const minIdx = results.indexOf(Math.min(...results));
            const faces = dice[0]?.faces ?? 10;
            results[minIdx] = Math.floor(Math.random() * faces) + 1;
        } else if (override.mode === "minimumDie" && override.value) {
            // Proven: any die below the value counts as the value
            results = results.map((r) => Math.max(r, override.value!));
        } else if (override.mode === "maximizeDie" && override.value) {
            // Primitive: cap each die at the given value
            results = results.map((r) => Math.min(r, override.value!));
        } else if (override.mode === "rerollBelow" && override.value) {
            // Re-roll any die showing ≤ value
            const faces = dice[0]?.faces ?? 10;
            results = results.map((r) => {
                if (r <= override.value!) {
                    return Math.floor(Math.random() * faces) + 1;
                }
                return r;
            });
        }
    }

    return results.reduce((sum, r) => sum + r, 0);
}

export { applyDiceOverrides };
export type { DiceOverride };
