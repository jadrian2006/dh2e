/**
 * Dialog for setting a deadline on an objective.
 */

import type { WarbandDH2e } from "./document.ts";
import type { ImperialDate } from "../../integrations/imperial-calendar/imperial-date.ts";

class DeadlineDialog {
    /** Open a dialog to set a deadline for an objective */
    static async open(warband: WarbandDH2e): Promise<void> {
        const objectives = warband.items.filter((i: Item) => i.type === "objective" && (i.system as any)?.status === "active");
        if (objectives.length === 0) {
            ui.notifications?.info(game.i18n.localize("DH2E.Chronicle.NoActiveObjectives"));
            return;
        }

        const currentDate = (warband as any).system?.chronicle?.currentDate;
        if (!currentDate) return;

        // Build objective options
        const options = objectives.map((o: any) =>
            `<option value="${o.id}">${o.name}</option>`
        ).join("");

        const result = await new Promise<{ objectiveId: string; objectiveName: string; deadline: ImperialDate } | null>((resolve) => {
            new fa.api.DialogV2({
                window: {
                    title: game.i18n.localize("DH2E.Chronicle.SetDeadline"),
                    icon: "fa-solid fa-hourglass-half",
                },
                content: `
                    <form class="dh2e deadline-form" style="display:flex;flex-direction:column;gap:8px;padding:8px 0;">
                        <div class="form-group">
                            <label>${game.i18n.localize("DH2E.Objective.Title")}</label>
                            <select name="objectiveId">${options}</select>
                        </div>
                        <div class="form-group">
                            <label>${game.i18n.localize("DH2E.Chronicle.Deadline.DaysFromNow")}</label>
                            <input type="number" name="daysFromNow" value="30" min="1" max="999" />
                        </div>
                    </form>
                `,
                buttons: [
                    {
                        action: "set",
                        label: game.i18n.localize("DH2E.Chronicle.SetDeadline"),
                        icon: "fa-solid fa-check",
                        default: true,
                        callback: (_event: any, _button: any, dialog: HTMLElement) => {
                            const form = dialog.querySelector("form");
                            if (!form) { resolve(null); return; }
                            const fd = new FormData(form);
                            const objectiveId = fd.get("objectiveId") as string;
                            const daysFromNow = parseInt(fd.get("daysFromNow") as string) || 30;

                            const obj = objectives.find((o: any) => o.id === objectiveId);
                            if (!obj) { resolve(null); return; }

                            // Import at runtime to avoid circular deps
                            import("../../integrations/imperial-calendar/imperial-date.ts").then(({ ImperialDateUtil }) => {
                                const deadline = ImperialDateUtil.advanceDay(currentDate, daysFromNow);
                                resolve({
                                    objectiveId,
                                    objectiveName: obj.name ?? "Objective",
                                    deadline,
                                });
                            });
                        },
                    },
                    {
                        action: "cancel",
                        label: game.i18n.localize("DH2E.Roll.Dialog.Cancel"),
                        callback: () => resolve(null),
                    },
                ],
                position: { width: 380 },
            }).render(true);
        });

        if (!result) return;
        await warband.setObjectiveDeadline(result.objectiveId, result.deadline, result.objectiveName);
    }
}

export { DeadlineDialog };
