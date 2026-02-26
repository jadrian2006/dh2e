import { MigrationBase } from "../types.ts";

/** Migration 005: Add `lastMaintenanceDate` field to cybernetic items — bumps schema to 0.6.0 */
class Migration005CyberneticMaintenance extends MigrationBase {
    readonly version = "0.6.0";

    override async migrateItem(source: Record<string, unknown>): Promise<boolean> {
        if (source.type !== "cybernetic") return false;

        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        // Already has the field
        if ("lastMaintenanceDate" in system) return false;

        system.lastMaintenanceDate = null;
        return true;
    }
}

export { Migration005CyberneticMaintenance };
