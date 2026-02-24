/**
 * GM-side dialog shown when a player requests elite advance approval via socket.
 */

import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import EliteApprovalPromptRoot from "./elite-approval-prompt-root.svelte";

export interface EliteApprovalPayload {
    actorId: string;
    actorName: string;
    userId: string;
    userName: string;
    advanceKey: string;
    advanceName: string;
    cost: number;
    prerequisites?: string;
}

class EliteApprovalPrompt extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-elite-approval-prompt",
        classes: ["dh2e", "dialog", "elite-approval-prompt"],
        position: { width: 380, height: "auto" as const },
        window: { resizable: false, minimizable: false },
    });

    protected override root = EliteApprovalPromptRoot;

    #payload: EliteApprovalPayload;

    constructor(payload: EliteApprovalPayload) {
        super({});
        this.#payload = payload;
    }

    override get title(): string {
        return game.i18n.localize("DH2E.EliteApproval.PromptTitle");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                payload: this.#payload,
                onApprove: () => this.#approve(),
                onDeny: () => this.#deny(),
            },
        };
    }

    #approve(): void {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "eliteApprovalGranted",
            payload: {
                actorId: this.#payload.actorId,
                advanceKey: this.#payload.advanceKey,
                advanceName: this.#payload.advanceName,
                userId: this.#payload.userId,
            },
        });
        ui.notifications.info(
            game.i18n.format("DH2E.EliteApproval.Approved", {
                name: this.#payload.advanceName,
                actor: this.#payload.actorName,
            }),
        );
        this.close();
    }

    #deny(): void {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "eliteApprovalDenied",
            payload: {
                actorId: this.#payload.actorId,
                advanceKey: this.#payload.advanceKey,
                advanceName: this.#payload.advanceName,
                userId: this.#payload.userId,
            },
        });
        this.close();
    }

    /** Show the approval prompt to the GM */
    static show(payload: EliteApprovalPayload): void {
        new EliteApprovalPrompt(payload).render(true);
    }
}

export { EliteApprovalPrompt };
