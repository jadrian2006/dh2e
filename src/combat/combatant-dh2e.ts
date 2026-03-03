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

    /** Get turn effects (e.g. "running") — cleared each turn */
    get turnEffects(): string[] {
        return (this as any).getFlag(SYSTEM_ID, "turnEffects") ?? [];
    }

    /** Check if a turn effect is active */
    hasTurnEffect(effect: string): boolean {
        return this.turnEffects.includes(effect);
    }

    /** Add a turn effect (persists until next turn reset) */
    async addTurnEffect(effect: string): Promise<void> {
        const current = [...this.turnEffects];
        if (!current.includes(effect)) {
            current.push(effect);
            await (this as any).setFlag(SYSTEM_ID, "turnEffects", current);
        }
    }

    /** Reset all actions and turn effects for a new turn */
    async resetActions(): Promise<void> {
        await (this as any).setFlag(SYSTEM_ID, "actionsUsed", {
            half: false,
            full: false,
            free: false,
            reaction: false,
        });
        await (this as any).setFlag(SYSTEM_ID, "turnEffects", []);
    }
}

export { CombatantDH2e };
