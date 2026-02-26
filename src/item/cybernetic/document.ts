import { ItemDH2e } from "@item/base/document.ts";
import type { CyberneticSystemSource, MaintenanceState } from "./data.ts";
import { ImperialDateUtil, type ImperialDate } from "../../integrations/imperial-calendar/imperial-date.ts";

/** Degradation thresholds in days since last maintenance */
const MINOR_THRESHOLD = 31;
const DEGRADED_THRESHOLD = 46;
const FAILURE_THRESHOLD = 61;

/** Cybernetic item — replacement limbs and enhancement implants */
class CyberneticDH2e extends ItemDH2e {
    declare system: CyberneticSystemSource;

    /** Whether this cybernetic is currently installed and active */
    get isInstalled(): boolean {
        return this.system.installed;
    }

    /** Derive maintenance state from days since last maintenance */
    get maintenanceState(): MaintenanceState {
        if (!this.system.installed) return "normal";

        const warbandDate = CyberneticDH2e.#getWarbandDate();
        const lastMaint = this.system.lastMaintenanceDate;

        // Installed but never maintained → total failure
        if (!lastMaint || !warbandDate) return "totalFailure";

        const elapsed = ImperialDateUtil.daysElapsed(lastMaint, warbandDate);

        if (elapsed >= FAILURE_THRESHOLD) return "totalFailure";
        if (elapsed >= DEGRADED_THRESHOLD) return "degraded";
        if (elapsed >= MINOR_THRESHOLD) return "minorMalfunction";
        return "normal";
    }

    /** Whether this cybernetic is installed and not in total failure */
    get isFunctional(): boolean {
        return this.system.installed && this.maintenanceState !== "totalFailure";
    }

    /** Days since last maintenance (or -1 if not applicable) */
    get daysSinceMaintenace(): number {
        const warbandDate = CyberneticDH2e.#getWarbandDate();
        const lastMaint = this.system.lastMaintenanceDate;
        if (!lastMaint || !warbandDate) return -1;
        return ImperialDateUtil.daysElapsed(lastMaint, warbandDate);
    }

    /** Set lastMaintenanceDate to the current warband date */
    async performMaintenance(): Promise<void> {
        const warbandDate = CyberneticDH2e.#getWarbandDate();
        if (!warbandDate) {
            ui.notifications.warn(
                game.i18n.localize("DH2E.Cybernetic.Maintenance.NoWarbandDate"),
            );
            return;
        }
        await this.update({ "system.lastMaintenanceDate": warbandDate });
    }

    /** Toggle the installed state — auto-set maintenance date when installing */
    async toggleInstalled(): Promise<void> {
        const newInstalled = !this.system.installed;
        const updates: Record<string, unknown> = { "system.installed": newInstalled };

        // When installing and no maintenance date exists, set it to current date
        if (newInstalled && !this.system.lastMaintenanceDate) {
            const warbandDate = CyberneticDH2e.#getWarbandDate();
            if (warbandDate) {
                updates["system.lastMaintenanceDate"] = warbandDate;
            }
        }

        await this.update(updates);
    }

    /** Read the current warband date from game.dh2e.warband */
    static #getWarbandDate(): ImperialDate | null {
        const warband = (game as any).dh2e?.warband;
        return warband?.system?.chronicle?.currentDate ?? null;
    }
}

export { CyberneticDH2e, MINOR_THRESHOLD, DEGRADED_THRESHOLD, FAILURE_THRESHOLD };
