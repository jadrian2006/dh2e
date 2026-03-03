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

/** Human-readable label for an action type */
function actionLabel(actionType: string): string {
    switch (actionType) {
        case "half": return "Half Action";
        case "full": return "Full Action";
        case "free": return "Free Action";
        case "reaction": return "Reaction";
        default: return actionType;
    }
}

/**
 * Consume an action from the combatant's action economy.
 *
 * When the action is unavailable:
 * - GM: Shows a confirm dialog offering to override.
 * - Player: Shows a notification that the action is blocked.
 *
 * Returns `true` if the action was consumed, `false` if denied/unavailable.
 * Silently returns `true` if the actor is not in active combat.
 */
async function consumeCombatAction(
    actorId: string,
    actionType: "half" | "full" | "free" | "reaction",
): Promise<boolean> {
    const combatant = getCombatantForActor(actorId);
    if (!combatant) return true; // not in combat — no action tracking

    if (!combatant.hasAction(actionType)) {
        const g = game as any;
        const label = actionLabel(actionType);

        if (g.user?.isGM) {
            // GM gets a confirm dialog to override
            const override = await new Promise<boolean>((resolve) => {
                const d = new (fd.DialogV2 ?? fd.Dialog as any)({
                    window: { title: "Action Override" },
                    content: `<p>${game.i18n?.format("DH2E.Action.Override", { action: label })
                        ?? `No ${label} available. Override?`}</p>`,
                    buttons: [{
                        action: "yes",
                        label: game.i18n?.localize("DH2E.Confirm") ?? "Yes",
                        callback: () => resolve(true),
                    }, {
                        action: "no",
                        label: game.i18n?.localize("DH2E.Cancel") ?? "No",
                        callback: () => resolve(false),
                    }],
                    close: () => resolve(false),
                });
                d.render({ force: true });
            });

            if (!override) return false;
        } else {
            // Player gets a notification — action is blocked
            ui.notifications.warn(
                game.i18n?.format("DH2E.Action.Blocked", { action: label })
                    ?? `No ${label} available this turn.`,
            );
            return false;
        }
    }

    await combatant.useAction(actionType);
    return true;
}

export { isInCombat, isActorInCombat, getCombatantForActor, consumeCombatAction };
