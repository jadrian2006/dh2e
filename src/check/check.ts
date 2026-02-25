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

        // Merge actor's synthetic roll options
        const actor = context.actor as any;
        if (actor?.synthetics?.rollOptions) {
            for (const opt of actor.synthetics.rollOptions) {
                rollOptions.add(opt);
            }
        }

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
                skillDescription: context.skillDescription,
                isAttack: context.isAttack,
                fireMode: context.fireMode,
            });
            if (dialogResult.cancelled) return null;

            // If user selected a called shot, store it and add the -20 modifier
            if (dialogResult.calledShot) {
                context.calledShot = dialogResult.calledShot;
                allModifiers.push(new ModifierDH2e({
                    label: "Called Shot",
                    value: -20,
                    source: "called-shot",
                }));
            }
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

        // Apply DoS adjustments from synthetics (e.g., AdjustDegree REs)
        if (actor?.synthetics?.dosAdjustments) {
            const { Predicate } = await import("@rules/predicate.ts");
            for (const adj of actor.synthetics.dosAdjustments) {
                const pred = Predicate.from(adj.predicate);
                if (pred.test(rollOptions)) {
                    dos.degrees += adj.amount;
                    // Ensure DoS can't flip success/failure via adjustment
                    if (dos.degrees < 0) dos.degrees = 0;
                }
            }
        }

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

    /**
     * Resolve whether to skip the dialog based on shift key + invertShiftRoll setting.
     * Default: click = dialog, shift+click = quick roll.
     * Inverted: click = quick roll, shift+click = dialog.
     */
    static shouldSkipDialog(shiftKey: boolean): boolean {
        const inverted = (game as any).settings?.get?.(SYSTEM_ID, "invertShiftRoll") ?? false;
        return inverted ? !shiftKey : shiftKey;
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

        // Inherit modifiers from parent domain (e.g. skill:stealth applies to skill:stealth:sneak)
        const parts = context.domain.split(":");
        if (parts.length === 3) {
            const parentDomain = `${parts[0]}:${parts[1]}`;
            if (actor?.synthetics?.modifiers?.[parentDomain]) {
                for (const mod of actor.synthetics.modifiers[parentDomain]) {
                    modifiers.push(mod.clone());
                }
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
