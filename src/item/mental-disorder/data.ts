import type { RuleElementSource } from "@rules/rule-element/base.ts";

export type DisorderSeverity = "minor" | "severe" | "acute";

export interface MentalDisorderSystemSource {
    description: string;
    threshold: number;
    severity: DisorderSeverity;
    rules: RuleElementSource[];
    triggers: string;
}
