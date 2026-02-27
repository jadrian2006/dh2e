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

        // Recover ammo button on attack cards
        html.querySelectorAll<HTMLButtonElement>("[data-action='recover-ammo']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onRecoverAmmo(message, btn));
        });

        // Suppressive fire — resolve pinning tests
        html.querySelectorAll<HTMLButtonElement>("[data-action='resolve-pinning']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onResolvePinning(message));
        });

        // Grapple actions
        html.querySelectorAll<HTMLButtonElement>("[data-action='grapple-action']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onGrappleAction(message, btn));
        });

        // Divination session effect Apply button (GM only)
        html.querySelectorAll<HTMLButtonElement>("[data-action='apply-divination']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onApplyDivination(message, btn));
        });

        // Apply damage button
        html.querySelectorAll<HTMLButtonElement>("[data-action='apply-damage']").forEach((btn) => {
            btn.addEventListener("click", () => ChatApplyHandler.applyDamage(message));
        });

        // Revert damage button
        html.querySelectorAll<HTMLButtonElement>("[data-action='revert-damage']").forEach((btn) => {
            btn.addEventListener("click", () => ChatApplyHandler.revertDamage(message));
        });

        // Right-click reroll on check/attack cards
        html.querySelectorAll<HTMLElement>(".check-card, .attack-card").forEach((el) => {
            el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                ChatListenersDH2e.#onSpendFate(e);
            });
        });

        // Expandable modifier breakdown
        html.querySelectorAll<HTMLDetailsElement>(".modifier-breakdown").forEach((details) => {
            details.addEventListener("toggle", () => {
                // Allow Foundry to resize the chat message
            });
        });

        // Inline enricher: condition link
        html.querySelectorAll<HTMLAnchorElement>(".dh2e-enricher.condition-link").forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                ChatListenersDH2e.#onConditionLink(link);
            });
        });

        // Inline enricher: check link
        html.querySelectorAll<HTMLAnchorElement>("[data-action='inline-check']").forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                ChatListenersDH2e.#onInlineCheck(link);
            });
        });

        // Inline enricher: damage link
        html.querySelectorAll<HTMLAnchorElement>("[data-action='inline-damage']").forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                ChatListenersDH2e.#onInlineDamage(link);
            });
        });

        // Item card action buttons (send-to-chat)
        html.querySelectorAll<HTMLButtonElement>(".item-card .card-action-btn").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onItemCardAction(message, btn));
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

        // Get target — required for damage calculation (armour, TB)
        const target = (game as any).user?.targets?.first()?.actor as Actor | undefined;
        if (!target) {
            ui.notifications?.warn(game.i18n?.localize("DH2E.Attack.NoTarget") ?? "No target selected. Select a target token before rolling damage.");
            return;
        }

        // Reconstruct AttackResult from stored flags
        const hits = (result.hits as Array<{ locationLabel: string; location: string; locationRoll?: number }>) ?? [];
        const attackResult = {
            success: result.success as boolean ?? true,
            degrees: result.degrees as number ?? 0,
            roll: result.roll as number ?? 0,
            target: result.target as number ?? 0,
            hitCount: result.hitCount as number ?? hits.length,
            hits: hits.map((h) => ({
                location: (h.location ?? "body") as any,
                locationLabel: h.locationLabel ?? "Body",
                locationRoll: h.locationRoll ?? 0,
            })),
            fireMode: (result.fireMode as any) ?? "single",
            weaponName: result.weaponName as string ?? weapon.name,
        };

        // Delegate to AttackResolver.rollDamage which handles armour, TB, pen, synthetics
        const { AttackResolver } = await import("@combat/attack.ts");
        await AttackResolver.rollDamage(attackResult, weapon, target);
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
    /** Recover ammo from an attack (undo ammo consumption) */
    static async #onRecoverAmmo(message: StoredDocument<ChatMessage>, btn: HTMLButtonElement): Promise<void> {
        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags) return;

        const ammoFlags = flags.ammo as { weaponId: string; roundsConsumed: number; recovered: boolean } | undefined;
        if (!ammoFlags) return;

        if (ammoFlags.recovered) {
            ui.notifications?.info(game.i18n?.localize("DH2E.Ammo.AlreadyRecovered") ?? "Ammunition already recovered for this attack.");
            return;
        }

        const result = flags.result as Record<string, unknown> | undefined;
        const actorId = result?.actorId as string;
        const g = game as any;
        const actor = g.actors?.get(actorId) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the attacking actor.");
            return;
        }

        const weapon = actor.items.get(ammoFlags.weaponId) as any;
        if (!weapon) {
            ui.notifications?.warn("Could not find the weapon.");
            return;
        }

        const { recoverAmmo } = await import("@combat/ammo.ts");
        await recoverAmmo(weapon, ammoFlags.roundsConsumed);

        // Mark as recovered in message flags
        await (message as any).update({
            [`flags.${SYSTEM_ID}.ammo.recovered`]: true,
        });

        // Disable the button visually
        btn.disabled = true;
        btn.style.opacity = "0.4";

        // Post system note
        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
        await fd.ChatMessage.create({
            content: `<div class="dh2e chat-card system-note"><em>${game.i18n?.format("DH2E.Ammo.Recovered", {
                actor: actor.name,
                count: String(ammoFlags.roundsConsumed),
            }) ?? `${actor.name} recovered ${ammoFlags.roundsConsumed} round(s).`}</em></div>`,
            speaker,
        });
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

    /** Handle item card action button clicks (send-to-chat) */
    static async #onItemCardAction(message: StoredDocument<ChatMessage>, btn: HTMLButtonElement): Promise<void> {
        const action = btn.dataset.action;
        const g = game as any;

        if (action === "roll-skill-use") {
            const skillName = btn.dataset.skill;
            const useSlug = btn.dataset.use;
            if (skillName && useSlug) {
                g.dh2e?.rollSkillUse?.(skillName, useSlug);
            }
        } else if (action === "roll-weapon") {
            const weaponId = btn.dataset.weaponId;
            if (weaponId) {
                g.dh2e?.rollWeapon?.(weaponId);
            }
        } else if (action === "focus-power") {
            const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
            const actorId = flags?.actorId as string | undefined;
            const itemId = flags?.itemId as string | undefined;
            if (actorId && itemId) {
                const actor = g.actors?.get(actorId) as any;
                const power = actor?.items?.get(itemId) as any;
                if (actor && power) {
                    const sys = power.system ?? {};
                    const charKey = sys.focusTest || "wp";
                    const talents = actor.items.filter((i: any) => i.type === "talent");
                    const prTalent = talents.find((t: any) => t.name === "Psy Rating");
                    const psyRating = prTalent?.system?.tier ?? 0;
                    if (psyRating <= 0) {
                        ui.notifications?.warn(game.i18n?.localize("DH2E.Psychic.NoPsyRating") ?? "No Psy Rating.");
                        return;
                    }
                    const { FocusPowerDialog } = await import("@psychic/focus-dialog.ts");
                    const { FocusPowerResolver } = await import("@psychic/focus-power.ts");
                    const result = await FocusPowerDialog.prompt({
                        powerName: power.name ?? "Power",
                        psyRating,
                        description: sys.description ?? "",
                    });
                    if (result.cancelled) return;
                    await FocusPowerResolver.resolve({
                        actor, power, focusCharacteristic: charKey,
                        focusModifier: sys.focusModifier ?? 0,
                        psyRating, mode: result.mode, skipDialog: false,
                    });
                }
            }
        }
    }

    /** Handle divination session effect Apply button */
    static async #onApplyDivination(message: StoredDocument<ChatMessage>, btn: HTMLButtonElement): Promise<void> {
        const { DivinationSessionHandler } = await import("@divination/session-effects.ts");
        await DivinationSessionHandler.handleApply(message, btn);
    }

    /** Open a condition item sheet from an enricher link */
    static async #onConditionLink(link: HTMLAnchorElement): Promise<void> {
        const uuid = link.dataset.uuid;
        if (uuid) {
            const doc = await fromUuid(uuid);
            if (doc) {
                (doc as any).sheet?.render(true);
                return;
            }
        }

        // Fallback: look up by slug in compendium
        const slug = link.dataset.slug;
        if (!slug) return;

        const g = game as any;
        const pack = g.packs?.get("dh2e-data.conditions");
        if (!pack) return;

        const index = await pack.getIndex();
        const entry = index.find((e: any) => {
            const name = e.name?.toLowerCase().replace(/\s+/g, "-");
            return name === slug;
        });
        if (entry) {
            const doc = await pack.getDocument(entry._id);
            (doc as any)?.sheet?.render(true);
        }
    }

    /** Roll a check from an inline enricher link */
    static async #onInlineCheck(link: HTMLAnchorElement): Promise<void> {
        const { CheckDH2e } = await import("@check/check.ts");
        const { CANONICAL_SKILL_CHARS } = await import("@item/skill/uses.ts");

        const typePart = link.dataset.type;
        if (!typePart) return;

        // Resolve actor
        const g = game as any;
        const actor = g.user?.character
            ?? canvas?.tokens?.controlled?.[0]?.actor
            ?? null;

        if (!actor) {
            ui.notifications?.warn(
                g.i18n?.localize("DH2E.Enricher.NoActor")
                    ?? "Select a token or assign a character to roll.",
            );
            return;
        }

        const mod = parseInt(link.dataset.mod ?? "0", 10) || 0;
        const lowerType = typePart.toLowerCase();

        // Characteristic abbreviations
        const charAbbrevs = new Set(["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"]);

        if (charAbbrevs.has(lowerType)) {
            // Characteristic check
            const charKey = lowerType as any;
            const charValue = (actor as any).system?.characteristics?.[charKey]?.value
                ?? (actor as any).system?.characteristics?.[charKey]?.base
                ?? 0;
            const charConfig = (CONFIG as any).DH2E?.characteristics?.[charKey];
            const charLabel = charConfig?.label
                ? (g.i18n?.localize(charConfig.label) ?? typePart)
                : typePart;

            await CheckDH2e.roll({
                actor,
                characteristic: charKey,
                baseTarget: charValue + mod,
                label: `${charLabel} Test`,
                domain: `characteristic:${charKey}`,
            });
        } else {
            // Skill check
            const skillItem = (actor as any).items?.find(
                (i: Item) => i.type === "skill" && i.name === typePart,
            );

            if (skillItem) {
                const sys = skillItem.skillSystem ?? skillItem.system ?? {};
                await CheckDH2e.roll({
                    actor,
                    characteristic: sys.linkedCharacteristic ?? "ws",
                    baseTarget: (skillItem.totalTarget ?? 0) + mod,
                    label: `${skillItem.displayName ?? skillItem.name} Test`,
                    domain: `skill:${typePart.toLowerCase().replace(/\s+/g, "-")}`,
                    skillDescription: sys.description ?? "",
                });
            } else {
                // Synthesize from canonical data
                const linkedChar = CANONICAL_SKILL_CHARS[typePart] ?? "ws";
                const charValue = (actor as any).system?.characteristics?.[linkedChar]?.value
                    ?? (actor as any).system?.characteristics?.[linkedChar]?.base
                    ?? 0;
                await CheckDH2e.roll({
                    actor,
                    characteristic: linkedChar,
                    baseTarget: charValue + mod,
                    label: `${typePart} Test`,
                    domain: `skill:${typePart.toLowerCase().replace(/\s+/g, "-")}`,
                    untrained: true,
                });
            }
        }
    }

    /** Roll damage from an inline enricher link */
    static async #onInlineDamage(link: HTMLAnchorElement): Promise<void> {
        const formula = link.dataset.formula;
        if (!formula) return;

        try {
            const roll = new foundry.dice.Roll(formula);
            await roll.evaluate();

            const label = link.textContent ?? formula;
            const speaker = fd.ChatMessage.getSpeaker?.() ?? {};
            await roll.toMessage({
                speaker,
                flavor: `<strong>${label}</strong>`,
            });
        } catch (e) {
            console.error("DH2E | Inline damage roll failed:", e);
            ui.notifications?.error(`Invalid damage formula: ${formula}`);
        }
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
