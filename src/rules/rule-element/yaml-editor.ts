import yaml from "js-yaml";
import type { RuleElementSource } from "./base.ts";
import { RE_REGISTRY } from "./registry.ts";

/**
 * Convert a rules JSON array to YAML string for display in the editor.
 *
 * Produces clean, human-readable YAML with helpful comments.
 */
function rulesToYaml(rules: RuleElementSource[]): string {
    if (!rules || rules.length === 0) {
        return YAML_TEMPLATE;
    }

    return yaml.dump(rules, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
    });
}

/**
 * Parse a YAML string into a RuleElementSource array.
 *
 * @returns The parsed rules array, or throws on invalid YAML/structure.
 */
function yamlToRules(yamlStr: string): RuleElementSource[] {
    const trimmed = yamlStr.trim();
    if (!trimmed || trimmed === YAML_TEMPLATE.trim()) return [];

    const parsed = yaml.load(trimmed);

    if (parsed === null || parsed === undefined) return [];

    // Accept a single object as a one-element array
    if (!Array.isArray(parsed)) {
        if (typeof parsed === "object") {
            return [parsed as RuleElementSource];
        }
        throw new Error("Rule elements must be a YAML list (array) of objects.");
    }

    return parsed as RuleElementSource[];
}

/** Validate parsed rules and return error messages (empty = valid) */
function validateRules(rules: RuleElementSource[]): string[] {
    const errors: string[] = [];

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        const prefix = `Rule #${i + 1}`;

        if (!rule.key) {
            errors.push(`${prefix}: Missing required "key" field.`);
            continue;
        }

        if (typeof rule.key !== "string") {
            errors.push(`${prefix}: "key" must be a string.`);
            continue;
        }

        if (!(rule.key in RE_REGISTRY)) {
            errors.push(
                `${prefix}: Unknown RE type "${rule.key}". Valid types: ${Object.keys(RE_REGISTRY).join(", ")}`,
            );
        }

        // Type-specific validation
        switch (rule.key) {
            case "FlatModifier":
                if (typeof rule.domain !== "string") {
                    errors.push(`${prefix}: FlatModifier requires a "domain" string.`);
                }
                if (typeof rule.value !== "number") {
                    errors.push(`${prefix}: FlatModifier requires a numeric "value".`);
                }
                break;
            case "RollOption":
                if (typeof rule.option !== "string") {
                    errors.push(`${prefix}: RollOption requires an "option" string.`);
                }
                break;
            case "DiceOverride":
                if (typeof rule.domain !== "string") {
                    errors.push(`${prefix}: DiceOverride requires a "domain" string.`);
                }
                if (!["rerollLowest", "minimumDie", "maximizeDie"].includes(rule.mode as string)) {
                    errors.push(`${prefix}: DiceOverride "mode" must be one of: rerollLowest, minimumDie, maximizeDie.`);
                }
                break;
            case "AdjustDegree":
                if (typeof rule.amount !== "number" && typeof rule.amount !== "string") {
                    errors.push(`${prefix}: AdjustDegree requires an "amount" (number or "actor:path").`);
                }
                break;
            case "GrantItem":
                if (typeof rule.uuid !== "string") {
                    errors.push(`${prefix}: GrantItem requires a "uuid" string.`);
                }
                break;
            case "Resistance":
                if (typeof rule.damageType !== "string") {
                    errors.push(`${prefix}: Resistance requires a "damageType" string.`);
                }
                break;
            case "AdjustToughness":
                if (typeof rule.value !== "number") {
                    errors.push(`${prefix}: AdjustToughness requires a numeric "value".`);
                }
                break;
            case "ChoiceSet":
                if (!Array.isArray(rule.choices)) {
                    errors.push(`${prefix}: ChoiceSet requires a "choices" array.`);
                }
                if (typeof rule.flag !== "string") {
                    errors.push(`${prefix}: ChoiceSet requires a "flag" string.`);
                }
                break;
            case "ActorValue":
                if (typeof rule.domain !== "string") {
                    errors.push(`${prefix}: ActorValue requires a "domain" string.`);
                }
                if (typeof rule.path !== "string") {
                    errors.push(`${prefix}: ActorValue requires a "path" string.`);
                }
                break;
            case "AttributeOverride":
                if (typeof rule.domain !== "string") {
                    errors.push(`${prefix}: AttributeOverride requires a "domain" string.`);
                }
                if (typeof rule.characteristic !== "string") {
                    errors.push(`${prefix}: AttributeOverride requires a "characteristic" string.`);
                }
                break;
        }
    }

    return errors;
}

/** Default template YAML shown in an empty editor */
const YAML_TEMPLATE = `# Rule Elements — YAML format
# Each entry is a rule element that modifies the actor/item.
# Supported types:
#   FlatModifier       — Add a flat modifier to a domain
#   RollOption         — Inject a roll option string
#   DiceOverride       — Modify damage dice (Tearing, Proven, etc.)
#   AdjustDegree       — Adjust DoS/DoF after a check
#   GrantItem          — Auto-grant an item on creation
#   Resistance         — Damage reduction by type
#   AdjustToughness    — Modify effective TB for damage soak
#   ChoiceSet          — Prompt user to pick from options
#   ActorValue         — Dynamic value from actor stats (e.g., half WSB)
#   AttributeOverride  — Swap characteristic for a test domain
#
# Example:
# - key: FlatModifier
#   domain: characteristic:bs
#   value: 10
#   label: Marksman
#   source: talent
#   predicate:
#     - self:aim:full
`;

export { rulesToYaml, yamlToRules, validateRules, YAML_TEMPLATE };
