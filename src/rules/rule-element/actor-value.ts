import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import { ModifierDH2e } from "../modifier.ts";
import { getModifiers, type DH2eSynthetics } from "../synthetics.ts";

/** Source data for an ActorValue rule element */
interface ActorValueSource extends RuleElementSource {
    key: "ActorValue";
    /** Target modifier domain, e.g. "damage:melee" */
    domain: string;
    /** Dot-path into actor data, e.g. "system.characteristics.ws.bonus" */
    path: string;
    /** Transform to apply to the resolved value */
    transform?: "identity" | "half-ceil" | "half-floor" | "negate" | string;
    source?: string;
    exclusionGroup?: string;
}

/**
 * A Rule Element that resolves a dynamic value from actor data and injects
 * it as a FlatModifier.
 *
 * Used for talents whose bonus scales with a characteristic, e.g.:
 * - Crushing Blow: half WSB (rounded up) to melee damage
 * - Mighty Shot: half BSB (rounded up) to ranged damage
 *
 * ```json
 * {
 *   "key": "ActorValue",
 *   "domain": "damage:melee",
 *   "path": "system.characteristics.ws.bonus",
 *   "transform": "half-ceil",
 *   "label": "Crushing Blow",
 *   "source": "talent"
 * }
 * ```
 */
class ActorValueRE extends RuleElementDH2e {
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as ActorValueSource;
        if (!src.domain || !src.path) return;

        // Resolve the value from actor data via dot-path traversal
        const rawValue = ActorValueRE.#resolvePath(this.actor, src.path);
        if (typeof rawValue !== "number") return;

        // Apply transform
        const value = ActorValueRE.#applyTransform(rawValue, src.transform);

        const modifier = new ModifierDH2e({
            label: src.label ?? this.item.name,
            value,
            source: src.source ?? "rule-element",
            exclusionGroup: src.exclusionGroup,
            predicate: src.predicate,
        });

        getModifiers(synthetics, src.domain).push(modifier);
    }

    /** Traverse a dot-separated path on an object */
    static #resolvePath(obj: any, path: string): unknown {
        let current = obj;
        for (const segment of path.split(".")) {
            if (current == null) return undefined;
            current = current[segment];
        }
        return current;
    }

    /** Apply a named transform to a numeric value */
    static #applyTransform(value: number, transform?: string): number {
        if (!transform || transform === "identity") return value;
        if (transform === "half-ceil") return Math.ceil(value / 2);
        if (transform === "half-floor") return Math.floor(value / 2);
        if (transform === "negate") return -value;
        if (transform.startsWith("multiply:")) {
            const factor = Number(transform.slice(9));
            return isNaN(factor) ? value : value * factor;
        }
        return value;
    }
}

export { ActorValueRE };
export type { ActorValueSource };
