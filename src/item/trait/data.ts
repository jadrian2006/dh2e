import type { RuleElementSource } from "@rules/rule-element/base.ts";

export interface TraitSystemSource {
    description: string;
    rules: RuleElementSource[];
    hasRating: boolean;
    rating: number;
    category: string;
    immunities: string[];
}
