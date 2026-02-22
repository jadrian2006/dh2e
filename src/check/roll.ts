/**
 * Custom d100 roll class for DH2E checks.
 *
 * Extends Foundry's Roll to handle the d100 roll-under system.
 */
class CheckRollDH2e extends Roll {
    constructor(
        formula: string = "1d100",
        data?: Record<string, unknown>,
        options?: Record<string, unknown>,
    ) {
        super(formula, data, options);
    }

    /** Get the d100 result value */
    get d100Result(): number {
        return this.total ?? 0;
    }
}

export { CheckRollDH2e };
