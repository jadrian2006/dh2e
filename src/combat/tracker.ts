import * as svelte from "svelte";
import TrackerRoot from "./tracker-root.svelte";

/**
 * Custom combat tracker sidebar for DH2E.
 *
 * Wraps a Svelte component for the combat tracker UI with
 * action economy, condition badges, and wound bars.
 */
class CombatTrackerDH2e extends CombatTracker {
    #mount: object | null = null;

    /** Re-render the Svelte tracker whenever combat state changes */
    override async getData(options?: Record<string, unknown>): Promise<Record<string, unknown>> {
        const data = await super.getData(options);
        return data;
    }

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        // Mount Svelte component into the tracker element
        const container = html[0] ?? html;
        if (!(container instanceof HTMLElement)) return;

        // Find or create a Svelte mount point
        let svelteTarget = container.querySelector<HTMLElement>(".dh2e-tracker-root");
        if (!svelteTarget) {
            svelteTarget = document.createElement("div");
            svelteTarget.classList.add("dh2e-tracker-root");
            container.prepend(svelteTarget);
        }

        // Unmount previous if exists
        if (this.#mount) {
            svelte.unmount(this.#mount);
            svelteTarget.replaceChildren();
        }

        // Prepare context
        const combat = (game as any).combat;
        if (!combat) return;

        const combatants = combat.combatants?.contents ?? [];
        const currentId = combat.combatant?.id ?? null;
        const isGM = (game as any).user?.isGM ?? false;

        this.#mount = svelte.mount(TrackerRoot, {
            target: svelteTarget,
            props: {
                ctx: {
                    combat,
                    combatants: combatants.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        img: c.img ?? c.actor?.img,
                        initiative: c.initiative,
                        isActive: c.id === currentId,
                        actionsUsed: c.actionsUsed ?? { half: false, full: false, free: false, reaction: false },
                        wounds: c.actor?.system?.wounds ?? { value: 0, max: 0 },
                        conditions: (c.actor?.items?.filter((i: any) => i.type === "condition") ?? []).map((cond: any) => ({
                            name: cond.name,
                            slug: cond.system?.slug ?? "",
                            remaining: cond.system?.remainingRounds ?? 0,
                        })),
                        hasAction: (type: string) => c.hasAction?.(type) ?? true,
                        useAction: (type: string) => c.useAction?.(type),
                    })),
                    isGM,
                    round: combat.round ?? 0,
                    turn: combat.turn ?? 0,
                    nextTurn: () => combat.nextTurn(),
                    previousTurn: () => combat.previousTurn(),
                    nextRound: () => combat.nextRound(),
                    rollAll: () => combat.rollAll(),
                    rollNPC: () => combat.rollNPC(),
                    resetAll: () => combat.resetAll(),
                },
            },
        });
    }

    override close(options?: Record<string, unknown>): Promise<void> {
        if (this.#mount) {
            svelte.unmount(this.#mount);
            this.#mount = null;
        }
        return super.close(options);
    }
}

export { CombatTrackerDH2e };
