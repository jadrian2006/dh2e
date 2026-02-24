import type { RuleElementSource } from "@rules/rule-element/base.ts";

export interface MalignancySystemSource {
    description: string;
    threshold: number;
    rules: RuleElementSource[];
    visible: boolean;
}
