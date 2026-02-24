/**
 * Custom Combatant document for DH2E.
 *
 * Tracks action economy per turn using flags:
 * - half: boolean (Half Action used)
 * - full: boolean (Full Action used)
 * - free: boolean (Free Action used)
 * - reaction: boolean (Reaction used)
 */
class CombatantDH2e extends Combatant {
    /** Get action economy state */
    get actionsUsed(): { half: boolean; full: boolean; free: boolean; reaction: boolean } {
        return (this as any).getFlag(SYSTEM_ID, "actionsUsed") ?? {
            half: false,
            full: false,
            free: false,
            reaction: false,
        };
    }

    /** Check if a specific action type is still available */
    hasAction(type: "half" | "full" | "free" | "reaction"): boolean {
        const used = this.actionsUsed;
        if (type === "half") return !used.half && !used.full;
        if (type === "full") return !used.full && !used.half;
        if (type === "free") return !used.free;
        if (type === "reaction") return !used.reaction;
        return false;
    }

    /** Mark an action type as used */
    async useAction(type: "half" | "full" | "free" | "reaction"): Promise<void> {
        const used = { ...this.actionsUsed };
        used[type] = true;
        await (this as any).setFlag(SYSTEM_ID, "actionsUsed", used);
    }

    /** Reset all actions for a new turn */
    async resetActions(): Promise<void> {
        await (this as any).setFlag(SYSTEM_ID, "actionsUsed", {
            half: false,
            full: false,
            free: false,
            reaction: false,
        });
    }
}

export { CombatantDH2e };
