import { CheckDH2e } from "@check/check.ts";
import { ModifierDH2e } from "@rules/modifier.ts";

interface RequisitionContext {
    actor: Actor;
    /** Name of the item being acquired */
    itemName: string;
    /** Availability tier key from config (e.g., "scarce") */
    availability: string;
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
        const influence = actor.system?.influence ?? 25;

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
