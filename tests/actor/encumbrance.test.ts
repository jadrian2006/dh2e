import { describe, it, expect } from "vitest";

/**
 * Encumbrance calculation logic (Core Rulebook p.247).
 *
 * Carry = SB + TB (kg, no penalty)
 * Lift  = Carry × 2 (overloaded: -10 Ag, half movement)
 * Push  = Carry × 4
 * Over-encumbered = weight > Lift (cannot move)
 */
function calcEncumbrance(
    sBonus: number,
    tBonus: number,
    items: Array<{ weight: number; quantity: number }>,
) {
    const carry = sBonus + tBonus;
    const lift = carry * 2;
    const push = carry * 4;

    let current = 0;
    for (const item of items) {
        current += item.weight * item.quantity;
    }

    return {
        current,
        carry,
        lift,
        push,
        overloaded: current > carry,
        overencumbered: current > lift,
    };
}

describe("Encumbrance Capacity Calculation", () => {
    it("SB 4, TB 4 → carry 8, lift 16, push 32", () => {
        const enc = calcEncumbrance(4, 4, []);
        expect(enc.carry).toBe(8);
        expect(enc.lift).toBe(16);
        expect(enc.push).toBe(32);
    });

    it("SB 3, TB 3 → carry 6, lift 12, push 24", () => {
        const enc = calcEncumbrance(3, 3, []);
        expect(enc.carry).toBe(6);
        expect(enc.lift).toBe(12);
        expect(enc.push).toBe(24);
    });

    it("SB 5, TB 3 → carry 8, lift 16, push 32", () => {
        const enc = calcEncumbrance(5, 3, []);
        expect(enc.carry).toBe(8);
        expect(enc.lift).toBe(16);
        expect(enc.push).toBe(32);
    });

    it("SB 2, TB 2 → carry 4, lift 8, push 16", () => {
        const enc = calcEncumbrance(2, 2, []);
        expect(enc.carry).toBe(4);
        expect(enc.lift).toBe(8);
        expect(enc.push).toBe(16);
    });
});

describe("Weight Summation", () => {
    it("sums weight × quantity for all items", () => {
        const items = [
            { weight: 3, quantity: 1 },
            { weight: 0.5, quantity: 4 },
            { weight: 1, quantity: 2 },
        ];
        const enc = calcEncumbrance(4, 4, items);
        // 3 + 2 + 2 = 7
        expect(enc.current).toBe(7);
    });

    it("empty inventory → 0 weight", () => {
        const enc = calcEncumbrance(4, 4, []);
        expect(enc.current).toBe(0);
    });

    it("single heavy item", () => {
        const items = [{ weight: 15, quantity: 1 }];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.current).toBe(15);
    });

    it("many lightweight items", () => {
        const items = [
            { weight: 0.1, quantity: 10 },
            { weight: 0.2, quantity: 5 },
        ];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.current).toBeCloseTo(2.0, 5);
    });
});

describe("Overloaded and Over-encumbered Flags", () => {
    it("weight within carry → not overloaded, not over-encumbered", () => {
        // Carry = 8, weight = 5
        const items = [{ weight: 5, quantity: 1 }];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.overloaded).toBe(false);
        expect(enc.overencumbered).toBe(false);
    });

    it("weight exactly at carry → not overloaded", () => {
        // Carry = 8
        const items = [{ weight: 8, quantity: 1 }];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.overloaded).toBe(false);
        expect(enc.overencumbered).toBe(false);
    });

    it("weight above carry but within lift → overloaded, not over-encumbered", () => {
        // Carry = 8, lift = 16, weight = 10
        const items = [{ weight: 10, quantity: 1 }];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.overloaded).toBe(true);
        expect(enc.overencumbered).toBe(false);
    });

    it("weight exactly at lift → overloaded, not over-encumbered", () => {
        // Carry = 8, lift = 16
        const items = [{ weight: 16, quantity: 1 }];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.overloaded).toBe(true);
        expect(enc.overencumbered).toBe(false);
    });

    it("weight above lift → both overloaded and over-encumbered", () => {
        // Carry = 8, lift = 16, weight = 20
        const items = [{ weight: 20, quantity: 1 }];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.overloaded).toBe(true);
        expect(enc.overencumbered).toBe(true);
    });
});

describe("Edge Cases", () => {
    it("zero SB and TB → carry 0, any item overloads", () => {
        const items = [{ weight: 0.1, quantity: 1 }];
        const enc = calcEncumbrance(0, 0, items);
        expect(enc.carry).toBe(0);
        expect(enc.lift).toBe(0);
        expect(enc.overloaded).toBe(true);
        expect(enc.overencumbered).toBe(true);
    });

    it("zero-weight items don't affect encumbrance", () => {
        const items = [{ weight: 0, quantity: 100 }];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.current).toBe(0);
        expect(enc.overloaded).toBe(false);
    });

    it("quantity 0 means item doesn't contribute weight", () => {
        const items = [{ weight: 50, quantity: 0 }];
        const enc = calcEncumbrance(4, 4, items);
        expect(enc.current).toBe(0);
    });
});
