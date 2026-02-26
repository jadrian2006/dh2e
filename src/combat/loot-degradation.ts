import type { NpcDH2e } from "@actor/npc/document.ts";

/** Craftsmanship tiers in ascending quality order */
const CRAFTSMANSHIP_TIERS = ["poor", "common", "good", "best"] as const;
type CraftsmanshipTier = typeof CRAFTSMANSHIP_TIERS[number];

/** Item types that can be degraded */
const DEGRADABLE_TYPES = new Set(["weapon", "armour", "gear", "ammunition"]);

interface ItemDegradation {
    name: string;
    oldQuality: string;
    newQuality: string;
}

interface DegradationResult {
    degraded: ItemDegradation[];
    destroyed: string[];
}

/**
 * Degrade NPC equipment based on the killing blow's degrees of success.
 *
 * - 0 DoS (bare success): 50% chance per item to drop one craftsmanship tier
 * - 1 DoS: 25% chance per item
 * - 2 DoS: 10% chance per item
 * - 3+ DoS: No degradation (clean kill)
 */
async function degradeNpcEquipment(npc: NpcDH2e, killingDoS: number): Promise<DegradationResult> {
    const result: DegradationResult = { degraded: [], destroyed: [] };

    // Clean kills don't damage equipment
    if (killingDoS >= 3) {
        await postDegradationChat(npc, result);
        return result;
    }

    const degradeChance = killingDoS === 0 ? 0.5 : killingDoS === 1 ? 0.25 : 0.1;

    const toDelete: string[] = [];
    const toUpdate: { _id: string; "system.craftsmanship": string }[] = [];

    for (const item of npc.items) {
        if (!DEGRADABLE_TYPES.has(item.type)) continue;

        // Roll for degradation
        if (Math.random() >= degradeChance) continue;

        const currentTier = ((item.system as any).craftsmanship as string) ?? "common";
        const tierIndex = CRAFTSMANSHIP_TIERS.indexOf(currentTier as CraftsmanshipTier);
        if (tierIndex < 0) continue; // Unknown tier, skip

        if (tierIndex === 0) {
            // Poor → destroyed
            toDelete.push(item.id!);
            result.destroyed.push(item.name!);
        } else {
            const newTier = CRAFTSMANSHIP_TIERS[tierIndex - 1];
            toUpdate.push({ _id: item.id!, "system.craftsmanship": newTier });
            result.degraded.push({
                name: item.name!,
                oldQuality: currentTier,
                newQuality: newTier,
            });
        }
    }

    // Apply updates
    if (toUpdate.length > 0) {
        await npc.updateEmbeddedDocuments("Item", toUpdate);
    }
    if (toDelete.length > 0) {
        await npc.deleteEmbeddedDocuments("Item", toDelete);
    }

    await postDegradationChat(npc, result);
    return result;
}

/** Post a chat message summarizing equipment degradation */
async function postDegradationChat(npc: NpcDH2e, result: DegradationResult): Promise<void> {
    const lines: string[] = [];

    if (result.degraded.length === 0 && result.destroyed.length === 0) {
        lines.push(game.i18n.localize("DH2E.Loot.NoDegradation"));
    } else {
        for (const d of result.degraded) {
            lines.push(game.i18n.format("DH2E.Loot.Degraded", {
                item: d.name,
                quality: game.i18n.localize(`DH2E.Craftsmanship.${d.newQuality.charAt(0).toUpperCase()}${d.newQuality.slice(1)}`),
            }));
        }
        for (const name of result.destroyed) {
            lines.push(game.i18n.format("DH2E.Loot.Destroyed", { item: name }));
        }
    }

    await ChatMessage.create({
        content: `<div class="dh2e loot-degradation-chat">
            <h4>${npc.name}</h4>
            ${lines.map(l => `<p>${l}</p>`).join("")}
        </div>`,
        speaker: ChatMessage.getSpeaker({ alias: npc.name! }),
    });
}

export { degradeNpcEquipment, CRAFTSMANSHIP_TIERS };
export type { CraftsmanshipTier, DegradationResult, ItemDegradation };
