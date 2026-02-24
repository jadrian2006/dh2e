import { ItemDH2e } from "@item/base/document.ts";

/** Objective status values */
export type ObjectiveStatus = "active" | "completed" | "failed";

/** Objective scope values */
export type ObjectiveScope = "personal" | "warband";

/** Objective format values */
export type ObjectiveFormat = "parchment" | "vox";

/** Objective system data stored in DB */
export interface ObjectiveSystemData {
    description: string;
    status: ObjectiveStatus;
    assignedBy: string;
    timestamp: number;
    completedTimestamp: number;
    scope: ObjectiveScope;
    format: ObjectiveFormat;
}

/** Objective item — mission goals and directives */
class ObjectiveDH2e extends ItemDH2e {
    declare system: ObjectiveSystemData;

    get status(): ObjectiveStatus {
        return this.system.status;
    }

    get scope(): ObjectiveScope {
        return this.system.scope;
    }

    get format(): ObjectiveFormat {
        return this.system.format;
    }

    get isActive(): boolean {
        return this.system.status === "active";
    }

    /** Mark objective as completed */
    async complete(): Promise<void> {
        await this.update({
            "system.status": "completed",
            "system.completedTimestamp": Date.now(),
        });
    }

    /** Mark objective as failed */
    async fail(): Promise<void> {
        await this.update({
            "system.status": "failed",
            "system.completedTimestamp": Date.now(),
        });
    }

    /** Reactivate a completed/failed objective */
    async reactivate(): Promise<void> {
        await this.update({
            "system.status": "active",
            "system.completedTimestamp": 0,
        });
    }
}

export { ObjectiveDH2e };
