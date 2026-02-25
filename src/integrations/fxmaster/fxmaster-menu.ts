/**
 * FX Master weather preset selection dialog — GM only.
 * Uses SvelteApplicationMixin for UI.
 */

import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import { getSetting } from "../../ui/settings/settings.ts";
import { PRESETS, type FXMasterPreset } from "./presets.ts";
import FXMasterMenuRoot from "./fxmaster-menu-root.svelte";

class FXMasterMenu extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-fxmaster-menu",
        classes: ["dh2e", "fxmaster-menu-app"],
        position: { width: 360, height: "auto" as any },
        window: {
            title: "DH2E.FXMaster.Title",
            resizable: false,
        },
    });

    protected override root = FXMasterMenuRoot;

    /** Track which presets are currently active */
    #activePresets = new Set<string>();

    /** Check if FX Master is available */
    static get available(): boolean {
        const g = game as any;
        if (!g.modules?.get("fxmaster")?.active) return false;
        try {
            return getSetting<boolean>("enableFXMaster");
        } catch {
            return false;
        }
    }

    /** Singleton open/toggle */
    static #instance: FXMasterMenu | null = null;
    static open(): void {
        if (!FXMasterMenu.available) {
            ui.notifications?.warn("FX Master module is not active.");
            return;
        }
        if (!(game as any).user?.isGM) {
            ui.notifications?.warn("Only the GM can control weather presets.");
            return;
        }
        if (FXMasterMenu.#instance?.rendered) {
            FXMasterMenu.#instance.close();
            return;
        }
        FXMasterMenu.#instance = new FXMasterMenu();
        FXMasterMenu.#instance.render(true);
    }

    protected override async _prepareContext(
        _options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                presets: PRESETS,
                activePresets: [...this.#activePresets],
                applyPreset: (preset: FXMasterPreset) => this.#applyPreset(preset),
                removePreset: (preset: FXMasterPreset) => this.#removePreset(preset),
                clearAll: () => this.#clearAll(),
            },
        };
    }

    /** Apply a preset's effects via FX Master API */
    async #applyPreset(preset: FXMasterPreset): Promise<void> {
        const FXMASTER = (globalThis as any).FXMASTER;
        if (!FXMASTER) return;

        try {
            const sceneId = (canvas as any).scene?.id;
            if (!sceneId) return;

            // FX Master uses canvas.scene.setFlag to store effects
            const currentEffects = (canvas as any).scene?.getFlag("fxmaster", "effects") ?? {};
            const merged = { ...currentEffects, ...preset.effects };
            await (canvas as any).scene?.setFlag("fxmaster", "effects", merged);

            this.#activePresets.add(preset.id);
        } catch (e) {
            console.warn("DH2E | Failed to apply FX Master preset:", e);
        }
    }

    /** Remove a preset's effects from the scene */
    async #removePreset(preset: FXMasterPreset): Promise<void> {
        try {
            const currentEffects = (canvas as any).scene?.getFlag("fxmaster", "effects") ?? {};
            const cleaned = { ...currentEffects };
            for (const key of Object.keys(preset.effects)) {
                // Set to null via flag update to remove
                (cleaned as any)[`-=${key}`] = null;
                delete cleaned[key];
            }
            await (canvas as any).scene?.setFlag("fxmaster", "effects", cleaned);

            this.#activePresets.delete(preset.id);
        } catch (e) {
            console.warn("DH2E | Failed to remove FX Master preset:", e);
        }
    }

    /** Clear all weather effects */
    async #clearAll(): Promise<void> {
        try {
            await (canvas as any).scene?.unsetFlag("fxmaster", "effects");
            this.#activePresets.clear();
        } catch (e) {
            console.warn("DH2E | Failed to clear FX Master effects:", e);
        }
    }
}

export { FXMasterMenu };
