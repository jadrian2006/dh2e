import type { AcolyteDH2e } from "@actor/acolyte/document.ts";
import type { NpcDH2e } from "@actor/npc/document.ts";
import type { WeaponDH2e } from "@item/weapon/document.ts";
import type { ArmourDH2e } from "@item/armour/document.ts";
import type { GearDH2e } from "@item/gear/document.ts";
import type { SkillDH2e } from "@item/skill/document.ts";
import type { TalentDH2e } from "@item/talent/document.ts";
import type { ConditionDH2e } from "@item/condition/document.ts";

/** Core system configuration for Dark Heresy 2nd Edition */
export const DH2ECONFIG: DH2EConfig = {
    Actor: {
        documentClasses: {} as Record<string, typeof Actor>,
    },
    Item: {
        documentClasses: {} as Record<string, typeof Item>,
    },

    characteristics: {
        ws: { label: "DH2E.Characteristic.WeaponSkill", abbreviation: "DH2E.CharAbbrev.WS" },
        bs: { label: "DH2E.Characteristic.BallisticSkill", abbreviation: "DH2E.CharAbbrev.BS" },
        s: { label: "DH2E.Characteristic.Strength", abbreviation: "DH2E.CharAbbrev.S" },
        t: { label: "DH2E.Characteristic.Toughness", abbreviation: "DH2E.CharAbbrev.T" },
        ag: { label: "DH2E.Characteristic.Agility", abbreviation: "DH2E.CharAbbrev.Ag" },
        int: { label: "DH2E.Characteristic.Intelligence", abbreviation: "DH2E.CharAbbrev.Int" },
        per: { label: "DH2E.Characteristic.Perception", abbreviation: "DH2E.CharAbbrev.Per" },
        wp: { label: "DH2E.Characteristic.Willpower", abbreviation: "DH2E.CharAbbrev.WP" },
        fel: { label: "DH2E.Characteristic.Fellowship", abbreviation: "DH2E.CharAbbrev.Fel" },
    },

    hitLocations: {
        head: { label: "DH2E.HitLocation.Head", range: [1, 10] },
        rightArm: { label: "DH2E.HitLocation.RightArm", range: [11, 20] },
        leftArm: { label: "DH2E.HitLocation.LeftArm", range: [21, 30] },
        body: { label: "DH2E.HitLocation.Body", range: [31, 70] },
        rightLeg: { label: "DH2E.HitLocation.RightLeg", range: [71, 85] },
        leftLeg: { label: "DH2E.HitLocation.LeftLeg", range: [86, 100] },
    },

    skills: {
        acrobatics: { label: "DH2E.Skill.Acrobatics", characteristic: "ag", specialist: false },
        athletics: { label: "DH2E.Skill.Athletics", characteristic: "s", specialist: false },
        awareness: { label: "DH2E.Skill.Awareness", characteristic: "per", specialist: false },
        charm: { label: "DH2E.Skill.Charm", characteristic: "fel", specialist: false },
        command: { label: "DH2E.Skill.Command", characteristic: "fel", specialist: false },
        commerce: { label: "DH2E.Skill.Commerce", characteristic: "int", specialist: false },
        commonLore: { label: "DH2E.Skill.CommonLore", characteristic: "int", specialist: true },
        deceive: { label: "DH2E.Skill.Deceive", characteristic: "fel", specialist: false },
        dodge: { label: "DH2E.Skill.Dodge", characteristic: "ag", specialist: false },
        forbiddenLore: { label: "DH2E.Skill.ForbiddenLore", characteristic: "int", specialist: true },
        inquiry: { label: "DH2E.Skill.Inquiry", characteristic: "fel", specialist: false },
        interrogation: { label: "DH2E.Skill.Interrogation", characteristic: "wp", specialist: false },
        intimidate: { label: "DH2E.Skill.Intimidate", characteristic: "s", specialist: false },
        linguistics: { label: "DH2E.Skill.Linguistics", characteristic: "int", specialist: true },
        logic: { label: "DH2E.Skill.Logic", characteristic: "int", specialist: false },
        medicae: { label: "DH2E.Skill.Medicae", characteristic: "int", specialist: false },
        navigate: { label: "DH2E.Skill.Navigate", characteristic: "int", specialist: true },
        operate: { label: "DH2E.Skill.Operate", characteristic: "ag", specialist: true },
        parry: { label: "DH2E.Skill.Parry", characteristic: "ws", specialist: false },
        psyniscience: { label: "DH2E.Skill.Psyniscience", characteristic: "per", specialist: false },
        scholasticLore: { label: "DH2E.Skill.ScholasticLore", characteristic: "int", specialist: true },
        scrutiny: { label: "DH2E.Skill.Scrutiny", characteristic: "per", specialist: false },
        security: { label: "DH2E.Skill.Security", characteristic: "int", specialist: false },
        sleightOfHand: { label: "DH2E.Skill.SleightOfHand", characteristic: "ag", specialist: false },
        stealth: { label: "DH2E.Skill.Stealth", characteristic: "ag", specialist: false },
        survival: { label: "DH2E.Skill.Survival", characteristic: "per", specialist: false },
        tech: { label: "DH2E.Skill.TechUse", characteristic: "int", specialist: false },
        trade: { label: "DH2E.Skill.Trade", characteristic: "int", specialist: true },
    },

    damageTypes: {
        energy: "DH2E.DamageType.Energy",
        impact: "DH2E.DamageType.Impact",
        rending: "DH2E.DamageType.Rending",
        explosive: "DH2E.DamageType.Explosive",
    },

    weaponClasses: {
        melee: "DH2E.WeaponClass.Melee",
        pistol: "DH2E.WeaponClass.Pistol",
        basic: "DH2E.WeaponClass.Basic",
        heavy: "DH2E.WeaponClass.Heavy",
        thrown: "DH2E.WeaponClass.Thrown",
    },

    fireModes: {
        single: "DH2E.FireMode.Single",
        semi: "DH2E.FireMode.SemiAuto",
        full: "DH2E.FireMode.FullAuto",
        suppressive: "DH2E.FireMode.Suppressive",
    },

    environmentalHazards: {
        fire: "DH2E.Environment.Fire",
        vacuum: "DH2E.Environment.Vacuum",
        toxic: "DH2E.Environment.Toxic",
        gravity: "DH2E.Environment.Gravity",
    },

    availabilityTiers: {
        ubiquitous: { label: "DH2E.Availability.Ubiquitous", modifier: 30 },
        abundant: { label: "DH2E.Availability.Abundant", modifier: 20 },
        plentiful: { label: "DH2E.Availability.Plentiful", modifier: 10 },
        common: { label: "DH2E.Availability.Common", modifier: 0 },
        average: { label: "DH2E.Availability.Average", modifier: -10 },
        scarce: { label: "DH2E.Availability.Scarce", modifier: -20 },
        rare: { label: "DH2E.Availability.Rare", modifier: -30 },
        veryRare: { label: "DH2E.Availability.VeryRare", modifier: -40 },
        extremelyRare: { label: "DH2E.Availability.ExtremelyRare", modifier: -50 },
        nearUnique: { label: "DH2E.Availability.NearUnique", modifier: -60 },
        unique: { label: "DH2E.Availability.Unique", modifier: -70 },
    },

    disorderSeverities: {
        minor: "DH2E.Disorder.Minor",
        severe: "DH2E.Disorder.Severe",
        acute: "DH2E.Disorder.Acute",
    },

    cyberneticTypes: {
        replacement: "DH2E.Cybernetic.Replacement",
        enhancement: "DH2E.Cybernetic.Enhancement",
    },

    cyberneticGrades: {
        poor: "DH2E.Cybernetic.Grade.Poor",
        common: "DH2E.Cybernetic.Grade.Common",
        good: "DH2E.Cybernetic.Grade.Good",
        best: "DH2E.Cybernetic.Grade.Best",
    },

    motiveTypes: {
        wheeled: "DH2E.Vehicle.Motive.Wheeled",
        tracked: "DH2E.Vehicle.Motive.Tracked",
        hover: "DH2E.Vehicle.Motive.Hover",
        walker: "DH2E.Vehicle.Motive.Walker",
    },

    vehicleSizes: {
        hulking: "DH2E.Vehicle.Size.Hulking",
        enormous: "DH2E.Vehicle.Size.Enormous",
        massive: "DH2E.Vehicle.Size.Massive",
        immense: "DH2E.Vehicle.Size.Immense",
    },

    crewRoles: {
        driver: "DH2E.Vehicle.Crew.Driver",
        gunner: "DH2E.Vehicle.Crew.Gunner",
        commander: "DH2E.Vehicle.Crew.Commander",
        passenger: "DH2E.Vehicle.Crew.Passenger",
    },

    fireArcs: {
        front: "DH2E.Vehicle.Arc.Front",
        turret: "DH2E.Vehicle.Arc.Turret",
        left: "DH2E.Vehicle.Arc.Left",
        right: "DH2E.Vehicle.Arc.Right",
        rear: "DH2E.Vehicle.Arc.Rear",
        all: "DH2E.Vehicle.Arc.All",
    },

    traitCategories: {
        creature: "DH2E.TraitCategory.Creature",
        npc: "DH2E.TraitCategory.NPC",
        daemonic: "DH2E.TraitCategory.Daemonic",
    },

    craftsmanshipTiers: {
        poor:   { label: "DH2E.Craftsmanship.Poor",   modifier: 10 },
        common: { label: "DH2E.Craftsmanship.Common", modifier: 0 },
        good:   { label: "DH2E.Craftsmanship.Good",   modifier: -10 },
        best:   { label: "DH2E.Craftsmanship.Best",   modifier: -30 },
    },

    modifierCap: 60,
};
