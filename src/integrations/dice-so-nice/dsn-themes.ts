/**
 * Dice So Nice integration — register Imperial-themed dice presets.
 * Graceful no-op when the module is not installed.
 */

import { getSetting } from "../../ui/settings/settings.ts";

class DSNIntegration {
    /** Check if Dice So Nice is active and DSN integration is enabled */
    static get available(): boolean {
        const g = game as any;
        if (!g.modules?.get("dice-so-nice")?.active) return false;
        try {
            return getSetting<boolean>("enableDSN");
        } catch {
            return false;
        }
    }

    /** Register 4 Imperial-themed colorsets with Dice So Nice */
    static registerThemes(dice3d: any): void {
        if (!DSNIntegration.available) return;
        if (typeof dice3d?.addColorset !== "function") return;

        dice3d.addColorset({
            name: "imperial-aquila",
            description: game.i18n.localize("DH2E.DSN.Aquila"),
            category: "Dark Heresy 2E",
            foreground: "#c8a84e",
            background: "#2a2a30",
            outline: "#c8a84e",
            edge: "#1a1a1e",
            texture: "metal",
            material: "metal",
        });

        dice3d.addColorset({
            name: "inquisitorial",
            description: game.i18n.localize("DH2E.DSN.Inquisitorial"),
            category: "Dark Heresy 2E",
            foreground: "#e0c060",
            background: "#3a0a0a",
            outline: "#8a0000",
            edge: "#200000",
            texture: "marble",
            material: "pristine",
        });

        dice3d.addColorset({
            name: "mechanicus",
            description: game.i18n.localize("DH2E.DSN.Mechanicus"),
            category: "Dark Heresy 2E",
            foreground: "#f0d080",
            background: "#4a3020",
            outline: "#906838",
            edge: "#2a1810",
            texture: "metal",
            material: "metal",
        });

        dice3d.addColorset({
            name: "warp-touched",
            description: game.i18n.localize("DH2E.DSN.WarpTouched"),
            category: "Dark Heresy 2E",
            foreground: "#e0c0ff",
            background: "#1a0030",
            outline: "#6020a0",
            edge: "#0a0018",
            texture: "cloudy",
            material: "glass",
        });

        console.log("DH2E | Registered 4 Dice So Nice Imperial themes.");
    }
}

export { DSNIntegration };
