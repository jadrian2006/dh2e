import type { RuleElementSource } from "@rules/rule-element/base.ts";
import type { ImperialDate } from "../../integrations/imperial-calendar/imperial-date.ts";

export type CyberneticType = "replacement" | "enhancement";
export type CyberneticGrade = "poor" | "common" | "good" | "best";
export type MaintenanceState = "normal" | "minorMalfunction" | "degraded" | "totalFailure";

export interface CyberneticSystemSource {
    description: string;
    location: string;
    type: CyberneticType;
    grade: CyberneticGrade;
    rules: RuleElementSource[];
    installed: boolean;
    weight: number;
    availability: string;
    lastMaintenanceDate: ImperialDate | null;
}
