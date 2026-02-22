import { AcolyteDH2e } from "@actor/acolyte/document.ts";
import { NpcDH2e } from "@actor/npc/document.ts";
import { WeaponDH2e } from "@item/weapon/document.ts";
import { ArmourDH2e } from "@item/armour/document.ts";
import { GearDH2e } from "@item/gear/document.ts";
import { SkillDH2e } from "@item/skill/document.ts";
import { TalentDH2e } from "@item/talent/document.ts";
import { ConditionDH2e } from "@item/condition/document.ts";
import { DH2ECONFIG } from "@scripts/config/index.ts";
import { registerHandlebarsHelpers } from "@scripts/handlebars.ts";
import { preloadTemplates } from "@scripts/register-templates.ts";

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
            };
            CONFIG.DH2E.Item.documentClasses = {
                weapon: WeaponDH2e as unknown as typeof Item,
                armour: ArmourDH2e as unknown as typeof Item,
                gear: GearDH2e as unknown as typeof Item,
                skill: SkillDH2e as unknown as typeof Item,
                talent: TalentDH2e as unknown as typeof Item,
                condition: ConditionDH2e as unknown as typeof Item,
            };

            // Register custom Handlebars helpers
            registerHandlebarsHelpers();

            // Preload Handlebars templates
            preloadTemplates();

            // Register game settings
            this.#registerSettings();
        });
    }

    static #registerSettings(): void {
        game.settings.register(SYSTEM_ID, "modifierCap", {
            name: "DH2E.Settings.ModifierCap.Name",
            hint: "DH2E.Settings.ModifierCap.Hint",
            scope: "world",
            config: true,
            type: Number,
            default: 60,
            range: { min: 10, max: 100, step: 10 },
        });

        game.settings.register(SYSTEM_ID, "automateArmour", {
            name: "DH2E.Settings.AutomateArmour.Name",
            hint: "DH2E.Settings.AutomateArmour.Hint",
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
        });

        game.settings.register(SYSTEM_ID, "automateDamage", {
            name: "DH2E.Settings.AutomateDamage.Name",
            hint: "DH2E.Settings.AutomateDamage.Hint",
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
        });

        game.settings.register(SYSTEM_ID, "fateRefreshOnSession", {
            name: "DH2E.Settings.FateRefresh.Name",
            hint: "DH2E.Settings.FateRefresh.Hint",
            scope: "world",
            config: true,
            type: Boolean,
            default: false,
        });
    }
}
