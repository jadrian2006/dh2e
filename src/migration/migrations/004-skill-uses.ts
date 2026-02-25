import { MigrationBase } from "../types.ts";

/** Migration 004: Add empty `uses` array to skill items — bumps schema to 0.5.0 */
class Migration004SkillUses extends MigrationBase {
    readonly version = "0.5.0";

    override async migrateItem(source: Record<string, unknown>): Promise<boolean> {
        if (source.type !== "skill") return false;

        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        if (Array.isArray(system.uses)) return false;

        system.uses = [];
        return true;
    }
}

export { Migration004SkillUses };
