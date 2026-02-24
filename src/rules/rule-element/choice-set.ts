import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics } from "../synthetics.ts";

/** A single option in a ChoiceSet */
interface ChoiceOption {
    /** Unique value stored as the selection */
    value: string;
    /** Display label for the option */
    label: string;
}

/** Source data for a ChoiceSet rule element */
interface ChoiceSetSource extends RuleElementSource {
    key: "ChoiceSet";
    /** Prompt text shown to the user */
    prompt: string;
    /** Available choices */
    choices: ChoiceOption[];
    /** The flag path where the selection is stored (on the item) */
    flag: string;
}

/**
 * Prompts the user to pick from a set of options when an item is created.
 *
 * The selected value is stored as a flag on the item. Other REs on the
 * same item can reference this flag via roll options or predicate checks.
 *
 * The actual dialog prompt happens during item creation (via lifecycle hooks),
 * not during data preparation.
 *
 * ```json
 * {
 *   "key": "ChoiceSet",
 *   "prompt": "Choose a specialization",
 *   "choices": [
 *     { "value": "bolter", "label": "Bolter" },
 *     { "value": "las", "label": "Las" }
 *   ],
 *   "flag": "specialization"
 * }
 * ```
 */
class ChoiceSetRE extends RuleElementDH2e {
    /** During data prep, inject the chosen value as a roll option */
    override onPrepareData(synthetics: DH2eSynthetics): void {
        const src = this.source as ChoiceSetSource;
        if (!src.flag) return;

        const chosen = (this.item as any).flags?.dh2e?.[src.flag] as string | undefined;
        if (chosen) {
            synthetics.rollOptions.add(`choice:${src.flag}:${chosen}`);
        }
    }

    /** Show choice dialog during item creation. Returns the selected value or null. */
    static async promptChoice(source: ChoiceSetSource): Promise<string | null> {
        const { ChoiceDialog } = await import("./choice-dialog.ts");
        return ChoiceDialog.prompt(source.prompt, source.choices);
    }

    /** Process all ChoiceSet REs on an item during creation */
    static async onPreCreate(item: Item): Promise<boolean> {
        const rules = (item as any)._source?.system?.rules as RuleElementSource[] ?? [];
        const choiceSets = rules.filter((r) => r.key === "ChoiceSet") as ChoiceSetSource[];
        if (choiceSets.length === 0) return true;

        const flags: Record<string, unknown> = {};

        for (const cs of choiceSets) {
            const choice = await ChoiceSetRE.promptChoice(cs);
            if (choice === null) return false; // User cancelled
            flags[cs.flag] = choice;
        }

        // Store choices as flags on the item
        (item as any).updateSource({
            "flags.dh2e": { ...(item as any).flags?.dh2e, ...flags },
        });

        return true;
    }
}

export { ChoiceSetRE };
export type { ChoiceSetSource, ChoiceOption };
