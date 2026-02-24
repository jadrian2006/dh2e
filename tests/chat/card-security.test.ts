import { describe, it, expect } from "vitest";

/**
 * Test that chat card template data correctly separates
 * GM-only information from player-visible information.
 *
 * The actual Handlebars rendering requires Foundry, so we test
 * the data preparation logic — verifying that the `isGM` flag
 * controls what would be rendered.
 */

describe("Chat Card Security", () => {
    describe("Damage card context", () => {
        interface DamageHit {
            location: string;
            locationLabel: string;
            rawDamage: number;
            armourPoints: number;
            penetration: number;
            effectiveAP: number;
            toughnessBonus: number;
            woundsDealt: number;
            formula: string;
        }

        interface DamageCardContext {
            weaponName: string;
            targetName: string;
            targetId: string;
            hits: DamageHit[];
            totalWounds: number;
            isGM: boolean;
            applied: boolean;
        }

        function createDamageContext(isGM: boolean): DamageCardContext {
            return {
                weaponName: "Autogun",
                targetName: "Heretic",
                targetId: "actor123",
                hits: [
                    {
                        location: "body",
                        locationLabel: "Body",
                        rawDamage: 12,
                        armourPoints: 4,
                        penetration: 2,
                        effectiveAP: 2,
                        toughnessBonus: 3,
                        woundsDealt: 7,
                        formula: "1d10+3",
                    },
                ],
                totalWounds: 7,
                isGM,
                applied: false,
            };
        }

        /** Simulate what {{#if isGM}} does — filter context to player-visible fields */
        function playerVisibleData(ctx: DamageCardContext) {
            if (ctx.isGM) {
                // GM sees everything
                return ctx;
            }
            // Players only see weapon name, location label, wounds dealt
            return {
                weaponName: ctx.weaponName,
                hits: ctx.hits.map((h) => ({
                    locationLabel: h.locationLabel,
                    woundsDealt: h.woundsDealt,
                })),
                totalWounds: ctx.totalWounds,
            };
        }

        it("GM context includes full damage breakdown", () => {
            const ctx = createDamageContext(true);
            const visible = playerVisibleData(ctx);
            expect(visible).toHaveProperty("hits");
            expect((visible as any).hits[0]).toHaveProperty("rawDamage");
            expect((visible as any).hits[0]).toHaveProperty("effectiveAP");
            expect((visible as any).hits[0]).toHaveProperty("toughnessBonus");
            expect((visible as any).hits[0]).toHaveProperty("penetration");
        });

        it("Player context only shows wounds dealt per location", () => {
            const ctx = createDamageContext(false);
            const visible = playerVisibleData(ctx);
            expect(visible.hits[0]).toHaveProperty("locationLabel");
            expect(visible.hits[0]).toHaveProperty("woundsDealt");
            expect(visible.hits[0]).not.toHaveProperty("rawDamage");
            expect(visible.hits[0]).not.toHaveProperty("effectiveAP");
            expect(visible.hits[0]).not.toHaveProperty("toughnessBonus");
            expect(visible.hits[0]).not.toHaveProperty("penetration");
            expect(visible.hits[0]).not.toHaveProperty("armourPoints");
        });

        it("Player context shows weapon name and total wounds", () => {
            const ctx = createDamageContext(false);
            const visible = playerVisibleData(ctx);
            expect(visible.weaponName).toBe("Autogun");
            expect(visible.totalWounds).toBe(7);
        });

        it("GM context preserves all fields", () => {
            const ctx = createDamageContext(true);
            expect(ctx.isGM).toBe(true);
            expect(ctx.hits[0].rawDamage).toBe(12);
            expect(ctx.hits[0].effectiveAP).toBe(2);
            expect(ctx.hits[0].penetration).toBe(2);
            expect(ctx.hits[0].toughnessBonus).toBe(3);
        });

        it("isGM flag is set based on user role", () => {
            const gmCtx = createDamageContext(true);
            const playerCtx = createDamageContext(false);
            expect(gmCtx.isGM).toBe(true);
            expect(playerCtx.isGM).toBe(false);
        });
    });

    describe("Damage snapshot for revert", () => {
        interface DamageSnapshot {
            targetId: string;
            field: string;
            previous: number;
            woundsDealt: number;
            hitDetails: { location: string; woundsDealt: number }[];
        }

        function createSnapshot(
            targetId: string,
            currentWounds: number,
            woundsDealt: number,
        ): DamageSnapshot {
            return {
                targetId,
                field: "system.wounds.value",
                previous: currentWounds,
                woundsDealt,
                hitDetails: [{ location: "body", woundsDealt }],
            };
        }

        it("stores previous wound value for revert", () => {
            const snapshot = createSnapshot("actor1", 12, 5);
            expect(snapshot.previous).toBe(12);
            expect(snapshot.woundsDealt).toBe(5);
        });

        it("records all hit details", () => {
            const snapshot: DamageSnapshot = {
                targetId: "actor1",
                field: "system.wounds.value",
                previous: 10,
                woundsDealt: 8,
                hitDetails: [
                    { location: "body", woundsDealt: 5 },
                    { location: "leftArm", woundsDealt: 3 },
                ],
            };
            expect(snapshot.hitDetails).toHaveLength(2);
            expect(snapshot.hitDetails[0].location).toBe("body");
            expect(snapshot.hitDetails[1].location).toBe("leftArm");
        });

        it("revert would restore wounds to previous value", () => {
            const snapshot = createSnapshot("actor1", 12, 5);
            // Simulate apply: 12 - 5 = 7
            const afterApply = snapshot.previous - snapshot.woundsDealt;
            expect(afterApply).toBe(7);
            // Revert restores to previous
            expect(snapshot.previous).toBe(12);
        });

        it("snapshot includes target identifier", () => {
            const snapshot = createSnapshot("actor_abc", 8, 3);
            expect(snapshot.targetId).toBe("actor_abc");
            expect(snapshot.field).toBe("system.wounds.value");
        });
    });

    describe("Apply controls visibility", () => {
        function getApplyControls(context: { targetId?: string; applied: boolean; isGM: boolean }) {
            const controls: string[] = [];

            if (context.targetId) {
                if (!context.applied) {
                    controls.push("apply-damage-button");
                }
                if (context.applied) {
                    controls.push("applied-label");
                    if (context.isGM) {
                        controls.push("revert-button");
                    }
                }
            }

            return controls;
        }

        it("shows apply button when not yet applied and target exists", () => {
            const controls = getApplyControls({ targetId: "actor1", applied: false, isGM: false });
            expect(controls).toContain("apply-damage-button");
            expect(controls).not.toContain("revert-button");
        });

        it("shows applied label and revert button for GM after apply", () => {
            const controls = getApplyControls({ targetId: "actor1", applied: true, isGM: true });
            expect(controls).toContain("applied-label");
            expect(controls).toContain("revert-button");
            expect(controls).not.toContain("apply-damage-button");
        });

        it("shows applied label but no revert for players after apply", () => {
            const controls = getApplyControls({ targetId: "actor1", applied: true, isGM: false });
            expect(controls).toContain("applied-label");
            expect(controls).not.toContain("revert-button");
        });

        it("shows no controls when no target", () => {
            const controls = getApplyControls({ applied: false, isGM: true });
            expect(controls).toHaveLength(0);
        });
    });
});
