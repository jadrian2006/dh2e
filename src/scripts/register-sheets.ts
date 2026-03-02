import { AcolyteSheetDH2e } from "@actor/acolyte/sheet.ts";
import { NpcSheetDH2e } from "@actor/npc/sheet.ts";
import { HordeSheetDH2e } from "@actor/horde/sheet.ts";
import { VehicleSheetDH2e } from "@actor/vehicle/sheet.ts";
import { WeaponSheetDH2e } from "@item/weapon/sheet.ts";
import { ArmourSheetDH2e } from "@item/armour/sheet.ts";
import { GearSheetDH2e } from "@item/gear/sheet.ts";
import { SkillSheetDH2e } from "@item/skill/sheet.ts";
import { TalentSheetDH2e } from "@item/talent/sheet.ts";
import { ConditionSheetDH2e } from "@item/condition/sheet.ts";
import { PowerSheetDH2e } from "@item/power/sheet.ts";
import { HomeworldSheetDH2e } from "@item/homeworld/sheet.ts";
import { BackgroundSheetDH2e } from "@item/background/sheet.ts";
import { RoleSheetDH2e } from "@item/role/sheet.ts";
import { TraitSheetDH2e } from "@item/trait/sheet.ts";
import { CriticalInjurySheetDH2e } from "@item/critical-injury/sheet.ts";
import { MalignancySheetDH2e } from "@item/malignancy/sheet.ts";
import { MentalDisorderSheetDH2e } from "@item/mental-disorder/sheet.ts";
import { AmmunitionSheetDH2e } from "@item/ammunition/sheet.ts";
import { CyberneticSheetDH2e } from "@item/cybernetic/sheet.ts";
import { ObjectiveSheetDH2e } from "@item/objective/sheet.ts";
import { TreasureSheetDH2e } from "@item/treasure/sheet.ts";
import { NoteSheetDH2e } from "@item/note/sheet.ts";
import { WarbandSheetDH2e } from "@actor/warband/sheet.ts";
import { LootSheetDH2e } from "@actor/loot/sheet.ts";
import { AdventureImporterDH2e } from "../adventure/importer-sheet.ts";

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

    fd.collections.Actors.registerSheet(SYSTEM_ID, HordeSheetDH2e, {
        types: ["horde"],
        makeDefault: true,
        label: "DH2E.Sheet.Horde",
    });

    fd.collections.Actors.registerSheet(SYSTEM_ID, VehicleSheetDH2e, {
        types: ["vehicle"],
        makeDefault: true,
        label: "DH2E.Sheet.Vehicle",
    });

    fd.collections.Actors.registerSheet(SYSTEM_ID, WarbandSheetDH2e, {
        types: ["warband"],
        makeDefault: true,
        label: "DH2E.Sheet.Warband",
    });

    fd.collections.Actors.registerSheet(SYSTEM_ID, LootSheetDH2e, {
        types: ["loot"],
        makeDefault: true,
        label: "DH2E.Sheet.Loot",
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

    fd.collections.Items.registerSheet(SYSTEM_ID, PowerSheetDH2e, {
        types: ["power"],
        makeDefault: true,
        label: "DH2E.Sheet.Power",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, HomeworldSheetDH2e, {
        types: ["homeworld"],
        makeDefault: true,
        label: "DH2E.Sheet.Homeworld",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, BackgroundSheetDH2e, {
        types: ["background"],
        makeDefault: true,
        label: "DH2E.Sheet.Background",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, RoleSheetDH2e, {
        types: ["role"],
        makeDefault: true,
        label: "DH2E.Sheet.Role",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, TraitSheetDH2e, {
        types: ["trait"],
        makeDefault: true,
        label: "DH2E.Sheet.Trait",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, CriticalInjurySheetDH2e, {
        types: ["critical-injury"],
        makeDefault: true,
        label: "DH2E.Sheet.CriticalInjury",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, MalignancySheetDH2e, {
        types: ["malignancy"],
        makeDefault: true,
        label: "DH2E.Sheet.Malignancy",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, MentalDisorderSheetDH2e, {
        types: ["mental-disorder"],
        makeDefault: true,
        label: "DH2E.Sheet.MentalDisorder",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, AmmunitionSheetDH2e, {
        types: ["ammunition"],
        makeDefault: true,
        label: "DH2E.Sheet.Ammunition",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, CyberneticSheetDH2e, {
        types: ["cybernetic"],
        makeDefault: true,
        label: "DH2E.Sheet.Cybernetic",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, ObjectiveSheetDH2e, {
        types: ["objective"],
        makeDefault: true,
        label: "DH2E.Sheet.Objective",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, TreasureSheetDH2e, {
        types: ["treasure"],
        makeDefault: true,
        label: "DH2E.Sheet.Treasure",
    });

    fd.collections.Items.registerSheet(SYSTEM_ID, NoteSheetDH2e, {
        types: ["note"],
        makeDefault: true,
        label: "DH2E.Sheet.Note",
    });

    // Adventure importer sheet (V2 replacement for Foundry's built-in V1 AdventureImporter)
    fa.apps.DocumentSheetConfig.registerSheet(
        fd.Adventure as any,
        SYSTEM_ID,
        AdventureImporterDH2e as any,
        {
            makeDefault: true,
            label: "DH2E.Sheet.AdventureImporter",
        },
    );
}
