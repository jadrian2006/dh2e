import { describe, it, expect } from "vitest";
import { createSynthetics, getModifiers } from "@rules/synthetics.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";

/** Minimal item stub for trait Rule Element tests */
function makeTrait(overrides?: Partial<{
    name: string;
    system: Record<string, unknown>;
}>) {
    return {
        id: "trait1",
        name: overrides?.name ?? "Test Trait",
        type: "trait",
        system: overrides?.system ?? { hasRating: false, rating: 0 },
        flags: {},
        parent: { id: "actor1", name: "NPC" },
    } as unknown as Item;
}

describe("Trait Rule Elements", () => {
    describe("FlatModifier with value: 'rating'", () => {
        it("resolves value from item.system.rating", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({
                name: "Natural Armour",
                system: { hasRating: true, rating: 4, rules: [] },
            });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "armour:all",
                    value: "rating",
                    label: "Natural Armour",
                    source: "trait",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            const mods = getModifiers(synthetics, "armour:all");
            expect(mods).toHaveLength(1);
            expect(mods[0].value).toBe(4);
            expect(mods[0].label).toBe("Natural Armour");
        });

        it("defaults to 0 when item has no rating", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({
                name: "Test",
                system: { hasRating: false },
            });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "armour:all",
                    value: "rating",
                    label: "Test",
                    source: "trait",
                },
                item,
            );

            re!.onPrepareData(synthetics);
            const mods = getModifiers(synthetics, "armour:all");
            expect(mods[0].value).toBe(0);
        });

        it("still works with numeric value", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({ name: "Blind" });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "characteristic:ws",
                    value: -30,
                    label: "Blind",
                    source: "trait",
                },
                item,
            );

            re!.onPrepareData(synthetics);
            const mods = getModifiers(synthetics, "characteristic:ws");
            expect(mods[0].value).toBe(-30);
        });
    });

    describe("AdjustToughness with value: 'rating'", () => {
        it("resolves value from item.system.rating", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({
                name: "Daemonic",
                system: { hasRating: true, rating: 4, rules: [] },
            });
            const re = instantiateRuleElement(
                {
                    key: "AdjustToughness",
                    value: "rating",
                    mode: "add",
                    label: "Daemonic",
                },
                item,
            );

            expect(re).not.toBeNull();
            re!.onPrepareData(synthetics);

            expect(synthetics.toughnessAdjustments).toHaveLength(1);
            expect(synthetics.toughnessAdjustments[0].value).toBe(4);
            expect(synthetics.toughnessAdjustments[0].mode).toBe("add");
            expect(synthetics.toughnessAdjustments[0].source).toBe("Daemonic");
        });
    });

    describe("Natural Armour trait", () => {
        it("produces armour:all modifier from rules array", () => {
            const synthetics = createSynthetics();
            const traitRules = [
                {
                    key: "FlatModifier",
                    domain: "armour:all",
                    value: "rating",
                    label: "Natural Armour",
                    source: "trait",
                },
            ];
            const item = makeTrait({
                name: "Natural Armour",
                system: { hasRating: true, rating: 3, rules: traitRules },
            });

            for (const ruleSrc of traitRules) {
                const re = instantiateRuleElement(ruleSrc, item);
                re?.onPrepareData(synthetics);
            }

            const mods = getModifiers(synthetics, "armour:all");
            expect(mods).toHaveLength(1);
            expect(mods[0].value).toBe(3);
        });
    });

    describe("Machine trait", () => {
        it("produces armour:all modifier and trait:machine roll option", () => {
            const synthetics = createSynthetics();
            const traitRules = [
                {
                    key: "FlatModifier",
                    domain: "armour:all",
                    value: "rating",
                    label: "Machine",
                    source: "trait",
                },
                {
                    key: "RollOption",
                    option: "trait:machine",
                },
            ];
            const item = makeTrait({
                name: "Machine",
                system: { hasRating: true, rating: 3, rules: traitRules },
            });

            for (const ruleSrc of traitRules) {
                const re = instantiateRuleElement(ruleSrc, item);
                re?.onPrepareData(synthetics);
            }

            const mods = getModifiers(synthetics, "armour:all");
            expect(mods).toHaveLength(1);
            expect(mods[0].value).toBe(3);
            expect(synthetics.rollOptions.has("trait:machine")).toBe(true);
        });
    });

    describe("Size traits", () => {
        it("Size (Scrawny) adds +10 evasion:self", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({
                name: "Size (Scrawny)",
                system: { hasRating: true, rating: -1, rules: [] },
            });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "evasion:self",
                    value: 10,
                    label: "Size (Scrawny)",
                    source: "trait",
                },
                item,
            );

            re!.onPrepareData(synthetics);
            const mods = getModifiers(synthetics, "evasion:self");
            expect(mods[0].value).toBe(10);
        });

        it("Size (Hulking) adds -10 evasion:self", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({
                name: "Size (Hulking)",
                system: { hasRating: true, rating: 1, rules: [] },
            });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "evasion:self",
                    value: -10,
                    label: "Size (Hulking)",
                    source: "trait",
                },
                item,
            );

            re!.onPrepareData(synthetics);
            const mods = getModifiers(synthetics, "evasion:self");
            expect(mods[0].value).toBe(-10);
        });

        it("Size (Enormous) adds -20 evasion:self", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({
                name: "Size (Enormous)",
                system: { hasRating: true, rating: 2, rules: [] },
            });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "evasion:self",
                    value: -20,
                    label: "Size (Enormous)",
                    source: "trait",
                },
                item,
            );

            re!.onPrepareData(synthetics);
            const mods = getModifiers(synthetics, "evasion:self");
            expect(mods[0].value).toBe(-20);
        });

        it("Size (Massive) adds -30 evasion:self", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({
                name: "Size (Massive)",
                system: { hasRating: true, rating: 3, rules: [] },
            });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "evasion:self",
                    value: -30,
                    label: "Size (Massive)",
                    source: "trait",
                },
                item,
            );

            re!.onPrepareData(synthetics);
            const mods = getModifiers(synthetics, "evasion:self");
            expect(mods[0].value).toBe(-30);
        });
    });

    describe("Blind trait", () => {
        it("applies -30 WS and trait:blind roll option", () => {
            const synthetics = createSynthetics();
            const traitRules = [
                {
                    key: "FlatModifier",
                    domain: "characteristic:ws",
                    value: -30,
                    label: "Blind",
                    source: "trait",
                },
                {
                    key: "RollOption",
                    option: "trait:blind",
                },
            ];
            const item = makeTrait({
                name: "Blind",
                system: { hasRating: false, rating: 0, rules: traitRules },
            });

            for (const ruleSrc of traitRules) {
                const re = instantiateRuleElement(ruleSrc, item);
                re?.onPrepareData(synthetics);
            }

            const mods = getModifiers(synthetics, "characteristic:ws");
            expect(mods).toHaveLength(1);
            expect(mods[0].value).toBe(-30);
            expect(synthetics.rollOptions.has("trait:blind")).toBe(true);
        });
    });

    describe("Brutal Charge trait", () => {
        it("produces damage:melee modifier with predicate and rating value", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({
                name: "Brutal Charge",
                system: { hasRating: true, rating: 3, rules: [] },
            });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "damage:melee",
                    value: "rating",
                    label: "Brutal Charge",
                    source: "trait",
                    predicate: ["action:charge"],
                },
                item,
            );

            re!.onPrepareData(synthetics);
            const mods = getModifiers(synthetics, "damage:melee");
            expect(mods).toHaveLength(1);
            expect(mods[0].value).toBe(3);
            expect(mods[0].predicate?.statements ?? mods[0].predicate).toEqual(["action:charge"]);
        });
    });

    describe("Sturdy trait", () => {
        it("produces +20 resist-knockdown modifier", () => {
            const synthetics = createSynthetics();
            const item = makeTrait({ name: "Sturdy" });
            const re = instantiateRuleElement(
                {
                    key: "FlatModifier",
                    domain: "test:resist-knockdown",
                    value: 20,
                    label: "Sturdy",
                    source: "trait",
                },
                item,
            );

            re!.onPrepareData(synthetics);
            const mods = getModifiers(synthetics, "test:resist-knockdown");
            expect(mods[0].value).toBe(20);
        });
    });

    describe("Daemonic trait full rules", () => {
        it("adjusts TB and adds roll option", () => {
            const synthetics = createSynthetics();
            const traitRules = [
                {
                    key: "AdjustToughness",
                    value: "rating",
                    mode: "add",
                    label: "Daemonic",
                },
                {
                    key: "RollOption",
                    option: "trait:daemonic",
                },
            ];
            const item = makeTrait({
                name: "Daemonic",
                system: { hasRating: true, rating: 4, rules: traitRules },
            });

            for (const ruleSrc of traitRules) {
                const re = instantiateRuleElement(ruleSrc, item);
                re?.onPrepareData(synthetics);
            }

            expect(synthetics.toughnessAdjustments).toHaveLength(1);
            expect(synthetics.toughnessAdjustments[0].value).toBe(4);
            expect(synthetics.rollOptions.has("trait:daemonic")).toBe(true);
        });
    });
});
