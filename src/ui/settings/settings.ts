/**
 * All DH2E system settings.
 *
 * Registered during init hook.
 * Settings are grouped by category for the settings menu.
 */

interface SettingDefinition {
    key: string;
    category: "automation" | "combat" | "display";
    name: string;
    hint: string;
    scope: "world" | "client";
    config: boolean;
    type: typeof String | typeof Number | typeof Boolean;
    default: unknown;
    choices?: Record<string, string>;
    range?: { min: number; max: number; step: number };
}

const SETTINGS: SettingDefinition[] = [
    // Automation
    {
        key: "modifierCap",
        category: "automation",
        name: "DH2E.Settings.ModifierCap.Name",
        hint: "DH2E.Settings.ModifierCap.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 60,
        range: { min: 10, max: 100, step: 10 },
    },
    {
        key: "automateArmour",
        category: "automation",
        name: "DH2E.Settings.AutomateArmour.Name",
        hint: "DH2E.Settings.AutomateArmour.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "automateDamage",
        category: "automation",
        name: "DH2E.Settings.AutomateDamage.Name",
        hint: "DH2E.Settings.AutomateDamage.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "fateRefreshOnSession",
        category: "automation",
        name: "DH2E.Settings.FateRefresh.Name",
        hint: "DH2E.Settings.FateRefresh.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "allowPlayerXPEdit",
        category: "automation",
        name: "DH2E.Settings.AllowPlayerXPEdit.Name",
        hint: "DH2E.Settings.AllowPlayerXPEdit.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    },
    {
        key: "startingXP",
        category: "automation",
        name: "DH2E.Settings.StartingXP.Name",
        hint: "DH2E.Settings.StartingXP.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 1000,
        range: { min: 0, max: 10000, step: 100 },
    },
    {
        key: "charGenMethod",
        category: "automation",
        name: "DH2E.Settings.CharGenMethod.Name",
        hint: "DH2E.Settings.CharGenMethod.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "rolled",
        choices: {
            rolled: "DH2E.Settings.CharGenMethod.Rolled",
            rolled25: "DH2E.Settings.CharGenMethod.Rolled25",
            points: "DH2E.Settings.CharGenMethod.Points",
        },
    },
    {
        key: "woundsRerolls",
        category: "automation",
        name: "DH2E.Settings.WoundsRerolls.Name",
        hint: "DH2E.Settings.WoundsRerolls.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 1,
        range: { min: 0, max: 5, step: 1 },
    },
    {
        key: "divinationRerolls",
        category: "automation",
        name: "DH2E.Settings.DivinationRerolls.Name",
        hint: "DH2E.Settings.DivinationRerolls.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 0,
        range: { min: 0, max: 5, step: 1 },
    },

    {
        key: "automatePhenomena",
        category: "automation",
        name: "DH2E.Settings.AutomatePhenomena.Name",
        hint: "DH2E.Settings.AutomatePhenomena.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "automateCorruption",
        category: "automation",
        name: "DH2E.Settings.AutomateCorruption.Name",
        hint: "DH2E.Settings.AutomateCorruption.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "automateInsanity",
        category: "automation",
        name: "DH2E.Settings.AutomateInsanity.Name",
        hint: "DH2E.Settings.AutomateInsanity.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "requireEliteApproval",
        category: "automation",
        name: "DH2E.Settings.RequireEliteApproval.Name",
        hint: "DH2E.Settings.RequireEliteApproval.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    },

    // Combat
    {
        key: "xpMultiplier",
        category: "combat",
        name: "DH2E.Settings.XPMultiplier.Name",
        hint: "DH2E.Settings.XPMultiplier.Hint",
        scope: "world",
        config: true,
        type: Number,
        default: 100,
        range: { min: 50, max: 200, step: 25 },
    },
    {
        key: "criticalWoundsTable",
        category: "combat",
        name: "DH2E.Settings.CriticalWounds.Name",
        hint: "DH2E.Settings.CriticalWounds.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    },

    // Display
    {
        key: "showModifierBreakdown",
        category: "display",
        name: "DH2E.Settings.ShowModifiers.Name",
        hint: "DH2E.Settings.ShowModifiers.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "compactNpcSheet",
        category: "display",
        name: "DH2E.Settings.CompactNPC.Name",
        hint: "DH2E.Settings.CompactNPC.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    },
    {
        key: "npcDefaultCompact",
        category: "display",
        name: "DH2E.Settings.NpcDefaultCompact.Name",
        hint: "DH2E.Settings.NpcDefaultCompact.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    },
    {
        key: "invertShiftRoll",
        category: "display",
        name: "DH2E.Settings.InvertShiftRoll.Name",
        hint: "DH2E.Settings.InvertShiftRoll.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    },
    {
        key: "wizardScale",
        category: "display",
        name: "DH2E.Settings.WizardScale.Name",
        hint: "DH2E.Settings.WizardScale.Hint",
        scope: "client",
        config: true,
        type: Number,
        default: 100,
        range: { min: 75, max: 200, step: 25 },
    },

    {
        key: "enableAnimations",
        category: "display",
        name: "DH2E.Settings.EnableAnimations.Name",
        hint: "DH2E.Settings.EnableAnimations.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "enableSounds",
        category: "display",
        name: "DH2E.Settings.EnableSounds.Name",
        hint: "DH2E.Settings.EnableSounds.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    },
    {
        key: "defaultSheetViewMode",
        category: "display",
        name: "DH2E.Settings.DefaultViewMode.Name",
        hint: "DH2E.Settings.DefaultViewMode.Hint",
        scope: "client",
        config: true,
        type: String,
        default: "full",
        choices: {
            full: "DH2E.ViewMode.Full",
            compact: "DH2E.ViewMode.Compact",
            combat: "DH2E.ViewMode.Combat",
        },
    },
    {
        key: "enableCombatHUD",
        category: "display",
        name: "DH2E.Settings.EnableCombatHUD.Name",
        hint: "DH2E.Settings.EnableCombatHUD.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    },

    // Internal (hidden)
    {
        key: "schemaVersion",
        category: "automation",
        name: "Schema Version",
        hint: "Internal data schema version for migrations.",
        scope: "world",
        config: false,
        type: String,
        default: "0.1.2",
    },
    {
        key: "activeWarband",
        category: "automation",
        name: "Active Warband ID",
        hint: "The actor ID of the active warband.",
        scope: "world",
        config: false,
        type: String,
        default: "",
    },
];

/** Register all DH2E settings */
function registerAllSettings(): void {
    for (const setting of SETTINGS) {
        game.settings.register(SYSTEM_ID, setting.key, {
            name: setting.name,
            hint: setting.hint,
            scope: setting.scope,
            config: setting.config,
            type: setting.type,
            default: setting.default,
            ...(setting.choices ? { choices: setting.choices } : {}),
            ...(setting.range ? { range: setting.range } : {}),
        });
    }
}

/** Get a typed setting value */
function getSetting<T>(key: string): T {
    return game.settings.get(SYSTEM_ID, key) as T;
}

export { registerAllSettings, getSetting, SETTINGS };
export type { SettingDefinition };
