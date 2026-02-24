import { describe, it, expect } from "vitest";
import { calculateHits } from "@combat/fire-modes.ts";

describe("calculateHits", () => {
    describe("single fire mode", () => {
        it("always returns 1 hit with 0 DoS", () => {
            expect(calculateHits("single", 0, 1)).toBe(1);
        });

        it("always returns 1 hit regardless of high DoS", () => {
            expect(calculateHits("single", 5, 1)).toBe(1);
        });

        it("always returns 1 hit regardless of RoF value", () => {
            expect(calculateHits("single", 3, 10)).toBe(1);
        });
    });

    describe("semi-auto fire mode", () => {
        it("0 DoS → 1 hit (base hit only)", () => {
            expect(calculateHits("semi", 0, 3)).toBe(1);
        });

        it("1 DoS → 1 hit (1 + floor(1/2) = 1)", () => {
            expect(calculateHits("semi", 1, 3)).toBe(1);
        });

        it("2 DoS, RoF 3 → 2 hits (1 + floor(2/2) = 2)", () => {
            expect(calculateHits("semi", 2, 3)).toBe(2);
        });

        it("3 DoS, RoF 3 → 2 hits (1 + floor(3/2) = 2)", () => {
            expect(calculateHits("semi", 3, 3)).toBe(2);
        });

        it("4 DoS, RoF 3 → 3 hits (1 + floor(4/2) = 3, at cap)", () => {
            expect(calculateHits("semi", 4, 3)).toBe(3);
        });

        it("5 DoS, RoF 3 → capped at 3 (1 + floor(5/2) = 3)", () => {
            expect(calculateHits("semi", 5, 3)).toBe(3);
        });

        it("6 DoS, RoF 3 → capped at 3 (1 + floor(6/2) = 4 but capped)", () => {
            expect(calculateHits("semi", 6, 3)).toBe(3);
        });

        it("high DoS with high RoF → uncapped result", () => {
            // 10 DoS, RoF 10 → min(1 + 5, 10) = 6
            expect(calculateHits("semi", 10, 10)).toBe(6);
        });
    });

    describe("full-auto fire mode", () => {
        it("0 DoS → 1 hit (base hit only)", () => {
            expect(calculateHits("full", 0, 6)).toBe(1);
        });

        it("1 DoS, RoF 6 → 2 hits", () => {
            expect(calculateHits("full", 1, 6)).toBe(2);
        });

        it("3 DoS, RoF 6 → 4 hits (1 + 3 = 4)", () => {
            expect(calculateHits("full", 3, 6)).toBe(4);
        });

        it("5 DoS, RoF 6 → 6 hits (1 + 5 = 6, at cap)", () => {
            expect(calculateHits("full", 5, 6)).toBe(6);
        });

        it("8 DoS, RoF 6 → capped at 6 (1 + 8 = 9 but capped)", () => {
            expect(calculateHits("full", 8, 6)).toBe(6);
        });

        it("high DoS with high RoF → full result", () => {
            // 9 DoS, RoF 10 → min(1 + 9, 10) = 10
            expect(calculateHits("full", 9, 10)).toBe(10);
        });
    });

    describe("suppressive fire mode", () => {
        it("always returns 0 (hits rolled separately as 1d5)", () => {
            expect(calculateHits("suppressive", 0, 6)).toBe(0);
        });

        it("returns 0 even with high DoS", () => {
            expect(calculateHits("suppressive", 5, 6)).toBe(0);
        });
    });

    describe("negative DoS (miss)", () => {
        it("single mode with negative DoS → 0 hits", () => {
            expect(calculateHits("single", -1, 1)).toBe(0);
        });

        it("semi mode with negative DoS → 0 hits", () => {
            expect(calculateHits("semi", -3, 3)).toBe(0);
        });

        it("full mode with negative DoS → 0 hits", () => {
            expect(calculateHits("full", -2, 6)).toBe(0);
        });

        it("suppressive mode with negative DoS → 0 hits", () => {
            expect(calculateHits("suppressive", -1, 6)).toBe(0);
        });
    });
});
