/**
 * Dialog for adding/editing chronicle log entries on the warband.
 */

import type { WarbandDH2e } from "./document.ts";
import type { ChronicleEntry } from "./data.ts";
import type { ImperialDate } from "../../integrations/imperial-calendar/imperial-date.ts";

class ChronicleEntryDialog {
    /** Open a dialog to create a new chronicle entry */
    static async create(warband: WarbandDH2e): Promise<void> {
        const currentDate = (warband as any).system?.chronicle?.currentDate;
        if (!currentDate) return;

        const result = await ChronicleEntryDialog.#showDialog(
            game.i18n.localize("DH2E.Chronicle.AddEntry"),
            { title: "", body: "", category: "session" },
        );
        if (!result) return;

        const entry: ChronicleEntry = {
            id: fu.randomID(),
            date: { ...currentDate },
            title: result.title,
            body: result.body,
            author: (game as any).user?.name ?? "Unknown",
            timestamp: Date.now(),
            category: result.category as "session" | "event" | "note",
        };

        await warband.addChronicleEntry(entry);
    }

    /** Open a dialog to edit an existing chronicle entry */
    static async edit(warband: WarbandDH2e, entryId: string): Promise<void> {
        const entries: ChronicleEntry[] = (warband as any)._source.system?.chronicle?.entries ?? [];
        const existing = entries.find((e: ChronicleEntry) => e.id === entryId);
        if (!existing) return;

        const result = await ChronicleEntryDialog.#showDialog(
            game.i18n.localize("DH2E.Chronicle.EditEntry"),
            { title: existing.title, body: existing.body, category: existing.category },
        );
        if (!result) return;

        await warband.updateChronicleEntry(entryId, {
            title: result.title,
            body: result.body,
            category: result.category as "session" | "event" | "note",
        });
    }

    /** Show the dialog and return form data, or null if cancelled */
    static async #showDialog(
        title: string,
        defaults: { title: string; body: string; category: string },
    ): Promise<{ title: string; body: string; category: string } | null> {
        return new Promise((resolve) => {
            new fa.api.DialogV2({
                window: { title, icon: "fa-solid fa-scroll" },
                content: `
                    <form class="dh2e chronicle-entry-form" style="display:flex;flex-direction:column;gap:8px;padding:8px 0;">
                        <div class="form-group">
                            <label>${game.i18n.localize("DH2E.Chronicle.EntryTitle")}</label>
                            <input type="text" name="title" value="${defaults.title}" autofocus />
                        </div>
                        <div class="form-group">
                            <label>${game.i18n.localize("DH2E.Chronicle.EntryCategory")}</label>
                            <select name="category">
                                <option value="session" ${defaults.category === "session" ? "selected" : ""}>
                                    ${game.i18n.localize("DH2E.Chronicle.Category.Session")}
                                </option>
                                <option value="event" ${defaults.category === "event" ? "selected" : ""}>
                                    ${game.i18n.localize("DH2E.Chronicle.Category.Event")}
                                </option>
                                <option value="note" ${defaults.category === "note" ? "selected" : ""}>
                                    ${game.i18n.localize("DH2E.Chronicle.Category.Note")}
                                </option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${game.i18n.localize("DH2E.Chronicle.EntryBody")}</label>
                            <textarea name="body" rows="4" style="resize:vertical;">${defaults.body}</textarea>
                        </div>
                    </form>
                `,
                buttons: [
                    {
                        action: "save",
                        label: game.i18n.localize("DH2E.Common.Save"),
                        icon: "fa-solid fa-check",
                        default: true,
                        callback: (_event: any, _button: any, dialog: HTMLElement) => {
                            const form = dialog.querySelector("form");
                            if (!form) { resolve(null); return; }
                            const fd = new FormData(form);
                            resolve({
                                title: (fd.get("title") as string)?.trim() || "Untitled",
                                body: (fd.get("body") as string)?.trim() || "",
                                category: (fd.get("category") as string) || "session",
                            });
                        },
                    },
                    {
                        action: "cancel",
                        label: game.i18n.localize("DH2E.Roll.Dialog.Cancel"),
                        callback: () => resolve(null),
                    },
                ],
                position: { width: 400 },
            }).render(true);
        });
    }
}

export { ChronicleEntryDialog };
