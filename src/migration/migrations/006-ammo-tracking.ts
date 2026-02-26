import { MigrationBase } from "../types.ts";

/** Migration 006: Add weaponGroup and reloadProgress to weapons, weaponGroup to ammunition — bumps schema to 0.7.0 */
class Migration006AmmoTracking extends MigrationBase {
    readonly version = "0.7.0";

    override async migrateItem(source: Record<string, unknown>): Promise<boolean> {
        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        let modified = false;

        if (source.type === "weapon") {
            if (!("weaponGroup" in system)) {
                system.weaponGroup = "";
                modified = true;
            }
            if (!("reloadProgress" in system)) {
                system.reloadProgress = 0;
                modified = true;
            }
        }

        if (source.type === "ammunition") {
            if (!("weaponGroup" in system)) {
                system.weaponGroup = "";
                modified = true;
            }
        }

        return modified;
    }
}

export { Migration006AmmoTracking };
