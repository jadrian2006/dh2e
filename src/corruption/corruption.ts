import { CheckDH2e } from "@check/check.ts";
import { rollMalignancy } from "./malignancy-table.ts";

/**
 * Handles corruption threshold checks.
 *
 * Thresholds at 10, 20, 30, ... 100.
 * When a threshold is crossed: WP test. Failure → roll on malignancy table.
 * At 100 corruption: character is irrevocably lost.
 */
class CorruptionHandler {
    /** Called when corruption value changes. Checks if a threshold was crossed. */
    static async onCorruptionChanged(actor: Actor, oldVal: number, newVal: number): Promise<void> {
        if (newVal <= oldVal) return; // Only trigger on increases

        // Check for threshold crossings
        const oldThreshold = Math.floor(oldVal / 10);
        const newThreshold = Math.floor(newVal / 10);

        if (newThreshold <= oldThreshold) return;

        // Character lost at 100
        if (newVal >= 100) {
            await CorruptionHandler.#postCorruptionCard(actor, newVal, null, true);
            ui.notifications?.error(
                `${actor.name} has reached 100 Corruption and is irrevocably lost to darkness!`,
            );
            return;
        }

        // WP test for threshold crossing
        const sys = (actor as any).system;
        const wpValue = sys?.characteristics?.wp?.value ?? 25;

        const checkResult = await CheckDH2e.roll({
            actor,
            characteristic: "wp",
            baseTarget: wpValue,
            label: `${game.i18n?.localize("DH2E.Corruption.ThresholdTest") ?? "Corruption Threshold Test"} (${newThreshold * 10})`,
            domain: "corruption",
            skipDialog: true,
        });

        if (!checkResult) return;

        let malignancyName: string | null = null;

        // Failed WP test → roll on malignancy table
        if (!checkResult.dos.success) {
            const entry = await rollMalignancy(actor);
            malignancyName = entry?.title ?? null;
        }

        await CorruptionHandler.#postCorruptionCard(actor, newVal, malignancyName, false);
    }

    static async #postCorruptionCard(
        actor: Actor,
        corruption: number,
        malignancyName: string | null,
        lost: boolean,
    ): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/corruption-card.hbs`;
        const templateData = {
            actorName: actor.name,
            corruption,
            threshold: Math.floor(corruption / 10) * 10,
            malignancyName,
            hasMalignancy: !!malignancyName,
            lost,
        };

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);
        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };

        await fd.ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "corruption",
                    result: { corruption, malignancyName, lost },
                },
            },
        });
    }
}

export { CorruptionHandler };
