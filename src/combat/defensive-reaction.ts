/**
 * Defensive Reaction system — Dodge and Parry responses to incoming attacks.
 *
 * DH2E Rules:
 * - Dodge (Ag test): Reaction, works against melee AND ranged. Negates 1 hit per DoS.
 * - Parry (WS test): Reaction, melee only. Negates 1 hit per DoS.
 * - Step Aside: Grants one additional reaction per round.
 * - Counter Attack: After successful Parry, may make a free Standard Attack.
 * - Blademaster: May re-roll one failed Parry per round.
 */

import { CheckDH2e } from "@check/check.ts";
import { consumeCombatAction, getCombatantForActor } from "./combat-state.ts";
import { clearPendingReaction } from "./reaction-state.svelte.ts";

interface DefensiveReactionOptions {
    /** The defending actor */
    defender: Actor;
    /** The attack chat message being reacted to */
    attackMessage: StoredDocument<ChatMessage>;
    /** Which reaction type: dodge or parry */
    reactionType: "dodge" | "parry";
}

interface ReactionResult {
    success: boolean;
    degrees: number;
    roll: number;
    target: number;
    hitsNegated: number;
    remainingHits: number;
    originalHitCount: number;
    reactionType: "dodge" | "parry";
    defenderName: string;
    /** Whether Counter Attack is available (successful Parry + talent) */
    canCounterAttack: boolean;
}

/**
 * Execute a defensive reaction (Dodge or Parry) against an attack.
 */
async function executeDefensiveReaction(options: DefensiveReactionOptions): Promise<ReactionResult | null> {
    const { defender, attackMessage, reactionType } = options;
    const g = game as any;
    const flags = (attackMessage as any).flags?.[SYSTEM_ID] as Record<string, any> | undefined;
    if (!flags || flags.type !== "attack") return null;

    const attackResult = flags.result as Record<string, any>;
    if (!attackResult) return null;

    // Check if reaction already resolved on this message
    if (attackResult.reactionResolved) {
        ui.notifications.warn("A reaction has already been resolved for this attack.");
        return null;
    }

    // Find the appropriate skill on the defender
    const skillName = reactionType === "dodge" ? "Dodge" : "Parry";
    const skillItem = defender.items.find(
        (i: Item) => i.type === "skill" && i.name?.toLowerCase() === skillName.toLowerCase(),
    ) as any;

    if (!skillItem) {
        ui.notifications.warn(
            g.i18n?.format("DH2E.Reaction.NoSkill", { skill: skillName })
                ?? `${defender.name} does not have the ${skillName} skill.`,
        );
        return null;
    }

    // Check reaction availability
    const combatant = getCombatantForActor(defender.id!);
    if (combatant && !combatant.hasAction("reaction")) {
        ui.notifications.warn(
            g.i18n?.localize("DH2E.Reaction.NoReaction")
                ?? "No reactions remaining this round.",
        );
        return null;
    }

    // Consume reaction — abort if blocked
    if (combatant) {
        const consumed = await consumeCombatAction(defender.id!, "reaction");
        if (!consumed) return null;
    }

    // Determine characteristic and base target
    const characteristic = reactionType === "dodge" ? "ag" : "ws";
    const actorSys = (defender as any).system;
    const charValue = actorSys?.characteristics?.[characteristic]?.value ?? 0;
    const advancementBonus = skillItem.advancementBonus ?? 0;
    const baseTarget = charValue + advancementBonus;

    // Build domain
    const skillSlug = skillName.toLowerCase();
    const domain = `skill:${skillSlug}:${skillSlug}-attack`;

    // Build label
    const label = g.i18n?.format("DH2E.Reaction.TestLabel", {
        name: defender.name,
        type: skillName,
    }) ?? `${defender.name} — ${skillName} Test`;

    // Roll the check
    const result = await CheckDH2e.roll({
        actor: defender,
        characteristic,
        baseTarget,
        label,
        domain,
        skillDescription: `${skillName} reaction against incoming attack.`,
    });

    if (!result) return null; // User cancelled

    const originalHitCount = attackResult.hitCount as number ?? 0;
    let hitsNegated = 0;
    let canCounterAttack = false;

    if (result.dos.success) {
        // DoS is 1-based (1 DoS = 1 hit negated, which maps to RAW "1 + additional DoS")
        hitsNegated = result.dos.degrees;
    }

    // Blademaster: re-roll failed Parry once per round
    if (!result.dos.success && reactionType === "parry") {
        const defenderSynthetics = (defender as any).synthetics;
        const hasBlademaster = defenderSynthetics?.rollOptions?.has("talent:blademaster") ?? false;

        if (hasBlademaster && combatant && !combatant.hasTurnEffect("blademaster-used")) {
            const doReroll = await promptBlademasterReroll();
            if (doReroll) {
                await combatant.addTurnEffect("blademaster-used");

                const rerollResult = await CheckDH2e.roll({
                    actor: defender,
                    characteristic,
                    baseTarget,
                    label: `${label} [Blademaster Re-roll]`,
                    domain,
                    skillDescription: `Blademaster re-roll of failed Parry.`,
                });

                if (rerollResult?.dos.success) {
                    hitsNegated = rerollResult.dos.degrees;
                    // Use the re-roll result for the reaction card
                    result.dos = rerollResult.dos;
                    result.roll = rerollResult.roll;
                    result.target = rerollResult.target;
                }
            }
        }
    }

    const remainingHits = Math.max(0, originalHitCount - hitsNegated);

    // Counter Attack: successful Parry + talent
    if (result.dos.success && reactionType === "parry") {
        const defenderSynthetics = (defender as any).synthetics;
        canCounterAttack = defenderSynthetics?.rollOptions?.has("talent:counter-attack") ?? false;
    }

    // Update attack message flags with reaction outcome
    await (attackMessage as any).update({
        [`flags.${SYSTEM_ID}.result.reactionResolved`]: true,
        [`flags.${SYSTEM_ID}.result.reactionResult`]: {
            success: result.dos.success,
            degrees: result.dos.degrees,
            hitsNegated,
            remainingHits,
            reactionType,
            defenderName: defender.name,
        },
        [`flags.${SYSTEM_ID}.result.hitCount`]: remainingHits,
        [`flags.${SYSTEM_ID}.result.hits`]: (attackResult.hits as any[])?.slice(0, remainingHits) ?? [],
    });

    // Build reaction result
    const reactionResult: ReactionResult = {
        success: result.dos.success,
        degrees: result.dos.degrees,
        roll: result.roll,
        target: result.target,
        hitsNegated,
        remainingHits,
        originalHitCount,
        reactionType,
        defenderName: defender.name ?? "Unknown",
        canCounterAttack,
    };

    // Post reaction result card
    await postReactionCard(reactionResult, defender);

    // Clear pending reaction highlight
    clearPendingReaction();

    return reactionResult;
}

/** Prompt the user to re-roll a failed Parry via Blademaster */
async function promptBlademasterReroll(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const d = new fa.api.DialogV2({
            window: { title: game.i18n?.localize("DH2E.Reaction.Blademaster") ?? "Blademaster" },
            content: `<p>${game.i18n?.localize("DH2E.Reaction.Blademaster") ?? "Re-roll Parry (Blademaster)?"}</p>`,
            buttons: [{
                action: "yes",
                label: game.i18n?.localize("DH2E.Confirm") ?? "Yes",
                callback: () => resolve(true),
            }, {
                action: "no",
                label: game.i18n?.localize("DH2E.Cancel") ?? "No",
                callback: () => resolve(false),
            }],
            close: () => resolve(false),
        });
        d.render({ force: true });
    });
}

/** Post a reaction result chat card */
async function postReactionCard(result: ReactionResult, defender: Actor): Promise<void> {
    const g = game as any;
    const templatePath = `systems/${SYSTEM_ID}/templates/chat/reaction-card.hbs`;

    const templateData = {
        success: result.success,
        degrees: result.degrees,
        roll: result.roll,
        target: result.target,
        hitsNegated: result.hitsNegated,
        remainingHits: result.remainingHits,
        originalHitCount: result.originalHitCount,
        reactionType: result.reactionType,
        reactionLabel: result.reactionType === "dodge"
            ? (g.i18n?.localize("DH2E.Reaction.Dodge") ?? "Dodge")
            : (g.i18n?.localize("DH2E.Reaction.Parry") ?? "Parry"),
        defenderName: result.defenderName,
        allNegated: result.remainingHits === 0,
        canCounterAttack: result.canCounterAttack,
    };

    const content = await fa.handlebars.renderTemplate(templatePath, templateData);
    const speaker = fd.ChatMessage.getSpeaker?.({ actor: defender }) ?? { alias: defender.name };

    await fd.ChatMessage.create({
        content,
        speaker,
        flags: {
            [SYSTEM_ID]: {
                type: "reaction",
                result: templateData,
            },
        },
    });
}

export { executeDefensiveReaction };
export type { DefensiveReactionOptions, ReactionResult };
