import { describe, it, expect } from "vitest";
import { mockWeapon } from "../mocks/foundry.ts";

/**
 * Pure logic for weapon damage calculations, mirroring WeaponDH2e.effectiveDamage
 * and WeaponDH2e.effectiveQualities.
 */

interface DamageProfile {
    formula: string;
    type: string;
    bonus: number;
    penetration: number;
}

interface AmmoModifiers {
    damageModifier?: number;
    damageType?: string;
    penetrationModifier?: number;
    qualities?: string[];
}

/**
 * Calculate effective damage including ammo modifications.
 * Mirrors WeaponDH2e.effectiveDamage.
 */
function calcEffectiveDamage(
    base: { formula: string; type: string; bonus: number },
    basePenetration: number,
    ammo?: AmmoModifiers,
): DamageProfile {
    if (!ammo) {
        return {
            formula: base.formula,
            type: base.type,
            bonus: base.bonus,
            penetration: basePenetration,
        };
    }

    return {
        formula: base.formula,
        type: ammo.damageType || base.type,
        bonus: base.bonus + (ammo.damageModifier ?? 0),
        penetration: basePenetration + (ammo.penetrationModifier ?? 0),
    };
}

/**
 * Merge weapon and ammo qualities without duplicates.
 * Mirrors WeaponDH2e.effectiveQualities.
 */
function mergeQualities(weaponQualities: string[], ammoQualities?: string[]): string[] {
    const result = [...weaponQualities];
    if (ammoQualities) {
        for (const q of ammoQualities) {
            if (!result.includes(q)) {
                result.push(q);
            }
        }
    }
    return result;
}

describe("Weapon Damage Calculation", () => {
    describe("base damage (no ammo)", () => {
        it("returns base damage profile unchanged", () => {
            const result = calcEffectiveDamage(
                { formula: "1d10+3", type: "impact", bonus: 3 },
                0,
            );

            expect(result.formula).toBe("1d10+3");
            expect(result.type).toBe("impact");
            expect(result.bonus).toBe(3);
            expect(result.penetration).toBe(0);
        });

        it("preserves non-zero base penetration", () => {
            const result = calcEffectiveDamage(
                { formula: "1d10", type: "energy", bonus: 4 },
                2,
            );

            expect(result.type).toBe("energy");
            expect(result.bonus).toBe(4);
            expect(result.penetration).toBe(2);
        });
    });

    describe("with ammo modifications", () => {
        it("ammo adds damage modifier and penetration modifier", () => {
            const result = calcEffectiveDamage(
                { formula: "1d10+3", type: "impact", bonus: 3 },
                0,
                { damageModifier: 2, penetrationModifier: 3 },
            );

            expect(result.bonus).toBe(5);     // 3 + 2
            expect(result.penetration).toBe(3); // 0 + 3
        });

        it("ammo overrides damage type when provided", () => {
            const result = calcEffectiveDamage(
                { formula: "1d10", type: "impact", bonus: 2 },
                0,
                { damageType: "energy" },
            );

            expect(result.type).toBe("energy");
        });

        it("keeps weapon damage type when ammo type is empty", () => {
            const result = calcEffectiveDamage(
                { formula: "1d10", type: "impact", bonus: 2 },
                0,
                { damageType: "" },
            );

            expect(result.type).toBe("impact");
        });

        it("stacks ammo pen on top of weapon pen", () => {
            const result = calcEffectiveDamage(
                { formula: "1d10", type: "energy", bonus: 0 },
                4,
                { penetrationModifier: 2 },
            );

            expect(result.penetration).toBe(6); // 4 + 2
        });
    });
});

describe("Weapon Quality Merging", () => {
    it("weapon-only qualities pass through unchanged", () => {
        const result = mergeQualities(["Reliable", "Accurate"]);
        expect(result).toEqual(["Reliable", "Accurate"]);
    });

    it("merges ammo qualities with weapon qualities", () => {
        const result = mergeQualities(["Reliable"], ["Tearing"]);
        expect(result).toEqual(["Reliable", "Tearing"]);
    });

    it("no duplicate qualities when both have Reliable", () => {
        const result = mergeQualities(["Reliable"], ["Reliable"]);
        expect(result).toEqual(["Reliable"]);
        expect(result).toHaveLength(1);
    });

    it("no duplicates with multiple overlapping qualities", () => {
        const result = mergeQualities(
            ["Reliable", "Accurate"],
            ["Tearing", "Reliable", "Accurate"],
        );
        expect(result).toEqual(["Reliable", "Accurate", "Tearing"]);
        expect(result).toHaveLength(3);
    });

    it("empty weapon qualities with ammo qualities", () => {
        const result = mergeQualities([], ["Tearing", "Toxic(3)"]);
        expect(result).toEqual(["Tearing", "Toxic(3)"]);
    });

    it("empty ammo qualities changes nothing", () => {
        const result = mergeQualities(["Reliable"], []);
        expect(result).toEqual(["Reliable"]);
    });
});

describe("mockWeapon", () => {
    it("creates a weapon with expected defaults", () => {
        const weapon = mockWeapon();

        expect(weapon.type).toBe("weapon");
        expect(weapon.system.class).toBe("basic");
        expect(weapon.system.damage.formula).toBe("1d10");
        expect(weapon.system.damage.type).toBe("impact");
        expect(weapon.system.damage.bonus).toBe(3);
        expect(weapon.system.penetration).toBe(0);
        expect(weapon.system.qualities).toEqual([]);
    });

    it("creates a weapon with custom damage and qualities", () => {
        const weapon = mockWeapon({
            name: "Bolt Pistol",
            weaponClass: "pistol",
            damage: { formula: "1d10+5", type: "explosive", bonus: 5 },
            penetration: 4,
            qualities: ["Tearing"],
        });

        expect(weapon.name).toBe("Bolt Pistol");
        expect(weapon.system.class).toBe("pistol");
        expect(weapon.system.damage.formula).toBe("1d10+5");
        expect(weapon.system.damage.type).toBe("explosive");
        expect(weapon.system.damage.bonus).toBe(5);
        expect(weapon.system.penetration).toBe(4);
        expect(weapon.system.qualities).toEqual(["Tearing"]);
    });

    it("effectiveDamage mirrors system damage on base weapon", () => {
        const weapon = mockWeapon({
            damage: { formula: "1d10+3", type: "impact", bonus: 3 },
            penetration: 0,
        });

        expect(weapon.effectiveDamage.formula).toBe("1d10+3");
        expect(weapon.effectiveDamage.type).toBe("impact");
        expect(weapon.effectiveDamage.bonus).toBe(3);
        expect(weapon.effectiveDamage.penetration).toBe(0);
    });
});

describe("Combined Weapon + Ammo Scenario", () => {
    it("Autogun with Manstopper rounds", () => {
        // Autogun base: 1d10+3 I, Pen 0, Reliable
        // Manstopper ammo: +3 Pen, no damage modifier
        const baseDamage = { formula: "1d10+3", type: "impact", bonus: 3 };
        const basePen = 0;
        const ammo: AmmoModifiers = { penetrationModifier: 3, qualities: ["Tearing"] };

        const damage = calcEffectiveDamage(baseDamage, basePen, ammo);
        expect(damage.bonus).toBe(3);
        expect(damage.penetration).toBe(3);
        expect(damage.type).toBe("impact");

        const qualities = mergeQualities(["Reliable"], ammo.qualities);
        expect(qualities).toEqual(["Reliable", "Tearing"]);
    });

    it("Lasgun with Overcharge pack", () => {
        // Lasgun base: 1d10+3 E, Pen 0, Reliable
        // Overcharge: +1 damage, +0 pen
        const baseDamage = { formula: "1d10+3", type: "energy", bonus: 3 };
        const basePen = 0;
        const ammo: AmmoModifiers = { damageModifier: 1 };

        const damage = calcEffectiveDamage(baseDamage, basePen, ammo);
        expect(damage.bonus).toBe(4);
        expect(damage.penetration).toBe(0);
        expect(damage.type).toBe("energy");

        const qualities = mergeQualities(["Reliable"], ammo.qualities);
        expect(qualities).toEqual(["Reliable"]);
    });
});
