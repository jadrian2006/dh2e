/**
 * Core maintenance action — updates cybernetic dates, logs entries, posts chat card.
 */

import type { CyberneticDH2e } from "./document.ts";
import type { MaintenanceState } from "./data.ts";
import { appendLog } from "@actor/log.ts";

interface MaintenanceResult {
    cybernetic: CyberneticDH2e;
    previousState: MaintenanceState;
}

/**
 * Perform maintenance on one or more cybernetics belonging to an actor.
 * @param actor The actor who owns the cybernetics
 * @param cybernetics Array of cybernetic items to maintain
 * @param maintainer Optional actor performing the maintenance (chirurgeon)
 */
async function performMaintenance(
    actor: Actor,
    cybernetics: CyberneticDH2e[],
    maintainer?: Actor,
): Promise<void> {
    if (cybernetics.length === 0) return;

    const results: MaintenanceResult[] = [];

    // Capture states and perform maintenance
    for (const cyber of cybernetics) {
        const previousState = cyber.maintenanceState;
        await cyber.performMaintenance();
        results.push({ cybernetic: cyber, previousState });
    }

    // Append actor log entries
    const now = Date.now();
    for (const { cybernetic, previousState } of results) {
        const fromLabel = game.i18n.localize(`DH2E.Cybernetic.State.${previousState}`);
        const toLabel = game.i18n.localize("DH2E.Cybernetic.State.normal");
        await appendLog(actor, {
            timestamp: now,
            type: "maintenance",
            label: cybernetic.name ?? "Cybernetic",
            detail: game.i18n.format("DH2E.Cybernetic.Maintenance.LogDetail", {
                from: fromLabel,
                to: toLabel,
            }),
            who: maintainer?.name ?? actor.name ?? undefined,
        });
    }

    // Post single chat message
    const itemList = results
        .map(({ cybernetic, previousState }) => {
            const fromLabel = game.i18n.localize(`DH2E.Cybernetic.State.${previousState}`);
            return `<li><strong>${cybernetic.name}</strong> <span style="color:#a0a0a8">${fromLabel}</span> → <span style="color:#6c6">Operational</span></li>`;
        })
        .join("");

    const summaryKey = maintainer
        ? "DH2E.Cybernetic.Maintenance.Chirurgeon"
        : "DH2E.Cybernetic.Maintenance.Self";
    const summaryText = game.i18n.format(summaryKey, {
        actor: actor.name ?? "",
        maintainer: maintainer?.name ?? "",
        count: String(cybernetics.length),
    });

    const content = `
        <div class="dh2e chat-card maintenance-card">
            <header>
                <i class="fa-solid fa-wrench"></i>
                <span>${game.i18n.localize("DH2E.Cybernetic.Maintenance.Title")}</span>
            </header>
            <p class="summary">${summaryText}</p>
            <ul class="maintenance-list">${itemList}</ul>
        </div>
    `;

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    });
}

export { performMaintenance };
export type { MaintenanceResult };
