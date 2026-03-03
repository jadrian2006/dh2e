import { CheckDH2e } from "@check/check.ts";
import { ModifierDH2e } from "@rules/modifier.ts";
import type { DH2eSynthetics } from "@rules/synthetics.ts";

interface RequisitionContext {
    actor: Actor;
    /** Name of the item being acquired */
    itemName: string;
    /** Availability tier key from config (e.g., "scarce") */
    availability: string;
    /** Item type for background ability checks (e.g., "cybernetic") */
    itemType?: string;
    /** Extra situational modifiers */
    extraModifier?: number;
    skipDialog?: boolean;
}

/**
 * Resolves a Requisition test: d100 vs Influence + availability modifier.
 * On success, the item is acquired.
 * On failure with 3+ DoF, the character loses 1 Influence.
 */
class RequisitionResolver {
    static async resolve(context: RequisitionContext): Promise<void> {
        const actor = context.actor as any;
        let influence = actor.system?.influence ?? 25;

        // Check for AttributeOverride on requisition domain (e.g., Contact Network)
        const synthetics = actor.synthetics as DH2eSynthetics | undefined;
        if (synthetics) {
            const override = synthetics.attributeOverrides.find(o => o.domain === "requisition");
            if (override) {
                const overrideValue = actor.system?.characteristics?.[override.characteristic]?.value ?? 0;
                influence = Math.max(influence, overrideValue);
            }
        }

        // Look up availability modifier from config
        const availConfig = CONFIG.DH2E?.availabilityTiers?.[context.availability] as
            | { label: string; modifier: number }
            | undefined;
        const availMod = availConfig?.modifier ?? 0;
        const availLabel = availConfig?.label
            ? (game.i18n?.localize(availConfig.label) ?? context.availability)
            : context.availability;

        // Build modifiers
        const modifiers: ModifierDH2e[] = [];
        if (availMod !== 0) {
            modifiers.push(new ModifierDH2e({
                label: availLabel,
                value: availMod,
                source: game.i18n?.localize("DH2E.Requisition.Availability") ?? "Availability",
            }));
        }
        // Master of Paperwork: items count as one level more available (+10)
        if (synthetics?.rollOptions?.has("self:background:master-of-paperwork")) {
            modifiers.push(new ModifierDH2e({
                label: game.i18n?.localize("DH2E.MasterOfPaperwork.Label") ?? "Master of Paperwork",
                value: 10,
                source: game.i18n?.localize("DH2E.Background") ?? "Background",
            }));
        }
        // Replace the Weak Flesh: cybernetics count as two levels more available (+20)
        // Check synthetics first, fall back to background name for actors without embedded background item
        const hasReplaceWeakFlesh = synthetics?.rollOptions?.has("self:background:replace-the-weak-flesh")
            ?? synthetics?.rollOptions?.has("self:background:adeptus-mechanicus")
            ?? false;
        const backgroundName = actor.system?.details?.background ?? "";
        const isMechanicus = !hasReplaceWeakFlesh && /mechanicus/i.test(backgroundName);
        if (context.itemType === "cybernetic" && (hasReplaceWeakFlesh || isMechanicus)) {
            modifiers.push(new ModifierDH2e({
                label: game.i18n?.localize("DH2E.ReplaceTheWeakFlesh.Label") ?? "Replace the Weak Flesh",
                value: 20,
                source: game.i18n?.localize("DH2E.Background") ?? "Background",
            }));
        }
        if (context.extraModifier && context.extraModifier !== 0) {
            modifiers.push(new ModifierDH2e({
                label: game.i18n?.localize("DH2E.Requisition.Situational") ?? "Situational",
                value: context.extraModifier,
                source: "GM",
            }));
        }

        const checkResult = await CheckDH2e.roll({
            actor: context.actor,
            baseTarget: influence,
            label: `${game.i18n?.localize("DH2E.Requisition.Title") ?? "Requisition"}: ${context.itemName}`,
            domain: "requisition",
            modifiers,
            rollOptions: new Set(["requisition"]),
            skipDialog: context.skipDialog,
        });

        if (!checkResult) return;

        // On failure with 3+ DoF, lose 1 Influence
        // Breeding Counts (Highborn) is handled centrally in AcolyteDH2e._preUpdate
        if (!checkResult.dos.success && checkResult.dos.degrees >= 3) {
            const newInfluence = Math.max(0, influence - 1);
            await actor.update({ "system.influence": newInfluence });
        }

        // Post requisition card
        await RequisitionResolver.#postRequisitionCard(context, checkResult, availLabel);
    }

    static async #postRequisitionCard(
        context: RequisitionContext,
        checkResult: { dos: { success: boolean; degrees: number }; roll: number; target: number },
        availLabel: string,
    ): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/requisition-card.hbs`;
        const templateData = {
            itemName: context.itemName,
            availability: availLabel,
            success: checkResult.dos.success,
            degrees: checkResult.dos.degrees,
            roll: checkResult.roll,
            target: checkResult.target,
            influenceLost: !checkResult.dos.success && checkResult.dos.degrees >= 3,
        };

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);
        const speaker = fd.ChatMessage.getSpeaker?.({
            actor: context.actor,
        }) ?? { alias: context.actor.name };

        await fd.ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "requisition",
                    result: {
                        itemName: context.itemName,
                        success: checkResult.dos.success,
                        degrees: checkResult.dos.degrees,
                    },
                },
            },
        });
    }
}

export { RequisitionResolver };
export type { RequisitionContext };
