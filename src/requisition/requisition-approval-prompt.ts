import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { RequisitionRequestPayload } from "./requisition-request-dialog.ts";
import ApprovalRoot from "./requisition-approval-prompt-root.svelte";

/**
 * GM-side dialog shown when a player submits a requisition request via socket.
 * Shows full cost breakdown, roll result, delivery options, and approve/deny buttons.
 */
class RequisitionApprovalPrompt extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-requisition-approval",
        classes: ["dh2e", "dialog", "requisition-approval-prompt"],
        position: { width: 440, height: "auto" as const },
        window: { resizable: true, minimizable: false },
    });

    protected override root = ApprovalRoot;

    #payload: RequisitionRequestPayload;

    constructor(payload: RequisitionRequestPayload) {
        super({});
        this.#payload = payload;
    }

    override get title(): string {
        return game.i18n?.localize("DH2E.Requisition.RequestTitle") ?? "Requisition Request";
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        // Build localized availability/craftsmanship labels
        const availConfig = CONFIG.DH2E?.availabilityTiers?.[this.#payload.availability] as
            | { label: string; modifier: number } | undefined;
        const craftConfig = CONFIG.DH2E?.craftsmanshipTiers?.[this.#payload.craftsmanship] as
            | { label: string; modifier: number } | undefined;

        return {
            ctx: {
                payload: this.#payload,
                availLabel: availConfig ? game.i18n?.localize(availConfig.label) ?? this.#payload.availability : this.#payload.availability,
                availMod: availConfig?.modifier ?? 0,
                craftLabel: craftConfig ? game.i18n?.localize(craftConfig.label) ?? this.#payload.craftsmanship : this.#payload.craftsmanship,
                craftMod: craftConfig?.modifier ?? 0,
                onApprove: (delivery: "immediate" | "delayed", delayMs: number) =>
                    this.#approve(delivery, delayMs),
                onDeny: () => this.#deny(),
            },
        };
    }

    #approve(delivery: "immediate" | "delayed", delayMs: number): void {
        const g = game as any;

        if (delivery === "immediate") {
            // Tell player to create the item on their actor immediately
            g.socket.emit(`system.${SYSTEM_ID}`, {
                type: "requisitionApproved",
                payload: {
                    userId: this.#payload.userId,
                    itemData: this.#payload.itemData,
                    itemName: this.#payload.itemName,
                    actorUuid: this.#payload.requestedFor,
                    craftsmanship: this.#payload.craftsmanship,
                    modifications: this.#payload.modifications,
                },
            });
        } else {
            // Create pending requisition on warband with delivery timestamp
            const warband = g.dh2e?.warband;
            if (warband) {
                const req = {
                    id: fu.randomID(),
                    itemData: this.#payload.itemData,
                    itemName: this.#payload.itemName,
                    craftsmanship: this.#payload.craftsmanship,
                    modifications: this.#payload.modifications,
                    requestedBy: this.#payload.requestedBy,
                    requestedFor: this.#payload.requestedFor,
                    actorName: this.#payload.actorName,
                    availability: this.#payload.availability,
                    rollResult: this.#payload.rollResult,
                    targetNumber: this.#payload.targetNumber,
                    success: this.#payload.success,
                    degrees: this.#payload.degrees,
                    influenceLost: this.#payload.influenceLost,
                    readyAt: Date.now() + delayMs,
                    status: "pending",
                    approvedAt: Date.now(),
                };
                warband.addPendingRequisition(req);
            }

            // Notify player of delayed delivery
            const eta = RequisitionApprovalPrompt.#formatDuration(delayMs);
            g.socket.emit(`system.${SYSTEM_ID}`, {
                type: "requisitionApprovedDelayed",
                payload: {
                    userId: this.#payload.userId,
                    itemName: this.#payload.itemName,
                    time: eta,
                },
            });
        }

        ui.notifications.info(
            game.i18n.format("DH2E.Requisition.Approved", { name: this.#payload.itemName }),
        );
        this.close();
    }

    #deny(): void {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "requisitionDenied",
            payload: {
                userId: this.#payload.userId,
                itemName: this.#payload.itemName,
            },
        });
        this.close();
    }

    /** Format milliseconds into a human-readable duration */
    static #formatDuration(ms: number): string {
        const minutes = Math.round(ms / 60000);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
        const days = Math.round(hours / 24);
        return `${days} day${days !== 1 ? "s" : ""}`;
    }

    /** Show the approval prompt to the GM */
    static show(payload: RequisitionRequestPayload): void {
        new RequisitionApprovalPrompt(payload).render(true);
    }
}

export { RequisitionApprovalPrompt };
