import { describe, it, expect } from "vitest";
import yaml from "js-yaml";

/**
 * Test Rule Builder form → YAML round-trip logic.
 *
 * Tests the conversion between form data objects and YAML strings,
 * matching what rule-builder.svelte and yaml-editor.ts do.
 */

/** Strip empty/undefined fields (mimics the builder's clean step) */
function cleanRule(rule: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(rule)) {
        if (v !== undefined && v !== "" && v !== null) {
            if (k === "value" || k === "amount") {
                clean[k] = Number(v);
            } else {
                clean[k] = v;
            }
        }
    }
    return clean;
}

/** Convert rule object to YAML string (like rulesToYaml) */
function toYaml(rule: Record<string, any>): string {
    return yaml.dump([cleanRule(rule)], { indent: 2, noRefs: true });
}

/** Parse YAML string back to rule object (like yamlToRules) */
function fromYaml(yamlStr: string): Record<string, any>[] {
    return yaml.load(yamlStr) as Record<string, any>[];
}

describe("Rule Builder — Form to YAML Round-Trip", () => {
    it("FlatModifier round-trips correctly", () => {
        const form = {
            key: "FlatModifier",
            domain: "characteristic:bs",
            value: 10,
            label: "Marksman",
            source: "talent",
        };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].key).toBe("FlatModifier");
        expect(parsed[0].domain).toBe("characteristic:bs");
        expect(parsed[0].value).toBe(10);
        expect(parsed[0].label).toBe("Marksman");
    });

    it("RollOption round-trips correctly", () => {
        const form = { key: "RollOption", option: "self:aim:full" };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].key).toBe("RollOption");
        expect(parsed[0].option).toBe("self:aim:full");
    });

    it("DiceOverride round-trips correctly", () => {
        const form = { key: "DiceOverride", domain: "damage:melee", mode: "rerollLowest", value: 0 };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].key).toBe("DiceOverride");
        expect(parsed[0].mode).toBe("rerollLowest");
    });

    it("AdjustDegree round-trips correctly", () => {
        const form = { key: "AdjustDegree", amount: 1, label: "Keen Intuition" };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].amount).toBe(1);
    });

    it("GrantItem round-trips correctly", () => {
        const form = { key: "GrantItem", uuid: "Compendium.dh2e-data.talents.abc123" };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].uuid).toBe("Compendium.dh2e-data.talents.abc123");
    });

    it("Resistance round-trips correctly", () => {
        const form = { key: "Resistance", damageType: "energy", value: 2 };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].damageType).toBe("energy");
        expect(parsed[0].value).toBe(2);
    });

    it("AdjustToughness round-trips correctly", () => {
        const form = { key: "AdjustToughness", value: 1, label: "Hardy" };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].value).toBe(1);
    });

    it("ChoiceSet round-trips correctly", () => {
        const form = { key: "ChoiceSet", flag: "selectedSkill", prompt: "Choose:", choices: ["Athletics", "Stealth"] };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].choices).toEqual(["Athletics", "Stealth"]);
        expect(parsed[0].flag).toBe("selectedSkill");
    });
});

describe("Rule Builder — Field Cleaning", () => {
    it("strips empty string fields", () => {
        const form = { key: "FlatModifier", domain: "characteristic:bs", value: 5, label: "", source: "" };
        const clean = cleanRule(form);
        expect(clean).not.toHaveProperty("label");
        expect(clean).not.toHaveProperty("source");
    });

    it("strips undefined fields", () => {
        const form = { key: "FlatModifier", domain: "characteristic:bs", value: 10, exclusionGroup: undefined };
        const clean = cleanRule(form);
        expect(clean).not.toHaveProperty("exclusionGroup");
    });

    it("converts string value to number", () => {
        const form = { key: "FlatModifier", domain: "characteristic:bs", value: "10" };
        const clean = cleanRule(form);
        expect(clean.value).toBe(10);
        expect(typeof clean.value).toBe("number");
    });

    it("converts string amount to number", () => {
        const form = { key: "AdjustDegree", amount: "2" };
        const clean = cleanRule(form);
        expect(clean.amount).toBe(2);
        expect(typeof clean.amount).toBe("number");
    });

    it("preserves zero values", () => {
        const form = { key: "DiceOverride", domain: "damage:melee", mode: "rerollLowest", value: 0 };
        const clean = cleanRule(form);
        expect(clean.value).toBe(0);
    });
});

describe("Rule Builder — Predicate Handling", () => {
    it("includes predicate array when present", () => {
        const form = { key: "FlatModifier", domain: "characteristic:bs", value: 10, predicate: ["self:aim:full"] };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].predicate).toEqual(["self:aim:full"]);
    });

    it("omits predicate when undefined", () => {
        const form = { key: "FlatModifier", domain: "characteristic:bs", value: 10, predicate: undefined };
        const clean = cleanRule(form);
        expect(clean).not.toHaveProperty("predicate");
    });

    it("handles multiple predicate atoms", () => {
        const form = { key: "FlatModifier", domain: "damage:ranged", value: 2, predicate: ["self:aim:full", "target:within:30"] };
        const yamlStr = toYaml(form);
        const parsed = fromYaml(yamlStr);
        expect(parsed[0].predicate).toHaveLength(2);
    });
});
