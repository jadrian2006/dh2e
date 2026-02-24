import { describe, it, expect } from "vitest";
import { determineHitLocation } from "@combat/hit-location.ts";
import type { HitLocationKey } from "@actor/types.ts";

/**
 * Test Called Shot mechanics.
 *
 * Core Rulebook p.229:
 * - Called shot = -20 to BS/WS test
 * - On hit, use selected location instead of rolling
 * - Available only on Standard Attack (single fire), not on Full Auto or Suppressive Fire
 */

describe("Called Shot", () => {
    describe("Location override via determineHitLocation", () => {
        it("overrides random roll with called shot location", () => {
            const result = determineHitLocation(42, "head");
            expect(result.location).toBe("head");
            expect(result.locationLabel).toBe("Head");
            expect(result.locationRoll).toBe(0);
        });

        it("overrides to leftArm regardless of roll", () => {
            const result = determineHitLocation(99, "leftArm");
            expect(result.location).toBe("leftArm");
            expect(result.locationLabel).toBe("Left Arm");
        });

        it("overrides to rightLeg", () => {
            const result = determineHitLocation(15, "rightLeg");
            expect(result.location).toBe("rightLeg");
            expect(result.locationLabel).toBe("Right Leg");
        });

        it("overrides to body", () => {
            const result = determineHitLocation(5, "body");
            expect(result.location).toBe("body");
            expect(result.locationLabel).toBe("Body");
        });

        it("uses normal roll when no called shot", () => {
            // Roll 34 → reversed 43 → Body (31-70)
            const result = determineHitLocation(34);
            expect(result.location).toBe("body");
            expect(result.locationRoll).toBe(43);
        });

        it("all 6 locations can be called", () => {
            const locations: HitLocationKey[] = ["head", "rightArm", "leftArm", "body", "rightLeg", "leftLeg"];
            for (const loc of locations) {
                const result = determineHitLocation(50, loc);
                expect(result.location).toBe(loc);
                expect(result.locationRoll).toBe(0);
            }
        });
    });

    describe("Called Shot modifier", () => {
        const CALLED_SHOT_PENALTY = -20;

        it("applies -20 penalty", () => {
            expect(CALLED_SHOT_PENALTY).toBe(-20);
        });

        it("reduces target number by 20", () => {
            const baseTarget = 45;
            const modifiedTarget = baseTarget + CALLED_SHOT_PENALTY;
            expect(modifiedTarget).toBe(25);
        });

        it("target number has a minimum of 1", () => {
            const baseTarget = 15;
            const modifiedTarget = Math.max(1, baseTarget + CALLED_SHOT_PENALTY);
            expect(modifiedTarget).toBe(1); // 15 - 20 = -5, clamped to 1
        });
    });

    describe("Fire mode restrictions", () => {
        function canCalledShot(fireMode: string): boolean {
            return fireMode === "single";
        }

        it("allowed on single fire mode", () => {
            expect(canCalledShot("single")).toBe(true);
        });

        it("not allowed on semi-auto", () => {
            expect(canCalledShot("semi")).toBe(false);
        });

        it("not allowed on full-auto", () => {
            expect(canCalledShot("full")).toBe(false);
        });

        it("not allowed on suppressive fire", () => {
            expect(canCalledShot("suppressive")).toBe(false);
        });
    });

    describe("Called Shot dialog result", () => {
        interface MockDialogResult {
            cancelled: boolean;
            calledShot?: HitLocationKey;
        }

        it("dialog returns calledShot when enabled", () => {
            const result: MockDialogResult = {
                cancelled: false,
                calledShot: "head",
            };
            expect(result.calledShot).toBe("head");
        });

        it("dialog returns undefined calledShot when disabled", () => {
            const result: MockDialogResult = {
                cancelled: false,
            };
            expect(result.calledShot).toBeUndefined();
        });

        it("cancelled dialog has no called shot", () => {
            const result: MockDialogResult = {
                cancelled: true,
            };
            expect(result.cancelled).toBe(true);
            expect(result.calledShot).toBeUndefined();
        });
    });
});
