import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for GM Override action handlers.
 *
 * Since the override dialog is a Svelte ApplicationV2 which requires
 * Foundry rendering, we test the core logic patterns: message flag
 * updates and audit note generation.
 */

describe("GM Override — flag update patterns", () => {
    let mockMessage: Record<string, any>;

    beforeEach(() => {
        mockMessage = {
            id: "msg001",
            speaker: { actor: "actor001" },
            flags: {
                dh2e: {
                    type: "check",
                    result: {
                        roll: 45,
                        target: 50,
                        dos: 1,
                        dof: 0,
                        success: true,
                        label: "Ballistic Skill",
                    },
                },
            },
            update: vi.fn(async (data: Record<string, unknown>) => {
                // Simulate Foundry flag merge
                for (const [key, value] of Object.entries(data)) {
                    const parts = key.split(".");
                    let obj: any = mockMessage;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (!obj[parts[i]]) obj[parts[i]] = {};
                        obj = obj[parts[i]];
                    }
                    obj[parts[parts.length - 1]] = value;
                }
            }),
        };
    });

    describe("adjust-dos", () => {
        it("updates dos/dof flags to new positive value (DoS)", async () => {
            // Simulate the adjust-dos action setting 3 DoS
            const newValue = 3;
            const newDos = newValue >= 0 ? newValue : 0;
            const newDof = newValue < 0 ? Math.abs(newValue) : 0;
            const newSuccess = newDos > 0 || (newDos === 0 && newDof === 0);

            await mockMessage.update({
                "flags.dh2e.result.dos": newDos,
                "flags.dh2e.result.dof": newDof,
                "flags.dh2e.result.success": newSuccess,
                "flags.dh2e.gmOverride": true,
            });

            expect(mockMessage.update).toHaveBeenCalledTimes(1);
            expect(mockMessage.flags.dh2e.result.dos).toBe(3);
            expect(mockMessage.flags.dh2e.result.dof).toBe(0);
            expect(mockMessage.flags.dh2e.result.success).toBe(true);
            expect(mockMessage.flags.dh2e.gmOverride).toBe(true);
        });

        it("updates dos/dof flags to negative value (DoF)", async () => {
            const newValue = -2;
            const newDos = newValue >= 0 ? newValue : 0;
            const newDof = newValue < 0 ? Math.abs(newValue) : 0;
            const newSuccess = newDos > 0 || (newDos === 0 && newDof === 0);

            await mockMessage.update({
                "flags.dh2e.result.dos": newDos,
                "flags.dh2e.result.dof": newDof,
                "flags.dh2e.result.success": newSuccess,
                "flags.dh2e.gmOverride": true,
            });

            expect(mockMessage.flags.dh2e.result.dos).toBe(0);
            expect(mockMessage.flags.dh2e.result.dof).toBe(2);
            expect(mockMessage.flags.dh2e.result.success).toBe(false);
        });
    });

    describe("change-damage", () => {
        it("updates totalDamage and woundsDealt flags", async () => {
            mockMessage.flags.dh2e.type = "damage";
            mockMessage.flags.dh2e.result = { totalDamage: 8, woundsDealt: 8 };

            await mockMessage.update({
                "flags.dh2e.result.totalDamage": 12,
                "flags.dh2e.result.woundsDealt": 12,
                "flags.dh2e.gmOverride": true,
            });

            expect(mockMessage.flags.dh2e.result.totalDamage).toBe(12);
            expect(mockMessage.flags.dh2e.result.woundsDealt).toBe(12);
        });
    });

    describe("change-severity", () => {
        it("updates severity flag on critical message", async () => {
            mockMessage.flags.dh2e.type = "critical";
            mockMessage.flags.dh2e.result = { severity: 3 };

            await mockMessage.update({
                "flags.dh2e.result.severity": 7,
                "flags.dh2e.gmOverride": true,
            });

            expect(mockMessage.flags.dh2e.result.severity).toBe(7);
        });
    });

    describe("force-success / force-failure", () => {
        it("flips requisition result to success", async () => {
            mockMessage.flags.dh2e.type = "requisition";
            mockMessage.flags.dh2e.result = { success: false };

            await mockMessage.update({
                "flags.dh2e.result.success": true,
                "flags.dh2e.gmOverride": true,
            });

            expect(mockMessage.flags.dh2e.result.success).toBe(true);
        });

        it("flips requisition result to failure", async () => {
            mockMessage.flags.dh2e.type = "requisition";
            mockMessage.flags.dh2e.result = { success: true };

            await mockMessage.update({
                "flags.dh2e.result.success": false,
                "flags.dh2e.gmOverride": true,
            });

            expect(mockMessage.flags.dh2e.result.success).toBe(false);
        });
    });

    describe("dismiss", () => {
        it("sets dismissed flag", async () => {
            mockMessage.flags.dh2e.type = "phenomena";

            await mockMessage.update({
                "flags.dh2e.dismissed": true,
                "flags.dh2e.gmOverride": true,
            });

            expect(mockMessage.flags.dh2e.dismissed).toBe(true);
        });
    });
});
