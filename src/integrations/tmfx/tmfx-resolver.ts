/**
 * Token Magic FX integration — auto-apply visual token filters for conditions.
 * Graceful no-op when TMFX is not installed.
 */

import { getSetting } from "../../ui/settings/settings.ts";
import { CONDITION_FILTERS } from "./condition-filters.ts";

class TMFXResolver {
    /** Check if Token Magic FX is active and integration is enabled */
    static get available(): boolean {
        const g = game as any;
        if (!g.modules?.get("tokenmagic")?.active) return false;
        try {
            return getSetting<boolean>("enableTMFX");
        } catch {
            return false;
        }
    }

    /** Apply condition-specific TMFX filters to a token */
    static async applyConditionFilter(token: any, conditionSlug: string): Promise<void> {
        if (!TMFXResolver.available) return;

        const TM = TMFXResolver.#getTokenMagic();
        if (!TM) return;

        const params = CONDITION_FILTERS[conditionSlug];
        if (!params || params.length === 0) return;

        try {
            await TM.addUpdateFilters(token, params);
        } catch (e) {
            console.warn(`DH2E | TMFX failed to apply filter for "${conditionSlug}":`, e);
        }
    }

    /** Remove condition-specific TMFX filters from a token */
    static async removeConditionFilter(token: any, conditionSlug: string): Promise<void> {
        if (!TMFXResolver.available) return;

        const TM = TMFXResolver.#getTokenMagic();
        if (!TM) return;

        const params = CONDITION_FILTERS[conditionSlug];
        if (!params || params.length === 0) return;

        try {
            for (const p of params) {
                await TM.deleteFilters(token, p.filterId);
            }
        } catch (e) {
            console.warn(`DH2E | TMFX failed to remove filter for "${conditionSlug}":`, e);
        }
    }

    /** Get the TokenMagic global API */
    static #getTokenMagic(): any {
        return (globalThis as any).TokenMagic ?? null;
    }
}

export { TMFXResolver };
