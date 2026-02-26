/**
 * Player-to-player item trade system.
 *
 * Flow:
 * 1. Source player drags item onto target actor's sheet or token
 * 2. If allowSilentTrades setting is on, sender picks Public or Silent
 * 3. System detects cross-actor drop → emits "tradeOffer" socket
 * 4. Target player sees accept/decline dialog
 * 5. On accept → item is transferred (deleted from source, created on target)
 * 6. On decline → source gets notification
 * 7. A chat card is posted — public by default, GM-whispered if silent
 *
 * Warband transfers skip the dialog and are always public.
 */

import { getSetting } from "../ui/settings/settings.ts";

/**
 * Prompt the sender to choose public or silent, then send the trade offer.
 * Warband transfers bypass the prompt entirely.
 */
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

    // Warband transfers: skip dialog, transfer directly, always public
    if (targetActor.type === "warband" || sourceActor.type === "warband") {
        await executeTransfer(sourceActorId, targetActorId, itemId, { silent: false });
        return;
    }

    // Ask sender if they want a silent trade (if allowed by GM setting)
    const allowSilent = getSetting<boolean>("allowSilentTrades") ?? true;
    let silent = false;

    if (allowSilent) {
        silent = await promptTradeMode(item.name, item.img);
    }

    // Find the user who owns the target actor (must be online)
    const targetUserId = findOwnerUserId(targetActor);
    if (!targetUserId) {
        ui.notifications?.warn("No player owns this character.");
        return;
    }

    const targetUser = g.users?.get(targetUserId);
    if (!targetUser?.active) {
        ui.notifications?.warn("That player is not online.");
        return;
    }

    // If the current user also owns the target, just transfer directly
    if (targetUserId === g.user?.id) {
        await executeTransfer(sourceActorId, targetActorId, itemId, { silent });
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
            silent,
        },
    });

    ui.notifications?.info(`Trade offer for "${item.name}" sent.`);
}

/**
 * Prompt the sender to choose between a public or silent trade.
 * Returns true for silent, false for public. Rejects (throws) on cancel.
 */
function promptTradeMode(itemName: string, itemImg: string): Promise<boolean> {
    const g = game as any;
    return new Promise((resolve) => {
        new fa.api.DialogV2({
            window: {
                title: g.i18n?.localize("DH2E.Trade.ModeTitle") ?? "Trade Item",
                icon: "fa-solid fa-handshake",
            },
            content: `
                <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem;">
                    <img src="${itemImg}" alt="" style="width: 36px; height: 36px; border-radius: 4px; border: 1px solid var(--dh2e-border, #4a4a55);" />
                    <div>
                        <p style="margin: 0; font-size: 0.8rem;">
                            ${g.i18n?.format("DH2E.Trade.ModePrompt", { item: itemName }) ?? `Trade <strong>${itemName}</strong>`}
                        </p>
                        <p style="margin: 0.25rem 0 0; font-size: 0.65rem; color: var(--dh2e-text-secondary, #a0a0a8);">
                            ${g.i18n?.localize("DH2E.Trade.ModeHint") ?? "Silent trades are only visible to the GM."}
                        </p>
                    </div>
                </div>
            `,
            buttons: [
                {
                    action: "public",
                    label: g.i18n?.localize("DH2E.Trade.ModePublic") ?? "Public",
                    icon: "fa-solid fa-bullhorn",
                    default: true,
                    callback: () => resolve(false),
                },
                {
                    action: "silent",
                    label: g.i18n?.localize("DH2E.Trade.ModeSilent") ?? "Silent",
                    icon: "fa-solid fa-eye-slash",
                    callback: () => resolve(true),
                },
            ],
            position: { width: 360 },
            close: () => resolve(false), // default to public on close
        }).render(true);
    });
}

/** Execute the actual item transfer (called by both direct and socket flows) */
export async function executeTransfer(
    sourceActorId: string,
    targetActorId: string,
    itemId: string,
    options?: { silent?: boolean },
): Promise<void> {
    const g = game as any;
    const sourceActor = g.actors?.get(sourceActorId);
    const targetActor = g.actors?.get(targetActorId);

    if (!sourceActor || !targetActor) return;

    const item = sourceActor.items?.get(itemId);
    if (!item) return;

    const itemName = item.name;
    const itemImg = item.img ?? "icons/svg/item-bag.svg";
    const itemData = item.toObject();
    delete (itemData as any)._id;

    await targetActor.createEmbeddedDocuments("Item", [itemData]);
    await sourceActor.deleteEmbeddedDocuments("Item", [itemId]);

    // Post trade chat card
    await postTradeChatCard({
        sourceName: sourceActor.name,
        targetName: targetActor.name,
        itemName,
        itemImg,
        silent: options?.silent ?? false,
    });
}

/** Post a chat card announcing a completed trade */
async function postTradeChatCard(info: {
    sourceName: string;
    targetName: string;
    itemName: string;
    itemImg: string;
    silent: boolean;
}): Promise<void> {
    const g = game as any;

    const content = `
        <div class="dh2e chat-card trade-card" style="display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem;">
            <img src="${info.itemImg}" alt="" style="width: 32px; height: 32px; border-radius: 3px; border: 1px solid var(--dh2e-border, #4a4a55); flex-shrink: 0;" />
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--dh2e-gold, #c8a84e);">
                    ${g.i18n?.localize("DH2E.Trade.ChatTitle") ?? "Item Transfer"}
                </div>
                <div style="font-size: 0.75rem; color: var(--dh2e-text-primary, #d0cfc8);">
                    <strong>${info.sourceName}</strong>
                    <i class="fa-solid fa-arrow-right" style="font-size: 0.6rem; margin: 0 0.3rem; color: var(--dh2e-text-secondary, #a0a0a8);"></i>
                    <strong>${info.targetName}</strong>
                </div>
                <div style="font-size: 0.7rem; color: var(--dh2e-text-secondary, #a0a0a8); margin-top: 2px;">
                    ${info.itemName}
                </div>
            </div>
        </div>
    `;

    if (info.silent) {
        // GM-only whisper
        const gmUsers = g.users?.filter((u: any) => u.isGM)?.map((u: any) => u.id) ?? [];
        if (gmUsers.length > 0) {
            await fd.ChatMessage.create({
                content,
                whisper: gmUsers,
                speaker: { alias: g.i18n?.localize("DH2E.Trade.ChatTitle") ?? "Item Transfer" },
            });
        }
    } else {
        // Public chat card
        await fd.ChatMessage.create({
            content,
            speaker: { alias: g.i18n?.localize("DH2E.Trade.ChatTitle") ?? "Item Transfer" },
        });
    }
}

/** Show the trade offer dialog to the target player */
export function showTradePrompt(payload: {
    sourceActorId: string;
    targetActorId: string;
    itemId: string;
    itemName: string;
    itemImg: string;
    senderName: string;
    silent?: boolean;
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
                    g.socket.emit(`system.${SYSTEM_ID}`, {
                        type: "tradeAccepted",
                        payload: {
                            sourceActorId: payload.sourceActorId,
                            targetActorId: payload.targetActorId,
                            itemId: payload.itemId,
                            itemName: payload.itemName,
                            receiverName: g.user?.name ?? "Unknown",
                            silent: payload.silent ?? false,
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
            const user = g.users?.get(userId);
            if (user && !user.isGM) return userId;
        }
    }
    return null;
}
