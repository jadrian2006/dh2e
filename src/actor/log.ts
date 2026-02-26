import type { XPTransaction } from "../advancement/types.ts";

const FLAG_KEY = "actorLog";
const LEGACY_KEY = "xpLedger";

type LogEntryType = "xp-award" | "xp-spend" | "gm-grant" | "maintenance";

interface LogEntry {
    timestamp: number;
    type: LogEntryType;
    label: string;
    detail?: string;
    amount?: number;
    who?: string;
}

/** Read the actor's log entries. */
function getLog(actor: Actor): LogEntry[] {
    return (actor.getFlag("dh2e", FLAG_KEY) as LogEntry[] | undefined) ?? [];
}

/** Append a single log entry to the actor's flag-based log. */
async function appendLog(actor: Actor, entry: LogEntry): Promise<void> {
    const existing = getLog(actor);
    await actor.setFlag("dh2e", FLAG_KEY, [...existing, entry]);
}

/**
 * One-time migration: convert existing xpLedger transactions into LogEntry[].
 * Only runs if actorLog is empty/undefined and xpLedger has entries.
 */
async function migrateXPLedger(actor: Actor): Promise<void> {
    const existing = getLog(actor);
    if (existing.length > 0) return;

    const legacy = (actor.getFlag("dh2e", LEGACY_KEY) as XPTransaction[] | undefined) ?? [];
    if (legacy.length === 0) return;

    const entries: LogEntry[] = legacy.map((txn) => ({
        timestamp: txn.timestamp,
        type: "xp-spend" as const,
        label: txn.label,
        amount: -txn.cost,
    }));

    await actor.setFlag("dh2e", FLAG_KEY, entries);
}

export { getLog, appendLog, migrateXPLedger };
export type { LogEntry, LogEntryType };
