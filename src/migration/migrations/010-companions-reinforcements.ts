import { MigrationBase } from "../types.ts";

/**
 * Migration 010: Add companions array to acolyte actors,
 * reinforcements array to warband actors.
 */
class Migration010CompanionsReinforcements extends MigrationBase {
    readonly version = "0.11.0";

    override async migrateActor(source: Record<string, unknown>): Promise<boolean> {
        const type = source.type as string;
        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        if (type === "acolyte") {
            if (!Array.isArray(system.companions)) {
                system.companions = [];
                return true;
            }
        }

        if (type === "warband") {
            if (!Array.isArray(system.reinforcements)) {
                system.reinforcements = [];
                return true;
            }
        }

        return false;
    }
}

export { Migration010CompanionsReinforcements };
