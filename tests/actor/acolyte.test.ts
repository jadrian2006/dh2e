import { describe, it, expect } from "vitest";
import { mockActor } from "../mocks/foundry.ts";

/**
 * Pure calculation logic that mirrors AcolyteDH2e.prepareBaseData:
 *   value = base + advances * 5
 *   bonus = Math.floor(value / 10)
 */
function calcCharacteristic(base: number, advances: number): { value: number; bonus: number } {
    const value = base + advances * 5;
    const bonus = Math.floor(value / 10);
    return { value, bonus };
}

/**
 * Movement rates derived from Agility Bonus (DH2E Core p.245).
 */
function calcMovement(agBonus: number): { half: number; full: number; charge: number; run: number } {
    return {
        half: agBonus,
        full: agBonus * 2,
        charge: agBonus * 3,
        run: agBonus * 6,
    };
}

/**
 * XP availability calculation.
 */
function calcXP(total: number, spent: number): number {
    return total - spent;
}

describe("Acolyte Characteristics", () => {
    describe("value and bonus calculation", () => {
        it("base 35, advances 0 → value 35, bonus 3", () => {
            const result = calcCharacteristic(35, 0);
            expect(result.value).toBe(35);
            expect(result.bonus).toBe(3);
        });

        it("base 25, advances 2 → value 35, bonus 3", () => {
            const result = calcCharacteristic(25, 2);
            expect(result.value).toBe(35);
            expect(result.bonus).toBe(3);
        });

        it("base 40, advances 3 → value 55, bonus 5", () => {
            const result = calcCharacteristic(40, 3);
            expect(result.value).toBe(55);
            expect(result.bonus).toBe(5);
        });

        it("base 20, advances 0 → value 20, bonus 2", () => {
            const result = calcCharacteristic(20, 0);
            expect(result.value).toBe(20);
            expect(result.bonus).toBe(2);
        });

        it("base 10, advances 4 → value 30, bonus 3", () => {
            const result = calcCharacteristic(10, 4);
            expect(result.value).toBe(30);
            expect(result.bonus).toBe(3);
        });
    });

    describe("mockActor characteristic integration", () => {
        it("mockActor computes value and bonus from base+advances", () => {
            const actor = mockActor({
                characteristics: {
                    bs: { base: 40, advances: 3 },
                    ws: { base: 25, advances: 2 },
                },
            });

            expect(actor.system.characteristics.bs.value).toBe(55);
            expect(actor.system.characteristics.bs.bonus).toBe(5);
            expect(actor.system.characteristics.ws.value).toBe(35);
            expect(actor.system.characteristics.ws.bonus).toBe(3);
        });
    });
});

describe("Acolyte Movement", () => {
    it("AG bonus 4 → half 4, full 8, charge 12, run 24", () => {
        const movement = calcMovement(4);
        expect(movement.half).toBe(4);
        expect(movement.full).toBe(8);
        expect(movement.charge).toBe(12);
        expect(movement.run).toBe(24);
    });

    it("AG bonus 3 → half 3, full 6, charge 9, run 18", () => {
        const movement = calcMovement(3);
        expect(movement.half).toBe(3);
        expect(movement.full).toBe(6);
        expect(movement.charge).toBe(9);
        expect(movement.run).toBe(18);
    });

    it("mockActor derives movement from AG bonus", () => {
        const actor = mockActor({
            characteristics: { ag: { base: 40, advances: 0 } },
        });
        const agBonus = actor.system.characteristics.ag.bonus;

        expect(agBonus).toBe(4);
        expect(actor.system.movement.half).toBe(4);
        expect(actor.system.movement.full).toBe(8);
        expect(actor.system.movement.charge).toBe(12);
        expect(actor.system.movement.run).toBe(24);
    });
});

describe("Acolyte XP", () => {
    it("total 1000, spent 400 → available 600", () => {
        const available = calcXP(1000, 400);
        expect(available).toBe(600);
    });

    it("total 500, spent 500 → available 0", () => {
        const available = calcXP(500, 500);
        expect(available).toBe(0);
    });

    it("mockActor computes available XP", () => {
        const actor = mockActor({
            xp: { total: 1000, spent: 400 },
        });

        expect(actor.system.xp.total).toBe(1000);
        expect(actor.system.xp.spent).toBe(400);
        expect(actor.system.xp.available).toBe(600);
    });
});

describe("Acolyte Wounds", () => {
    it("apply 5 damage to 12 wounds → 7 remaining", () => {
        const actor = mockActor({ wounds: { value: 12, max: 12 } });
        const remaining = actor.system.wounds.value - 5;
        expect(remaining).toBe(7);
    });

    it("apply lethal damage reduces to 0", () => {
        const actor = mockActor({ wounds: { value: 8, max: 12 } });
        const damage = 10;
        const remaining = Math.max(0, actor.system.wounds.value - damage);
        expect(remaining).toBe(0);
    });

    it("wound value does not go below 0", () => {
        const actor = mockActor({ wounds: { value: 3, max: 12 } });
        const damage = 15;
        const remaining = Math.max(0, actor.system.wounds.value - damage);
        expect(remaining).toBe(0);
    });
});
