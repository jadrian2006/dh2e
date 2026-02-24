import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import RollRequestDialogRoot from "./roll-request-dialog-root.svelte";

interface RollRequestPlayerEntry {
    userId: string;
    userName: string;
    online: boolean;
}

interface RollRequestPayload {
    targetUserIds: string[];
    testLabel: string;
    characteristic?: CharacteristicAbbrev;
    skillName?: string;
    dosThreshold?: number;
    modifier?: number;
}

/**
 * GM-only dialog for requesting rolls from players via socket.
 *
 * Usage: `RollRequestDialog.open()` or `game.dh2e.requestRoll()`
 */
class RollRequestDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-roll-request",
        classes: ["dh2e", "dialog", "roll-request-dialog"],
        position: { width: 420, height: "auto" as const },
        window: { resizable: false, minimizable: false },
    });

    protected override root = RollRequestDialogRoot;

    override get title(): string {
        return game.i18n.localize("DH2E.Request.Title");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const g = game as any;
        const players: RollRequestPlayerEntry[] = g.users
            .filter((u: any) => !u.isGM && u.active)
            .map((u: any) => ({
                userId: u.id,
                userName: u.name,
                online: u.active,
            }));

        return {
            ctx: {
                players,
                onSend: (payload: RollRequestPayload) => this.#send(payload),
            },
        };
    }

    async #send(payload: RollRequestPayload): Promise<void> {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "requestRoll",
            payload,
        });
        ui.notifications.info(`Roll request sent to ${payload.targetUserIds.length} player(s).`);
        this.close();
    }

    /** Open the dialog. GM-only guard. */
    static open(): void {
        const g = game as any;
        if (!g.user?.isGM) {
            ui.notifications.warn(game.i18n.localize("DH2E.Request.GMOnly"));
            return;
        }
        new RollRequestDialog({}).render(true);
    }
}

export { RollRequestDialog };
export type { RollRequestPayload, RollRequestPlayerEntry };
