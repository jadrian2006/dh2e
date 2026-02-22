/**
 * A predicate engine for testing roll options against conditional rules.
 *
 * Supports:
 * - String atoms: "self:characteristic:ws" — true if string is in the set
 * - Negation: "not:flanked" — true if string is NOT in the set
 * - Conjunction: { and: [...] } — true if ALL sub-predicates pass
 * - Disjunction: { or: [...] } — true if ANY sub-predicate passes
 */

type PredicateAtom = string;

interface PredicateAnd {
    and: PredicateStatement[];
}

interface PredicateOr {
    or: PredicateStatement[];
}

type PredicateStatement = PredicateAtom | PredicateAnd | PredicateOr;

class Predicate {
    readonly statements: PredicateStatement[];

    constructor(statements: PredicateStatement[] = []) {
        this.statements = statements;
    }

    /** Test whether all statements are satisfied by the given roll options */
    test(rollOptions: Set<string>): boolean {
        return this.statements.every((s) => Predicate.#testStatement(s, rollOptions));
    }

    /** Returns true if the predicate has no statements (always passes) */
    get isempty(): boolean {
        return this.statements.length === 0;
    }

    static #testStatement(statement: PredicateStatement, rollOptions: Set<string>): boolean {
        if (typeof statement === "string") {
            return Predicate.#testAtom(statement, rollOptions);
        }
        if ("and" in statement) {
            return statement.and.every((s) => Predicate.#testStatement(s, rollOptions));
        }
        if ("or" in statement) {
            return statement.or.some((s) => Predicate.#testStatement(s, rollOptions));
        }
        return false;
    }

    static #testAtom(atom: string, rollOptions: Set<string>): boolean {
        if (atom.startsWith("not:")) {
            return !rollOptions.has(atom.slice(4));
        }
        return rollOptions.has(atom);
    }

    /** Create from raw data, normalizing to array */
    static from(data: PredicateStatement[] | PredicateStatement | undefined): Predicate {
        if (!data) return new Predicate();
        if (Array.isArray(data)) return new Predicate(data);
        return new Predicate([data]);
    }
}

export { Predicate };
export type { PredicateStatement, PredicateAtom, PredicateAnd, PredicateOr };
