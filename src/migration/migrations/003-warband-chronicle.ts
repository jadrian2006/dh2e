import { MigrationBase } from "../types.ts";

/** Migration 003: Add chronicle data to warband actors — bumps schema to 0.4.0 */
class Migration003WarbandChronicle extends MigrationBase {
    readonly version = "0.4.0";

    override async migrateActor(source: Record<string, unknown>): Promise<boolean> {
        if (source.type !== "warband") return false;

        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        // Only add if chronicle doesn't already exist
        if (system.chronicle) return false;

        system.chronicle = {
            currentDate: { check: 0, year: 815, day: 1, millennium: 41 },
            entries: [],
            deadlines: [],
        };

        return true;
    }
}

export { Migration003WarbandChronicle };
