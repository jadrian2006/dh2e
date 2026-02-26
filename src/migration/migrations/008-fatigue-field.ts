import { MigrationBase } from "../types.ts";

/** Migration 008: Add fatigue field to acolyte and NPC actors — bumps schema to 0.9.0 */
class Migration008FatigueField extends MigrationBase {
    readonly version = "0.9.0";

    override async migrateActor(source: Record<string, unknown>): Promise<boolean> {
        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        const actorTypes = new Set(["acolyte", "npc"]);
        if (!actorTypes.has(source.type as string)) return false;

        if (!("fatigue" in system)) {
            system.fatigue = 0;
            return true;
        }

        return false;
    }
}

export { Migration008FatigueField };
