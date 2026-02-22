import { AcolyteSheetDH2e } from "@actor/acolyte/sheet.ts";
import { NpcSheetDH2e } from "@actor/npc/sheet.ts";
import { WeaponSheetDH2e } from "@item/weapon/sheet.ts";
import { ArmourSheetDH2e } from "@item/armour/sheet.ts";
import { GearSheetDH2e } from "@item/gear/sheet.ts";
import { SkillSheetDH2e } from "@item/skill/sheet.ts";
import { TalentSheetDH2e } from "@item/talent/sheet.ts";
import { ConditionSheetDH2e } from "@item/condition/sheet.ts";

/** Register all actor and item sheets with Foundry */
export function registerSheets(): void {
    // Actor sheets
    fd.collections.Actors.registerSheet(SYSTEM_ID, AcolyteSheetDH2e, {
        types: ["acolyte"],
        makeDefault: true,
        label: "DH2E.Sheet.Acolyte",
    });

    fd.collections.Actors.registerSheet(SYSTEM_ID, NpcSheetDH2e, {
        types: ["npc"],
        makeDefault: true,
        label: "DH2E.Sheet.NPC",
    });

    // Item sheets
    fd.collections.Items.registerSheet(SYSTEM_ID, WeaponSheetDH2e, {
        types: ["weapon"],
        makeDefault: true,
        label: "DH2E.Sheet.Weapon",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, ArmourSheetDH2e, {
        types: ["armour"],
        makeDefault: true,
        label: "DH2E.Sheet.Armour",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, GearSheetDH2e, {
        types: ["gear"],
        makeDefault: true,
        label: "DH2E.Sheet.Gear",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, SkillSheetDH2e, {
        types: ["skill"],
        makeDefault: true,
        label: "DH2E.Sheet.Skill",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, TalentSheetDH2e, {
        types: ["talent"],
        makeDefault: true,
        label: "DH2E.Sheet.Talent",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, ConditionSheetDH2e, {
        types: ["condition"],
        makeDefault: true,
        label: "DH2E.Sheet.Condition",
    });
}
