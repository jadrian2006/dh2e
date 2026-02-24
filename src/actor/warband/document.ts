import { ActorDH2e } from "@actor/base.ts";
import type { WarbandSystemData, WarbandMemberSource, InquisitorSource, PendingRequisition } from "./data.ts";
import type { AcolyteDH2e } from "@actor/acolyte/document.ts";

/** Valid actor types for the Inquisitor slot */
const INQUISITOR_TYPES = new Set(["acolyte", "npc"]);

/** The Warband actor — a party overview sheet */
class WarbandDH2e extends ActorDH2e {
    declare system: WarbandSystemData;

    /** Resolved member actors (populated during prepareBaseData) */
    get members(): AcolyteDH2e[] {
        return this.system.resolvedMembers ?? [];
    }

    /** Resolved Inquisitor actor */
    get inquisitor(): ActorDH2e | null {
        return this.system.resolvedInquisitor ?? null;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Resolve member UUIDs into live actor references
        const resolved: AcolyteDH2e[] = [];
        const members = this._source.system?.members as WarbandMemberSource[] ?? [];
        for (const entry of members) {
            const actor = fromUuidSync(entry.uuid) as AcolyteDH2e | null;
            if (actor && actor.type === "acolyte") {
                resolved.push(actor);
            }
        }
        (this.system as WarbandSystemData).resolvedMembers = resolved;

        // Resolve Inquisitor UUID
        const inqSource = this._source.system?.inquisitor as InquisitorSource | undefined;
        let resolvedInquisitor: ActorDH2e | null = null;
        if (inqSource?.uuid) {
            const actor = fromUuidSync(inqSource.uuid) as ActorDH2e | null;
            if (actor && INQUISITOR_TYPES.has(actor.type)) {
                resolvedInquisitor = actor;
            }
        }
        (this.system as WarbandSystemData).resolvedInquisitor = resolvedInquisitor;
    }

    /** Set the Inquisitor slot to a given actor (acolyte or NPC) */
    async setInquisitor(actor: ActorDH2e): Promise<void> {
        if (!INQUISITOR_TYPES.has(actor.type)) {
            ui.notifications?.warn(
                game.i18n?.localize("DH2E.Warband.InquisitorOnly")
                    ?? "Only Acolyte or NPC actors can be set as Inquisitor.",
            );
            return;
        }
        await this.update({ "system.inquisitor.uuid": actor.uuid });
    }

    /** Clear the Inquisitor slot */
    async removeInquisitor(): Promise<void> {
        await this.update({ "system.inquisitor.uuid": "" });
    }

    /** Check whether a user controls the Inquisitor actor (OWNER permission) */
    isInquisitorController(userId?: string): boolean {
        const inq = this.inquisitor;
        if (!inq) return false;
        const uid = userId ?? (game as any).user?.id;
        if (!uid) return false;
        return inq.testUserPermission(
            (game as any).users?.get(uid),
            "OWNER",
        );
    }

    /** Add Acolyte actors as warband members (deduplicates) */
    async addMembers(...actors: ActorDH2e[]): Promise<void> {
        const existing = new Set(
            (this._source.system?.members as WarbandMemberSource[] ?? []).map(m => m.uuid),
        );
        const toAdd: WarbandMemberSource[] = [];
        for (const actor of actors) {
            if (actor.type !== "acolyte") continue;
            if (existing.has(actor.uuid)) continue;
            toAdd.push({ uuid: actor.uuid });
            existing.add(actor.uuid);
        }
        if (toAdd.length === 0) return;

        const current = this._source.system?.members as WarbandMemberSource[] ?? [];
        await this.update({ "system.members": [...current, ...toAdd] });
    }

    /** Remove members by UUID */
    async removeMembers(...uuids: string[]): Promise<void> {
        const removeSet = new Set(uuids);
        const current = this._source.system?.members as WarbandMemberSource[] ?? [];
        const filtered = current.filter(m => !removeSet.has(m.uuid));
        await this.update({ "system.members": filtered });
    }

    // ─── Pending Requisitions ────────────────────────────────

    /** Add a pending requisition entry */
    async addPendingRequisition(req: PendingRequisition): Promise<void> {
        const current = (this._source.system as any)?.pendingRequisitions ?? [];
        await this.update({ "system.pendingRequisitions": [...current, req] });
    }

    /** Remove a pending requisition by ID */
    async removePendingRequisition(id: string): Promise<void> {
        const current = (this._source.system as any)?.pendingRequisitions ?? [];
        const filtered = current.filter((r: PendingRequisition) => r.id !== id);
        await this.update({ "system.pendingRequisitions": filtered });
    }

    /** Update fields on a pending requisition */
    async updatePendingRequisition(id: string, changes: Partial<PendingRequisition>): Promise<void> {
        const current: PendingRequisition[] = (this._source.system as any)?.pendingRequisitions ?? [];
        const updated = current.map((r: PendingRequisition) =>
            r.id === id ? { ...r, ...changes } : r,
        );
        await this.update({ "system.pendingRequisitions": updated });
    }

    /** Deliver a ready requisition — create item on target actor or warband, mark delivered */
    async deliverRequisition(id: string, target: "player" | "warband"): Promise<void> {
        const current: PendingRequisition[] = (this._source.system as any)?.pendingRequisitions ?? [];
        const req = current.find((r: PendingRequisition) => r.id === id);
        if (!req) return;

        const itemData = req.itemData;
        if (!itemData || Object.keys(itemData).length === 0) {
            ui.notifications?.warn("No item data to deliver.");
            return;
        }

        if (target === "player") {
            // Create on target actor
            try {
                const actor = await fromUuid(req.requestedFor) as any;
                if (actor) {
                    await actor.createEmbeddedDocuments("Item", [itemData]);
                } else {
                    ui.notifications?.warn("Target actor not found.");
                    return;
                }
            } catch (e) {
                console.warn("DH2E | Failed to deliver requisition to player:", e);
                return;
            }
        } else {
            // Create on warband
            await this.createEmbeddedDocuments("Item", [itemData as Record<string, unknown>]);
        }

        await this.updatePendingRequisition(id, { status: "delivered" });
    }

    /** Force warband to have no folder */
    protected override async _preCreate(
        data: Record<string, unknown>,
        options: Record<string, unknown>,
        user: any,
    ): Promise<boolean | void> {
        const result = await super._preCreate(data, options, user);
        if (result === false) return false;
        this.updateSource({
            folder: null,
            ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
        });
    }

    protected override async _preUpdate(
        changed: Record<string, unknown>,
        options: Record<string, unknown>,
        user: any,
    ): Promise<boolean | void> {
        const result = await super._preUpdate(changed, options, user);
        if (result === false) return false;
        if ("folder" in changed) {
            (changed as any).folder = null;
        }
    }
}

export { WarbandDH2e };
