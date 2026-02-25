import { executeSkillUseRoll } from "@item/skill/roll-skill-use.ts";
import { CANONICAL_SKILL_USES, CANONICAL_SKILL_CHARS } from "@item/skill/uses.ts";
import { AttackResolver } from "@combat/attack.ts";
import { CheckDH2e } from "@check/check.ts";

/** A single HUD hotbar slot entry */
export type HudSlotEntry =
    | { type: "skillUse"; skillName: string; useSlug: string; label: string; icon: string }
    | { type: "weapon"; weaponId: string; label: string; icon: string }
    | { type: "skill"; skillName: string; label: string; icon: string }
    | { type: "quickAction"; actionKey: string; label: string; icon: string };

const NUM_SLOTS = 10;

/**
 * Auto-populate HUD slots from actor data:
 * - Favorited skill uses first
 * - Equipped weapons
 * - Remaining slots are null
 */
export function autoPopulateSlots(actor: any): (HudSlotEntry | null)[] {
    const slots: (HudSlotEntry | null)[] = new Array(NUM_SLOTS).fill(null);
    let idx = 0;

    // Favorited skill uses
    const favs = actor?.getFlag?.("dh2e", "favoriteUses") ?? {};
    for (const [key, val] of Object.entries(favs)) {
        if (!val || idx >= NUM_SLOTS) break;
        // key format: "skillname--useslug"
        const dashIdx = key.indexOf("--");
        if (dashIdx < 0) continue;
        const skillSlug = key.slice(0, dashIdx);
        const useSlug = key.slice(dashIdx + 2);

        // Find the actual skill name from canonical data (reverse slug lookup)
        let skillName = "";
        for (const [name] of Object.entries(CANONICAL_SKILL_USES)) {
            if (name.toLowerCase().replace(/\s+/g, "-") === skillSlug) {
                skillName = name;
                break;
            }
        }
        if (!skillName) continue;

        // Find use label
        const uses = CANONICAL_SKILL_USES[skillName] ?? [];
        const use = uses.find(u => u.slug === useSlug);
        if (!use) continue;

        slots[idx++] = {
            type: "skillUse",
            skillName,
            useSlug,
            label: use.label,
            icon: "fa-solid fa-dice-d20",
        };
    }

    // Equipped weapons
    const weapons = actor?.items?.filter((i: Item) => {
        return i.type === "weapon" && (i as any).system?.equipped;
    }) ?? [];
    for (const w of weapons) {
        if (idx >= NUM_SLOTS) break;
        slots[idx++] = {
            type: "weapon",
            weaponId: w.id ?? w._id ?? "",
            label: w.name,
            icon: "fa-solid fa-crosshairs",
        };
    }

    return slots;
}

/**
 * Execute a HUD slot action.
 */
export async function executeSlot(actor: any, entry: HudSlotEntry): Promise<void> {
    switch (entry.type) {
        case "skillUse": {
            const skillItem = actor.items?.find(
                (i: Item) => i.type === "skill" && i.name === entry.skillName,
            ) ?? null;

            const uses = skillItem?.system?.uses ?? skillItem?.skillSystem?.uses
                ?? CANONICAL_SKILL_USES[entry.skillName] ?? [];
            const use = uses.find((u: any) => u.slug === entry.useSlug);
            if (!use) {
                ui.notifications.warn("Skill use not found.");
                return;
            }

            // Synthesize skill if not owned
            let item = skillItem;
            if (!item) {
                const linkedChar = CANONICAL_SKILL_CHARS[entry.skillName] ?? "ws";
                const charValue = actor.system?.characteristics?.[linkedChar]?.value
                    ?? actor.system?.characteristics?.[linkedChar]?.base ?? 0;
                item = {
                    name: entry.skillName,
                    displayName: entry.skillName,
                    linkedCharacteristic: linkedChar,
                    advancement: 0,
                    advancementBonus: 0,
                    totalTarget: charValue,
                    isTrained: false,
                    _synthetic: true,
                };
            }

            await executeSkillUseRoll(actor, item, use);
            break;
        }
        case "weapon": {
            const weapon = actor.items?.get(entry.weaponId);
            if (!weapon) {
                ui.notifications.warn("Weapon not found on actor.");
                return;
            }
            await AttackResolver.resolve({ actor, weapon, fireMode: "single" });
            break;
        }
        case "skill": {
            const skillItem = actor.items?.find(
                (i: Item) => i.type === "skill" && i.name === entry.skillName,
            );
            if (skillItem) {
                const sys = skillItem.skillSystem ?? skillItem.system ?? {};
                await CheckDH2e.roll({
                    actor,
                    characteristic: sys.linkedCharacteristic ?? "ws",
                    baseTarget: skillItem.totalTarget ?? 0,
                    label: `${skillItem.displayName ?? skillItem.name} Test`,
                    domain: `skill:${entry.skillName.toLowerCase().replace(/\s+/g, "-")}`,
                    skillDescription: sys.description ?? "",
                });
            }
            break;
        }
        case "quickAction":
            // Quick actions are handled by the combatant action economy
            break;
    }
}

/**
 * Set a specific HUD slot on an actor's flags.
 */
export async function setHudSlot(
    actor: any,
    index: number,
    entry: HudSlotEntry | null,
): Promise<void> {
    const slots = actor.getFlag?.("dh2e", "hudSlots") ?? new Array(NUM_SLOTS).fill(null);
    const updated = [...slots];
    updated[index] = entry;
    await actor.setFlag("dh2e", "hudSlots", updated);
}

/**
 * Validate stored slots against current actor data.
 * Removes entries for weapons that no longer exist, etc.
 */
export function validateSlots(
    actor: any,
    slots: (HudSlotEntry | null)[],
): (HudSlotEntry | null)[] {
    return slots.map(entry => {
        if (!entry) return null;
        if (entry.type === "weapon") {
            const weapon = actor.items?.get(entry.weaponId);
            if (!weapon) return null;
            // Update label in case weapon was renamed
            return { ...entry, label: weapon.name };
        }
        return entry;
    });
}
