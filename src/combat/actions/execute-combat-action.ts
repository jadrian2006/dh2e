/**
 * Dispatcher for executing combat actions.
 *
 * Routes to the correct handler based on `executionMode`:
 * - consume-only: consume action + post chat emote
 * - attack-pipeline: find weapon → launch AttackResolver
 * - skill-check: roll CheckDH2e with specified skill/characteristic
 * - dialog: delegate to existing system dialogs (Focus Power, Grapple, etc.)
 */

import type { CombatAction } from "./combat-actions.ts";
import { consumeCombatAction, getCombatantForActor } from "../combat-state.ts";

async function executeCombatAction(
    actor: any,
    action: CombatAction,
    options?: { shiftKey?: boolean },
): Promise<void> {
    if (!actor) return;

    // Consume action economy (unless "varies" — those handle it internally)
    if (action.actionCost !== "varies" && action.actionCost !== "free") {
        const consumed = await consumeCombatAction(actor.id, action.actionCost);
        if (!consumed) return;
    }

    // Apply turn effect if specified
    if (action.turnEffect) {
        const combatant = getCombatantForActor(actor.id);
        if (combatant?.addTurnEffect) {
            await combatant.addTurnEffect(action.turnEffect);
        }
    }

    // Route by execution mode
    switch (action.executionMode) {
        case "consume-only":
            await postEmote(actor, action);
            break;

        case "attack-pipeline":
            await executeAttack(actor, action, options);
            break;

        case "skill-check":
            await executeSkillCheck(actor, action, options);
            break;

        case "dialog":
            await executeDialog(actor, action);
            break;
    }
}

/** Post a simple chat emote for actions that just consume action economy */
async function postEmote(actor: any, action: CombatAction): Promise<void> {
    const label = game.i18n?.localize(action.labelKey) ?? action.label;

    // Movement actions: include distance
    let suffix = "";
    const movement = actor.system?.movement;
    if (movement) {
        if (action.slug === "move-half") suffix = ` (${movement.half}m)`;
        else if (action.slug === "move-full") suffix = ` (${movement.full}m)`;
        else if (action.slug === "run") suffix = ` (${movement.run}m)`;
    }

    const content = `<div class="dh2e-action-msg"><strong>${actor.name ?? "?"}</strong> uses <em>${label}</em>${suffix}.</div>`;
    await ChatMessage.create({
        content,
        speaker: ChatMessage.getSpeaker({ actor }),
        type: CONST.CHAT_MESSAGE_STYLES.EMOTE,
    });
}

/** Launch the attack pipeline with a weapon */
async function executeAttack(
    actor: any,
    action: CombatAction,
    options?: { shiftKey?: boolean },
): Promise<void> {
    const opts = action.attackOptions ?? {};

    // Find an equipped weapon matching requirements
    const weapon = findWeapon(actor, action);
    if (!weapon) {
        const reqType = action.requiresMelee ? "melee" : action.requiresRanged ? "ranged" : "";
        const msg = reqType
            ? `No equipped ${reqType} weapon found.`
            : "No equipped weapon found.";
        ui.notifications?.warn(msg);
        return;
    }

    const { AttackResolver } = await import("../attack.ts");
    await AttackResolver.resolve({
        actor,
        weapon,
        fireMode: (opts.fireMode ?? "single") as any,
        meleeMode: opts.meleeMode as any,
        isCharge: opts.isCharge,
    });
}

/** Execute a skill check for the action */
async function executeSkillCheck(
    actor: any,
    action: CombatAction,
    options?: { shiftKey?: boolean },
): Promise<void> {
    const check = action.skillCheck;
    if (!check) return;

    // Special routing for Dodge/Parry reactions
    if (action.slug === "dodge" || action.slug === "parry") {
        const { DefensiveReaction } = await import("../defensive-reaction.ts");
        await DefensiveReaction.prompt(actor, action.slug);
        return;
    }

    // Generic skill check
    const { CheckDH2e } = await import("../../check/check.ts");
    const charKey = check.characteristic ?? "ws";
    const charData = actor.system?.characteristics?.[charKey];
    const baseTarget = charData?.value ?? 25;

    await CheckDH2e.roll({
        actor,
        characteristic: charKey as any,
        baseTarget,
        label: `${game.i18n?.localize(action.labelKey) ?? action.label} Test`,
        domain: `combat:${action.slug}`,
        skipDialog: CheckDH2e.shouldSkipDialog(options?.shiftKey ?? false),
    });
}

/** Delegate to existing system dialogs */
async function executeDialog(actor: any, action: CombatAction): Promise<void> {
    switch (action.slug) {
        case "focus-power": {
            // Open the Powers tab or use power from favorites — handled by sheet
            ui.notifications?.info(
                game.i18n?.localize("DH2E.CombatAction.FocusPower.Hint") ??
                "Use Focus Power from your Powers tab or sheet.",
            );
            break;
        }
        case "grapple": {
            const { GrappleResolver } = await import("../grapple.ts");
            const g = game as any;
            const target = g.user?.targets?.first()?.actor;
            if (!target) {
                ui.notifications?.warn("Select a target for the grapple.");
                return;
            }
            await GrappleResolver.initiate(actor, target);
            break;
        }
        case "suppressing-fire": {
            const { SuppressiveFireResolver } = await import("../suppressive-fire.ts");
            const weapon = findWeapon(actor, action);
            if (!weapon) {
                ui.notifications?.warn("No equipped ranged weapon with full-auto capability.");
                return;
            }
            await SuppressiveFireResolver.resolve({ actor, weapon });
            break;
        }
        case "overwatch": {
            const { OverwatchResolver } = await import("../overwatch.ts");
            const weapon = findWeapon(actor, action);
            if (!weapon) {
                ui.notifications?.warn("No equipped ranged weapon for overwatch.");
                return;
            }
            await OverwatchResolver.resolve({ actor, weapon });
            break;
        }
        default:
            await postEmote(actor, action);
    }
}

/** Find an equipped weapon matching action requirements */
function findWeapon(actor: any, action: CombatAction): any | null {
    const items = actor.items?.filter(
        (i: Item) => i.type === "weapon" && (i.system as any)?.equipped,
    ) ?? [];

    if (action.requiresMelee) {
        return items.find((i: Item) => (i.system as any)?.class === "melee") ?? null;
    }
    if (action.requiresRanged) {
        const fMode = action.attackOptions?.fireMode;
        return items.find((i: Item) => {
            const sys = (i.system as any);
            if (sys?.class !== "ranged" && sys?.class !== "pistol") return false;
            // For semi/full auto, check ROF
            if (fMode === "semi" && !(sys.rof?.semi > 0)) return false;
            if (fMode === "full" && !(sys.rof?.full > 0)) return false;
            return true;
        }) ?? null;
    }
    // Any equipped weapon
    return items[0] ?? null;
}

export { executeCombatAction };
