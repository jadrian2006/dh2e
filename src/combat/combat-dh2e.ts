/**
 * Custom Combat document for DH2E.
 *
 * - Initiative formula: 1d10 + Agility Bonus
 * - nextTurn: resets combatant actions, decrements condition durations
 * - Custom sorting: descending initiative, ties broken by Agility
 */
class CombatDH2e extends Combat {
    /** Advance to the next turn, resetting actions and decrementing conditions */
    override async nextTurn(): Promise<this> {
        // Get the combatant whose turn is ending
        const current = this.combatant as CombatantDH2e | undefined;
        if (current) {
            // Reset action economy flags
            await current.resetActions();

            // Clear overwatch at end of turn
            const overwatchActive = (current as any).getFlag?.(SYSTEM_ID, "overwatchActive");
            if (overwatchActive) {
                const { OverwatchHandler } = await import("./overwatch.ts");
                await OverwatchHandler.clearOverwatch(current);
            }

            // Check grapple maintenance
            const grappleTarget = (current as any).getFlag?.(SYSTEM_ID, "grapplingWith");
            if (grappleTarget) {
                const actor = current.actor;
                const target = (game as any).actors?.get(grappleTarget);
                if (actor && target) {
                    const { GrappleHandler } = await import("./grapple.ts");
                    const maintained = await GrappleHandler.maintainGrapple(actor, target);
                    if (!maintained) {
                        ui.notifications.info(`${actor.name}'s grapple on ${target.name} is broken!`);
                    }
                }
            }

            // Decrement condition durations on the combatant's actor
            const actor = current.actor;
            if (actor) {
                await CombatDH2e.#decrementConditions(actor);
            }
        }

        return super.nextTurn() as Promise<this>;
    }

    /** Sort combatants by initiative (descending), then Agility bonus as tiebreaker */
    override _sortCombatants(
        a: Combatant,
        b: Combatant,
    ): number {
        const ia = a.initiative ?? -Infinity;
        const ib = b.initiative ?? -Infinity;
        if (ia !== ib) return ib - ia;

        // Tiebreaker: Agility bonus (higher goes first)
        const agA = (a.actor as any)?.system?.characteristics?.ag?.bonus ?? 0;
        const agB = (b.actor as any)?.system?.characteristics?.ag?.bonus ?? 0;
        if (agA !== agB) return agB - agA;

        // Final tiebreaker: alphabetical by name
        return (a.name ?? "").localeCompare(b.name ?? "");
    }

    /** Decrement remainingRounds on all conditions, auto-delete expired ones */
    static async #decrementConditions(actor: Actor): Promise<void> {
        const conditions = actor.items.filter((i: Item) => i.type === "condition");
        const toDelete: string[] = [];
        const toUpdate: { _id: string; "system.remainingRounds": number }[] = [];

        for (const cond of conditions) {
            const remaining = (cond.system as any)?.remainingRounds ?? 0;
            if (remaining <= 0) continue; // 0 = permanent, skip

            const newRemaining = remaining - 1;
            if (newRemaining <= 0) {
                toDelete.push(cond.id!);
            } else {
                toUpdate.push({
                    _id: cond.id!,
                    "system.remainingRounds": newRemaining,
                });
            }
        }

        if (toUpdate.length > 0) {
            await actor.updateEmbeddedDocuments("Item", toUpdate);
        }
        if (toDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("Item", toDelete);
        }
    }
}

// Reference the custom combatant for type checking
type CombatantDH2e = InstanceType<typeof import("./combatant-dh2e.ts").CombatantDH2e>;

export { CombatDH2e };
