import type { CheckResult } from "@check/types.ts";
import type { CheckRollDH2e } from "@check/roll.ts";

/**
 * Handles creation of rich chat cards for checks, attacks, and damage.
 */
class ChatCardDH2e {
    /** Create a chat card for a d100 check result */
    static async createCheckCard(
        result: CheckResult,
        roll: CheckRollDH2e,
    ): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/check-card.hbs`;

        const targetTens = Math.floor(result.target / 10);
        const rollTens = Math.floor(result.roll / 10);
        const dosThreshold = result.context.dosThreshold;

        const templateData = {
            title: result.context.label,
            success: result.dos.success,
            degrees: result.dos.degrees,
            roll: result.roll,
            target: result.target,
            targetTens,
            rollTens,
            dosThreshold,
            thresholdMet: dosThreshold != null
                ? result.dos.success && result.dos.degrees >= dosThreshold
                : null,
            modifiers: result.appliedModifiers.map((m) => ({
                label: m.label,
                value: m.value,
                source: m.source,
            })),
            isGM: (game as any).user?.isGM ?? false,
        };

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);

        const speaker = fd.ChatMessage.getSpeaker?.({
            actor: result.context.actor,
        }) ?? { alias: result.context.actor.name };

        await fd.ChatMessage.create({
            content,
            speaker,
            rolls: [roll],
            flags: {
                [SYSTEM_ID]: {
                    type: "check",
                    result: {
                        roll: result.roll,
                        target: result.target,
                        success: result.dos.success,
                        degrees: result.dos.degrees,
                        characteristic: result.context.characteristic,
                        domain: result.context.domain,
                        dosThreshold,
                    },
                },
            },
        });
    }
}

export { ChatCardDH2e };
