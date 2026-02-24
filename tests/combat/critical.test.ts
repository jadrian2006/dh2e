import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CriticalEntry } from "@combat/critical.ts";

/** Small test table for mocking */
const TEST_CRITICAL_TABLE: CriticalEntry[] = [
    {
        damageType: "energy",
        location: "head",
        severity: 1,
        title: "Dazed",
        description: "The target is dazed by the blast.",
        effects: ["stunned-1"],
        lethal: false,
        duration: "1 round",
        penalties: [],
    },
    {
        damageType: "energy",
        location: "body",
        severity: 5,
        title: "Organ Damage",
        description: "Internal organs are seared by the energy.",
        effects: ["fatigue-2"],
        lethal: false,
        duration: "until treated",
        penalties: [{ characteristic: "t", modifier: -10, permanent: false }],
    },
    {
        damageType: "impact",
        location: "head",
        severity: 10,
        title: "Crushed Skull",
        description: "The skull is crushed beyond repair.",
        effects: ["death"],
        lethal: true,
        duration: "permanent",
        penalties: [],
    },
];

// Stub fetch to return test data before importing the module so the
// module-level cache picks up our mock on first loadCriticalTable call.
vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
        ok: true,
        json: async () => TEST_CRITICAL_TABLE,
    })),
);

// Dynamic import after fetch is stubbed — the module's internal cache
// starts empty, so loadCriticalTable will call our stubbed fetch.
const { lookupCritical, loadCriticalTable } = await import("@combat/critical.ts");

describe("loadCriticalTable", () => {
    it("loads the critical table via fetch", async () => {
        const table = await loadCriticalTable();
        expect(table).toHaveLength(3);
        expect(table[0].title).toBe("Dazed");
    });

    it("caches the result on subsequent calls", async () => {
        const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
        fetchMock.mockClear();

        // Second call should use the cache, not fetch again
        await loadCriticalTable();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("lookupCritical", () => {
    describe("severity clamping", () => {
        it("severity 0 is clamped to 1", async () => {
            const result = await lookupCritical("energy", "head", 0);
            // Clamped to 1 → matches energy/head/1 = "Dazed"
            expect(result).not.toBeNull();
            expect(result!.severity).toBe(1);
            expect(result!.title).toBe("Dazed");
        });

        it("severity -5 is clamped to 1", async () => {
            const result = await lookupCritical("energy", "head", -5);
            expect(result).not.toBeNull();
            expect(result!.severity).toBe(1);
        });

        it("severity 15 is clamped to 10", async () => {
            const result = await lookupCritical("impact", "head", 15);
            // Clamped to 10 → matches impact/head/10 = "Crushed Skull"
            expect(result).not.toBeNull();
            expect(result!.severity).toBe(10);
            expect(result!.title).toBe("Crushed Skull");
        });

        it("severity within range is used as-is", async () => {
            const result = await lookupCritical("energy", "body", 5);
            expect(result).not.toBeNull();
            expect(result!.severity).toBe(5);
            expect(result!.title).toBe("Organ Damage");
        });
    });

    describe("matching entries", () => {
        it("finds energy/head/1 correctly", async () => {
            const result = await lookupCritical("energy", "head", 1);
            expect(result).not.toBeNull();
            expect(result!.damageType).toBe("energy");
            expect(result!.location).toBe("head");
            expect(result!.title).toBe("Dazed");
            expect(result!.lethal).toBe(false);
            expect(result!.effects).toContain("stunned-1");
        });

        it("finds energy/body/5 with penalties", async () => {
            const result = await lookupCritical("energy", "body", 5);
            expect(result).not.toBeNull();
            expect(result!.penalties).toHaveLength(1);
            expect(result!.penalties[0].characteristic).toBe("t");
            expect(result!.penalties[0].modifier).toBe(-10);
        });

        it("finds impact/head/10 as lethal", async () => {
            const result = await lookupCritical("impact", "head", 10);
            expect(result).not.toBeNull();
            expect(result!.lethal).toBe(true);
            expect(result!.effects).toContain("death");
        });
    });

    describe("no match returns null", () => {
        it("returns null for non-existent damage type", async () => {
            const result = await lookupCritical("rending", "head", 1);
            expect(result).toBeNull();
        });

        it("returns null for non-existent location", async () => {
            const result = await lookupCritical("energy", "leftArm", 1);
            expect(result).toBeNull();
        });

        it("returns null for non-existent severity", async () => {
            const result = await lookupCritical("energy", "head", 3);
            // Only severity 1 exists for energy/head in our test table
            expect(result).toBeNull();
        });

        it("returns null for completely unmatched combo", async () => {
            const result = await lookupCritical("explosive", "rightLeg", 7);
            expect(result).toBeNull();
        });
    });
});
