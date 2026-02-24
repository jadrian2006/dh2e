/**
 * Delegated event handlers for chat card interactions.
 *
 * Handles button clicks within chat messages (Roll Damage, Spend Fate, etc.)
 */
class ChatListenersDH2e {
    /** Register delegated listeners on the chat log */
    static listen(): void {
        Hooks.on("renderChatMessage", (message: unknown, html: unknown) => {
            // V13 may pass jQuery, HTMLElement, or other wrapper — handle all cases
            let element: HTMLElement | null = null;
            if (html instanceof HTMLElement) {
                element = html;
            } else if (html && typeof html === "object" && 0 in (html as Record<number, unknown>)) {
                const first = (html as Record<number, unknown>)[0];
                if (first instanceof HTMLElement) element = first;
            }
            if (element) ChatListenersDH2e.#bindListeners(element, message as StoredDocument<ChatMessage>);
        });
    }

    static #bindListeners(html: HTMLElement, message: StoredDocument<ChatMessage>): void {
        // Roll Damage button
        html.querySelectorAll<HTMLButtonElement>("[data-action='roll-damage']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onRollDamage(message));
        });

        // Spend Fate button (future)
        html.querySelectorAll<HTMLButtonElement>("[data-action='spend-fate']").forEach((btn) => {
            btn.addEventListener("click", ChatListenersDH2e.#onSpendFate);
        });

        // Critical Override button (GM only)
        html.querySelectorAll<HTMLButtonElement>("[data-action='override-critical']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onOverrideCritical(message, btn));
        });

        // Critical Undo button (GM only)
        html.querySelectorAll<HTMLButtonElement>("[data-action='undo-critical']").forEach((btn) => {
            btn.addEventListener("click", () => ChatListenersDH2e.#onUndoCritical(message, btn));
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

        // Build damage card HTML
        const hitsHtml = damageRolls.map((d) =>
            `<div class="damage-hit">
                <span class="hit-location">${d.locationLabel}</span>
                <span class="hit-damage">${d.rawDamage}</span>
                <span class="hit-formula">(${d.formula})</span>
            </div>`,
        ).join("");

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
                <div class="damage-info">
                    <span>Pen ${penetration}</span>
                    <span class="damage-type">${damageType}</span>
                </div>
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

    static #onSpendFate(_event: MouseEvent): void {
        console.log("Spend Fate — coming in Milestone 6");
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
}

export { ChatListenersDH2e };
