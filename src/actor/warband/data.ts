import type { AcolyteDH2e } from "@actor/acolyte/document.ts";

/** A single warband member entry (stored in DB) */
export interface WarbandMemberSource {
    uuid: string;
}

/** Warband system source data (stored in DB) */
export interface WarbandSystemSource {
    members: WarbandMemberSource[];
    details: {
        name: string;
        notes: string;
    };
}

/** Warband system data (includes computed/derived fields) */
export interface WarbandSystemData extends WarbandSystemSource {
    resolvedMembers: AcolyteDH2e[];
}
