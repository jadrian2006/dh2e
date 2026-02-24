import { describe, it, expect } from "vitest";
import { calculateDoS } from "@util/degree-of-success.ts";

describe("calculateDoS", () => {
    describe("basic success and failure", () => {
        it("basic success: roll 35 vs target 45 → success with 2 DoS", () => {
            const result = calculateDoS(35, 45);
            expect(result.success).toBe(true);
            expect(result.degrees).toBe(2);
            expect(result.roll).toBe(35);
            expect(result.target).toBe(45);
        });

        it("basic failure: roll 67 vs target 45 → failure with 3 DoF", () => {
            const result = calculateDoS(67, 45);
            expect(result.success).toBe(false);
            expect(result.degrees).toBe(3);
            expect(result.roll).toBe(67);
            expect(result.target).toBe(45);
        });

        it("exact target: roll 45 vs target 45 → success with 1 DoS", () => {
            const result = calculateDoS(45, 45);
            expect(result.success).toBe(true);
            expect(result.degrees).toBe(1);
        });

        it("one over: roll 46 vs target 45 → failure with 1 DoF", () => {
            const result = calculateDoS(46, 45);
            expect(result.success).toBe(false);
            expect(result.degrees).toBe(1);
        });
    });

    describe("natural 1 (auto-success)", () => {
        it("always succeeds with at least 1 DoS", () => {
            const result = calculateDoS(1, 50);
            expect(result.success).toBe(true);
            expect(result.degrees).toBeGreaterThanOrEqual(1);
        });

        it("roll 1 vs low target 5 → success with 1 DoS", () => {
            const result = calculateDoS(1, 5);
            expect(result.success).toBe(true);
            expect(result.degrees).toBe(1);
        });

        it("roll 1 vs target 0 → success (natural 1 rule overrides)", () => {
            const result = calculateDoS(1, 0);
            expect(result.success).toBe(true);
            expect(result.degrees).toBeGreaterThanOrEqual(1);
        });
    });

    describe("natural 100 (auto-failure)", () => {
        it("always fails with at least 1 DoF", () => {
            const result = calculateDoS(100, 90);
            expect(result.success).toBe(false);
            expect(result.degrees).toBeGreaterThanOrEqual(1);
        });

        it("roll 100 vs target 100 → failure", () => {
            const result = calculateDoS(100, 100);
            expect(result.success).toBe(false);
            expect(result.degrees).toBeGreaterThanOrEqual(1);
        });

        it("roll 100 vs target 99 → failure with at least 1 DoF", () => {
            const result = calculateDoS(100, 99);
            expect(result.success).toBe(false);
            expect(result.degrees).toBeGreaterThanOrEqual(1);
        });
    });

    describe("extreme degree ranges", () => {
        it("high DoS: roll 01 vs target 99 → success with 10 DoS", () => {
            // 1 + floor(99/10) - floor(1/10) = 1 + 9 - 0 = 10
            const result = calculateDoS(1, 99);
            expect(result.success).toBe(true);
            expect(result.degrees).toBe(10);
        });

        it("high DoF: roll 99 vs target 10 → failure with 9 DoF", () => {
            // 1 + floor(99/10) - floor(10/10) = 1 + 9 - 1 = 9
            const result = calculateDoS(99, 10);
            expect(result.success).toBe(false);
            expect(result.degrees).toBe(9);
        });

        it("maximum DoF: roll 99 vs target 01 → failure with 10 DoF", () => {
            // 1 + floor(99/10) - floor(1/10) = 1 + 9 - 0 = 10
            const result = calculateDoS(99, 1);
            expect(result.success).toBe(false);
            expect(result.degrees).toBe(10);
        });
    });

    describe("target 0 edge case", () => {
        it("roll 2 vs target 0 → failure", () => {
            const result = calculateDoS(2, 0);
            expect(result.success).toBe(false);
        });
    });
});
