import { MigrationBase } from "../types.ts";

/** Migration 001: Add horde actor type support — bumps schema to 0.2.0 */
class Migration001HordeType extends MigrationBase {
    readonly version = "0.2.0";

    // No data changes needed — horde is a new type, existing actors unaffected.
    // This migration exists as a schema version bump marker.
}

export { Migration001HordeType };
