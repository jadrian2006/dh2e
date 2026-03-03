/**
 * Reactive pending-reaction state.
 *
 * Set when an attack card shows Dodge/Parry buttons (a reaction is applicable).
 * Cleared when the reaction is resolved or a new turn begins.
 * The HUD subscribes to this to highlight Dodge/Parry buttons.
 */

interface PendingReaction {
    /** The chat message ID of the attack being reacted to */
    messageId: string;
    /** Whether the triggering attack was melee (determines if Parry is available) */
    isMelee: boolean;
}

/** Reactive state container — Svelte reads `.current` reactively */
const reactionState: { current: PendingReaction | null } = $state({ current: null });

/** Read the current pending reaction (reactive in Svelte components) */
function getPendingReaction(): PendingReaction | null {
    return reactionState.current;
}

function setPendingReaction(reaction: PendingReaction | null): void {
    reactionState.current = reaction;
}

function clearPendingReaction(): void {
    reactionState.current = null;
}

export { reactionState, getPendingReaction, setPendingReaction, clearPendingReaction };
export type { PendingReaction };
