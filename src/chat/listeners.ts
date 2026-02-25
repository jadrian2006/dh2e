import { GMOverrideHandler } from "./gm-override.ts";
import { ChatApplyHandler } from "./apply-handler.ts";
import { FateDialog } from "@ui/fate-dialog.ts";

/**
 * Delegated event handlers for chat card interactions.
 *
 * Handles button clicks within chat messages (Roll Damage, Spend Fate, etc.)
 */
class ChatListenersDH2e {
    /** Register delegated listeners on the chat log */
    static listen(): void {
        Hooks.on("renderChatMessageHTML", (message: unknown, html: HTMLElement) => {
            ChatListenersDH2e.#bindListeners(html, message as StoredDocument<ChatMessage>);
        });
    }

    static #bindListeners(html: HTMLElement, message: StoredDocument<ChatMessage>): void {
        // Roll Damage button
        html.querySelectorAll<HTMLButtonElement>("[data-action='roll-damage']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onRollDamage(message));
        });

        // Spend Fate button
        html.querySelectorAll<HTMLButtonElement>("[data-action='spend-fate']").forEach((btn) => {
            btn.addEventListener("click", (e) => ChatListenersDH2e.#onSpendFate(e));
        });

        // Critical Override button (GM only)
        html.querySelectorAll<HTMLButtonElement>("[data-action='override-critical']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onOverrideCritical(message, btn));
        });

        // Critical Undo button (GM only)
        html.querySelectorAll<HTMLButtonElement>("[data-action='undo-critical']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onUndoCritical(message, btn));
        });

        // Apply Phenomena effect (GM only)
        html.querySelectorAll<HTMLButtonElement>("[data-action='apply-phenomena']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onApplyPhenomena(message));
        });

        // GM Override gear button
        html.querySelectorAll<HTMLButtonElement>("[data-action='gm-override']").forEach((btn) => {
            btn.addEventListener("click", () => GMOverrideHandler.showOverrideDialog(message));
        });

        // Suppressive fire — resolve pinning tests
        html.querySelectorAll<HTMLButtonElement>("[data-action='resolve-pinning']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onResolvePinning(message));
        });

        // Grapple actions
        html.querySelectorAll<HTMLButtonElement>("[data-action='grapple-action']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onGrappleAction(message, btn));
        });

        // Apply damage button
        html.querySelectorAll<HTMLButtonElement>("[data-action='apply-damage']").forEach((btn) => {
            btn.addEventListener("click", () => ChatApplyHandler.applyDamage(message));
        });

        // Revert damage button
        html.querySelectorAll<HTMLButtonElement>("[data-action='revert-damage']").forEach((btn) => {
            btn.addEventListener("click", () => ChatApplyHandler.revertDamage(message));
        });

        // Expandable modifier breakdown
        html.querySelectorAll<HTMLDetailsElement>(".modifier-breakdown").forEach((details) => {
            details.addEventListener("toggle", () => {
                // Allow Foundry to resize the chat message
            });
        });
    }

    static async #onRollDamage(message: StoredDocument<ChatMessage>): Promise<void> {
        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags || flags.type !== "attack") return;

        const result = flags.result as Record<string, unknown>;
        if (!result) return;

        // Look up actor and weapon
        const actor = (game as any).actors?.get(result.actorId as string) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the attacking actor.");
            return;
        }

        const weapon = actor.items.get(result.weaponId as string) as Item | undefined;
        if (!weapon) {
            ui.notifications?.warn("Could not find the weapon used.");
            return;
        }

        const sys = (weapon as any).system ?? {};
        const formula = sys.damage?.formula ?? "1d10";
        const penetration = sys.penetration ?? 0;
        const damageType = sys.damage?.type ?? "impact";
        const hits = (result.hits as Array<{ locationLabel: string; location: string }>) ?? [];

        // Roll damage for each hit
        const damageRolls: Array<{ locationLabel: string; rawDamage: number; formula: string }> = [];

        for (const hit of hits) {
            const roll = new foundry.dice.Roll(formula);
            await roll.evaluate();
            damageRolls.push({
                locationLabel: hit.locationLabel,
                rawDamage: roll.total ?? 0,
                formula,
            });
        }

        const totalDamage = damageRolls.reduce((sum, r) => sum + r.rawDamage, 0);

        const isGM = (game as any).user?.isGM ?? false;

        // Build damage card HTML — GM sees full breakdown, players see only totals
        const hitsHtml = damageRolls.map((d) => {
            if (isGM) {
                return `<div class="damage-hit">
                    <span class="hit-location">${d.locationLabel}</span>
                    <span class="hit-damage">${d.rawDamage}</span>
                    <span class="hit-formula">(${d.formula})</span>
                </div>`;
            }
            return `<div class="damage-hit">
                <span class="hit-location">${d.locationLabel}</span>
                <span class="hit-damage">${d.rawDamage}</span>
            </div>`;
        }).join("");

        const infoHtml = isGM
            ? `<div class="damage-info">
                    <span>Pen ${penetration}</span>
                    <span class="damage-type">${damageType}</span>
                </div>`
            : "";

        const content = `<div class="dh2e chat-card damage-card">
            <header class="card-header">
                <h3>${(weapon as any).name} — Damage</h3>
            </header>
            <div class="card-body">
                <div class="damage-hits">${hitsHtml}</div>
                <div class="damage-total">
                    <span class="total-label">Total Raw Damage</span>
                    <span class="total-value">${totalDamage}</span>
                </div>
                ${infoHtml}
            </div>
        </div>`;

        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };

        await fd.ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "damage",
                    result: {
                        weaponName: (weapon as any).name,
                        hits: damageRolls,
                        totalDamage,
                        penetration,
                        damageType,
                    },
                },
            },
        });
    }

    static async #onSpendFate(event: MouseEvent): Promise<void> {
        // Find the parent chat message to get actor + flags
        const btn = event.currentTarget as HTMLElement;
        const msgEl = btn.closest("[data-message-id]");
        if (!msgEl) return;
        const messageId = (msgEl as HTMLElement).dataset.messageId;
        if (!messageId) return;
        const message = (game as any).messages?.get(messageId) as StoredDocument<ChatMessage> | undefined;
        if (!message) return;

        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags) return;

        const result = flags.result as Record<string, unknown> | undefined;
        const actorId = result?.actorId as string ?? (message as any).speaker?.actor;
        if (!actorId) return;

        const actor = (game as any).actors?.get(actorId) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the actor.");
            return;
        }

        const fateResult = await FateDialog.execute(actor);
        if (fateResult.cancelled || !fateResult.action) return;

        // Apply fate cost
        if (fateResult.burn) {
            const ok = await FateDialog.burnFate(actor);
            if (!ok) return;
        } else {
            const ok = await FateDialog.spendFate(actor);
            if (!ok) return;
        }

        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };

        switch (fateResult.action) {
            case "reroll": {
                // Re-roll d100 with the same target number, post new card
                const target = (result?.target as number) ?? 50;
                const roll = new foundry.dice.Roll("1d100");
                await roll.evaluate();
                const newRoll = roll.total ?? 50;
                const success = newRoll <= target;
                const dos = success ? Math.floor(target / 10) - Math.floor(newRoll / 10) + 1 : 0;
                const dof = success ? 0 : Math.floor(newRoll / 10) - Math.floor(target / 10) + 1;
                const label = (result?.label as string) ?? (result?.skillName as string) ?? "Test";

                await fd.ChatMessage.create({
                    content: `<div class="dh2e chat-card check-card fate-reroll">
                        <header class="card-header">
                            <h3>${label} <span class="fate-tag">[Fate Reroll]</span></h3>
                        </header>
                        <div class="card-body">
                            <div class="roll-result ${success ? "success" : "failure"}">
                                <span class="roll-value">${newRoll}</span>
                                <span class="roll-target">vs ${target}</span>
                            </div>
                            <div class="dos-display">${success ? `${dos} DoS` : `${dof} DoF`}</div>
                        </div>
                    </div>`,
                    speaker,
                    flags: {
                        [SYSTEM_ID]: {
                            type: flags.type,
                            fateReroll: true,
                            result: { ...result, roll: newRoll, dos, dof, success },
                        },
                    },
                });
                break;
            }

            case "plus10": {
                // Add +10, recalculate and update existing card
                const target = (result?.target as number) ?? 50;
                const roll = (result?.roll as number) ?? 50;
                const newTarget = target + 10;
                const success = roll <= newTarget;
                const dos = success ? Math.floor(newTarget / 10) - Math.floor(roll / 10) + 1 : 0;
                const dof = success ? 0 : Math.floor(roll / 10) - Math.floor(newTarget / 10) + 1;

                await (message as any).update({
                    [`flags.${SYSTEM_ID}.result.target`]: newTarget,
                    [`flags.${SYSTEM_ID}.result.success`]: success,
                    [`flags.${SYSTEM_ID}.result.dos`]: dos,
                    [`flags.${SYSTEM_ID}.result.dof`]: dof,
                    [`flags.${SYSTEM_ID}.fatePlus10`]: true,
                });

                await fd.ChatMessage.create({
                    content: `<div class="dh2e chat-card system-note"><em>${actor.name} spent a Fate Point for +10 (target now ${newTarget}).</em></div>`,
                    speaker,
                });
                break;
            }

            case "halfWounds": {
                // Halve the wound total on a damage card
                const totalDamage = (result?.totalDamage as number) ?? (result?.woundsDealt as number) ?? 0;
                const halved = Math.floor(totalDamage / 2);

                await (message as any).update({
                    [`flags.${SYSTEM_ID}.result.totalDamage`]: halved,
                    [`flags.${SYSTEM_ID}.result.woundsDealt`]: halved,
                    [`flags.${SYSTEM_ID}.fateHalved`]: true,
                });

                await fd.ChatMessage.create({
                    content: `<div class="dh2e chat-card system-note"><em>${actor.name} spent a Fate Point to halve damage (${totalDamage} → ${halved}).</em></div>`,
                    speaker,
                });
                break;
            }

            case "survive":
            case "autoPass": {
                const actionLabel = fateResult.action === "survive" ? "survive certain death" : "automatically pass a test";
                await fd.ChatMessage.create({
                    content: `<div class="dh2e chat-card system-note fate-burn"><em>${actor.name} burned a Fate Point to ${actionLabel}!</em></div>`,
                    speaker,
                });
                break;
            }
        }
    }

    /** GM override: allow changing the critical severity or effect */
    static async #onOverrideCritical(message: StoredDocument<ChatMessage>, btn: HTMLButtonElement): Promise<void> {
        if (!(game as any).user?.isGM) {
            ui.notifications?.warn("Only the GM can override critical effects.");
            return;
        }

        const actorId = btn.dataset.actorId;
        if (!actorId) return;

        const actor = (game as any).actors?.get(actorId) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the affected actor.");
            return;
        }

        // Find the most recent critical injury on the actor
        const criticals = actor.items.filter((i: Item) => i.type === "critical-injury");
        if (criticals.length === 0) {
            ui.notifications?.info("No critical injuries to override.");
            return;
        }

        // Open the latest critical injury sheet for editing
        const latest = criticals[criticals.length - 1];
        latest.sheet?.render(true);
    }

    /** Apply phenomena/perils effect — placeholder for GM manual resolution */
    static async #onApplyPhenomena(message: StoredDocument<ChatMessage>): Promise<void> {
        if (!(game as any).user?.isGM) {
            ui.notifications?.warn("Only the GM can apply phenomena effects.");
            return;
        }

        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags || flags.type !== "phenomena") return;

        const result = flags.result as Record<string, unknown> | undefined;
        if (!result) return;

        ui.notifications?.info(`Phenomena effect "${result.title}" acknowledged by GM.`);
    }

    /** GM undo: remove the most recent critical injury */
    static async #onUndoCritical(message: StoredDocument<ChatMessage>, btn: HTMLButtonElement): Promise<void> {
        if (!(game as any).user?.isGM) {
            ui.notifications?.warn("Only the GM can undo critical effects.");
            return;
        }

        const actorId = btn.dataset.actorId;
        if (!actorId) return;

        const actor = (game as any).actors?.get(actorId) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the affected actor.");
            return;
        }

        // Remove the most recent critical injury
        const criticals = actor.items.filter((i: Item) => i.type === "critical-injury");
        if (criticals.length === 0) {
            ui.notifications?.info("No critical injuries to undo.");
            return;
        }

        const latest = criticals[criticals.length - 1];
        await actor.deleteEmbeddedDocuments("Item", [latest.id!]);
        ui.notifications?.info(`Removed critical injury "${latest.name}" from ${actor.name}.`);
    }
    /** Resolve pinning tests for suppressive fire targets */
    static async #onResolvePinning(message: StoredDocument<ChatMessage>): Promise<void> {
        if (!(game as any).user?.isGM) {
            ui.notifications?.warn("Only the GM can resolve pinning tests.");
            return;
        }

        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags || flags.type !== "suppressive-fire") return;

        const result = flags.result as Record<string, unknown>;
        const targetIds = (result?.targetIds as string[]) ?? [];

        if (targetIds.length === 0) {
            ui.notifications?.info("No targets specified for pinning tests.");
            return;
        }

        const { SuppressiveFireResolver } = await import("@combat/suppressive-fire.ts");
        await SuppressiveFireResolver.resolvePinning(targetIds);
    }

    /** Handle grapple action button clicks */
    static async #onGrappleAction(message: StoredDocument<ChatMessage>, btn: HTMLButtonElement): Promise<void> {
        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags || flags.type !== "grapple") return;

        const result = flags.result as Record<string, unknown>;
        const attackerId = result?.attackerId as string;
        const defenderId = result?.defenderId as string;
        const action = btn.dataset.grapple as string;

        const g = game as any;
        const attacker = g.actors?.get(attackerId) as Actor | undefined;
        const defender = g.actors?.get(defenderId) as Actor | undefined;

        if (!attacker || !defender) {
            ui.notifications?.warn("Could not find grapple participants.");
            return;
        }

        const { GrappleHandler } = await import("@combat/grapple.ts");
        await GrappleHandler.executeAction(action as any, attacker, defender);
    }
}

export { ChatListenersDH2e };
