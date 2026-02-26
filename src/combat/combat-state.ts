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

export { isInCombat, isActorInCombat };
