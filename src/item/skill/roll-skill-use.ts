import type { SkillUse } from "./data.ts";
import { CheckDH2e } from "@check/check.ts";
import { ModifierDH2e } from "@rules/modifier.ts";

/**
 * Execute a skill use roll — shared logic used by the character sheet,
 * actions grid, combat HUD, and macro API.
 *
 * Handles: characteristic resolution, base target computation,
 * untrained blocking, domain building, defaultModifier, and CheckDH2e.roll().
 */
export async function executeSkillUseRoll(
    actor: Actor,
    skillItem: any | null,
    use: SkillUse,
    skipDialog?: boolean,
): Promise<void> {
    const g = game as any;

    // Resolve skill properties — works for real items and synthetic entries
    const skillSystem = skillItem?.skillSystem ?? skillItem?.system ?? {};
    const advancement = skillSystem.advancement ?? skillItem?.advancement ?? 0;
    const isTrained = skillItem?.isTrained ?? (advancement >= 1);

    // Check untrained block setting
    const blockUntrained = g.settings?.get?.(SYSTEM_ID, "blockUntrainedSkillUses") ?? false;
    const isGM = g.user?.isGM ?? false;
    if (blockUntrained && !isTrained && !isGM) {
        ui.notifications.warn(
            g.i18n?.localize?.("DH2E.Skill.UntrainedBlocked")
                ?? "You must be trained in this skill to use it.",
        );
        return;
    }

    // Resolve characteristic — use override if present, otherwise parent skill's linked char
    const characteristic = use.characteristicOverride
        ?? skillSystem.linkedCharacteristic
        ?? skillItem?.linkedCharacteristic
        ?? "ws";

    // Compute base target from the actor's characteristic + skill advancement bonus
    const actorSys = (actor as any).system;
    const charValue = actorSys?.characteristics?.[characteristic]?.value
        ?? actorSys?.characteristics?.[characteristic]?.base
        ?? 0;
    const advancementBonus = skillItem?.advancementBonus ?? 0;
    const baseTarget = charValue + advancementBonus;

    // Build domain with three segments for parent inheritance
    const skillName = skillItem?.name ?? "Unknown";
    const skillSlug = skillName.toLowerCase().replace(/\s+/g, "-");
    const domain = `skill:${skillSlug}:${use.slug}`;

    // Build label
    const displayName = skillItem?.displayName ?? skillName;
    const label = `${displayName} (${use.label}) Test`;

    // Collect extra modifiers from the use's defaultModifier
    const modifiers: ModifierDH2e[] = [];
    if (use.defaultModifier && use.defaultModifier !== 0) {
        modifiers.push(new ModifierDH2e({
            label: use.defaultModifierLabel ?? use.label,
            value: use.defaultModifier,
            source: `skill-use:${use.slug}`,
        }));
    }

    await CheckDH2e.roll({
        actor,
        characteristic,
        baseTarget,
        label,
        domain,
        modifiers,
        skillDescription: use.description,
        untrained: !isTrained,
        skipDialog,
    });
}
