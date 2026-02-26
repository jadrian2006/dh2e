/**
 * Cybernetic maintenance notifier — detects degradation threshold crossings
 * when the warband date advances and shows GM popup dialogs.
 */

import type { MaintenanceState } from "../../item/cybernetic/data.ts";

/** Severity order for comparison */
const STATE_SEVERITY: Record<MaintenanceState, number> = {
    normal: 0,
    minorMalfunction: 1,
    degraded: 2,
    totalFailure: 3,
};

interface CachedState {
    actorId: string;
    actorName: string;
    itemId: string;
    itemName: string;
    state: MaintenanceState;
}

/** Narrative suggestions per degradation state */
const SUGGESTION_KEYS: Partial<Record<MaintenanceState, string>> = {
    minorMalfunction: "DH2E.Cybernetic.Maintenance.MinorSuggestion",
    degraded: "DH2E.Cybernetic.Maintenance.DegradedSuggestion",
    totalFailure: "DH2E.Cybernetic.Maintenance.FailureSuggestion",
};

class CyberneticMaintenanceNotifier {
    static #cache: Map<string, CachedState> = new Map();

    /** Hook into warband updates to detect date changes */
    static init(): void {
        Hooks.on("updateActor", (actor: any, changes: any) => {
            if (actor.type !== "warband") return;
            if (!changes?.system?.chronicle?.currentDate) return;
            if (!(game as any).user?.isGM) return;

            CyberneticMaintenanceNotifier.#onDateAdvanced();
        });
    }

    /** Build initial cache of all installed cybernetic states (call after warband ready) */
    static populateCache(): void {
        CyberneticMaintenanceNotifier.#cache.clear();
        const g = game as any;

        for (const actor of g.actors ?? []) {
            if (actor.type !== "acolyte" && actor.type !== "npc") continue;

            for (const item of actor.items ?? []) {
                if (item.type !== "cybernetic") continue;
                if (!item.system?.installed) continue;

                const state: MaintenanceState = item.maintenanceState ?? "normal";
                CyberneticMaintenanceNotifier.#cache.set(item.id, {
                    actorId: actor.id,
                    actorName: actor.name ?? "Unknown",
                    itemId: item.id,
                    itemName: item.name ?? "Cybernetic",
                    state,
                });
            }
        }
    }

    /** Compare new states to cached and fire popups for any that crossed thresholds */
    static #onDateAdvanced(): void {
        const g = game as any;
        const crossings: Array<{
            actorName: string;
            itemName: string;
            oldState: MaintenanceState;
            newState: MaintenanceState;
        }> = [];

        for (const actor of g.actors ?? []) {
            if (actor.type !== "acolyte" && actor.type !== "npc") continue;

            for (const item of actor.items ?? []) {
                if (item.type !== "cybernetic") continue;
                if (!item.system?.installed) continue;

                const newState: MaintenanceState = item.maintenanceState ?? "normal";
                const cached = CyberneticMaintenanceNotifier.#cache.get(item.id);
                const oldState = cached?.state ?? "normal";

                if (STATE_SEVERITY[newState] > STATE_SEVERITY[oldState]) {
                    crossings.push({
                        actorName: actor.name ?? "Unknown",
                        itemName: item.name ?? "Cybernetic",
                        oldState,
                        newState,
                    });
                }

                // Update cache
                CyberneticMaintenanceNotifier.#cache.set(item.id, {
                    actorId: actor.id,
                    actorName: actor.name ?? "Unknown",
                    itemId: item.id,
                    itemName: item.name ?? "Cybernetic",
                    state: newState,
                });
            }
        }

        if (crossings.length > 0) {
            CyberneticMaintenanceNotifier.#showPopup(crossings);
        }
    }

    /** Show a single GM dialog listing all degradation crossings */
    static #showPopup(
        crossings: Array<{
            actorName: string;
            itemName: string;
            oldState: MaintenanceState;
            newState: MaintenanceState;
        }>,
    ): void {
        const entries = crossings
            .map((c) => {
                const stateLabel = game.i18n.localize(`DH2E.Cybernetic.State.${c.newState}`);
                const body = game.i18n.format("DH2E.Cybernetic.Maintenance.AlertBody", {
                    actor: c.actorName,
                    cybernetic: c.itemName,
                    state: stateLabel,
                });
                const suggestion = SUGGESTION_KEYS[c.newState]
                    ? game.i18n.localize(SUGGESTION_KEYS[c.newState]!)
                    : "";
                return `
                    <div class="degradation-entry" style="margin-bottom: 0.75rem; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 3px;">
                        <p style="margin: 0 0 0.25rem; color: var(--dh2e-text-primary, #d0cfc8);"><strong>${body}</strong></p>
                        ${suggestion ? `<p style="margin: 0; font-style: italic; color: var(--dh2e-text-secondary, #a0a0a8); font-size: 0.85rem;">${suggestion}</p>` : ""}
                    </div>
                `;
            })
            .join("");

        const content = `
            <div style="padding: 0.5rem;">
                ${entries}
                <label style="display:block; margin-top: 0.5rem;">
                    <span style="font-size: 0.75rem; color: var(--dh2e-text-secondary, #a0a0a8); text-transform: uppercase; letter-spacing: 0.05em;">
                        ${game.i18n.localize("DH2E.Cybernetic.Maintenance.FlavorPlaceholder")}
                    </span>
                    <textarea
                        name="flavor"
                        rows="3"
                        style="width: 100%; margin-top: 0.25rem; background: var(--dh2e-bg-dark, #1a1a1f); color: var(--dh2e-text-primary, #d0cfc8); border: 1px solid var(--dh2e-border, #4a4a55); border-radius: 3px; padding: 0.5rem; font-family: inherit; resize: vertical;"
                    ></textarea>
                </label>
            </div>
        `;

        new (foundry.applications.api as any).DialogV2({
            window: {
                title: game.i18n.localize("DH2E.Cybernetic.Maintenance.AlertTitle"),
                icon: "fa-solid fa-gear",
            },
            content,
            buttons: [
                {
                    action: "post",
                    label: game.i18n.localize("DH2E.Cybernetic.Maintenance.PostToChat"),
                    icon: "fa-solid fa-comment",
                    callback: (_event: Event, button: HTMLElement) => {
                        const textarea = button
                            .closest(".dialog")
                            ?.querySelector("textarea[name='flavor']") as HTMLTextAreaElement | null;
                        const flavor = textarea?.value?.trim();
                        if (flavor) {
                            CyberneticMaintenanceNotifier.#postFlavorToChat(flavor, crossings);
                        }
                    },
                },
                {
                    action: "dismiss",
                    label: game.i18n.localize("Cancel"),
                    default: true,
                },
            ],
            position: { width: 480 },
        }).render(true);
    }

    /** Post GM flavor text as a narrative chat message */
    static async #postFlavorToChat(
        flavor: string,
        crossings: Array<{ actorName: string; itemName: string; newState: MaintenanceState }>,
    ): Promise<void> {
        const affected = crossings
            .map((c) => `${c.actorName}'s ${c.itemName}`)
            .join(", ");

        const content = `
            <div class="dh2e chat-card maintenance-alert">
                <header>
                    <i class="fa-solid fa-gear"></i>
                    <span>${game.i18n.localize("DH2E.Cybernetic.Maintenance.AlertTitle")}</span>
                </header>
                <p class="affected" style="font-size: 0.75rem; color: var(--dh2e-text-secondary, #a0a0a8); margin: 0.25rem 0;">${affected}</p>
                <blockquote style="border-left: 2px solid var(--dh2e-gold-muted, #8a7a3e); padding-left: 0.5rem; margin: 0.5rem 0; font-style: italic; color: var(--dh2e-text-primary, #d0cfc8);">${flavor}</blockquote>
            </div>
        `;

        await ChatMessage.create({
            content,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            whisper: [],
        });
    }
}

export { CyberneticMaintenanceNotifier };
