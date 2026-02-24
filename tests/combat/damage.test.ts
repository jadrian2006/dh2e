import { describe, it, expect } from "vitest";
import { calculateDamage } from "@combat/damage.ts";

describe("calculateDamage", () => {
    describe("basic damage calculation", () => {
        it("standard hit: rawDamage 10, AP 3, pen 0, TB 3 → 4 wounds", () => {
            const result = calculateDamage(10, 3, 0, 3, "body", "1d10+3");
            expect(result.effectiveAP).toBe(3);
            expect(result.toughnessBonus).toBe(3);
            expect(result.woundsDealt).toBe(4);
            expect(result.rawDamage).toBe(10);
            expect(result.armourPoints).toBe(3);
            expect(result.penetration).toBe(0);
            expect(result.formula).toBe("1d10+3");
            expect(result.location).toBe("body");
            expect(result.locationLabel).toBe("Body");
        });

        it("head hit has correct label", () => {
            const result = calculateDamage(8, 2, 0, 3, "head", "1d10");
            expect(result.locationLabel).toBe("Head");
        });

        it("leftArm hit has correct label", () => {
            const result = calculateDamage(8, 2, 0, 3, "leftArm", "1d10");
            expect(result.locationLabel).toBe("Left Arm");
        });
    });

    describe("penetration mechanics", () => {
        it("penetration > AP: rawDamage 10, AP 3, pen 5 → effectiveAP 0, wounds 7", () => {
            const result = calculateDamage(10, 3, 5, 3, "body", "1d10+3");
            expect(result.effectiveAP).toBe(0);
            expect(result.woundsDealt).toBe(7);
        });

        it("penetration = AP: effectiveAP becomes 0", () => {
            const result = calculateDamage(10, 4, 4, 3, "body", "1d10+3");
            expect(result.effectiveAP).toBe(0);
            expect(result.woundsDealt).toBe(7);
        });

        it("penetration < AP: partial reduction", () => {
            const result = calculateDamage(10, 5, 2, 3, "body", "1d10+3");
            expect(result.effectiveAP).toBe(3);
            expect(result.woundsDealt).toBe(4);
        });

        it("AP cannot go negative from penetration", () => {
            const result = calculateDamage(10, 2, 10, 3, "body", "1d10+3");
            expect(result.effectiveAP).toBe(0);
            expect(result.woundsDealt).toBe(7);
        });
    });

    describe("zero and minimal damage", () => {
        it("zero raw damage → 0 wounds", () => {
            const result = calculateDamage(0, 3, 0, 3, "body", "0");
            expect(result.woundsDealt).toBe(0);
        });

        it("damage completely absorbed by AP + TB → 0 wounds (clamped)", () => {
            const result = calculateDamage(1, 5, 0, 3, "body", "1d10");
            expect(result.woundsDealt).toBe(0);
        });

        it("damage equals AP + TB exactly → 0 wounds", () => {
            const result = calculateDamage(6, 3, 0, 3, "body", "1d10");
            expect(result.woundsDealt).toBe(0);
        });

        it("damage one above AP + TB → 1 wound", () => {
            const result = calculateDamage(7, 3, 0, 3, "body", "1d10");
            expect(result.woundsDealt).toBe(1);
        });
    });

    describe("toughness adjustments", () => {
        it("add mode: TB 3 + add 2 → effective TB 5", () => {
            const result = calculateDamage(15, 0, 0, 3, "body", "2d10", {
                toughnessAdjustments: [{ value: 2, mode: "add", source: "talent" }],
            });
            expect(result.toughnessBonus).toBe(5);
            expect(result.woundsDealt).toBe(10); // 15 - 0 - 5
        });

        it("multiply mode: TB 3 * 2 → effective TB 6", () => {
            const result = calculateDamage(15, 0, 0, 3, "body", "2d10", {
                toughnessAdjustments: [{ value: 2, mode: "multiply", source: "trait" }],
            });
            expect(result.toughnessBonus).toBe(6);
            expect(result.woundsDealt).toBe(9); // 15 - 0 - 6
        });

        it("multiple adjustments applied sequentially", () => {
            // TB 3, add 2 → 5, then multiply 2 → 10
            const result = calculateDamage(20, 0, 0, 3, "body", "3d10", {
                toughnessAdjustments: [
                    { value: 2, mode: "add", source: "talent" },
                    { value: 2, mode: "multiply", source: "trait" },
                ],
            });
            expect(result.toughnessBonus).toBe(10);
            expect(result.woundsDealt).toBe(10); // 20 - 0 - 10
        });

        it("multiply with fractional result floors down", () => {
            // TB 3 * 1.5 → floor(4.5) = 4
            const result = calculateDamage(10, 0, 0, 3, "body", "1d10", {
                toughnessAdjustments: [{ value: 1.5, mode: "multiply", source: "trait" }],
            });
            expect(result.toughnessBonus).toBe(4);
            expect(result.woundsDealt).toBe(6); // 10 - 0 - 4
        });
    });

    describe("damage resistances", () => {
        it("flat resistance: energy resist 2, 10 energy damage → 8 before AP/TB", () => {
            const result = calculateDamage(10, 0, 0, 0, "body", "1d10+3", {
                damageType: "energy",
                resistances: [{ damageType: "energy", value: 2, mode: "flat", source: "trait" }],
            });
            // totalDamage = 10 - 2 = 8, wounds = max(0, 8 - 0 - 0) = 8
            expect(result.woundsDealt).toBe(8);
        });

        it("half resistance: impact half, 10 impact damage → 5 before AP/TB", () => {
            const result = calculateDamage(10, 0, 0, 0, "body", "1d10+3", {
                damageType: "impact",
                resistances: [{ damageType: "impact", value: 0, mode: "half", source: "trait" }],
            });
            // totalDamage = floor(10 / 2) = 5, wounds = max(0, 5 - 0 - 0) = 5
            expect(result.woundsDealt).toBe(5);
        });

        it("wrong damage type: energy resist but impact damage → no reduction", () => {
            const result = calculateDamage(10, 0, 0, 0, "body", "1d10+3", {
                damageType: "impact",
                resistances: [{ damageType: "energy", value: 3, mode: "flat", source: "trait" }],
            });
            expect(result.woundsDealt).toBe(10);
        });

        it("'all' damage type resistance applies to any damage type", () => {
            const result = calculateDamage(10, 0, 0, 0, "body", "1d10+3", {
                damageType: "rending",
                resistances: [{ damageType: "all", value: 3, mode: "flat", source: "trait" }],
            });
            expect(result.woundsDealt).toBe(7);
        });

        it("resistance cannot reduce total damage below 0", () => {
            const result = calculateDamage(2, 0, 0, 0, "body", "1d10", {
                damageType: "energy",
                resistances: [{ damageType: "energy", value: 10, mode: "flat", source: "trait" }],
            });
            // totalDamage = max(0, 2 - 10) = 0, wounds = max(0, 0 - 0 - 0) = 0
            expect(result.woundsDealt).toBe(0);
        });

        it("resistance + AP + TB combined", () => {
            const result = calculateDamage(15, 3, 1, 3, "body", "2d10", {
                damageType: "energy",
                resistances: [{ damageType: "energy", value: 2, mode: "flat", source: "trait" }],
            });
            // totalDamage = 15 - 2 = 13
            // effectiveAP = max(0, 3 - 1) = 2
            // wounds = max(0, 13 - 2 - 3) = 8
            expect(result.effectiveAP).toBe(2);
            expect(result.woundsDealt).toBe(8);
        });
    });

    describe("no options provided", () => {
        it("works correctly without optional options parameter", () => {
            const result = calculateDamage(10, 2, 1, 3, "rightArm", "1d10+3");
            // effectiveAP = max(0, 2-1) = 1
            // wounds = max(0, 10 - 1 - 3) = 6
            expect(result.effectiveAP).toBe(1);
            expect(result.toughnessBonus).toBe(3);
            expect(result.woundsDealt).toBe(6);
            expect(result.locationLabel).toBe("Right Arm");
        });
    });
});
