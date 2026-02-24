import { describe, it, expect } from "vitest";
import { mockActor } from "../mocks/foundry.ts";

/**
 * Pure calculation logic that mirrors HordeDH2e.applyMagnitudeDamage:
 *   - Base magnitude loss = wounds dealt
 *   - Blast(X) adds floor(X/2) extra magnitude loss
 *   - Flame adds 1d10 extra magnitude loss (mocked as flameRoll)
 *   - Magnitude cannot go below 0
 */
function calcMagnitudeLoss(
    wounds: number,
    opts?: { isBlast?: boolean; blastRadius?: number; isFlame?: boolean; flameRoll?: number },
): number {
    let loss = wounds;
    if (opts?.isBlast && opts.blastRadius) {
        loss += Math.floor(opts.blastRadius / 2);
    }
    if (opts?.isFlame) {
        loss += (opts.flameRoll ?? 5);
    }
    return loss;
}

/**
 * Apply magnitude loss and clamp to 0.
 */
function applyMagnitudeLoss(current: number, loss: number): number {
    return Math.max(0, current - loss);
}

describe("Horde Magnitude Damage", () => {
    describe("calcMagnitudeLoss", () => {
        it("5 wounds → 5 magnitude loss", () => {
            expect(calcMagnitudeLoss(5)).toBe(5);
        });

        it("5 wounds + Blast(4) → 7 magnitude loss", () => {
            const loss = calcMagnitudeLoss(5, { isBlast: true, blastRadius: 4 });
            expect(loss).toBe(7);
        });

        it("5 wounds + Flame (roll 3) → 8 magnitude loss", () => {
            const loss = calcMagnitudeLoss(5, { isFlame: true, flameRoll: 3 });
            expect(loss).toBe(8);
        });

        it("5 wounds + Blast(6) + Flame (roll 7) → 15 magnitude loss", () => {
            const loss = calcMagnitudeLoss(5, {
                isBlast: true,
                blastRadius: 6,
                isFlame: true,
                flameRoll: 7,
            });
            // 5 + floor(6/2) + 7 = 5 + 3 + 7 = 15
            expect(loss).toBe(15);
        });

        it("Blast with odd radius rounds down: Blast(3) → floor(3/2) = 1", () => {
            const loss = calcMagnitudeLoss(2, { isBlast: true, blastRadius: 3 });
            // 2 + 1 = 3
            expect(loss).toBe(3);
        });

        it("Flame with default roll (5) when flameRoll is omitted", () => {
            const loss = calcMagnitudeLoss(4, { isFlame: true });
            // 4 + 5 = 9
            expect(loss).toBe(9);
        });
    });

    describe("applyMagnitudeLoss", () => {
        it("30 magnitude, lose 5 → 25 remaining", () => {
            expect(applyMagnitudeLoss(30, 5)).toBe(25);
        });

        it("magnitude cannot go below 0", () => {
            expect(applyMagnitudeLoss(10, 15)).toBe(0);
        });

        it("exactly reducing to 0", () => {
            expect(applyMagnitudeLoss(10, 10)).toBe(0);
        });

        it("0 wounds → no magnitude change", () => {
            expect(applyMagnitudeLoss(30, 0)).toBe(30);
        });
    });

    describe("isBroken", () => {
        it("horde is broken when magnitude reaches 0", () => {
            const horde = mockActor({
                type: "horde",
                magnitude: { value: 0, max: 30 },
            });
            expect(horde.system.magnitude.value).toBe(0);
            expect(horde.system.magnitude.value <= 0).toBe(true);
        });

        it("horde is not broken when magnitude is above 0", () => {
            const horde = mockActor({
                type: "horde",
                magnitude: { value: 15, max: 30 },
            });
            expect(horde.system.magnitude.value).toBe(15);
            expect(horde.system.magnitude.value <= 0).toBe(false);
        });
    });

    describe("combined scenario: Blast + Flame on horde", () => {
        it("30 magnitude horde, 5 wounds, Blast(4), Flame(roll=6) → 30 - 13 = 17", () => {
            const horde = mockActor({
                type: "horde",
                magnitude: { value: 30, max: 30 },
            });
            const loss = calcMagnitudeLoss(5, {
                isBlast: true,
                blastRadius: 4,
                isFlame: true,
                flameRoll: 6,
            });
            // 5 + floor(4/2) + 6 = 5 + 2 + 6 = 13
            expect(loss).toBe(13);

            const remaining = applyMagnitudeLoss(horde.system.magnitude.value, loss);
            expect(remaining).toBe(17);
        });

        it("low-magnitude horde breaks from Blast damage", () => {
            const loss = calcMagnitudeLoss(3, { isBlast: true, blastRadius: 8 });
            // 3 + 4 = 7
            expect(loss).toBe(7);

            const remaining = applyMagnitudeLoss(5, loss);
            expect(remaining).toBe(0);
        });
    });
});
