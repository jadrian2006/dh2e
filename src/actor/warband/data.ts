import type { AcolyteDH2e } from "@actor/acolyte/document.ts";
import type { ActorDH2e } from "@actor/base.ts";
import type { NpcDH2e } from "@actor/npc/document.ts";
import type { ImperialDate } from "../../integrations/imperial-calendar/imperial-date.ts";

/** A single warband member entry (stored in DB) */
export interface WarbandMemberSource {
    uuid: string;
}

/** A reinforcement character entry (stored in DB) */
export interface ReinforcementEntry {
    actorId: string;
    controllerId: string;
    name: string;
    notes: string;
}

/** Inquisitor slot source data (stored in DB) */
export interface InquisitorSource {
    uuid: string;
}

/** A pending requisition entry stored on the warband */
export interface PendingRequisition {
    /** Random unique ID */
    id: string;
    /** Full item toObject() snapshot */
    itemData: object;
    /** Display name */
    itemName: string;
    /** "poor"|"common"|"good"|"best" */
    craftsmanship: string;
    /** Free-text modification notes */
    modifications: string;
    /** Player user name */
    requestedBy: string;
    /** Actor UUID (who gets the item) */
    requestedFor: string;
    /** Display name of target actor */
    actorName: string;
    /** Availability tier key */
    availability: string;
    /** d100 roll result */
    rollResult: number;
    /** Influence + modifiers */
    targetNumber: number;
    /** Whether the roll succeeded */
    success: boolean;
    /** Degrees of success/failure */
    degrees: number;
    /** Whether 1 Influence was lost (3+ DoF) */
    influenceLost: boolean;
    /** 0 = immediate, else epoch ms when ready */
    readyAt: number;
    /** "pending"|"ready"|"delivered" */
    status: string;
    /** Epoch ms when GM approved */
    approvedAt: number;
}

/** A chronicle log entry */
export interface ChronicleEntry {
    id: string;
    date: ImperialDate;
    title: string;
    body: string;
    author: string;
    timestamp: number;
    category: "session" | "event" | "note";
}

/** An objective deadline */
export interface ObjectiveDeadline {
    objectiveId: string;
    objectiveName: string;
    deadline: ImperialDate;
    dismissed: boolean;
}

/** Chronicle data block stored on the warband */
export interface ChronicleData {
    currentDate: ImperialDate;
    entries: ChronicleEntry[];
    deadlines: ObjectiveDeadline[];
}

/** Warband system source data (stored in DB) */
export interface WarbandSystemSource {
    members: WarbandMemberSource[];
    reinforcements: ReinforcementEntry[];
    inquisitor: InquisitorSource;
    pendingRequisitions: PendingRequisition[];
    chronicle: ChronicleData;
    details: {
        name: string;
        notes: string;
    };
}

/** Warband system data (includes computed/derived fields) */
export interface WarbandSystemData extends WarbandSystemSource {
    resolvedMembers: AcolyteDH2e[];
    resolvedInquisitor: ActorDH2e | null;
    resolvedReinforcements: (ReinforcementEntry & { actor: NpcDH2e | null; controllerName: string })[];
}
