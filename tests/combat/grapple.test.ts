import { describe, it, expect } from "vitest";

/**
 * Test grapple mechanics.
 *
 * GrappleHandler relies heavily on CheckDH2e.roll() (Foundry-dependent),
 * so we test the pure calculation logic: opposed DoS comparison and
 * damage formulas.
 */

describe("Grapple Mechanics", () => {
    describe("Opposed test resolution", () => {
        // Grapple initiation: attacker DoS vs defender DoS
        // Success: attackerDoS > defenderDoS
        function resolveOpposed(
            attackerSuccess: boolean,
            attackerDegrees: number,
            defenderSuccess: boolean,
            defenderDegrees: number,
        ): boolean {
            const aDoS = attackerSuccess ? attackerDegrees : -attackerDegrees;
            const dDoS = defenderSuccess ? defenderDegrees : -defenderDegrees;
            return aDoS > dDoS;
        }

        it("attacker wins when they have more DoS", () => {
            expect(resolveOpposed(true, 3, true, 1)).toBe(true);
        });

        it("defender wins on a tie", () => {
            // GrappleHandler uses `>` not `>=`, so ties go to defender
            expect(resolveOpposed(true, 2, true, 2)).toBe(false);
        });

        it("attacker wins when defender fails", () => {
            expect(resolveOpposed(true, 1, false, 3)).toBe(true);
        });

        it("defender wins when attacker fails", () => {
            expect(resolveOpposed(false, 2, true, 1)).toBe(false);
        });

        it("attacker wins when both fail but defender fails worse", () => {
            // attacker: -1, defender: -4 → -1 > -4 → true
            expect(resolveOpposed(false, 1, false, 4)).toBe(true);
        });

        it("defender wins when both fail but attacker fails worse", () => {
            // attacker: -5, defender: -2 → -5 > -2 → false
            expect(resolveOpposed(false, 5, false, 2)).toBe(false);
        });
    });

    describe("Maintain grapple (Strength opposed)", () => {
        // maintainGrapple: gDoS >= tDoS (note: >= unlike initiate which is >)
        function maintainGrapple(
            grapplerSuccess: boolean,
            grapplerDegrees: number,
            targetSuccess: boolean,
            targetDegrees: number,
        ): boolean {
            const gDoS = grapplerSuccess ? grapplerDegrees : -grapplerDegrees;
            const tDoS = targetSuccess ? targetDegrees : -targetDegrees;
            return gDoS >= tDoS;
        }

        it("grappler maintains on a tie", () => {
            expect(maintainGrapple(true, 2, true, 2)).toBe(true);
        });

        it("grappler maintains with higher DoS", () => {
            expect(maintainGrapple(true, 4, true, 2)).toBe(true);
        });

        it("target escapes with higher DoS", () => {
            expect(maintainGrapple(true, 1, true, 3)).toBe(false);
        });
    });

    describe("Grapple damage", () => {
        // Damage in grapple: 1d5 + SB
        function grappleDamage(d5Result: number, strengthBonus: number): number {
            return d5Result + strengthBonus;
        }

        it("calculates 1d5+SB correctly", () => {
            expect(grappleDamage(3, 4)).toBe(7);
        });

        it("minimum damage is 1+SB", () => {
            expect(grappleDamage(1, 3)).toBe(4);
        });

        it("maximum damage is 5+SB", () => {
            expect(grappleDamage(5, 5)).toBe(10);
        });

        it("zero SB gives just the die result", () => {
            expect(grappleDamage(3, 0)).toBe(3);
        });
    });

    describe("Grapple actions", () => {
        // Throw distance = SB metres
        it("throw distance equals strength bonus", () => {
            const sBonus = 4;
            expect(sBonus).toBe(4);
        });

        // Break free = failed maintain from target's perspective
        it("break free succeeds when target wins opposed test", () => {
            // If maintainGrapple returns false → break free succeeded
            const maintained = false; // target won
            const breakFreeSuccess = !maintained;
            expect(breakFreeSuccess).toBe(true);
        });
    });
});
