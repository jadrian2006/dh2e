/**
 * Shared helpers for applying elite advances, talents, and skills to actors.
 * Used by AdvancementShop (player purchases), socket approval handler,
 * and GMGrantDialog (GM force-grants).
 */

import type { AcolyteDH2e } from "@actor/acolyte/document.ts";
import { recordTransaction } from "./xp-ledger.ts";
import { appendLog } from "@actor/log.ts";
import type { XPTransaction } from "./types.ts";

/** Elite advance definition loaded from dh2e-data */
export interface EliteAdvanceDef {
    id: string;
    name: string;
    cost: number;
    prerequisites: {
        characteristics?: Record<string, number>;
        notEliteAdvance?: string;
        influence?: number;
    };
    instant: {
        aptitudes?: string[];
        talents?: string[];
        unsanctionedCorruption?: string;
    };
    description: string;
}

/**
 * Execute an elite advance purchase on an actor.
 * Handles: updating eliteAdvances, deducting XP, applying instant aptitudes,
 * creating instant talent items, unsanctioned corruption roll + chat message,
 * and recording XP transaction + actor log.
 */
export async function executeElitePurchase(
    actor: AcolyteDH2e,
    advDef: EliteAdvanceDef,
    xpCost: number,
    grantedBy?: string,
): Promise<void> {
    const system = actor.system;
    const currentElites: string[] = [...((system as any).eliteAdvances ?? [])];
    currentElites.push(advDef.id);
    const currentApts: string[] = [...(system.aptitudes ?? [])];
    const updates: Record<string, unknown> = {
        "system.eliteAdvances": currentElites,
        "system.xp.spent": system.xp.spent + xpCost,
    };

    // Apply instant aptitudes
    if (advDef.instant.aptitudes) {
        for (const apt of advDef.instant.aptitudes) {
            if (!currentApts.includes(apt)) currentApts.push(apt);
        }
        updates["system.aptitudes"] = currentApts;
    }

    await actor.update(updates);

    // Apply instant talents
    if (advDef.instant.talents) {
        for (const talentName of advDef.instant.talents) {
            const existing = actor.items.find(
                (i: Item) => i.type === "talent" && i.name.toLowerCase() === talentName.toLowerCase(),
            );
            if (existing) continue;

            const talentPack = game.packs?.get("dh2e-data.talents");
            if (talentPack) {
                const idx = (await talentPack.getIndex()).find(
                    (e: any) => e.name.toLowerCase() === talentName.toLowerCase(),
                );
                if (idx) {
                    const doc = await talentPack.getDocument(idx._id);
                    if (doc) {
                        await actor.createEmbeddedDocuments("Item", [(doc as any).toObject()]);
                    }
                }
            }
        }
    }

    // Unsanctioned psyker corruption
    if (advDef.id === "psyker" && advDef.instant.unsanctionedCorruption) {
        const bgName = (system as any).details?.background ?? "";
        const isSanctioned = bgName === "Adeptus Astra Telepathica";
        if (!isSanctioned) {
            const corruptionRoll = new foundry.dice.Roll(advDef.instant.unsanctionedCorruption);
            await corruptionRoll.evaluate();
            const corruptionGain = corruptionRoll.total ?? 6;
            const currentCorruption = (system as any).corruption ?? 0;
            await actor.update({ "system.corruption": currentCorruption + corruptionGain });

            const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
            await fd.ChatMessage.create({
                content: `<div class="dh2e chat-card system-note"><em>${game.i18n?.format("DH2E.EliteAdvance.UnsanctionedCorruption", { amount: String(corruptionGain) }) ?? `Unsanctioned psyker — gained ${corruptionGain} Corruption Points!`}</em></div>`,
                speaker,
            });
        }
    }

    // Record transaction & log
    const txn: XPTransaction = {
        timestamp: Date.now(),
        category: "elite",
        label: `${advDef.name} — Elite Advance`,
        cost: xpCost,
        matchCount: 0,
    };
    await recordTransaction(actor, txn);
    await appendLog(actor, {
        timestamp: txn.timestamp,
        type: grantedBy ? "gm-grant" : "xp-spend",
        label: grantedBy
            ? (game.i18n?.format("DH2E.GMGrant.LogEntry", { advance: advDef.name }) ?? `GM Grant: ${advDef.name}`)
            : `${advDef.name} — Elite Advance`,
        amount: -xpCost,
        who: grantedBy ?? (game as any).user?.name,
    });
}

/**
 * Grant a talent to an actor from the compendium.
 * Creates the embedded talent item and records a log entry.
 */
export async function grantTalent(
    actor: AcolyteDH2e,
    talentName: string,
    grantedBy?: string,
): Promise<void> {
    // Check if already owned
    const existing = actor.items.find(
        (i: Item) => i.type === "talent" && i.name.toLowerCase() === talentName.toLowerCase(),
    );
    if (existing) {
        ui.notifications.warn(`${actor.name} already has ${talentName}.`);
        return;
    }

    const talentPack = game.packs?.get("dh2e-data.talents");
    if (!talentPack) return;

    const idx = (await talentPack.getIndex()).find(
        (e: any) => e.name.toLowerCase() === talentName.toLowerCase(),
    );
    if (!idx) return;

    const doc = await talentPack.getDocument(idx._id);
    if (!doc) return;

    await actor.createEmbeddedDocuments("Item", [(doc as any).toObject()]);

    const timestamp = Date.now();
    await recordTransaction(actor, {
        timestamp,
        category: "talent",
        label: `${talentName}${grantedBy ? " (GM Grant)" : ""}`,
        cost: 0,
        matchCount: 0,
    });
    await appendLog(actor, {
        timestamp,
        type: grantedBy ? "gm-grant" : "xp-spend",
        label: grantedBy
            ? (game.i18n?.format("DH2E.GMGrant.LogEntry", { advance: talentName }) ?? `GM Grant: ${talentName}`)
            : talentName,
        amount: 0,
        who: grantedBy ?? (game as any).user?.name,
    });
}

/**
 * Grant or advance a skill on an actor from the compendium.
 * If the actor doesn't have the skill, creates it at Known (advancement 1).
 * If they already have it and it's below max, advances it by 1.
 */
export async function grantSkill(
    actor: AcolyteDH2e,
    skillName: string,
    grantedBy?: string,
): Promise<void> {
    // Check for existing skill on actor
    const existingSkill = actor.items.find(
        (i: Item) => i.type === "skill" && i.name.toLowerCase() === skillName.toLowerCase(),
    );

    if (existingSkill) {
        const advancement: number = (existingSkill.system as any).advancement ?? 0;
        if (advancement >= 4) {
            ui.notifications.warn(`${actor.name}'s ${skillName} is already at maximum.`);
            return;
        }
        await existingSkill.update({ "system.advancement": advancement + 1 });
    } else {
        // Add from compendium
        const skillPack = game.packs?.get("dh2e-data.skills");
        if (!skillPack) return;

        const idx = (await skillPack.getIndex()).find(
            (e: any) => e.name.toLowerCase() === skillName.toLowerCase(),
        );
        if (!idx) return;

        const doc = await skillPack.getDocument(idx._id);
        if (!doc) return;

        const data = (doc as any).toObject();
        data.system.advancement = 1;
        await actor.createEmbeddedDocuments("Item", [data]);
    }

    const timestamp = Date.now();
    await recordTransaction(actor, {
        timestamp,
        category: "skill",
        label: `${skillName}${grantedBy ? " (GM Grant)" : ""}`,
        cost: 0,
        matchCount: 0,
    });
    await appendLog(actor, {
        timestamp,
        type: grantedBy ? "gm-grant" : "xp-spend",
        label: grantedBy
            ? (game.i18n?.format("DH2E.GMGrant.LogEntry", { advance: skillName }) ?? `GM Grant: ${skillName}`)
            : skillName,
        amount: 0,
        who: grantedBy ?? (game as any).user?.name,
    });
}
