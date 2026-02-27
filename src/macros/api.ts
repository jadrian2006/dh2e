import { executeSkillUseRoll } from "@item/skill/roll-skill-use.ts";
import { CANONICAL_SKILL_USES, CANONICAL_SKILL_CHARS } from "@item/skill/uses.ts";
import { CheckDH2e } from "@check/check.ts";
import { AttackResolver } from "@combat/attack.ts";
import { MaintenanceDialog } from "@item/cybernetic/maintenance-dialog.ts";
import { getConditionFromCompendium } from "@combat/critical.ts";

/**
 * Resolve the current actor for macro execution.
 * Priority: assigned character > first selected token's actor > null.
 */
function resolveActor(): Actor | null {
    const g = game as any;
    if (g.user?.character) return g.user.character;
    const controlled = canvas?.tokens?.controlled ?? [];
    if (controlled.length > 0) return controlled[0].actor ?? null;
    return null;
}

/**
 * Roll a specific skill use via macro.
 * Finds the skill item on the actor (or synthesizes from canonical data).
 */
export async function rollSkillUse(skillName: string, useSlug: string): Promise<void> {
    const actor = resolveActor();
    if (!actor) {
        ui.notifications.warn(
            (game as any).i18n?.localize?.("DH2E.Macro.NoActor")
                ?? "No actor found. Assign a character or select a token.",
        );
        return;
    }

    // Find skill item on actor
    let skillItem = (actor as any).items?.find(
        (i: Item) => i.type === "skill" && i.name === skillName,
    ) ?? null;

    // Find the use definition
    const uses = skillItem?.system?.uses ?? skillItem?.skillSystem?.uses
        ?? CANONICAL_SKILL_USES[skillName] ?? [];
    const use = uses.find((u: any) => u.slug === useSlug);

    if (!use) {
        ui.notifications.warn(
            (game as any).i18n?.localize?.("DH2E.Macro.UnknownSkillUse")
                ?? `Unknown skill use: ${skillName} / ${useSlug}`,
        );
        return;
    }

    // Synthesize a minimal skill entry if actor doesn't own the skill
    if (!skillItem) {
        const linkedChar = CANONICAL_SKILL_CHARS[skillName] ?? "ws";
        const charValue = (actor as any).system?.characteristics?.[linkedChar]?.value
            ?? (actor as any).system?.characteristics?.[linkedChar]?.base
            ?? 0;
        skillItem = {
            name: skillName,
            displayName: skillName,
            linkedCharacteristic: linkedChar,
            advancement: 0,
            advancementBonus: 0,
            totalTarget: charValue,
            isTrained: false,
            _synthetic: true,
        };
    }

    await executeSkillUseRoll(actor, skillItem, use);
}

/**
 * Roll a weapon attack via macro.
 * Finds the weapon by ID on the resolved actor.
 */
export async function rollWeapon(weaponId: string): Promise<void> {
    const actor = resolveActor();
    if (!actor) {
        ui.notifications.warn(
            (game as any).i18n?.localize?.("DH2E.Macro.NoActor")
                ?? "No actor found. Assign a character or select a token.",
        );
        return;
    }

    const weapon = (actor as any).items?.get(weaponId);
    if (!weapon || weapon.type !== "weapon") {
        ui.notifications.warn(
            (game as any).i18n?.localize?.("DH2E.Macro.WeaponNotFound")
                ?? "Weapon not found on the current actor.",
        );
        return;
    }

    await AttackResolver.resolve({ actor, weapon, fireMode: "single" });
}

/**
 * Open the cybernetic maintenance dialog.
 * With a targeted token → chirurgeon mode (maintain target's cybernetics).
 * No target → self-maintenance on the resolved actor.
 */
export async function maintainCybernetics(): Promise<void> {
    const actor = resolveActor();
    if (!actor) {
        ui.notifications.warn(
            (game as any).i18n?.localize?.("DH2E.Macro.NoActor")
                ?? "No actor found. Assign a character or select a token.",
        );
        return;
    }

    // Check for targeted token → chirurgeon mode
    const targets = (game as any).user?.targets;
    const targetToken = targets?.size > 0 ? targets.values().next().value : null;
    const targetActor = targetToken?.actor ?? null;

    if (targetActor && targetActor.id !== actor.id) {
        // Chirurgeon mode: maintain target's cybernetics, attributed to actor
        await MaintenanceDialog.open(targetActor, actor);
    } else {
        // Self-maintenance
        await MaintenanceDialog.open(actor);
    }
}

/**
 * Roll a base skill check via macro (no specific use).
 * Finds the skill item on the actor and rolls a simple check.
 */
/**
 * Check Surprised — GM macro for surprise rounds.
 *
 * Prompts the GM for a difficulty modifier, then rolls Awareness (Perception)
 * for each combatant in the active combat. Failures receive the Surprised
 * condition (skipped on their turn, attackers gain +3 DoS).
 *
 * Players see "Roll Awareness" — the surprise intent is not revealed.
 */
export async function checkSurprised(): Promise<void> {
    const g = game as any;

    if (!g.user?.isGM) {
        ui.notifications.warn(
            g.i18n?.localize("DH2E.Surprised.GMOnly") ?? "Only the GM can run surprise checks.",
        );
        return;
    }

    const combat = g.combat;
    if (!combat || !combat.started) {
        ui.notifications.warn(
            g.i18n?.localize("DH2E.Surprised.NoCombat") ?? "No active combat encounter.",
        );
        return;
    }

    // Build combatant list for the dialog
    const combatants: { id: string; name: string; img: string; actorId: string }[] = [];
    for (const c of combat.combatants) {
        if (!c.actor) continue;
        combatants.push({
            id: c.id,
            name: c.name ?? c.actor.name ?? "Unknown",
            img: c.token?.texture?.src ?? c.actor.img ?? "icons/svg/mystery-man.svg",
            actorId: c.actor.id,
        });
    }

    if (combatants.length === 0) {
        ui.notifications.warn("No combatants in the encounter.");
        return;
    }

    // Show GM dialog — difficulty modifier + checkboxes for which combatants to test
    const checkRows = combatants.map(c =>
        `<label class="dh2e-surprise-row" style="display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0;">
            <input type="checkbox" name="combatant" value="${c.id}" checked>
            <img src="${c.img}" width="24" height="24" style="border:none;border-radius:2px;">
            <span>${c.name}</span>
        </label>`,
    ).join("");

    const content = `
        <div style="padding:0.5rem;">
            <div style="margin-bottom:0.75rem;">
                <label style="font-weight:bold;font-size:0.8rem;">
                    ${g.i18n?.localize("DH2E.Surprised.DifficultyLabel") ?? "Difficulty Modifier"}
                </label>
                <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem;">
                    <input type="number" name="modifier" value="0" step="10"
                        style="width:5rem;text-align:center;">
                    <span style="font-size:0.75rem;color:#999;">
                        ${g.i18n?.localize("DH2E.Surprised.DifficultyHint") ?? "(e.g. -20 for well-planned ambush)"}
                    </span>
                </div>
            </div>
            <div>
                <label style="font-weight:bold;font-size:0.8rem;">
                    ${g.i18n?.localize("DH2E.Surprised.CombatantsLabel") ?? "Combatants to Test"}
                </label>
                <div style="max-height:200px;overflow-y:auto;margin-top:0.25rem;">
                    ${checkRows}
                </div>
            </div>
        </div>
    `;

    const dialog = new fa.api.DialogV2({
        window: {
            title: g.i18n?.localize("DH2E.Surprised.DialogTitle") ?? "Check Surprised",
            icon: "fa-solid fa-eye-slash",
        },
        content,
        buttons: [
            {
                action: "roll",
                label: g.i18n?.localize("DH2E.Surprised.RollButton") ?? "Roll Awareness",
                default: true,
                callback: (_event: Event, button: HTMLElement) => {
                    const form = button.closest(".dialog-v2")?.querySelector("form")
                        ?? button.closest(".application")?.querySelector("form");
                    const modifier = parseInt((form?.querySelector('[name="modifier"]') as HTMLInputElement)?.value ?? "0", 10) || 0;
                    const checked: string[] = [];
                    form?.querySelectorAll<HTMLInputElement>('input[name="combatant"]:checked').forEach(
                        cb => checked.push(cb.value),
                    );
                    return { modifier, combatantIds: checked };
                },
            },
            {
                action: "cancel",
                label: g.i18n?.localize("DH2E.Cancel") ?? "Cancel",
            },
        ],
        position: { width: 400 },
    });

    const result: any = await dialog.render(true).then(
        () => new Promise(resolve => {
            dialog.addEventListener("close", (ev: any) => {
                resolve(ev.detail?.result ?? null);
            });
        }),
    );

    if (!result || !result.combatantIds?.length) return;

    const { modifier, combatantIds } = result;
    const surprised: string[] = [];
    const passed: string[] = [];

    // Roll Awareness for each selected combatant
    for (const cId of combatantIds) {
        const combatant = combat.combatants.get(cId);
        const actor = combatant?.actor;
        if (!actor) continue;

        // Resolve Perception target for Awareness
        const skillItem = (actor as any).items?.find(
            (i: Item) => i.type === "skill" && i.name === "Awareness",
        );
        let baseTarget: number;
        let characteristic: string = "per";

        if (skillItem) {
            baseTarget = skillItem.totalTarget ?? 0;
            characteristic = (skillItem.skillSystem ?? skillItem.system)?.linkedCharacteristic ?? "per";
        } else {
            baseTarget = (actor as any).system?.characteristics?.per?.value
                ?? (actor as any).system?.characteristics?.per?.base
                ?? 0;
        }

        // Roll with difficulty modifier, skip dialog (GM is setting difficulty via the macro dialog)
        const checkResult = await CheckDH2e.roll({
            actor,
            characteristic: characteristic as any,
            baseTarget: baseTarget + modifier,
            label: g.i18n?.localize("DH2E.Surprised.RollLabel") ?? "Awareness Test",
            domain: "skill:awareness",
            skipDialog: true,
        });

        if (!checkResult || !checkResult.dos.success) {
            surprised.push(actor.name);

            // Apply Surprised condition
            const conditionData = await getConditionFromCompendium("surprised");
            await actor.createEmbeddedDocuments("Item", [conditionData]);
        } else {
            passed.push(actor.name);
        }
    }

    // Post GM summary chat card
    const surprisedList = surprised.length > 0
        ? surprised.map(n => `<strong>${n}</strong>`).join(", ")
        : g.i18n?.localize("DH2E.Surprised.None") ?? "None";
    const passedList = passed.length > 0
        ? passed.map(n => `<strong>${n}</strong>`).join(", ")
        : g.i18n?.localize("DH2E.Surprised.None") ?? "None";

    await fd.ChatMessage.create({
        content: `<div class="dh2e-condition-effect">
            <h4 style="margin:0 0 0.25rem;">${g.i18n?.localize("DH2E.Surprised.SummaryTitle") ?? "Surprise Round!"}</h4>
            <p style="margin:0.25rem 0;"><strong>${g.i18n?.localize("DH2E.Surprised.SurprisedLabel") ?? "Surprised:"}</strong> ${surprisedList}</p>
            <p style="margin:0.25rem 0;"><strong>${g.i18n?.localize("DH2E.Surprised.AlertLabel") ?? "Alert:"}</strong> ${passedList}</p>
        </div>`,
        whisper: [g.user.id],
        flags: { [SYSTEM_ID]: { type: "surprise-summary" } },
    });
}

export async function rollSkill(skillName: string): Promise<void> {
    const actor = resolveActor();
    if (!actor) {
        ui.notifications.warn(
            (game as any).i18n?.localize?.("DH2E.Macro.NoActor")
                ?? "No actor found. Assign a character or select a token.",
        );
        return;
    }

    // Find skill item on actor
    const skillItem = (actor as any).items?.find(
        (i: Item) => i.type === "skill" && i.name === skillName,
    );

    if (skillItem) {
        const sys = skillItem.skillSystem ?? skillItem.system ?? {};
        await CheckDH2e.roll({
            actor,
            characteristic: sys.linkedCharacteristic ?? "ws",
            baseTarget: skillItem.totalTarget ?? 0,
            label: `${skillItem.displayName ?? skillItem.name} Test`,
            domain: `skill:${skillName.toLowerCase().replace(/\s+/g, "-")}`,
            skillDescription: sys.description ?? "",
        });
    } else {
        // Synthesize from canonical data
        const linkedChar = CANONICAL_SKILL_CHARS[skillName] ?? "ws";
        const charValue = (actor as any).system?.characteristics?.[linkedChar]?.value
            ?? (actor as any).system?.characteristics?.[linkedChar]?.base
            ?? 0;
        await CheckDH2e.roll({
            actor,
            characteristic: linkedChar,
            baseTarget: charValue,
            label: `${skillName} Test`,
            domain: `skill:${skillName.toLowerCase().replace(/\s+/g, "-")}`,
            untrained: true,
        });
    }
}
