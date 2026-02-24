import type { XPTransaction } from "./types.ts";

const FLAG_KEY = "xpLedger";

/** Record an XP transaction in the actor's flag-based ledger */
export async function recordTransaction(
    actor: Actor,
    txn: XPTransaction,
): Promise<void> {
    const existing = (actor.getFlag("dh2e", FLAG_KEY) as XPTransaction[] | undefined) ?? [];
    await actor.setFlag("dh2e", FLAG_KEY, [...existing, txn]);
}
