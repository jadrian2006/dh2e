import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockRoll, MockChatMessage } from "../mocks/foundry.ts";

// Mock the @check/check.ts module to avoid the Svelte import chain.
// SuppressiveFireResolver imports CheckDH2e from @check/check.ts, which
// transitively pulls in a Svelte dialog component that cannot be parsed
// in the test environment.
vi.mock("@check/check.ts", () => ({
    CheckDH2e: {
        roll: vi.fn(async () => ({ dos: { success: false, degrees: 1 } })),
    },
}));

// When vi.mock intercepts module resolution, Vite's define transform may not
// apply to the dependent module. The source code uses `fd` and `SYSTEM_ID`
// which are normally replaced at build time. We install them as real globals
// so the un-transformed code can still reference them.
(globalThis as any).fd = (globalThis as any).__foundryMocks?.fd ?? {};
(globalThis as any).SYSTEM_ID = "dh2e";

const { SuppressiveFireResolver } = await import("@combat/suppressive-fire.ts");

describe("SuppressiveFireResolver", () => {
    describe("rollSuppressiveHits", () => {
        let rollSpy: ReturnType<typeof vi.spyOn> | undefined;

        afterEach(() => {
            rollSpy?.mockRestore();
            rollSpy = undefined;
        });

        it("returns a number from 1d5 roll", async () => {
            const mockRoll = MockRoll.create("1d5", 3);
            rollSpy = vi.spyOn(foundry.dice, "Roll").mockImplementation(() => mockRoll as any);

            const hits = await SuppressiveFireResolver.rollSuppressiveHits();
            expect(typeof hits).toBe("number");
            expect(hits).toBe(3);
        });

        it("returns 1 when roll.total is null (fallback via ?? operator)", async () => {
            const mockRoll = new MockRoll("1d5");
            Object.defineProperty(mockRoll, "total", { get: () => null });
            rollSpy = vi.spyOn(foundry.dice, "Roll").mockImplementation(() => mockRoll as any);

            const hits = await SuppressiveFireResolver.rollSuppressiveHits();
            expect(hits).toBe(1);
        });

        it("returns the exact roll total for each possible 1d5 value", async () => {
            for (const expected of [1, 2, 3, 4, 5]) {
                rollSpy?.mockRestore();
                const mockRoll = MockRoll.create("1d5", expected);
                rollSpy = vi.spyOn(foundry.dice, "Roll").mockImplementation(() => mockRoll as any);

                const hits = await SuppressiveFireResolver.rollSuppressiveHits();
                expect(hits).toBe(expected);
            }
        });
    });

    describe("resolve", () => {
        beforeEach(() => {
            MockChatMessage.reset();
        });

        it("posts a chat message with suppressive fire details", async () => {
            const mockWeapon = {
                id: "weapon1",
                name: "Heavy Stubber",
                system: {
                    magazine: { value: 60, max: 60 },
                    loadedRounds: [{ name: "Solid Rounds", count: 60 }],
                },
                update: vi.fn(async () => {}),
            };

            const mockActor = {
                id: "actor1",
                name: "Guardsman",
                items: [],
            };

            await SuppressiveFireResolver.resolve({
                actor: mockActor as any,
                weapon: mockWeapon as any,
            });

            // Weapon ammo should be expended (set to 0)
            expect(mockWeapon.update).toHaveBeenCalledWith({ "system.magazine.value": 0, "system.loadedRounds": [] });

            // A chat message should have been created
            expect(MockChatMessage.messages).toHaveLength(1);

            const msg = MockChatMessage.messages[0] as any;
            expect(msg.content).toContain("Suppressive Fire");
            expect(msg.content).toContain("Heavy Stubber");
            expect(msg.flags?.dh2e?.type).toBe("suppressive-fire");
            expect(msg.flags?.dh2e?.result?.weaponName).toBe("Heavy Stubber");
        });

        it("includes resolve-pinning button when targets are provided", async () => {
            const mockWeapon = {
                id: "weapon2",
                name: "Autocannon",
                system: { magazine: { value: 20, max: 20 }, loadedRounds: [{ name: "Solid Rounds", count: 20 }] },
                update: vi.fn(async () => {}),
            };

            const mockActor = {
                id: "actor2",
                name: "Heavy Gunner",
                items: [],
            };

            await SuppressiveFireResolver.resolve({
                actor: mockActor as any,
                weapon: mockWeapon as any,
                targetIds: ["target1", "target2"],
            });

            const msg = MockChatMessage.messages[0] as any;
            expect(msg.content).toContain("resolve-pinning");
            expect(msg.flags?.dh2e?.result?.targetIds).toEqual(["target1", "target2"]);
        });

        it("handles weapon with no magazine (max 0) gracefully", async () => {
            const mockWeapon = {
                id: "weapon3",
                name: "Flamer",
                system: { magazine: { value: 0, max: 0 }, loadedRounds: [] },
                update: vi.fn(async () => {}),
            };

            const mockActor = {
                id: "actor3",
                name: "Burna Boy",
                items: [],
            };

            await SuppressiveFireResolver.resolve({
                actor: mockActor as any,
                weapon: mockWeapon as any,
            });

            // With max 0, update should not be called (magMax > 0 check)
            expect(mockWeapon.update).not.toHaveBeenCalled();
            // Chat message should still be posted
            expect(MockChatMessage.messages).toHaveLength(1);
        });
    });
});
