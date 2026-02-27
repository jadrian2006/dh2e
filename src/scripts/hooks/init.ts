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
import { ObjectiveDH2e } from "@item/objective/document.ts";
import { TreasureDH2e } from "@item/treasure/document.ts";
import { NoteDH2e } from "@item/note/document.ts";
import { HordeDH2e } from "@actor/horde/document.ts";
import { VehicleDH2e } from "@actor/vehicle/document.ts";
import { WarbandDH2e } from "@actor/warband/document.ts";
import { LootDH2e } from "@actor/loot/document.ts";
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
                warband: WarbandDH2e as unknown as typeof Actor,
                loot: LootDH2e as unknown as typeof Actor,
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
                objective: ObjectiveDH2e as unknown as typeof Item,
                treasure: TreasureDH2e as unknown as typeof Item,
                note: NoteDH2e as unknown as typeof Item,
            };

            // Set initiative formula
            CONFIG.Combat.initiative = {
                formula: "1d10 + @characteristics.ag.bonus",
                decimals: 0,
            };

            // Extend compendium index with system fields needed by the Advancement Shop
            const indexFields = (CONFIG as any).Item?.compendiumIndexFields;
            if (indexFields instanceof Set) {
                for (const f of [
                    "system.aptitude", "system.aptitudes", "system.tier",
                    "system.linkedCharacteristic", "system.specialization",
                    "system.prerequisites", "system.cost", "system.discipline",
                ]) indexFields.add(f);
            }

            // Register status effects for token overlays
            CONFIG.statusEffects = DH2E_STATUS_EFFECTS;

            // Thematic turn marker — gold imperial ring instead of default orange d20
            if ((CONFIG as any).Combat?.turnMarker) {
                (CONFIG as any).Combat.turnMarker.path = `systems/${SYSTEM_ID}/ui/turn-marker.svg`;
            }

            // Lock token rotation for non-vehicle actors (vehicles need facing for armour zones)
            // Also enforce one-token-per-scene for companion & reinforcement NPCs
            Hooks.on("preCreateToken", (token: any) => {
                const actorType = token.actor?.type;
                if (actorType && actorType !== "vehicle") {
                    token.updateSource({ lockRotation: true });
                }

                // Companion / Reinforcement uniqueness enforcement
                if (actorType === "npc" && token.actor?.id) {
                    const actorId = token.actor.id;
                    const g = game as any;

                    // Check if this NPC is a companion or reinforcement
                    let isManaged = false;

                    // Check acolyte companions
                    for (const a of g.actors ?? []) {
                        if (a.type !== "acolyte") continue;
                        const companions = a.system?.companions ?? a._source?.system?.companions ?? [];
                        if (companions.some((c: any) => c.actorId === actorId)) {
                            isManaged = true;
                            break;
                        }
                    }

                    // Check warband reinforcements
                    if (!isManaged) {
                        const warband = g.dh2e?.warband;
                        if (warband) {
                            const reinforcements = warband.system?.reinforcements ?? warband._source?.system?.reinforcements ?? [];
                            if (reinforcements.some((r: any) => r.actorId === actorId)) {
                                isManaged = true;
                            }
                        }
                    }

                    // If managed, enforce one-per-scene
                    if (isManaged) {
                        const scene = token.parent;
                        const existing = scene?.tokens?.find(
                            (t: any) => t.actorId === actorId && t.id !== token.id,
                        );
                        if (existing) {
                            ui.notifications?.warn(
                                g.i18n?.localize("DH2E.Companion.AlreadyOnScene")
                                    ?? "This companion already has a token on this scene.",
                            );
                            return false;
                        }
                    }
                }
            });

            // Register custom Handlebars helpers
            registerHandlebarsHelpers();

            // Preload Handlebars templates
            preloadTemplates();

            // Register game settings
            registerAllSettings();

            // Register keybindings
            game.keybindings.register(SYSTEM_ID, "toggleWarbandSheet", {
                name: "DH2E.Keybinding.ToggleWarband",
                editable: [{ key: "KeyW" }],
                onDown: () => {
                    const g = game as any;
                    const warbandId = g.settings?.get(SYSTEM_ID, "activeWarband") as string;
                    if (!warbandId) return false;
                    const warband = g.actors?.get(warbandId);
                    if (!warband) return false;
                    const sheet = warband.sheet;
                    if (sheet?.rendered) {
                        sheet.close();
                    } else {
                        sheet?.render(true);
                    }
                    return true;
                },
                restricted: false,
                precedence: (CONST as any).KEYBINDING_PRECEDENCE?.NORMAL ?? 0,
            });

            // FX Master scene control button (GM only, only when FX Master active)
            Hooks.on("getSceneControlButtons", (controls: any[]) => {
                const g = game as any;
                if (!g.user?.isGM) return;
                if (!g.modules?.get("fxmaster")?.active) return;

                const tokenControls = controls.find((c: any) => c.name === "token");
                if (tokenControls?.tools) {
                    tokenControls.tools.push({
                        name: "dh2e-weather",
                        title: "DH2E.FXMaster.Title",
                        icon: "fa-solid fa-cloud-bolt",
                        button: true,
                        onClick: () => {
                            import("../../integrations/fxmaster/fxmaster-menu.ts").then(m => m.FXMasterMenu.open());
                        },
                    });
                }
            });

            game.keybindings.register(SYSTEM_ID, "openActionsGrid", {
                name: "DH2E.Keybinding.OpenActionsGrid",
                editable: [{ key: "KeyA", modifiers: ["Shift"] }],
                onDown: () => {
                    import("../../ui/actions-grid/actions-grid.ts").then(m => m.ActionsGrid.open());
                    return true;
                },
                restricted: false,
                precedence: (CONST as any).KEYBINDING_PRECEDENCE?.NORMAL ?? 0,
            });

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

            game.keybindings.register(SYSTEM_ID, "openQuickSearch", {
                name: "DH2E.Keybinding.OpenQuickSearch",
                editable: [{ key: "Space", modifiers: ["Control"] }],
                onDown: () => {
                    import("../../ui/quick-search/quick-search.ts").then(m => m.QuickSearch.toggle());
                    return true;
                },
                restricted: false,
                precedence: (CONST as any).KEYBINDING_PRECEDENCE?.NORMAL ?? 0,
            });
        });
    }
}
