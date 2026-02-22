import type { CheckContext, CheckResult } from "./types.ts";
import { CheckRollDH2e } from "./roll.ts";
import { CheckDialog } from "./dialog.ts";
import { ModifierDH2e, resolveModifiers } from "@rules/modifier.ts";
import { calculateDoS } from "@util/degree-of-success.ts";
import { ChatCardDH2e } from "@chat/cards.ts";

/**
 * The DH2E d100 roll-under check system.
 *
 * Flow:
 * 1. Collect modifiers from synthetics + provided modifiers
 * 2. Show roll dialog (unless skipDialog)
 * 3. Resolve modifier pipeline (predicates, exclusion groups, cap)
 * 4. Roll d100
 * 5. Calculate Degrees of Success/Failure
 * 6. Create chat message with rich card
 */
class CheckDH2e {
    static async roll(context: CheckContext): Promise<CheckResult | null> {
        const rollOptions = context.rollOptions ?? new Set<string>();

        // Build roll option context
        if (context.characteristic) {
            rollOptions.add(`self:characteristic:${context.characteristic}`);
        }
        rollOptions.add(`self:check`);

        // Collect modifiers: synthetics from actor + provided
        const allModifiers = CheckDH2e.#collectModifiers(context);

        // Show dialog for modifier toggles (unless skipping)
        if (!context.skipDialog) {
            const dialogResult = await CheckDialog.prompt({
                label: context.label,
                baseTarget: context.baseTarget,
                modifiers: allModifiers,
            });
            if (dialogResult.cancelled) return null;
        }

        // Resolve modifier pipeline
        const modifierCap = (game as any).settings?.get?.(SYSTEM_ID, "modifierCap") ?? 60;
        const { total: modifierTotal, applied } = resolveModifiers(
            allModifiers,
            rollOptions,
            modifierCap,
        );

        const target = Math.max(1, context.baseTarget + modifierTotal);

        // Roll d100
        const roll = new CheckRollDH2e("1d100");
        await roll.evaluate();
        const d100 = roll.d100Result;

        // Calculate DoS/DoF
        const dos = calculateDoS(d100, target);

        const result: CheckResult = {
            roll: d100,
            target,
            dos,
            appliedModifiers: applied,
            modifierTotal,
            context,
        };

        // Post chat card
        await ChatCardDH2e.createCheckCard(result, roll);

        return result;
    }

    /** Collect modifiers from actor synthetics and direct context */
    static #collectModifiers(context: CheckContext): ModifierDH2e[] {
        const modifiers: ModifierDH2e[] = [];

        // Get modifiers from actor synthetics
        const actor = context.actor as any;
        if (actor?.synthetics?.modifiers?.[context.domain]) {
            for (const mod of actor.synthetics.modifiers[context.domain]) {
                modifiers.push(mod.clone());
            }
        }

        // Add directly provided modifiers
        if (context.modifiers) {
            modifiers.push(...context.modifiers);
        }

        return modifiers;
    }
}

export { CheckDH2e };
