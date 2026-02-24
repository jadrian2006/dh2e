import { describe, it, expect } from "vitest";
import { createSynthetics, getModifiers } from "@rules/synthetics.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";

/** Minimal item stub for Rule Element construction */
function makeItem(overrides?: Partial<{
    id: string;
    name: string;
    type: string;
    system: Record<string, unknown>;
    flags: Record<string, unknown>;
}>) {
    return {
        id: overrides?.id ?? "item1",
        name: overrides?.name ?? "Test Talent",
        type: overrides?.type ?? "talent",
        system: overrides?.system ?? {},
        flags: overrides?.flags ?? {},
        parent: { id: "actor1", name: "Actor" },
    } as unknown as Item;
}

describe("Rule Elements", () => {
    describe("FlatModifier", () => {
        it("pushes a modifier into the correct domain", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "characteristic:bs",
                    value: 10,
                    label: "Marksman",
                    source: "talent",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            const mods = getModifiers(synthetics, "characteristic:bs");
            expect(mods).toHaveLength(1);
            expect(mods[0].label).toBe("Marksman");
            expect(mods[0].value).toBe(10);
            expect(mods[0].source).toBe("talent");
        });

        it("sets exclusionGroup when provided", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "characteristic:bs",
                    value: 20,
                    label: "Full Aim",
                    source: "situational",
                    exclusionGroup: "aim",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            const mods = getModifiers(synthetics, "characteristic:bs");
            expect(mods).toHaveLength(1);
            expect(mods[0].exclusionGroup).toBe("aim");
        });
    });

    describe("RollOption", () => {
        it("adds an option string to synthetics.rollOptions", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                { key: "RollOption", option: "weapon:reliable" },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.rollOptions.has("weapon:reliable")).toBe(true);
        });
    });

    describe("DiceOverride", () => {
        it("pushes a dice override entry into the correct domain", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                {
                    key: "DiceOverride",
                    domain: "damage:ranged",
                    mode: "rerollLowest",
                    label: "Tearing",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            const overrides = synthetics.diceOverrides["damage:ranged"];
            expect(overrides).toBeDefined();
            expect(overrides).toHaveLength(1);
            expect(overrides[0].mode).toBe("rerollLowest");
            expect(overrides[0].source).toBe("Tearing");
        });
    });

    describe("AdjustDegree", () => {
        it("pushes a DoS adjustment with predicate", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                {
                    key: "AdjustDegree",
                    amount: 1,
                    predicate: ["self:aim:full"],
                    label: "Accurate",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.dosAdjustments).toHaveLength(1);
            expect(synthetics.dosAdjustments[0].amount).toBe(1);
            expect(synthetics.dosAdjustments[0].predicate).toEqual(["self:aim:full"]);
            expect(synthetics.dosAdjustments[0].source).toBe("Accurate");
        });
    });

    describe("Resistance", () => {
        it("pushes a flat resistance entry", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                {
                    key: "Resistance",
                    damageType: "energy",
                    value: 2,
                    mode: "flat",
                    label: "Energy Resistance",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.resistances).toHaveLength(1);
            expect(synthetics.resistances[0].damageType).toBe("energy");
            expect(synthetics.resistances[0].value).toBe(2);
            expect(synthetics.resistances[0].mode).toBe("flat");
        });

        it("pushes a half-damage resistance entry", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                {
                    key: "Resistance",
                    damageType: "impact",
                    mode: "half",
                    label: "Impact Resistance",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.resistances).toHaveLength(1);
            expect(synthetics.resistances[0].damageType).toBe("impact");
            expect(synthetics.resistances[0].mode).toBe("half");
        });
    });

    describe("AdjustToughness", () => {
        it("pushes an additive toughness adjustment", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                {
                    key: "AdjustToughness",
                    value: 2,
                    mode: "add",
                    label: "Unnatural Toughness",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.toughnessAdjustments).toHaveLength(1);
            expect(synthetics.toughnessAdjustments[0].value).toBe(2);
            expect(synthetics.toughnessAdjustments[0].mode).toBe("add");
            expect(synthetics.toughnessAdjustments[0].source).toBe("Unnatural Toughness");
        });

        it("pushes a multiplicative toughness adjustment", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                {
                    key: "AdjustToughness",
                    value: 2,
                    mode: "multiply",
                    label: "Unnatural Toughness x2",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.toughnessAdjustments).toHaveLength(1);
            expect(synthetics.toughnessAdjustments[0].value).toBe(2);
            expect(synthetics.toughnessAdjustments[0].mode).toBe("multiply");
        });
    });

    describe("GrantItem", () => {
        it("onPrepareData is a no-op (does not throw)", () => {
            const synthetics = createSynthetics();
            const item = makeItem();
            const re = instantiateRuleElement(
                { key: "GrantItem", uuid: "Compendium.dh2e-data.conditions.Item.stunned" },
                item,
            );

            expect(re).not.toBeNull();
            expect(() => re!.onPrepareData(synthetics)).not.toThrow();

            // Synthetics should be unchanged
            expect(synthetics.rollOptions.size).toBe(0);
            expect(synthetics.dosAdjustments).toHaveLength(0);
            expect(synthetics.resistances).toHaveLength(0);
            expect(synthetics.toughnessAdjustments).toHaveLength(0);
        });
    });

    describe("ChoiceSet", () => {
        it("injects a roll option from the stored flag value", () => {
            const synthetics = createSynthetics();
            const item = makeItem({
                flags: { dh2e: { spec: "bolter" } },
            });
            const re = instantiateRuleElement(
                {
                    key: "ChoiceSet",
                    prompt: "Choose a weapon specialization",
                    choices: [
                        { value: "bolter", label: "Bolter" },
                        { value: "las", label: "Las" },
                    ],
                    flag: "spec",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.rollOptions.has("choice:spec:bolter")).toBe(true);
        });

        it("does not inject if no flag is set", () => {
            const synthetics = createSynthetics();
            const item = makeItem(); // no flags
            const re = instantiateRuleElement(
                {
                    key: "ChoiceSet",
                    prompt: "Choose",
                    choices: [{ value: "a", label: "A" }],
                    flag: "spec",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.rollOptions.size).toBe(0);
        });
    });

    describe("Unknown key", () => {
        it("returns null for an unregistered key", () => {
            const item = makeItem();
            const re = instantiateRuleElement({ key: "NonExistent" }, item);
            expect(re).toBeNull();
        });
    });
});
