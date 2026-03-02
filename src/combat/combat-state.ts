/**
 * Combat state utilities.
 *
 * Provides helpers to determine if the game is currently in active combat
 * and whether a specific actor is a combatant.
 */

/** Check if there is an active combat encounter in progress */
function isInCombat(): boolean {
    const g = game as any;
    const combat = g.combat;
    return combat?.started === true && combat?.round > 0;
}

/** Check if a specific actor is currently in an active combat encounter */
function isActorInCombat(actorId: string): boolean {
    const g = game as any;
    const combat = g.combat;
    if (!combat?.started || combat.round <= 0) return false;
    return combat.combatants?.some((c: any) => c.actorId === actorId) ?? false;
}

/** Look up the CombatantDH2e for an actor in the active combat */
function getCombatantForActor(actorId: string): any | null {
    const g = game as any;
    const combat = g.combat;
    if (!combat?.started || combat.round <= 0) return null;
    return combat.combatants?.find((c: any) => c.actorId === actorId) ?? null;
}

/**
 * Consume an action from the combatant's action economy.
 * Warns if the action is unavailable but still consumes (soft gate / GM override).
 * Silently returns if the actor is not in active combat.
 */
async function consumeCombatAction(actorId: string, actionType: "half" | "full"): Promise<void> {
    const combatant = getCombatantForActor(actorId);
    if (!combatant) return; // not in combat — no action tracking

    if (!combatant.hasAction(actionType)) {
        const actionLabel = actionType === "half" ? "Half Action" : "Full Action";
        ui.notifications.warn(
            game.i18n?.format("DH2E.Action.Unavailable", { action: actionLabel })
            ?? `No ${actionLabel} available this turn.`,
        );
    }

    await combatant.useAction(actionType);
}

export { isInCombat, isActorInCombat, getCombatantForActor, consumeCombatAction };
