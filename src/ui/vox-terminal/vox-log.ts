import type { VoxTerminalPayload } from "./vox-compose-dialog.ts";

/** A single stored Vox transmission on an actor */
interface VoxLogEntry {
    id: string;
    sender: string;
    /** Display title for the list view */
    title: string;
    /** Plain text message (for freetext transmissions without a journal source) */
    message: string;
    /** Journal page UUID — resolve live instead of storing HTML */
    sourceUuid?: string;
    receivedAt: number;
}

const FLAG_KEY = "voxLog";

/** Get the actor's Vox log entries */
function getVoxLog(actor: Actor): VoxLogEntry[] {
    return ((actor as any).getFlag(SYSTEM_ID, FLAG_KEY) as VoxLogEntry[] | undefined) ?? [];
}

/**
 * Store a Vox entry on the actor.
 * If sourceUuid is set and already exists in the log, skip (dedup).
 * Only stores lightweight metadata — no HTML blobs.
 */
async function storeVoxEntry(actor: Actor, payload: VoxTerminalPayload): Promise<void> {
    const log = getVoxLog(actor);

    // Dedup by sourceUuid
    if (payload.sourceUuid && log.some((e) => e.sourceUuid === payload.sourceUuid)) {
        return;
    }

    // Derive a title from the payload
    let title = payload.sender || "";
    if (!title && payload.html) {
        const match = payload.html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
        if (match) title = match[1].replace(/<[^>]*>/g, "").trim();
    }
    if (!title) {
        const msg = payload.message?.trim() ?? "";
        title = msg.length > 60 ? msg.slice(0, 60) + "..." : msg || "Vox Transmission";
    }

    const entry: VoxLogEntry = {
        id: crypto.randomUUID(),
        sender: payload.sender ?? "",
        title,
        // Only store plain text message for non-journal transmissions
        message: payload.sourceUuid ? "" : (payload.message ?? ""),
        sourceUuid: payload.sourceUuid,
        receivedAt: Date.now(),
    };

    await (actor as any).setFlag(SYSTEM_ID, FLAG_KEY, [...log, entry]);
}

/** Delete a single entry by id */
async function deleteVoxEntry(actor: Actor, entryId: string): Promise<void> {
    const log = getVoxLog(actor);
    const filtered = log.filter((e) => e.id !== entryId);
    await (actor as any).setFlag(SYSTEM_ID, FLAG_KEY, filtered);
}

/**
 * Resolve the full content for a vox log entry.
 * For journal-sourced entries, fetches HTML from the journal page live.
 * For freetext entries, returns the stored plain text.
 */
async function resolveVoxContent(entry: VoxLogEntry): Promise<{ html?: string; message: string }> {
    if (entry.sourceUuid) {
        try {
            const doc = await fromUuid(entry.sourceUuid);
            if (doc) {
                // JournalEntryPage
                if ((doc as any).text?.content) {
                    return { html: (doc as any).text.content, message: "" };
                }
                // JournalEntry with pages
                if ((doc as any).pages) {
                    const parts: string[] = [];
                    for (const page of (doc as any).pages) {
                        const html = page.text?.content ?? "";
                        if (html) parts.push(html);
                    }
                    if (parts.length > 0) {
                        return { html: parts.join("<hr/>"), message: "" };
                    }
                }
            }
        } catch {
            // Journal deleted or inaccessible
        }
    }

    // Fallback: stored plain text, or legacy html field
    const legacy = (entry as any).html;
    if (legacy) return { html: legacy, message: "" };

    return { message: entry.message || "Content unavailable." };
}

/** Convert a Vox entry to a personal objective item on the actor, then remove it from the log */
async function convertToObjective(actor: Actor, entry: VoxLogEntry): Promise<void> {
    // Resolve content for the objective description
    const content = await resolveVoxContent(entry);
    const description = content.message || content.html || entry.title;

    await (actor as any).createEmbeddedDocuments("Item", [{
        name: entry.sender ? `Vox: ${entry.sender}` : "Vox Directive",
        type: "objective",
        img: `systems/${SYSTEM_ID}/icons/default-icons/objective.svg`,
        system: {
            description,
            status: "active",
            assignedBy: entry.sender,
            timestamp: entry.receivedAt,
            completedTimestamp: 0,
            scope: "personal",
            format: "vox",
        },
    }]);

    await deleteVoxEntry(actor, entry.id);
}

export { getVoxLog, storeVoxEntry, deleteVoxEntry, convertToObjective, resolveVoxContent };
export type { VoxLogEntry };
