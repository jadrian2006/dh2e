import { describe, it, expect } from "vitest";

/**
 * Test condition → token status effect synchronization.
 *
 * The actual sync uses Foundry's token.toggleActiveEffect() which we
 * can't test without Foundry. Instead we test the mapping logic and
 * the status effects configuration.
 */

describe("Status Effects Configuration", () => {
    // Inline the status effects data for testing without importing the module
    // (which depends on Foundry globals in the icon paths)
    const STATUS_EFFECTS = [
        { id: "stunned", label: "DH2E.Condition.Status.Stunned", icon: "systems/dh2e/icons/conditions/stunned.svg" },
        { id: "prone", label: "DH2E.Condition.Status.Prone", icon: "systems/dh2e/icons/conditions/prone.svg" },
        { id: "blinded", label: "DH2E.Condition.Status.Blinded", icon: "systems/dh2e/icons/conditions/blinded.svg" },
        { id: "deafened", label: "DH2E.Condition.Status.Deafened", icon: "systems/dh2e/icons/conditions/deafened.svg" },
        { id: "on-fire", label: "DH2E.Condition.Status.OnFire", icon: "systems/dh2e/icons/conditions/on-fire.svg" },
        { id: "bleeding", label: "DH2E.Condition.Status.Bleeding", icon: "systems/dh2e/icons/conditions/bleeding.svg" },
        { id: "pinned", label: "DH2E.Condition.Status.Pinned", icon: "systems/dh2e/icons/conditions/pinned.svg" },
        { id: "fatigued", label: "DH2E.Condition.Status.Fatigued", icon: "systems/dh2e/icons/conditions/fatigued.svg" },
        { id: "crippled", label: "DH2E.Condition.Status.Crippled", icon: "systems/dh2e/icons/conditions/crippled.svg" },
        { id: "unconscious", label: "DH2E.Condition.Status.Unconscious", icon: "systems/dh2e/icons/conditions/unconscious.svg" },
        { id: "helpless", label: "DH2E.Condition.Status.Helpless", icon: "systems/dh2e/icons/conditions/helpless.svg" },
        { id: "grappled", label: "DH2E.Condition.Status.Grappled", icon: "systems/dh2e/icons/conditions/grappled.svg" },
        { id: "immobilized", label: "DH2E.Condition.Status.Immobilized", icon: "systems/dh2e/icons/conditions/immobilized.svg" },
        { id: "toxic", label: "DH2E.Condition.Status.Toxic", icon: "systems/dh2e/icons/conditions/toxic.svg" },
        { id: "feared", label: "DH2E.Condition.Status.Feared", icon: "systems/dh2e/icons/conditions/feared.svg" },
    ];

    it("has 15 status effects defined", () => {
        expect(STATUS_EFFECTS).toHaveLength(15);
    });

    it("all effects have unique ids", () => {
        const ids = STATUS_EFFECTS.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("all effects have i18n label keys", () => {
        for (const effect of STATUS_EFFECTS) {
            expect(effect.label).toMatch(/^DH2E\.Condition\.Status\./);
        }
    });

    it("all effects have SVG icon paths", () => {
        for (const effect of STATUS_EFFECTS) {
            expect(effect.icon).toMatch(/^systems\/dh2e\/icons\/conditions\/.+\.svg$/);
        }
    });

    it("icon filenames match effect ids", () => {
        for (const effect of STATUS_EFFECTS) {
            const filename = effect.icon.split("/").pop()?.replace(".svg", "");
            expect(filename).toBe(effect.id);
        }
    });
});

describe("Condition → Status Effect Mapping", () => {
    const STATUS_EFFECTS = [
        { id: "stunned", label: "Stunned", icon: "stunned.svg" },
        { id: "prone", label: "Prone", icon: "prone.svg" },
        { id: "on-fire", label: "On Fire", icon: "on-fire.svg" },
    ];

    function findStatusEffect(conditionSlug: string) {
        return STATUS_EFFECTS.find((e) => e.id === conditionSlug) ?? null;
    }

    it("finds matching status effect for condition slug", () => {
        const effect = findStatusEffect("stunned");
        expect(effect).not.toBeNull();
        expect(effect!.id).toBe("stunned");
    });

    it("finds hyphenated slug (on-fire)", () => {
        const effect = findStatusEffect("on-fire");
        expect(effect).not.toBeNull();
        expect(effect!.label).toBe("On Fire");
    });

    it("returns null for unknown slug", () => {
        const effect = findStatusEffect("nonexistent");
        expect(effect).toBeNull();
    });
});

describe("Token Effect Sync Logic", () => {
    /** Simulate the sync that ConditionDH2e does */
    function simulateSync(
        conditionSlug: string,
        active: boolean,
        tokenToggleCalls: Array<{ effectId: string; active: boolean }>,
    ) {
        const STATUS_EFFECTS = [
            { id: "stunned", icon: "stunned.svg", label: "Stunned" },
            { id: "prone", icon: "prone.svg", label: "Prone" },
        ];

        const effectDef = STATUS_EFFECTS.find((e) => e.id === conditionSlug);
        if (!effectDef) return;

        // Simulate what toggleActiveEffect would record
        tokenToggleCalls.push({ effectId: effectDef.id, active });
    }

    it("adds effect when condition is created", () => {
        const calls: Array<{ effectId: string; active: boolean }> = [];
        simulateSync("stunned", true, calls);
        expect(calls).toHaveLength(1);
        expect(calls[0].effectId).toBe("stunned");
        expect(calls[0].active).toBe(true);
    });

    it("removes effect when condition is deleted", () => {
        const calls: Array<{ effectId: string; active: boolean }> = [];
        simulateSync("stunned", false, calls);
        expect(calls).toHaveLength(1);
        expect(calls[0].active).toBe(false);
    });

    it("does nothing for unknown condition slug", () => {
        const calls: Array<{ effectId: string; active: boolean }> = [];
        simulateSync("nonexistent", true, calls);
        expect(calls).toHaveLength(0);
    });
});
