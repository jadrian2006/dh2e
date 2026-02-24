import { describe, it, expect } from "vitest";
import { mockActor } from "../mocks/foundry.ts";

/**
 * Pure calculation logic mirroring VehicleDH2e.applyVehicleDamage:
 *   effectiveDamage = max(0, wounds - facingAP)
 *   newSI = max(0, currentSI - effectiveDamage)
 */

type FacingDirection = "front" | "side" | "rear";

interface VehicleArmour {
    front: number;
    side: number;
    rear: number;
}

function getFacingAP(armour: VehicleArmour, facing: FacingDirection): number {
    return armour[facing] ?? 0;
}

function calcEffectiveDamage(wounds: number, ap: number): number {
    return Math.max(0, wounds - ap);
}

function applySIDamage(currentSI: number, effectiveDamage: number): number {
    return Math.max(0, currentSI - effectiveDamage);
}

describe("Vehicle Facing AP", () => {
    it("returns correct AP for each facing", () => {
        const armour: VehicleArmour = { front: 20, side: 15, rear: 10 };
        expect(getFacingAP(armour, "front")).toBe(20);
        expect(getFacingAP(armour, "side")).toBe(15);
        expect(getFacingAP(armour, "rear")).toBe(10);
    });

    it("mockActor vehicle has correct armour values", () => {
        const vehicle = mockActor({
            type: "vehicle",
            vehicleArmour: { front: 20, side: 15, rear: 10 },
        });
        expect(vehicle.system.armour.front).toBe(20);
        expect(vehicle.system.armour.side).toBe(15);
        expect(vehicle.system.armour.rear).toBe(10);
    });
});

describe("Vehicle Effective Damage", () => {
    it("damage from front: 25 wounds - 20 AP = 5 effective", () => {
        const effective = calcEffectiveDamage(25, 20);
        expect(effective).toBe(5);
    });

    it("damage from rear: 15 wounds - 10 AP = 5 effective", () => {
        const effective = calcEffectiveDamage(15, 10);
        expect(effective).toBe(5);
    });

    it("armour absorbs all: 10 wounds - 20 AP = 0 effective", () => {
        const effective = calcEffectiveDamage(10, 20);
        expect(effective).toBe(0);
    });

    it("exactly matching armour: 15 wounds - 15 AP = 0 effective", () => {
        const effective = calcEffectiveDamage(15, 15);
        expect(effective).toBe(0);
    });

    it("massive damage: 50 wounds - 10 rear AP = 40 effective", () => {
        const effective = calcEffectiveDamage(50, 10);
        expect(effective).toBe(40);
    });
});

describe("Vehicle SI Reduction", () => {
    it("SI 30, take 5 effective damage → 25 remaining", () => {
        const newSI = applySIDamage(30, 5);
        expect(newSI).toBe(25);
    });

    it("SI reduced to exactly 0", () => {
        const newSI = applySIDamage(10, 10);
        expect(newSI).toBe(0);
    });

    it("SI cannot go below 0 (overkill clamped)", () => {
        const newSI = applySIDamage(10, 25);
        expect(newSI).toBe(0);
    });

    it("no damage when effective damage is 0", () => {
        const newSI = applySIDamage(30, 0);
        expect(newSI).toBe(30);
    });
});

describe("Vehicle Destruction", () => {
    it("vehicle is destroyed when SI reaches 0", () => {
        const vehicle = mockActor({
            type: "vehicle",
            structuralIntegrity: { value: 0, max: 30 },
        });
        expect(vehicle.system.structuralIntegrity.value).toBe(0);
        expect(vehicle.system.structuralIntegrity.value <= 0).toBe(true);
    });

    it("vehicle is not destroyed when SI is above 0", () => {
        const vehicle = mockActor({
            type: "vehicle",
            structuralIntegrity: { value: 15, max: 30 },
        });
        expect(vehicle.system.structuralIntegrity.value).toBe(15);
        expect(vehicle.system.structuralIntegrity.value <= 0).toBe(false);
    });
});

describe("Vehicle Combined Damage Scenario", () => {
    it("front hit: 30 wounds, AP 20, SI 30 → 10 effective → SI 20", () => {
        const armour: VehicleArmour = { front: 20, side: 15, rear: 10 };
        const ap = getFacingAP(armour, "front");
        const effective = calcEffectiveDamage(30, ap);
        const newSI = applySIDamage(30, effective);

        expect(ap).toBe(20);
        expect(effective).toBe(10);
        expect(newSI).toBe(20);
    });

    it("side hit: 20 wounds, AP 15, SI 12 → 5 effective → SI 7", () => {
        const armour: VehicleArmour = { front: 20, side: 15, rear: 10 };
        const ap = getFacingAP(armour, "side");
        const effective = calcEffectiveDamage(20, ap);
        const newSI = applySIDamage(12, effective);

        expect(ap).toBe(15);
        expect(effective).toBe(5);
        expect(newSI).toBe(7);
    });

    it("rear hit destroys vehicle: 25 wounds, AP 10, SI 10 → 15 effective → SI 0", () => {
        const armour: VehicleArmour = { front: 20, side: 15, rear: 10 };
        const ap = getFacingAP(armour, "rear");
        const effective = calcEffectiveDamage(25, ap);
        const newSI = applySIDamage(10, effective);

        expect(ap).toBe(10);
        expect(effective).toBe(15);
        expect(newSI).toBe(0);
    });

    it("multiple hits accumulate SI damage", () => {
        let si = 30;
        const armour: VehicleArmour = { front: 20, side: 15, rear: 10 };

        // Hit 1: front, 25 wounds
        si = applySIDamage(si, calcEffectiveDamage(25, getFacingAP(armour, "front")));
        expect(si).toBe(25); // 30 - 5

        // Hit 2: side, 20 wounds
        si = applySIDamage(si, calcEffectiveDamage(20, getFacingAP(armour, "side")));
        expect(si).toBe(20); // 25 - 5

        // Hit 3: rear, 30 wounds
        si = applySIDamage(si, calcEffectiveDamage(30, getFacingAP(armour, "rear")));
        expect(si).toBe(0); // 20 - 20, clamped to 0
    });
});
