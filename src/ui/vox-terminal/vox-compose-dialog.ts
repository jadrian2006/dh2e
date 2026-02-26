import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import VoxComposeRoot from "./vox-compose-root.svelte";
import { VoxTerminalPopup } from "./vox-terminal-popup.ts";

interface VoxTerminalPayload {
    sender: string;
    message: string;
    /** Raw HTML for rich document rendering (journals). If set, message is ignored. */
    html?: string;
    speed: number;
    timestamp: number;
}

interface VoxItemEntry {
    uuid: string;
    name: string;
    img: string;
    type: string;
}

interface VoxItemGroup {
    label: string;
    items: VoxItemEntry[];
}

/** Convert HTML to structured plain text, preserving paragraphs, headers, and line breaks. */
function htmlToPlainText(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;

    // Insert markers before block elements so textContent preserves structure
    for (const el of div.querySelectorAll("br")) {
        el.replaceWith("\n");
    }
    for (const el of div.querySelectorAll("p, div")) {
        el.prepend("\n");
        el.append("\n");
    }
    for (const el of div.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
        el.prepend("\n\n");
        el.append("\n");
    }
    // Lists: add indent based on nesting depth
    for (const el of div.querySelectorAll("ol, ul")) {
        el.prepend("\n");
        el.append("\n");
    }
    for (const li of div.querySelectorAll("li")) {
        let depth = 0;
        let parent = li.parentElement;
        while (parent && parent !== div) {
            if (parent.tagName === "OL" || parent.tagName === "UL") depth++;
            parent = parent.parentElement;
        }
        const indent = "  ".repeat(Math.max(0, depth - 1));
        // Use bullet for <ul>, number for <ol>
        const isOrdered = li.parentElement?.tagName === "OL";
        const marker = isOrdered
            ? `${Array.from(li.parentElement!.children).indexOf(li) + 1}. `
            : "\u2022 "; // bullet •
        li.prepend(`\n${indent}${marker}`);
    }
    for (const el of div.querySelectorAll("hr")) {
        el.replaceWith("\n---\n");
    }
    for (const el of div.querySelectorAll("blockquote")) {
        el.prepend("\n> ");
        el.append("\n");
    }

    // Collapse runs of 3+ newlines to 2, and trim
    return (div.textContent ?? "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * GM-only compose dialog for sending vox transmissions to all players.
 *
 * Usage: `VoxComposeDialog.open()` or `game.dh2e.voxTerminal()`
 */
class VoxComposeDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-vox-compose",
        classes: ["dh2e", "dialog", "vox-compose-dialog"],
        position: { width: 440, height: "auto" as const },
        window: { resizable: false, minimizable: false },
    });

    protected override root = VoxComposeRoot;

    #initialSender: string;
    #initialMessage: string;
    #initialHtml: string;

    constructor(options?: { initialSender?: string; initialMessage?: string; initialHtml?: string }) {
        super({});
        this.#initialSender = options?.initialSender ?? "";
        this.#initialMessage = options?.initialMessage ?? "";
        this.#initialHtml = options?.initialHtml ?? "";
    }

    override get title(): string {
        return game.i18n.localize("DH2E.Vox.ComposeTitle");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const groups = await this.#loadItemGroups();
        return {
            ctx: {
                onSend: (payload: VoxTerminalPayload) => this.#send(payload),
                groups,
                initialSender: this.#initialSender,
                initialMessage: this.#initialMessage,
                initialHtml: this.#initialHtml,
                loadItem: async (uuid: string) => {
                    const doc = await fromUuid(uuid);
                    if (!doc) return null;
                    // JournalEntryPage: single page — return raw HTML for rich rendering
                    if ((doc as any).documentName === "JournalEntryPage") {
                        const html = (doc as any).text?.content ?? "";
                        return {
                            sender: "",
                            message: htmlToPlainText(html),
                            html,
                            name: (doc as any).name ?? "",
                        };
                    }
                    // JournalEntry: concatenate all pages — return raw HTML
                    if ((doc as any).documentName === "JournalEntry" || (doc as any).pages) {
                        const pages = (doc as any).pages ?? [];
                        const htmlParts: string[] = [];
                        const textParts: string[] = [];
                        for (const page of pages) {
                            const html = page.text?.content ?? "";
                            if (html) {
                                htmlParts.push(html);
                                textParts.push(htmlToPlainText(html));
                            }
                        }
                        return {
                            sender: "",
                            message: textParts.join("\n\n"),
                            html: htmlParts.join("<hr/>"),
                            name: (doc as any).name ?? "",
                        };
                    }
                    const sys = (doc as any).system ?? {};
                    return {
                        sender: sys.assignedBy ?? "",
                        message: htmlToPlainText(sys.description ?? ""),
                        name: (doc as any).name ?? "",
                    };
                },
            },
        };
    }

    async #loadItemGroups(): Promise<VoxItemGroup[]> {
        const groups: VoxItemGroup[] = [];
        const g = game as any;
        for (const pack of g.packs ?? []) {
            if (pack.documentName !== "Item" && pack.documentName !== "JournalEntry") continue;
            const index = await pack.getIndex();
            const items: VoxItemEntry[] = [];
            for (const entry of index) {
                const e = entry as any;
                items.push({
                    uuid: `Compendium.${pack.collection}.${e._id}`,
                    name: e.name ?? "Item",
                    img: e.img ?? "",
                    type: e.type ?? "unknown",
                });
            }
            if (items.length > 0) {
                items.sort((a, b) => a.name.localeCompare(b.name));
                groups.push({ label: pack.metadata.label ?? pack.collection, items });
            }
        }
        const worldItems: VoxItemEntry[] = [];
        for (const item of g.items ?? []) {
            worldItems.push({
                uuid: (item as any).uuid,
                name: (item as any).name ?? "Item",
                img: (item as any).img ?? "",
                type: (item as any).type ?? "unknown",
            });
        }
        if (worldItems.length > 0) {
            worldItems.sort((a, b) => a.name.localeCompare(b.name));
            groups.push({ label: game.i18n.localize("DH2E.Vox.WorldItems"), items: worldItems });
        }
        // World journal entries — list individual pages
        const worldJournals: VoxItemEntry[] = [];
        for (const journal of g.journal ?? []) {
            const pages = (journal as any).pages ?? [];
            for (const page of pages) {
                worldJournals.push({
                    uuid: page.uuid,
                    name: `${(journal as any).name}: ${page.name}`,
                    img: (journal as any).img ?? "",
                    type: "page",
                });
            }
        }
        if (worldJournals.length > 0) {
            worldJournals.sort((a, b) => a.name.localeCompare(b.name));
            groups.push({ label: game.i18n.localize("DH2E.Vox.WorldJournals"), items: worldJournals });
        }
        return groups;
    }

    async #send(payload: VoxTerminalPayload): Promise<void> {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "voxTerminal",
            payload,
        });
        // Socket emit doesn't echo to sender, so show locally
        VoxTerminalPopup.show(payload);
        ui.notifications.info(game.i18n.localize("DH2E.Vox.Sent"));
        this.close();
    }

    /** Open the compose dialog. GM-only guard. */
    static open(): void {
        const g = game as any;
        if (!g.user?.isGM) {
            ui.notifications.warn(game.i18n.localize("DH2E.Vox.GMOnly"));
            return;
        }
        new VoxComposeDialog({}).render(true);
    }

    /** Open the compose dialog pre-populated from an item or journal's data. GM-only. */
    static async openWithItem(uuid: string): Promise<void> {
        if (!(game as any).user?.isGM) {
            ui.notifications.warn(game.i18n.localize("DH2E.Vox.GMOnly"));
            return;
        }
        const doc = await fromUuid(uuid);
        if (!doc) return;
        // JournalEntryPage: single page
        if ((doc as any).documentName === "JournalEntryPage") {
            const html = (doc as any).text?.content ?? "";
            new VoxComposeDialog({
                initialSender: "",
                initialMessage: htmlToPlainText(html),
                initialHtml: html,
            }).render(true);
            return;
        }
        // JournalEntry: all pages
        if ((doc as any).documentName === "JournalEntry" || (doc as any).pages) {
            const pages = (doc as any).pages ?? [];
            const htmlParts: string[] = [];
            const textParts: string[] = [];
            for (const page of pages) {
                const html = page.text?.content ?? "";
                if (html) {
                    htmlParts.push(html);
                    textParts.push(htmlToPlainText(html));
                }
            }
            new VoxComposeDialog({
                initialSender: "",
                initialMessage: textParts.join("\n\n"),
                initialHtml: htmlParts.join("<hr/>"),
            }).render(true);
            return;
        }
        const sys = (doc as any).system ?? {};
        new VoxComposeDialog({
            initialSender: sys.assignedBy ?? "",
            initialMessage: htmlToPlainText(sys.description ?? ""),
        }).render(true);
    }
}

export { VoxComposeDialog };
export type { VoxTerminalPayload };
