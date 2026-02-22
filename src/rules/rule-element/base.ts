import type { DH2eSynthetics } from "../synthetics.ts";
import type { PredicateStatement } from "../predicate.ts";

/** Raw JSON data for a Rule Element on an item */
interface RuleElementSource {
    key: string;
    label?: string;
    predicate?: PredicateStatement[];
    [key: string]: unknown;
}

/**
 * Base class for Rule Elements.
 *
 * Rule Elements are data-driven effects attached to items (talents, conditions, etc.)
 * that inject modifiers into the synthetics registry during data preparation.
 */
abstract class RuleElementDH2e {
    readonly source: RuleElementSource;
    readonly item: Item;
    readonly actor: Actor;

    constructor(source: RuleElementSource, item: Item) {
        this.source = source;
        this.item = item;
        this.actor = item.parent as Actor;
    }

    /** Called during actor data preparation to inject modifiers into synthetics */
    abstract onPrepareData(synthetics: DH2eSynthetics): void;
}

export { RuleElementDH2e };
export type { RuleElementSource };
