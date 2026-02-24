import type { RuleElementSource } from "@rules/rule-element/base.ts";

export type CyberneticType = "replacement" | "enhancement";
export type CyberneticGrade = "poor" | "common" | "good" | "best";

export interface CyberneticSystemSource {
    description: string;
    location: string;
    type: CyberneticType;
    grade: CyberneticGrade;
    rules: RuleElementSource[];
    installed: boolean;
    weight: number;
    availability: string;
}
