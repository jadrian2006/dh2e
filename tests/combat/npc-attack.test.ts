import { describe, it, expect } from "vitest";
import { createSynthetics, getModifiers } from "@rules/synthetics.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";

/**
 * NPC Attack tests — since AttackResolver.resolve() depends on Foundry runtime
 * (ChatMessage, dice rolls, etc.), we test the prerequisite data flow:
 * the RE pipeline that feeds into attack resolution.
 */

function makeTrait(name: string, system: Record<string, unknown>) {
    return {
        id: `trait-${name}`,
        name,
        type: "trait",
        system,
        flags: {},
        parent: { id: "npc1", name: "Test NPC" },
    } as unknown as Item;
}

describe("NPC Combat — Rule Element data flow", () => {
    it("Natural Armour (4) adds 4 AP via armour:all modifier", () => {
        const synthetics = createSynthetics();
        const item = makeTrait("Natural Armour", { hasRating: true, rating: 4 });
        const re = instantiateRuleElement(
            { key: "FlatModifier", domain: "armour:all", value: "rating", label: "Natural Armour", source: "trait" },
            item,
        );
        re!.onPrepareData(synthetics);

        // Simulate what prepareDerivedData does
        const armour: Record<string, number> = { head: 0, body: 0, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 };
        const armourMods = synthetics.modifiers["armour:all"] ?? [];
        const bonus = armourMods.reduce((sum, m) => sum + m.value, 0);
        for (const loc of Object.keys(armour)) {
            armour[loc] += bonus;
        }

        expect(armour.head).toBe(4);
        expect(armour.body).toBe(4);
        expect(armour.rightArm).toBe(4);
        expect(armour.leftArm).toBe(4);
        expect(armour.rightLeg).toBe(4);
        expect(armour.leftLeg).toBe(4);
    });

    it("Natural Armour stacks with equipped armour", () => {
        const synthetics = createSynthetics();
        const item = makeTrait("Natural Armour", { hasRating: true, rating: 2 });
        const re = instantiateRuleElement(
            { key: "FlatModifier", domain: "armour:all", value: "rating", label: "Natural Armour", source: "trait" },
            item,
        );
        re!.onPrepareData(synthetics);

        // Start with some equipped armour AP
        const armour: Record<string, number> = { head: 3, body: 5, rightArm: 2, leftArm: 2, rightLeg: 3, leftLeg: 3 };
        const armourMods = synthetics.modifiers["armour:all"] ?? [];
        const bonus = armourMods.reduce((sum, m) => sum + m.value, 0);
        for (const loc of Object.keys(armour)) {
            armour[loc] += bonus;
        }

        expect(armour.head).toBe(5);
        expect(armour.body).toBe(7);
        expect(armour.rightArm).toBe(4);
    });

    it("Machine + Natural Armour stack for combined AP", () => {
        const synthetics = createSynthetics();

        const machineItem = makeTrait("Machine", { hasRating: true, rating: 3 });
        const natArmItem = makeTrait("Natural Armour", { hasRating: true, rating: 2 });

        const re1 = instantiateRuleElement(
            { key: "FlatModifier", domain: "armour:all", value: "rating", label: "Machine", source: "trait" },
            machineItem,
        );
        const re2 = instantiateRuleElement(
            { key: "FlatModifier", domain: "armour:all", value: "rating", label: "Natural Armour", source: "trait" },
            natArmItem,
        );

        re1!.onPrepareData(synthetics);
        re2!.onPrepareData(synthetics);

        const armour: Record<string, number> = { head: 0, body: 0, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 };
        const armourMods = synthetics.modifiers["armour:all"] ?? [];
        const bonus = armourMods.reduce((sum, m) => sum + m.value, 0);
        for (const loc of Object.keys(armour)) {
            armour[loc] += bonus;
        }

        expect(armour.body).toBe(5); // 3 + 2
    });

    it("Daemonic (4) adds TB adjustment of 4", () => {
        const synthetics = createSynthetics();
        const item = makeTrait("Daemonic", { hasRating: true, rating: 4 });
        const re = instantiateRuleElement(
            { key: "AdjustToughness", value: "rating", mode: "add", label: "Daemonic" },
            item,
        );
        re!.onPrepareData(synthetics);

        expect(synthetics.toughnessAdjustments).toHaveLength(1);
        expect(synthetics.toughnessAdjustments[0].value).toBe(4);
    });

    it("Fear trait tags actor for fear checks", () => {
        const synthetics = createSynthetics();
        const item = makeTrait("Fear", { hasRating: true, rating: 3 });
        const re = instantiateRuleElement(
            { key: "RollOption", option: "trait:fear" },
            item,
        );
        re!.onPrepareData(synthetics);

        expect(synthetics.rollOptions.has("trait:fear")).toBe(true);
    });
});
