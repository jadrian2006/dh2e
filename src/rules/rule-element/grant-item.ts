import { RuleElementDH2e, type RuleElementSource } from "./base.ts";
import type { DH2eSynthetics } from "../synthetics.ts";

/** Source data for a GrantItem rule element */
interface GrantItemSource extends RuleElementSource {
    key: "GrantItem";
    /** UUID of the item to grant (compendium or world) */
    uuid: string;
    /** If true, the granted item is removed when the parent item is removed */
    cascadeDelete?: boolean;
}

/**
 * Auto-grants an item when the parent item is added to an actor.
 *
 * The actual granting is handled during item creation hooks (not during
 * prepareData), so `onPrepareData` is a no-op. The logic is in the
 * static helper methods called from item lifecycle hooks.
 *
 * ```json
 * { "key": "GrantItem", "uuid": "Compendium.dh2e-data.conditions.Item.stunned", "cascadeDelete": true }
 * ```
 */
class GrantItemRE extends RuleElementDH2e {
    /** No-op during data preparation — granting happens in lifecycle hooks */
    override onPrepareData(_synthetics: DH2eSynthetics): void {
        // Intentionally empty — GrantItem operates via lifecycle hooks
    }

    /** Grant items when parent is created on an actor */
    static async onParentCreated(item: Item): Promise<void> {
        const actor = item.parent as Actor | null;
        if (!actor) return;

        const rules = (item.system as any)?.rules as RuleElementSource[] ?? [];
        const grants = rules.filter((r) => r.key === "GrantItem") as GrantItemSource[];
        if (grants.length === 0) return;

        const itemsToCreate: Record<string, unknown>[] = [];

        for (const grant of grants) {
            if (!grant.uuid) continue;
            try {
                const source = await fromUuid(grant.uuid);
                if (!source) {
                    console.warn(`DH2E | GrantItem: Could not resolve UUID ${grant.uuid}`);
                    continue;
                }
                const data = (source as any).toObject();
                // Tag the granted item so we can cascade-delete it later
                data.flags ??= {};
                data.flags.dh2e ??= {};
                data.flags.dh2e.grantedBy = item.id;
                itemsToCreate.push(data);
            } catch (e) {
                console.warn(`DH2E | GrantItem: Error resolving UUID ${grant.uuid}`, e);
            }
        }

        if (itemsToCreate.length > 0) {
            await actor.createEmbeddedDocuments("Item", itemsToCreate);
        }
    }

    /** Cascade-delete granted items when parent is deleted */
    static async onParentDeleted(item: Item): Promise<void> {
        const actor = item.parent as Actor | null;
        if (!actor) return;

        const rules = (item.system as any)?.rules as RuleElementSource[] ?? [];
        const hasGrants = rules.some((r) => r.key === "GrantItem" && (r as GrantItemSource).cascadeDelete !== false);
        if (!hasGrants) return;

        // Find all items granted by this parent
        const grantedIds: string[] = [];
        for (const owned of actor.items) {
            const grantedBy = (owned as any).flags?.dh2e?.grantedBy;
            if (grantedBy === item.id) {
                grantedIds.push(owned.id!);
            }
        }

        if (grantedIds.length > 0) {
            await actor.deleteEmbeddedDocuments("Item", grantedIds);
        }
    }
}

export { GrantItemRE };
export type { GrantItemSource };
