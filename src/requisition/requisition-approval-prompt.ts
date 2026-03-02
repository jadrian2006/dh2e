import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { RequisitionRequestPayload, RequisitionRequestItem } from "./requisition-request-dialog.ts";
import ApprovalRoot from "./requisition-approval-prompt-root.svelte";

/**
 * GM-side dialog shown when a player submits a requisition request via socket.
 * Shows full cost breakdown, roll result, delivery options, and approve/deny buttons.
 * Supports batch requisitions with selective per-item approval.
 */
class RequisitionApprovalPrompt extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-requisition-approval",
        classes: ["dh2e", "dialog", "requisition-approval-prompt"],
        position: { width: 480, height: "auto" as const },
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
        // Build per-item display data with resolved availability/craftsmanship labels
        const itemDisplayData = this.#payload.items.map((item) => {
            const availConfig = CONFIG.DH2E?.availabilityTiers?.[item.availability] as
                | { label: string; modifier: number } | undefined;
            const craftConfig = CONFIG.DH2E?.craftsmanshipTiers?.[item.craftsmanship] as
                | { label: string; modifier: number } | undefined;
            return {
                ...item,
                availLabel: availConfig ? game.i18n?.localize(availConfig.label) ?? item.availability : item.availability,
                availMod: availConfig?.modifier ?? 0,
                craftLabel: craftConfig ? game.i18n?.localize(craftConfig.label) ?? item.craftsmanship : item.craftsmanship,
                craftMod: craftConfig?.modifier ?? 0,
            };
        });

        return {
            ctx: {
                payload: this.#payload,
                itemDisplayData,
                onApprove: (approvedIndices: number[], delivery: "immediate" | "delayed", delayMs: number) =>
                    this.#approve(approvedIndices, delivery, delayMs),
                onDeny: () => this.#deny(),
            },
        };
    }

    #approve(approvedIndices: number[], delivery: "immediate" | "delayed", delayMs: number): void {
        const g = game as any;

        const approvedItems = approvedIndices.map(i => this.#payload.items[i]);
        const deniedItems = this.#payload.items.filter((_, i) => !approvedIndices.includes(i));

        if (approvedItems.length === 0) {
            // Nothing approved — treat as full deny
            this.#deny();
            return;
        }

        if (delivery === "immediate") {
            g.socket.emit(`system.${SYSTEM_ID}`, {
                type: "requisitionApproved",
                payload: {
                    userId: this.#payload.userId,
                    items: approvedItems.map(item => ({
                        itemData: item.itemData,
                        itemName: item.itemName,
                    })),
                    actorUuid: this.#payload.requestedFor,
                    modifications: this.#payload.modifications,
                },
            });
        } else {
            // Create one pending requisition per approved item on warband
            const warband = g.dh2e?.warband;
            if (warband) {
                for (const item of approvedItems) {
                    const req = {
                        id: fu.randomID(),
                        itemData: item.itemData,
                        itemName: item.itemName,
                        craftsmanship: item.craftsmanship,
                        modifications: this.#payload.modifications,
                        requestedBy: this.#payload.requestedBy,
                        requestedFor: this.#payload.requestedFor,
                        actorName: this.#payload.actorName,
                        availability: item.availability,
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
            }

            const eta = RequisitionApprovalPrompt.#formatDuration(delayMs);
            g.socket.emit(`system.${SYSTEM_ID}`, {
                type: "requisitionApprovedDelayed",
                payload: {
                    userId: this.#payload.userId,
                    itemNames: approvedItems.map(i => i.itemName),
                    count: approvedItems.length,
                    time: eta,
                },
            });
        }

        // Emit partial denial if some items were unchecked
        if (deniedItems.length > 0) {
            g.socket.emit(`system.${SYSTEM_ID}`, {
                type: "requisitionDenied",
                payload: {
                    userId: this.#payload.userId,
                    itemNames: deniedItems.map(i => i.itemName),
                },
            });
        }

        const approvedNames = approvedItems.map(i => i.itemName).join(", ");
        ui.notifications.info(
            game.i18n.format("DH2E.Requisition.Approved", { name: approvedNames }),
        );
        this.close();
    }

    #deny(): void {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "requisitionDenied",
            payload: {
                userId: this.#payload.userId,
                itemNames: this.#payload.items.map(i => i.itemName),
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
