import { MigrationBase } from "../types.ts";

/** Migration 002: Add vehicle actor type support — bumps schema to 0.3.0 */
class Migration002VehicleType extends MigrationBase {
    readonly version = "0.3.0";

    // No data changes needed — vehicle is a new type, existing actors unaffected.
}

export { Migration002VehicleType };
