import { executeSkillUseRoll } from "@item/skill/roll-skill-use.ts";
import { CANONICAL_SKILL_USES, CANONICAL_SKILL_CHARS } from "@item/skill/uses.ts";
import { CheckDH2e } from "@check/check.ts";
import { AttackResolver } from "@combat/attack.ts";
import { MaintenanceDialog } from "@item/cybernetic/maintenance-dialog.ts";

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
