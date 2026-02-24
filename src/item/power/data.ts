import type { RuleElementSource } from "@rules/rule-element/base.ts";

export interface PowerSystemSource {
    description: string;
    discipline: string;
    cost: number;
    focusTest: string;
    focusModifier: number;
    range: string;
    sustained: boolean;
    action: string;
    rules: RuleElementSource[];
}
