/**
 * Maintenance dialog — lists target's installed cybernetics with checkboxes
 * and performs maintenance on selected items.
 */

import type { CyberneticDH2e } from "./document.ts";
import type { MaintenanceState } from "./data.ts";
import { performMaintenance } from "./maintenance.ts";

class MaintenanceDialog {
    /**
     * Open the maintenance dialog for a target actor.
     * @param target The actor whose cybernetics to maintain
     * @param maintainer Optional chirurgeon actor performing the maintenance
     */
    static async open(target: Actor, maintainer?: Actor): Promise<void> {
        const cybernetics = (target.items as any)
            .filter((i: any) => i.type === "cybernetic" && i.system?.installed) as CyberneticDH2e[];

        if (cybernetics.length === 0) {
            ui.notifications.info(
                game.i18n.format("DH2E.Cybernetic.Maintenance.NoneInstalled", {
                    name: target.name ?? "Actor",
                }),
            );
            return;
        }

        const rows = cybernetics
            .map((cyber) => {
                const state: MaintenanceState = cyber.maintenanceState ?? "normal";
                const stateLabel = game.i18n.localize(`DH2E.Cybernetic.State.${state}`);
                const checked = state !== "normal" ? "checked" : "";
                const color = MaintenanceDialog.#stateColor(state);
                return `
                    <label class="cyber-row" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <input type="checkbox" name="cyber" value="${cyber.id}" ${checked} style="flex-shrink:0" />
                        <span style="flex: 1; color: var(--dh2e-text-primary, #d0cfc8);">${cyber.name}</span>
                        <span style="font-size: 0.75rem; color: ${color}; text-transform: uppercase;">${stateLabel}</span>
                    </label>
                `;
            })
            .join("");

        const intro = game.i18n.format("DH2E.Cybernetic.Maintenance.DialogIntro", {
            name: target.name ?? "Actor",
        });

        const content = `
            <div style="padding: 0.5rem;">
                <p style="margin: 0 0 0.5rem; color: var(--dh2e-text-secondary, #a0a0a8); font-size: 0.85rem;">${intro}</p>
                <div class="cyber-list">${rows}</div>
            </div>
        `;

        new (foundry.applications.api as any).DialogV2({
            window: {
                title: game.i18n.localize("DH2E.Cybernetic.Maintenance.DialogTitle"),
                icon: "fa-solid fa-wrench",
            },
            content,
            buttons: [
                {
                    action: "maintain",
                    label: game.i18n.localize("DH2E.Cybernetic.Maintenance.PerformButton"),
                    icon: "fa-solid fa-wrench",
                    default: true,
                    callback: (_event: Event, button: HTMLElement) => {
                        const dialog = button.closest(".dialog");
                        const checked = dialog?.querySelectorAll<HTMLInputElement>(
                            "input[name='cyber']:checked",
                        );
                        const ids = Array.from(checked ?? []).map((el) => el.value);
                        const selected = cybernetics.filter((c) => ids.includes(c.id!));
                        if (selected.length > 0) {
                            performMaintenance(target, selected, maintainer);
                        }
                    },
                },
                {
                    action: "cancel",
                    label: game.i18n.localize("Cancel"),
                },
            ],
            position: { width: 420 },
        }).render(true);
    }

    static #stateColor(state: MaintenanceState): string {
        switch (state) {
            case "normal": return "#6c6";
            case "minorMalfunction": return "#cc6";
            case "degraded": return "#c86";
            case "totalFailure": return "#c44";
            default: return "#888";
        }
    }
}

export { MaintenanceDialog };
