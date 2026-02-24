import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import { appendLog } from "@actor/log.ts";
import XPAwardDialogRoot from "./xp-award-dialog-root.svelte";

interface PlayerEntry {
    userId: string;
    userName: string;
    actorId: string;
    actorName: string;
    online: boolean;
}

/**
 * GM-only dialog for bulk-awarding XP to players.
 *
 * Usage: `XPAwardDialog.open()` or `game.dh2e.awardXP()`
 */
class XPAwardDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-xp-award",
        classes: ["dh2e", "dialog", "xp-award-dialog"],
        position: { width: 400, height: "auto" as const },
        window: { resizable: false, minimizable: false },
    });

    protected override root = XPAwardDialogRoot;

    override get title(): string {
        return game.i18n.localize("DH2E.XP.Award.Title");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const g = game as any;
        const players: PlayerEntry[] = g.users
            .filter((u: any) => !u.isGM && u.character)
            .map((u: any) => ({
                userId: u.id,
                userName: u.name,
                actorId: u.character.id,
                actorName: u.character.name,
                online: u.active,
            }));

        const online = players.filter((p) => p.online);
        const offline = players.filter((p) => !p.online);

        return {
            ctx: {
                online,
                offline,
                onAward: (amount: number, reason: string, selectedIds: string[]) =>
                    this.#award(amount, reason, selectedIds),
            },
        };
    }

    async #award(amount: number, reason: string, selectedActorIds: string[]): Promise<void> {
        const g = game as any;
        const actors: Actor[] = selectedActorIds
            .map((id) => g.actors.get(id))
            .filter(Boolean);

        if (actors.length === 0) return;

        const gmName = (game as any).user?.name ?? "GM";

        for (const actor of actors) {
            const current = (actor as any).system?.xp?.total ?? 0;
            await actor.update({ "system.xp.total": current + amount });
            await appendLog(actor, {
                timestamp: Date.now(),
                type: "xp-award",
                label: `Awarded ${amount} XP`,
                detail: reason || undefined,
                amount,
                who: gmName,
            });
        }

        // Build chat message
        const names = actors.map((a) => a.name).join(", ");
        let content = game.i18n.format("DH2E.XP.Award.ChatMessage", { amount: String(amount), names });
        if (reason) {
            content += `<br>${game.i18n.format("DH2E.XP.Award.ChatReason", { reason })}`;
        }

        await ChatMessage.create({
            content: `<div class="dh2e xp-award-chat">${content}</div>`,
            speaker: ChatMessage.getSpeaker({ alias: "Game Master" }),
        });

        ui.notifications.info(
            game.i18n.format("DH2E.XP.Award.Success", {
                amount: String(amount),
                count: String(actors.length),
            }),
        );

        this.close();
    }

    /** Open the dialog. GM-only guard. */
    static open(): void {
        const g = game as any;
        if (!g.user?.isGM) {
            ui.notifications.warn(game.i18n.localize("DH2E.XP.Award.GMOnly"));
            return;
        }
        new XPAwardDialog({}).render(true);
    }
}

export { XPAwardDialog };
export type { PlayerEntry };
