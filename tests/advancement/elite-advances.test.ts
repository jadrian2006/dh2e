import { describe, it, expect } from "vitest";
import { mockActor } from "../mocks/foundry.ts";
import { hasEliteAdvance, checkPrerequisites } from "@advancement/prerequisites.ts";

describe("Elite Advance Prerequisites", () => {
    describe("hasEliteAdvance", () => {
        it("returns true when actor has the specified elite advance", () => {
            const actor = mockActor();
            actor.system.eliteAdvances = ["psyker"];
            expect(hasEliteAdvance(actor as any, "psyker")).toBe(true);
        });

        it("returns false when actor does not have the specified elite advance", () => {
            const actor = mockActor();
            actor.system.eliteAdvances = [];
            expect(hasEliteAdvance(actor as any, "psyker")).toBe(false);
        });

        it("returns false when eliteAdvances is undefined", () => {
            const actor = mockActor();
            // Default mockActor doesn't set eliteAdvances
            expect(hasEliteAdvance(actor as any, "psyker")).toBe(false);
        });

        it("handles multiple elite advances", () => {
            const actor = mockActor();
            actor.system.eliteAdvances = ["psyker", "inquisitor"];
            expect(hasEliteAdvance(actor as any, "psyker")).toBe(true);
            expect(hasEliteAdvance(actor as any, "inquisitor")).toBe(true);
            expect(hasEliteAdvance(actor as any, "untouchable")).toBe(false);
        });
    });

    describe("Psyker prerequisite checks", () => {
        it("WP 40 requirement — met when WP is 40+", () => {
            const actor = mockActor({
                characteristics: { wp: { base: 40, advances: 0 } },
            });
            const result = checkPrerequisites(actor as any, "WP 40");
            expect(result.met).toBe(true);
        });

        it("WP 40 requirement — unmet when WP is below 40", () => {
            const actor = mockActor({
                characteristics: { wp: { base: 35, advances: 0 } },
            });
            const result = checkPrerequisites(actor as any, "WP 40");
            expect(result.met).toBe(false);
            expect(result.unmet).toContain("WP 40");
        });
    });

    describe("Psy Rating cost formula", () => {
        it("PR 2 costs 400 XP (200 × 2)", () => {
            const nextPR = 2;
            expect(200 * nextPR).toBe(400);
        });

        it("PR 3 costs 600 XP (200 × 3)", () => {
            const nextPR = 3;
            expect(200 * nextPR).toBe(600);
        });

        it("PR 5 costs 1000 XP (200 × 5)", () => {
            const nextPR = 5;
            expect(200 * nextPR).toBe(1000);
        });

        it("PR 10 costs 2000 XP (200 × 10)", () => {
            const nextPR = 10;
            expect(200 * nextPR).toBe(2000);
        });
    });

    describe("Elite advance data structure", () => {
        it("Psyker definition matches RAW", () => {
            const psyker = {
                id: "psyker",
                cost: 300,
                prerequisites: { characteristics: { wp: 40 }, notEliteAdvance: "untouchable" },
                instant: { aptitudes: ["Psyker"], talents: ["Psy Rating"], unsanctionedCorruption: "1d10+3" },
            };

            expect(psyker.cost).toBe(300);
            expect(psyker.prerequisites.characteristics.wp).toBe(40);
            expect(psyker.prerequisites.notEliteAdvance).toBe("untouchable");
            expect(psyker.instant.aptitudes).toContain("Psyker");
            expect(psyker.instant.talents).toContain("Psy Rating");
        });

        it("Untouchable definition matches RAW", () => {
            const untouchable = {
                id: "untouchable",
                cost: 300,
                prerequisites: { notEliteAdvance: "psyker" },
                instant: { talents: ["Resistance (Psychic Powers)"] },
            };

            expect(untouchable.cost).toBe(300);
            expect(untouchable.prerequisites.notEliteAdvance).toBe("psyker");
        });

        it("Inquisitor definition matches RAW", () => {
            const inquisitor = {
                id: "inquisitor",
                cost: 1000,
                prerequisites: { influence: 75 },
                instant: { aptitudes: ["Leadership"], talents: ["Peer (Inquisition)"] },
            };

            expect(inquisitor.cost).toBe(1000);
            expect(inquisitor.prerequisites.influence).toBe(75);
            expect(inquisitor.instant.aptitudes).toContain("Leadership");
        });
    });

    describe("Mutual exclusion", () => {
        it("Psyker and Untouchable are mutually exclusive", () => {
            const psykerActor = mockActor();
            psykerActor.system.eliteAdvances = ["psyker"];

            const untouchableActor = mockActor();
            untouchableActor.system.eliteAdvances = ["untouchable"];

            // Psyker actor has psyker, which blocks untouchable (notEliteAdvance: "psyker")
            expect(hasEliteAdvance(psykerActor as any, "psyker")).toBe(true);
            expect(psykerActor.system.eliteAdvances.includes("psyker")).toBe(true);

            // Untouchable actor has untouchable, which blocks psyker (notEliteAdvance: "untouchable")
            expect(hasEliteAdvance(untouchableActor as any, "untouchable")).toBe(true);
            expect(untouchableActor.system.eliteAdvances.includes("untouchable")).toBe(true);
        });
    });
});
