import { ActorDH2e } from "@actor/base.ts";
import type {
    WarbandSystemData,
    WarbandMemberSource,
    InquisitorSource,
    ReinforcementEntry,
    PendingRequisition,
    ChronicleEntry,
    ObjectiveDeadline,
} from "./data.ts";
import type { NpcDH2e } from "@actor/npc/document.ts";
import { ImperialDateUtil, type ImperialDate } from "../../integrations/imperial-calendar/imperial-date.ts";
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

        // Resolve reinforcement entries → live actor references
        const reinforcements = (this._source.system as any)?.reinforcements as ReinforcementEntry[] ?? [];
        const g = game as any;
        const resolvedReinforcements = reinforcements.map(entry => {
            const actor = g.actors?.get(entry.actorId) as NpcDH2e | null;
            const controllerUser = entry.controllerId ? g.users?.get(entry.controllerId) : null;
            return {
                ...entry,
                actor: actor?.type === "npc" ? actor : null,
                controllerName: controllerUser?.name ?? "",
            };
        });
        (this.system as WarbandSystemData).resolvedReinforcements = resolvedReinforcements;
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

    // ─── Reinforcements ───────────────────────────────────────

    /** Add an NPC as a reinforcement character (deduplicates) */
    async addReinforcement(npcActor: ActorDH2e, controllerId?: string, notes?: string): Promise<void> {
        if (npcActor.type !== "npc") return;

        const current: ReinforcementEntry[] = (this._source.system as any)?.reinforcements ?? [];
        if (current.some(r => r.actorId === npcActor.id)) return;

        const entry: ReinforcementEntry = {
            actorId: npcActor.id!,
            controllerId: controllerId ?? "",
            name: npcActor.name ?? "",
            notes: notes ?? "",
        };
        await this.update({ "system.reinforcements": [...current, entry] });

        if (controllerId) {
            await this.#grantRCPermission(npcActor, controllerId);
        }
    }

    /** Remove a reinforcement by actor ID */
    async removeReinforcement(actorId: string): Promise<void> {
        const current: ReinforcementEntry[] = (this._source.system as any)?.reinforcements ?? [];
        const entry = current.find(r => r.actorId === actorId);
        const filtered = current.filter(r => r.actorId !== actorId);
        await this.update({ "system.reinforcements": filtered });

        // Revoke permissions
        const g = game as any;
        const npc = g.actors?.get(actorId);
        if (npc) {
            await this.#revokeRCPermission(npc);
        }

        // Notify controller
        if (entry?.controllerId) {
            g.socket?.emit(`system.${SYSTEM_ID}`, {
                type: "rcRecalled",
                payload: {
                    userId: entry.controllerId,
                    name: entry.name,
                },
            });
        }
    }

    /** Assign a player as controller of a reinforcement */
    async assignRCController(actorId: string, userId: string): Promise<void> {
        const current: ReinforcementEntry[] = (this._source.system as any)?.reinforcements ?? [];
        const entry = current.find(r => r.actorId === actorId);
        if (!entry) return;

        // Revoke old controller if changing
        if (entry.controllerId && entry.controllerId !== userId) {
            const g = game as any;
            const npc = g.actors?.get(actorId);
            if (npc) await this.#revokeRCPermission(npc);
        }

        const updated = current.map(r =>
            r.actorId === actorId ? { ...r, controllerId: userId } : r,
        );
        await this.update({ "system.reinforcements": updated });

        // Grant OWNER to new controller
        const g = game as any;
        const npc = g.actors?.get(actorId);
        if (npc) {
            await this.#grantRCPermission(npc, userId);
        }

        // Notify player
        g.socket?.emit(`system.${SYSTEM_ID}`, {
            type: "rcAssigned",
            payload: {
                userId,
                name: entry.name,
            },
        });
    }

    /** Grant OWNER permission on an NPC to a user */
    async #grantRCPermission(npc: ActorDH2e, userId: string): Promise<void> {
        const ownership: Record<string, number> = { ...npc.ownership };
        ownership[userId] = 3; // OWNER
        await npc.update({ ownership });
    }

    /** Revoke all non-GM ownership on an NPC */
    async #revokeRCPermission(npc: ActorDH2e): Promise<void> {
        const g = game as any;
        const ownership: Record<string, number> = {};
        for (const [uid, level] of Object.entries(npc.ownership ?? {})) {
            if (uid === "default") {
                ownership[uid] = level as number;
                continue;
            }
            const user = g.users?.get(uid);
            if (user?.isGM) {
                ownership[uid] = level as number;
            }
        }
        await npc.update({ ownership });
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

    // ─── Chronicle / Imperial Calendar ─────────────────────

    /** Advance the Imperial date by a number of days */
    async advanceImperialDate(days: number): Promise<void> {
        const current = (this._source.system as any)?.chronicle?.currentDate;
        if (!current) return;
        const advanced = ImperialDateUtil.advanceDay(current, days);
        await this.update({ "system.chronicle.currentDate": advanced });
    }

    /** Set the Imperial date explicitly */
    async setImperialDate(date: ImperialDate): Promise<void> {
        await this.update({ "system.chronicle.currentDate": date });
    }

    /** Add a chronicle log entry */
    async addChronicleEntry(entry: ChronicleEntry): Promise<void> {
        const current: ChronicleEntry[] = (this._source.system as any)?.chronicle?.entries ?? [];
        await this.update({ "system.chronicle.entries": [...current, entry] });
    }

    /** Remove a chronicle entry by ID */
    async removeChronicleEntry(id: string): Promise<void> {
        const current: ChronicleEntry[] = (this._source.system as any)?.chronicle?.entries ?? [];
        const filtered = current.filter((e: ChronicleEntry) => e.id !== id);
        await this.update({ "system.chronicle.entries": filtered });
    }

    /** Update a chronicle entry in place */
    async updateChronicleEntry(id: string, changes: Partial<ChronicleEntry>): Promise<void> {
        const current: ChronicleEntry[] = (this._source.system as any)?.chronicle?.entries ?? [];
        const updated = current.map((e: ChronicleEntry) =>
            e.id === id ? { ...e, ...changes } : e,
        );
        await this.update({ "system.chronicle.entries": updated });
    }

    /** Set or update a deadline for an objective */
    async setObjectiveDeadline(objectiveId: string, deadline: ImperialDate, objectiveName: string): Promise<void> {
        const current: ObjectiveDeadline[] = (this._source.system as any)?.chronicle?.deadlines ?? [];
        const existing = current.findIndex((d: ObjectiveDeadline) => d.objectiveId === objectiveId);
        if (existing >= 0) {
            const updated = [...current];
            updated[existing] = { ...updated[existing], deadline, objectiveName, dismissed: false };
            await this.update({ "system.chronicle.deadlines": updated });
        } else {
            await this.update({
                "system.chronicle.deadlines": [
                    ...current,
                    { objectiveId, objectiveName, deadline, dismissed: false },
                ],
            });
        }
    }

    /** Remove a deadline for an objective */
    async removeObjectiveDeadline(objectiveId: string): Promise<void> {
        const current: ObjectiveDeadline[] = (this._source.system as any)?.chronicle?.deadlines ?? [];
        const filtered = current.filter((d: ObjectiveDeadline) => d.objectiveId !== objectiveId);
        await this.update({ "system.chronicle.deadlines": filtered });
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
