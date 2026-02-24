import { describe, it, expect } from "vitest";
import { ModifierDH2e, applyExclusionGroups, resolveModifiers } from "@rules/modifier.ts";
import { Predicate } from "@rules/predicate.ts";

describe("ModifierDH2e", () => {
    describe("constructor", () => {
        it("sets all properties from params", () => {
            const mod = new ModifierDH2e({
                label: "Test",
                value: 10,
                source: "talent",
                exclusionGroup: "aim",
                predicate: ["self:aim:full"],
                enabled: false,
                toggleable: true,
            });

            expect(mod.label).toBe("Test");
            expect(mod.value).toBe(10);
            expect(mod.source).toBe("talent");
            expect(mod.exclusionGroup).toBe("aim");
            expect(mod.enabled).toBe(false);
            expect(mod.toggleable).toBe(true);
            expect(mod.predicate).toBeInstanceOf(Predicate);
        });

        it("defaults enabled to true and toggleable to false", () => {
            const mod = new ModifierDH2e({
                label: "Basic",
                value: 5,
                source: "equipment",
            });

            expect(mod.enabled).toBe(true);
            expect(mod.toggleable).toBe(false);
            expect(mod.exclusionGroup).toBeNull();
        });
    });

    describe("isBonus / isPenalty", () => {
        it("positive value is a bonus", () => {
            const mod = new ModifierDH2e({ label: "Bonus", value: 10, source: "talent" });
            expect(mod.isBonus).toBe(true);
            expect(mod.isPenalty).toBe(false);
        });

        it("negative value is a penalty", () => {
            const mod = new ModifierDH2e({ label: "Penalty", value: -10, source: "condition" });
            expect(mod.isBonus).toBe(false);
            expect(mod.isPenalty).toBe(true);
        });

        it("zero value is neither bonus nor penalty", () => {
            const mod = new ModifierDH2e({ label: "Neutral", value: 0, source: "talent" });
            expect(mod.isBonus).toBe(false);
            expect(mod.isPenalty).toBe(false);
        });
    });

    describe("clone", () => {
        it("returns a distinct object with same values", () => {
            const original = new ModifierDH2e({
                label: "Aim",
                value: 10,
                source: "situational",
                exclusionGroup: "aim",
                predicate: ["self:aim:full"],
                enabled: true,
                toggleable: true,
            });

            const cloned = original.clone();

            expect(cloned).not.toBe(original);
            expect(cloned.label).toBe(original.label);
            expect(cloned.value).toBe(original.value);
            expect(cloned.source).toBe(original.source);
            expect(cloned.exclusionGroup).toBe(original.exclusionGroup);
            expect(cloned.enabled).toBe(original.enabled);
            expect(cloned.toggleable).toBe(original.toggleable);
            expect(cloned.predicate.statements).toEqual(original.predicate.statements);
            expect(cloned.predicate).not.toBe(original.predicate);
        });
    });
});

describe("applyExclusionGroups", () => {
    describe("tagged stacking (ungrouped)", () => {
        it("two ungrouped modifiers stack additively", () => {
            const mods = [
                new ModifierDH2e({ label: "Talent A", value: 10, source: "talent" }),
                new ModifierDH2e({ label: "Equipment B", value: 5, source: "equipment" }),
            ];

            const result = applyExclusionGroups(mods);
            const total = result.reduce((sum, m) => sum + m.value, 0);

            expect(result).toHaveLength(2);
            expect(total).toBe(15);
        });
    });

    describe("exclusion group: bonuses", () => {
        it("two bonuses in the same group → only the highest applies", () => {
            const mods = [
                new ModifierDH2e({ label: "Half Aim", value: 10, source: "situational", exclusionGroup: "aim" }),
                new ModifierDH2e({ label: "Full Aim", value: 20, source: "situational", exclusionGroup: "aim" }),
            ];

            const result = applyExclusionGroups(mods);

            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(20);
            expect(result[0].label).toBe("Full Aim");
        });
    });

    describe("exclusion group: penalties", () => {
        it("two penalties in the same group → only the most negative applies", () => {
            const mods = [
                new ModifierDH2e({ label: "Light Wound", value: -5, source: "condition", exclusionGroup: "wound" }),
                new ModifierDH2e({ label: "Heavy Wound", value: -20, source: "condition", exclusionGroup: "wound" }),
            ];

            const result = applyExclusionGroups(mods);

            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(-20);
            expect(result[0].label).toBe("Heavy Wound");
        });
    });

    describe("exclusion group: bonus and penalty together", () => {
        it("one bonus and one penalty in same group → both apply", () => {
            const mods = [
                new ModifierDH2e({ label: "Cover Bonus", value: 10, source: "situational", exclusionGroup: "cover" }),
                new ModifierDH2e({ label: "Suppressed", value: -10, source: "condition", exclusionGroup: "cover" }),
            ];

            const result = applyExclusionGroups(mods);

            expect(result).toHaveLength(2);
            const total = result.reduce((sum, m) => sum + m.value, 0);
            expect(total).toBe(0);
        });
    });
});

describe("resolveModifiers", () => {
    describe("predicate filtering", () => {
        it("modifier with predicate only applies when roll options match", () => {
            const mods = [
                new ModifierDH2e({ label: "Full Aim", value: 20, source: "situational", predicate: ["self:aim:full"] }),
                new ModifierDH2e({ label: "Always On", value: 5, source: "talent" }),
            ];

            // Without the aim roll option
            const without = resolveModifiers(mods, new Set(["self:characteristic:bs"]));
            expect(without.total).toBe(5);
            expect(without.applied).toHaveLength(1);

            // With the aim roll option
            const withAim = resolveModifiers(mods, new Set(["self:aim:full"]));
            expect(withAim.total).toBe(25);
            expect(withAim.applied).toHaveLength(2);
        });
    });

    describe("disabled modifiers", () => {
        it("disabled modifiers are excluded from the total", () => {
            const mods = [
                new ModifierDH2e({ label: "Active", value: 10, source: "talent", enabled: true }),
                new ModifierDH2e({ label: "Disabled", value: 20, source: "talent", enabled: false }),
            ];

            const result = resolveModifiers(mods, new Set());
            expect(result.total).toBe(10);
            expect(result.applied).toHaveLength(1);
            expect(result.applied[0].label).toBe("Active");
        });
    });

    describe("modifier cap", () => {
        it("positive total is clamped to +cap (default 60)", () => {
            const mods = [
                new ModifierDH2e({ label: "Big Bonus A", value: 40, source: "talent" }),
                new ModifierDH2e({ label: "Big Bonus B", value: 40, source: "equipment" }),
            ];

            const result = resolveModifiers(mods, new Set());
            expect(result.total).toBe(60);
        });

        it("negative total is clamped to -cap (default 60)", () => {
            const mods = [
                new ModifierDH2e({ label: "Big Penalty A", value: -40, source: "condition" }),
                new ModifierDH2e({ label: "Big Penalty B", value: -40, source: "equipment" }),
            ];

            const result = resolveModifiers(mods, new Set());
            expect(result.total).toBe(-60);
        });

        it("respects custom cap value", () => {
            const mods = [
                new ModifierDH2e({ label: "Huge", value: 100, source: "talent" }),
            ];

            const result = resolveModifiers(mods, new Set(), 30);
            expect(result.total).toBe(30);
        });
    });

    describe("all field preserves original modifiers", () => {
        it("returns all original modifiers regardless of filtering", () => {
            const mods = [
                new ModifierDH2e({ label: "A", value: 10, source: "talent", enabled: false }),
                new ModifierDH2e({ label: "B", value: 5, source: "talent" }),
            ];

            const result = resolveModifiers(mods, new Set());
            expect(result.all).toHaveLength(2);
            expect(result.all).toBe(mods);
        });
    });
});

describe("Predicate", () => {
    describe("empty predicate", () => {
        it("always passes", () => {
            const predicate = Predicate.from(undefined);
            expect(predicate.isempty).toBe(true);
            expect(predicate.test(new Set())).toBe(true);
            expect(predicate.test(new Set(["anything"]))).toBe(true);
        });
    });

    describe("atom matching", () => {
        it("passes when roll options contain the atom", () => {
            const predicate = Predicate.from(["self:aim:full"]);
            expect(predicate.test(new Set(["self:aim:full"]))).toBe(true);
        });

        it("fails when roll options do not contain the atom", () => {
            const predicate = Predicate.from(["self:aim:full"]);
            expect(predicate.test(new Set(["self:aim:half"]))).toBe(false);
        });
    });

    describe("negation (not: prefix)", () => {
        it("passes when the negated option is absent", () => {
            const predicate = Predicate.from(["not:flanked"]);
            expect(predicate.test(new Set())).toBe(true);
            expect(predicate.test(new Set(["self:aim:full"]))).toBe(true);
        });

        it("fails when the negated option is present", () => {
            const predicate = Predicate.from(["not:flanked"]);
            expect(predicate.test(new Set(["flanked"]))).toBe(false);
        });
    });

    describe("conjunction (and)", () => {
        it("passes when all sub-predicates are satisfied", () => {
            const predicate = Predicate.from([
                { and: ["self:aim:full", "self:characteristic:bs"] },
            ]);
            expect(predicate.test(new Set(["self:aim:full", "self:characteristic:bs"]))).toBe(true);
        });

        it("fails when any sub-predicate is not satisfied", () => {
            const predicate = Predicate.from([
                { and: ["self:aim:full", "self:characteristic:bs"] },
            ]);
            expect(predicate.test(new Set(["self:aim:full"]))).toBe(false);
        });
    });

    describe("disjunction (or)", () => {
        it("passes when at least one sub-predicate is satisfied", () => {
            const predicate = Predicate.from([
                { or: ["self:aim:full", "self:aim:half"] },
            ]);
            expect(predicate.test(new Set(["self:aim:half"]))).toBe(true);
        });

        it("fails when no sub-predicate is satisfied", () => {
            const predicate = Predicate.from([
                { or: ["self:aim:full", "self:aim:half"] },
            ]);
            expect(predicate.test(new Set(["self:characteristic:ws"]))).toBe(false);
        });
    });

    describe("Predicate.from normalization", () => {
        it("wraps a single statement into an array", () => {
            const predicate = Predicate.from("self:aim:full");
            expect(predicate.statements).toHaveLength(1);
            expect(predicate.test(new Set(["self:aim:full"]))).toBe(true);
        });

        it("passes through an array unchanged", () => {
            const predicate = Predicate.from(["a", "b"]);
            expect(predicate.statements).toHaveLength(2);
        });

        it("returns empty predicate for undefined", () => {
            const predicate = Predicate.from(undefined);
            expect(predicate.isempty).toBe(true);
        });
    });
});
