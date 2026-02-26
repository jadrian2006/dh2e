import type { VoxTerminalPayload } from "./vox-compose-dialog.ts";

/** A single stored Vox transmission on an actor */
interface VoxLogEntry {
    id: string;
    sender: string;
    message: string;
    html?: string;
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
 * Direct text entries (no sourceUuid) always append.
 */
async function storeVoxEntry(actor: Actor, payload: VoxTerminalPayload): Promise<void> {
    const log = getVoxLog(actor);

    // Dedup by sourceUuid
    if (payload.sourceUuid && log.some((e) => e.sourceUuid === payload.sourceUuid)) {
        return;
    }

    const entry: VoxLogEntry = {
        id: crypto.randomUUID(),
        sender: payload.sender ?? "",
        message: payload.message ?? "",
        html: payload.html,
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

/** Convert a Vox entry to a personal objective item on the actor, then remove it from the log */
async function convertToObjective(actor: Actor, entry: VoxLogEntry): Promise<void> {
    await (actor as any).createEmbeddedDocuments("Item", [{
        name: entry.sender ? `Vox: ${entry.sender}` : "Vox Directive",
        type: "objective",
        img: `systems/${SYSTEM_ID}/icons/default-icons/objective.svg`,
        system: {
            description: entry.message,
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

export { getVoxLog, storeVoxEntry, deleteVoxEntry, convertToObjective };
export type { VoxLogEntry };
