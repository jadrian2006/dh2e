import { describe, it, expect } from "vitest";
import { reverseDigits } from "@util/dice.ts";
import { determineHitLocation } from "@combat/hit-location.ts";

describe("reverseDigits", () => {
    it("reverses 34 → 43", () => {
        expect(reverseDigits(34)).toBe(43);
    });

    it("reverses 70 → 7", () => {
        expect(reverseDigits(70)).toBe(7);
    });

    it("reverses 5 → 50", () => {
        expect(reverseDigits(5)).toBe(50);
    });

    it("reverses 100 → 0 (tens=0, ones=0)", () => {
        // 100: Math.floor(100/10)%10 = 0, 100%10 = 0 → 0*10+0 = 0
        expect(reverseDigits(100)).toBe(0);
    });

    it("reverses 11 → 11 (palindrome)", () => {
        expect(reverseDigits(11)).toBe(11);
    });

    it("reverses 99 → 99 (palindrome)", () => {
        expect(reverseDigits(99)).toBe(99);
    });

    it("reverses 10 → 1", () => {
        expect(reverseDigits(10)).toBe(1);
    });

    it("reverses 1 → 10", () => {
        expect(reverseDigits(1)).toBe(10);
    });
});

describe("determineHitLocation", () => {
    describe("standard location lookup via reversed roll", () => {
        it("roll 34 → reversed 43 → Body (31-70)", () => {
            const result = determineHitLocation(34);
            expect(result.location).toBe("body");
            expect(result.locationLabel).toBe("Body");
            expect(result.locationRoll).toBe(43);
        });

        it("roll 10 → reversed 1 → Head (1-10)", () => {
            const result = determineHitLocation(10);
            expect(result.location).toBe("head");
            expect(result.locationLabel).toBe("Head");
            expect(result.locationRoll).toBe(1);
        });

        it("roll 15 → reversed 51 → Body (31-70)", () => {
            const result = determineHitLocation(15);
            expect(result.location).toBe("body");
            expect(result.locationLabel).toBe("Body");
            expect(result.locationRoll).toBe(51);
        });

        it("roll 73 → reversed 37 → Body (31-70)", () => {
            const result = determineHitLocation(73);
            expect(result.location).toBe("body");
            expect(result.locationLabel).toBe("Body");
            expect(result.locationRoll).toBe(37);
        });

        it("roll 78 → reversed 87 → Left Leg (86-100)", () => {
            const result = determineHitLocation(78);
            expect(result.location).toBe("leftLeg");
            expect(result.locationLabel).toBe("Left Leg");
            expect(result.locationRoll).toBe(87);
        });

        it("roll 2 → reversed 20 → Right Arm (11-20)", () => {
            const result = determineHitLocation(2);
            expect(result.location).toBe("rightArm");
            expect(result.locationLabel).toBe("Right Arm");
            expect(result.locationRoll).toBe(20);
        });

        it("roll 3 → reversed 30 → Left Arm (21-30)", () => {
            const result = determineHitLocation(3);
            expect(result.location).toBe("leftArm");
            expect(result.locationLabel).toBe("Left Arm");
            expect(result.locationRoll).toBe(30);
        });

        it("roll 58 → reversed 85 → Right Leg (71-85)", () => {
            const result = determineHitLocation(58);
            expect(result.location).toBe("rightLeg");
            expect(result.locationLabel).toBe("Right Leg");
            expect(result.locationRoll).toBe(85);
        });
    });

    describe("edge case: roll 100 → reversed 0 → fallback to Body", () => {
        it("falls back to body when reversed value is outside all ranges", () => {
            const result = determineHitLocation(100);
            // reversed = 0, which is below the min of 1 for head
            expect(result.location).toBe("body");
            expect(result.locationLabel).toBe("Body");
            expect(result.locationRoll).toBe(0);
        });
    });

    describe("called shot override", () => {
        it("called shot to head overrides location regardless of roll", () => {
            const result = determineHitLocation(50, "head");
            expect(result.location).toBe("head");
            expect(result.locationLabel).toBe("Head");
            expect(result.locationRoll).toBe(0);
        });

        it("called shot to leftArm overrides with correct label", () => {
            const result = determineHitLocation(99, "leftArm");
            expect(result.location).toBe("leftArm");
            expect(result.locationLabel).toBe("Left Arm");
            expect(result.locationRoll).toBe(0);
        });

        it("called shot to rightLeg overrides with correct label", () => {
            const result = determineHitLocation(12, "rightLeg");
            expect(result.location).toBe("rightLeg");
            expect(result.locationLabel).toBe("Right Leg");
            expect(result.locationRoll).toBe(0);
        });
    });
});
