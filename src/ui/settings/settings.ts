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
