/**
 * Utilities for evaluating PR-based formulas in psychic powers.
 *
 * Powers use `@pr` as a placeholder for the effective Psy Rating.
 * These functions substitute/evaluate the token at roll time.
 */

/** Replace `@pr` with the numeric psy rating value in a dice formula string */
function substitutePR(formula: string, pr: number): string {
    return formula.replace(/@pr/gi, String(pr));
}

/**
 * Evaluate a PR formula to a single number (for penetration, healing, etc.).
 * Supports basic arithmetic and `ceil`/`floor` helpers.
 *
 * Examples:
 * - `"4"` → 4
 * - `"2*@pr"` with pr=4 → 8
 * - `"ceil(@pr/2)"` with pr=3 → 2
 */
function evaluatePRNumber(formula: string, pr: number): number {
    if (!formula) return 0;
    const substituted = substitutePR(formula, pr);
    try {
        const fn = new Function("ceil", "floor", "min", "max", `return (${substituted});`);
        const result = fn(Math.ceil, Math.floor, Math.min, Math.max);
        return typeof result === "number" && isFinite(result) ? Math.floor(result) : 0;
    } catch {
        return 0;
    }
}

/**
 * Substitute `@pr` within quality strings.
 * e.g. `["Blast(@pr)", "Flame"]` with pr=4 → `["Blast(4)", "Flame"]`
 */
function substitutePRInQualities(qualities: string[], pr: number): string[] {
    return qualities.map((q) => q.replace(/@pr/gi, String(pr)));
}

export { substitutePR, evaluatePRNumber, substitutePRInQualities };
