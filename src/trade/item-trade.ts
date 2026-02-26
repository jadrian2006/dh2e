/**
 * Player-to-player item trade system.
 *
 * Flow:
 * 1. Source player drags item onto target actor's sheet or token
 * 2. System detects cross-actor drop → emits "tradeOffer" socket
 * 3. Target player sees accept/decline dialog
 * 4. On accept → item is transferred (deleted from source, created on target)
 * 5. On decline → source gets notification
 *
 * Warband transfers skip the dialog and transfer directly.
 */

/** Send a trade offer via socket */
export async function sendTradeOffer(
    sourceActorId: string,
    targetActorId: string,
    itemId: string,
): Promise<void> {
    const g = game as any;
    const sourceActor = g.actors?.get(sourceActorId);
    const targetActor = g.actors?.get(targetActorId);
    const item = sourceActor?.items?.get(itemId);

    if (!sourceActor || !targetActor || !item) {
        console.warn("DH2E | Trade offer failed: missing actor or item");
        return;
    }

    // Warband transfers: skip dialog, transfer directly
    if (targetActor.type === "warband" || sourceActor.type === "warband") {
        await executeTransfer(sourceActorId, targetActorId, itemId);
        return;
    }

    // Find the user who owns the target actor
    const targetUserId = findOwnerUserId(targetActor);
    if (!targetUserId) {
        ui.notifications?.warn("No player owns this character.");
        return;
    }

    // If the current user also owns the target, just transfer
    if (targetUserId === g.user?.id) {
        await executeTransfer(sourceActorId, targetActorId, itemId);
        return;
    }

    // Emit socket to target player
    g.socket.emit(`system.${SYSTEM_ID}`, {
        type: "tradeOffer",
        payload: {
            sourceActorId,
            targetActorId,
            itemId,
            itemName: item.name,
            itemImg: item.img,
            senderName: g.user?.name ?? "Unknown",
            targetUserId,
        },
    });

    ui.notifications?.info(`Trade offer for "${item.name}" sent.`);
}

/** Execute the actual item transfer (called by both direct and socket flows) */
export async function executeTransfer(
    sourceActorId: string,
    targetActorId: string,
    itemId: string,
): Promise<void> {
    const g = game as any;
    const sourceActor = g.actors?.get(sourceActorId);
    const targetActor = g.actors?.get(targetActorId);

    if (!sourceActor || !targetActor) return;

    const item = sourceActor.items?.get(itemId);
    if (!item) return;

    const itemData = item.toObject();
    delete (itemData as any)._id;

    await targetActor.createEmbeddedDocuments("Item", [itemData]);
    await sourceActor.deleteEmbeddedDocuments("Item", [itemId]);
}

/** Show the trade offer dialog to the target player */
export function showTradePrompt(payload: {
    sourceActorId: string;
    targetActorId: string;
    itemId: string;
    itemName: string;
    itemImg: string;
    senderName: string;
}): void {
    const g = game as any;

    const content = `
        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem;">
            <img src="${payload.itemImg}" alt="" style="width: 40px; height: 40px; border-radius: 4px; border: 1px solid var(--dh2e-border, #4a4a55);" />
            <div>
                <p style="margin: 0; font-size: 0.85rem;">
                    <strong>${payload.senderName}</strong> wants to give you <strong>${payload.itemName}</strong>.
                </p>
                <p style="margin: 0.25rem 0 0; font-size: 0.7rem; color: var(--dh2e-text-secondary, #a0a0a8);">
                    Do you accept?
                </p>
            </div>
        </div>
    `;

    new fa.api.DialogV2({
        window: {
            title: g.i18n?.localize("DH2E.Trade.OfferTitle") ?? "Item Trade Offer",
            icon: "fa-solid fa-handshake",
        },
        content,
        buttons: [
            {
                action: "accept",
                label: g.i18n?.localize("DH2E.Trade.Accept") ?? "Accept",
                default: true,
                callback: () => {
                    // Emit acceptance back via socket (GM will execute transfer)
                    g.socket.emit(`system.${SYSTEM_ID}`, {
                        type: "tradeAccepted",
                        payload: {
                            sourceActorId: payload.sourceActorId,
                            targetActorId: payload.targetActorId,
                            itemId: payload.itemId,
                            itemName: payload.itemName,
                            receiverName: g.user?.name ?? "Unknown",
                        },
                    });
                },
            },
            {
                action: "decline",
                label: g.i18n?.localize("DH2E.Trade.Decline") ?? "Decline",
                callback: () => {
                    g.socket.emit(`system.${SYSTEM_ID}`, {
                        type: "tradeDeclined",
                        payload: {
                            itemName: payload.itemName,
                            receiverName: g.user?.name ?? "Unknown",
                        },
                    });
                },
            },
        ],
        position: { width: 400 },
    }).render(true);
}

/** Find the user ID that has ownership of an actor */
function findOwnerUserId(actor: any): string | null {
    const g = game as any;
    const ownership = actor.ownership ?? {};

    for (const [userId, level] of Object.entries(ownership)) {
        if (userId === "default") continue;
        if ((level as number) >= 3) {
            // Verify user exists and is not GM
            const user = g.users?.get(userId);
            if (user && !user.isGM) return userId;
        }
    }
    return null;
}
