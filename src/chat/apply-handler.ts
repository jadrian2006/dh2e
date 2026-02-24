/**
 * Handles applying and reverting effects from chat cards.
 *
 * Supports:
 * - Auto-apply damage to target actors
 * - Revert (undo) previously applied damage using snapshot data
 * - Apply conditions/heals from chat cards
 *
 * Snapshot data is stored in ChatMessage flags for rollback capability.
 */

interface DamageSnapshot {
    targetId: string;
    field: string;
    previous: number;
    woundsDealt: number;
    hitDetails: { location: string; woundsDealt: number }[];
}

class ChatApplyHandler {
    /**
     * Apply damage from a damage chat card to the target actor.
     * Updates the message flags to mark as applied.
     */
    static async applyDamage(message: StoredDocument<ChatMessage>): Promise<void> {
        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags || flags.type !== "damage") return;

        const snapshot = flags.snapshot as DamageSnapshot | undefined;
        if (!snapshot?.targetId) {
            ui.notifications?.warn("No target specified for damage application.");
            return;
        }

        const actor = (game as any).actors?.get(snapshot.targetId) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the target actor.");
            return;
        }

        // Check ownership — GM can always apply, owner can apply to their own
        const isGM = (game as any).user?.isGM ?? false;
        const isOwner = (actor as any).isOwner ?? false;
        if (!isGM && !isOwner) {
            ui.notifications?.warn("You don't have permission to apply damage to this actor.");
            return;
        }

        // Record current wound value before applying (for revert)
        const currentWounds = (actor as any).system?.wounds?.value ?? 0;

        // Apply via the actor's applyDamage method if available, otherwise direct update
        if (typeof (actor as any).applyDamage === "function") {
            // Use first hit's location and damage type for critical routing
            const result = flags.result as Record<string, unknown>;
            const hits = result?.hits as Array<{ location: string; woundsDealt: number }> | undefined;
            const firstHit = hits?.[0];
            await (actor as any).applyDamage(
                snapshot.woundsDealt,
                firstHit?.location,
            );
        } else {
            // Fallback: directly reduce wounds
            const newValue = Math.max(0, currentWounds - snapshot.woundsDealt);
            await actor.update({ [snapshot.field]: newValue });
        }

        // Update the snapshot with the actual pre-apply value and mark as applied
        await (message as any).update({
            [`flags.${SYSTEM_ID}.snapshot.previous`]: currentWounds,
            [`flags.${SYSTEM_ID}.applied`]: true,
        });

        // Re-render the card to show applied state
        ChatApplyHandler.#rerenderCard(message);

        ui.notifications?.info(`Applied ${snapshot.woundsDealt} wounds to ${actor.name}.`);
    }

    /**
     * Revert previously applied damage using the stored snapshot.
     * Restores the target's wounds to their pre-damage value.
     */
    static async revertDamage(message: StoredDocument<ChatMessage>): Promise<void> {
        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags || flags.type !== "damage") return;

        const snapshot = flags.snapshot as DamageSnapshot | undefined;
        if (!snapshot?.targetId) {
            ui.notifications?.warn("No snapshot data to revert.");
            return;
        }

        // Only GM can revert
        const isGM = (game as any).user?.isGM ?? false;
        if (!isGM) {
            ui.notifications?.warn("Only the GM can revert applied damage.");
            return;
        }

        const actor = (game as any).actors?.get(snapshot.targetId) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the target actor.");
            return;
        }

        // Restore wounds to the pre-damage value
        await actor.update({ [snapshot.field]: snapshot.previous });

        // Mark as not applied
        await (message as any).update({
            [`flags.${SYSTEM_ID}.applied`]: false,
        });

        ChatApplyHandler.#rerenderCard(message);

        ui.notifications?.info(`Reverted ${snapshot.woundsDealt} wounds on ${actor.name}. Wounds restored to ${snapshot.previous}.`);
    }

    /**
     * Apply a condition to a target actor from a chat card.
     */
    static async applyCondition(
        targetId: string,
        conditionSlug: string,
        conditionName: string,
    ): Promise<void> {
        const actor = (game as any).actors?.get(targetId) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the target actor.");
            return;
        }

        // Check if condition already exists
        const existing = actor.items.find(
            (i: Item) => i.type === "condition" && (i.system as any)?.slug === conditionSlug,
        );
        if (existing) {
            ui.notifications?.info(`${actor.name} already has ${conditionName}.`);
            return;
        }

        await actor.createEmbeddedDocuments("Item", [{
            name: conditionName,
            type: "condition",
            img: `systems/dh2e/icons/conditions/${conditionSlug}.svg`,
            system: {
                description: "",
                slug: conditionSlug,
                duration: "",
                stackable: false,
                remainingRounds: 0,
            },
        }]);

        ui.notifications?.info(`Applied ${conditionName} to ${actor.name}.`);
    }

    /**
     * Heal wounds on a target actor.
     */
    static async applyHealing(
        targetId: string,
        woundsHealed: number,
        message?: StoredDocument<ChatMessage>,
    ): Promise<void> {
        const actor = (game as any).actors?.get(targetId) as Actor | undefined;
        if (!actor) {
            ui.notifications?.warn("Could not find the target actor.");
            return;
        }

        if (typeof (actor as any).healDamage === "function") {
            await (actor as any).healDamage(woundsHealed);
        } else {
            const current = (actor as any).system?.wounds?.value ?? 0;
            const max = (actor as any).system?.wounds?.max ?? current;
            const newValue = Math.min(max, current + woundsHealed);
            await actor.update({ "system.wounds.value": newValue });
        }

        if (message) {
            await (message as any).update({
                [`flags.${SYSTEM_ID}.applied`]: true,
            });
        }

        ui.notifications?.info(`Healed ${woundsHealed} wounds on ${actor.name}.`);
    }

    /** Force a chat message to re-render by triggering Foundry's render pipeline */
    static #rerenderCard(message: StoredDocument<ChatMessage>): void {
        try {
            // Find the chat message element and re-render it
            const el = document.querySelector(`[data-message-id="${(message as any).id}"]`);
            if (el) {
                (message as any).render?.(false);
            }
        } catch {
            // Non-critical — card will update on next chat scroll
        }
    }
}

export { ChatApplyHandler };
export type { DamageSnapshot };
