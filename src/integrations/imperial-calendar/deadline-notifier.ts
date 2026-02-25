/**
 * Deadline notification system — fires banner notifications when
 * the Imperial date advances and objectives approach their deadlines.
 */

import { ImperialDateUtil, type ImperialDate } from "./imperial-date.ts";
import { getSetting } from "../../ui/settings/settings.ts";

interface ObjectiveDeadline {
    objectiveId: string;
    objectiveName: string;
    deadline: ImperialDate;
    dismissed: boolean;
}

class DeadlineNotifier {
    /** Initialize the notifier — hooks into updateActor */
    static init(): void {
        Hooks.on("updateActor", (actor: any, changes: any) => {
            if (actor.type !== "warband") return;

            // Check if the currentDate changed
            const dateChanged =
                changes?.system?.chronicle?.currentDate !== undefined;
            if (!dateChanged) return;

            DeadlineNotifier.#checkDeadlines(actor);
        });
    }

    /** Check all deadlines and show notifications as needed */
    static #checkDeadlines(warband: any): void {
        try {
            if (!getSetting<boolean>("deadlineNotifications")) return;
        } catch {
            return;
        }

        const chronicle = warband.system?.chronicle;
        if (!chronicle) return;

        const currentDate: ImperialDate | undefined = chronicle.currentDate;
        const deadlines: ObjectiveDeadline[] = chronicle.deadlines ?? [];
        if (!currentDate || deadlines.length === 0) return;

        for (const dl of deadlines) {
            if (dl.dismissed) continue;

            const remaining = ImperialDateUtil.daysRemaining(currentDate, dl.deadline);

            if (remaining < 0) {
                // Overdue
                ui.notifications.error(
                    game.i18n.format("DH2E.Chronicle.Deadline.Overdue", {
                        title: dl.objectiveName,
                    }),
                    { permanent: true },
                );
            } else if (remaining === 0) {
                // Due today
                ui.notifications.warn(
                    game.i18n.format("DH2E.Chronicle.Deadline.Today", {
                        title: dl.objectiveName,
                    }),
                    { permanent: true },
                );
            } else if (remaining <= 3) {
                // Urgent
                ui.notifications.warn(
                    game.i18n.format("DH2E.Chronicle.Deadline.Urgent", {
                        count: String(remaining),
                        title: dl.objectiveName,
                    }),
                );
            }
        }
    }
}

export { DeadlineNotifier };
export type { ObjectiveDeadline };
