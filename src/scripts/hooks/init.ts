import { AcolyteDH2e } from "@actor/acolyte/document.ts";
import { NpcDH2e } from "@actor/npc/document.ts";
import { WeaponDH2e } from "@item/weapon/document.ts";
import { ArmourDH2e } from "@item/armour/document.ts";
import { GearDH2e } from "@item/gear/document.ts";
import { SkillDH2e } from "@item/skill/document.ts";
import { TalentDH2e } from "@item/talent/document.ts";
import { ConditionDH2e } from "@item/condition/document.ts";
import { PowerDH2e } from "@item/power/document.ts";
import { HomeworldDH2e } from "@item/homeworld/document.ts";
import { BackgroundDH2e } from "@item/background/document.ts";
import { RoleDH2e } from "@item/role/document.ts";
import { TraitDH2e } from "@item/trait/document.ts";
import { CriticalInjuryDH2e } from "@item/critical-injury/document.ts";
import { MalignancyDH2e } from "@item/malignancy/document.ts";
import { MentalDisorderDH2e } from "@item/mental-disorder/document.ts";
import { AmmunitionDH2e } from "@item/ammunition/document.ts";
import { CyberneticDH2e } from "@item/cybernetic/document.ts";
import { HordeDH2e } from "@actor/horde/document.ts";
import { VehicleDH2e } from "@actor/vehicle/document.ts";
import { DH2ECONFIG } from "@scripts/config/index.ts";
import { DH2E_STATUS_EFFECTS } from "@scripts/config/status-effects.ts";
import { registerHandlebarsHelpers } from "@scripts/handlebars.ts";
import { preloadTemplates } from "@scripts/register-templates.ts";
import { registerAllSettings } from "../../ui/settings/settings.ts";

/** Hooks.once("init") — set config, register settings, preload templates */
export class Init {
    static listen(): void {
        Hooks.once("init", () => {
            // Assign system config
            CONFIG.DH2E = DH2ECONFIG;
            game.dh2e = { config: DH2ECONFIG };

            // Register document subclasses for the proxy dispatch
            CONFIG.DH2E.Actor.documentClasses = {
                acolyte: AcolyteDH2e as unknown as typeof Actor,
                npc: NpcDH2e as unknown as typeof Actor,
                horde: HordeDH2e as unknown as typeof Actor,
                vehicle: VehicleDH2e as unknown as typeof Actor,
            };
            CONFIG.DH2E.Item.documentClasses = {
                weapon: WeaponDH2e as unknown as typeof Item,
                armour: ArmourDH2e as unknown as typeof Item,
                gear: GearDH2e as unknown as typeof Item,
                skill: SkillDH2e as unknown as typeof Item,
                talent: TalentDH2e as unknown as typeof Item,
                condition: ConditionDH2e as unknown as typeof Item,
                power: PowerDH2e as unknown as typeof Item,
                homeworld: HomeworldDH2e as unknown as typeof Item,
                background: BackgroundDH2e as unknown as typeof Item,
                role: RoleDH2e as unknown as typeof Item,
                trait: TraitDH2e as unknown as typeof Item,
                "critical-injury": CriticalInjuryDH2e as unknown as typeof Item,
                malignancy: MalignancyDH2e as unknown as typeof Item,
                "mental-disorder": MentalDisorderDH2e as unknown as typeof Item,
                ammunition: AmmunitionDH2e as unknown as typeof Item,
                cybernetic: CyberneticDH2e as unknown as typeof Item,
            };

            // Set initiative formula
            CONFIG.Combat.initiative = {
                formula: "1d10 + @characteristics.ag.bonus",
                decimals: 0,
            };

            // Register status effects for token overlays
            CONFIG.statusEffects = DH2E_STATUS_EFFECTS;

            // Register custom Handlebars helpers
            registerHandlebarsHelpers();

            // Preload Handlebars templates
            preloadTemplates();

            // Register game settings
            registerAllSettings();

            // Register keybindings
            game.keybindings.register(SYSTEM_ID, "openCompendiumBrowser", {
                name: "DH2E.Browser.Title",
                editable: [{ key: "KeyB", modifiers: ["Control"] }],
                onDown: () => {
                    import("../../ui/compendium-browser/browser.ts").then(m => m.CompendiumBrowser.open());
                    return true;
                },
                restricted: false,
                precedence: (CONST as any).KEYBINDING_PRECEDENCE?.NORMAL ?? 0,
            });
        });
    }
}
