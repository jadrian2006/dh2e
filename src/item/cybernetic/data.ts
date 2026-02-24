import type { RuleElementSource } from "@rules/rule-element/base.ts";

export type CyberneticType = "replacement" | "enhancement";

export interface CyberneticSystemSource {
    description: string;
    location: string;
    type: CyberneticType;
    rules: RuleElementSource[];
    installed: boolean;
    weight: number;
    availability: string;
}
