import { CheckDH2e } from "@check/check.ts";
import { rollDisorder } from "./disorder-table.ts";

/**
 * Handles insanity threshold checks.
 *
 * Thresholds at 10, 20, 30, ... 100.
 * When a threshold is crossed: WP test. Failure → roll on disorder table.
 * Severity escalates: 1st disorder = minor, 2nd = severe, 3rd+ = acute.
 * At 100 insanity: character is irrecoverably insane.
 */
class InsanityHandler {
    /** Called when insanity value changes. Checks if a threshold was crossed. */
    static async onInsanityChanged(actor: Actor, oldVal: number, newVal: number): Promise<void> {
        if (newVal <= oldVal) return;

        const oldThreshold = Math.floor(oldVal / 10);
        const newThreshold = Math.floor(newVal / 10);

        if (newThreshold <= oldThreshold) return;

        // Irrecoverably insane at 100
        if (newVal >= 100) {
            ui.notifications?.error(
                `${actor.name} has reached 100 Insanity and is irrecoverably insane!`,
            );

            const content = InsanityHandler.#buildInsanityCardHtml(actor.name ?? "Unknown", newVal, null, true);
            const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
            await fd.ChatMessage.create({
                content,
                speaker,
                flags: { [SYSTEM_ID]: { type: "insanity", result: { insanity: newVal, lost: true } } },
            });
            return;
        }

        // WP test
        const sys = (actor as any).system;
        const wpValue = sys?.characteristics?.wp?.value ?? 25;

        const checkResult = await CheckDH2e.roll({
            actor,
            characteristic: "wp",
            baseTarget: wpValue,
            label: `${game.i18n?.localize("DH2E.Insanity.ThresholdTest") ?? "Insanity Threshold Test"} (${newThreshold * 10})`,
            domain: "insanity",
            skipDialog: true,
        });

        if (!checkResult) return;

        let disorderName: string | null = null;

        if (!checkResult.dos.success) {
            // Determine severity based on existing disorder count
            const existingDisorders = actor.items.filter((i: Item) => i.type === "mental-disorder");
            let severity: "minor" | "severe" | "acute";
            if (existingDisorders.length === 0) severity = "minor";
            else if (existingDisorders.length === 1) severity = "severe";
            else severity = "acute";

            const entry = await rollDisorder(actor, severity);
            disorderName = entry ? `${entry.title} (${severity})` : null;
        }

        const content = InsanityHandler.#buildInsanityCardHtml(actor.name ?? "Unknown", newVal, disorderName, false);
        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
        await fd.ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "insanity",
                    result: { insanity: newVal, disorderName, lost: false },
                },
            },
        });
    }

    static #buildInsanityCardHtml(
        actorName: string,
        insanity: number,
        disorderName: string | null,
        lost: boolean,
    ): string {
        const threshold = Math.floor(insanity / 10) * 10;
        let html = `<div class="dh2e chat-card insanity-card${lost ? " lost" : ""}">
            <header class="card-header insanity-header">
                <h3><i class="fas fa-brain"></i> ${game.i18n?.localize("DH2E.Insanity.ThresholdCrossed") ?? "Insanity Threshold Crossed"}</h3>
            </header>
            <div class="card-body">
                <p><strong>${actorName}</strong> — ${game.i18n?.localize("DH2E.Insanity") ?? "Insanity"}: ${insanity} (${game.i18n?.localize("DH2E.Insanity.Threshold") ?? "Threshold"}: ${threshold})</p>`;

        if (lost) {
            html += `<p class="lost-warning"><i class="fas fa-skull"></i> ${game.i18n?.localize("DH2E.Insanity.Lost") ?? "Irrecoverably insane!"}</p>`;
        } else if (disorderName) {
            html += `<p class="disorder-gained">${game.i18n?.localize("DH2E.Insanity.DisorderGained") ?? "Disorder gained"}: <strong>${disorderName}</strong></p>`;
        } else {
            html += `<p class="wp-passed">${game.i18n?.localize("DH2E.Insanity.WPPassed") ?? "Willpower test passed — no disorder."}</p>`;
        }

        html += `</div></div>`;
        return html;
    }
}

export { InsanityHandler };
