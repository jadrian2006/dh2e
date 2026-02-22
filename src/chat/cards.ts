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

        const templateData = {
            title: result.context.label,
            success: result.dos.success,
            degrees: result.dos.degrees,
            roll: result.roll,
            target: result.target,
            modifiers: result.appliedModifiers.map((m) => ({
                label: m.label,
                value: m.value,
                source: m.source,
            })),
        };

        const content = await renderTemplate(templatePath, templateData);

        const speaker = ChatMessage.getSpeaker?.({
            actor: result.context.actor,
        }) ?? { alias: result.context.actor.name };

        await ChatMessage.create({
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
                    },
                },
            },
        });
    }
}

export { ChatCardDH2e };
