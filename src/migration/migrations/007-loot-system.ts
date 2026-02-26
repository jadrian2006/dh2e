import { MigrationBase } from "../types.ts";

/** Migration 007: Add defeated to NPCs, craftsmanship to equipment items — bumps schema to 0.8.0 */
class Migration007LootSystem extends MigrationBase {
    readonly version = "0.8.0";

    override async migrateActor(source: Record<string, unknown>): Promise<boolean> {
        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        if (source.type === "npc") {
            if (!("defeated" in system)) {
                system.defeated = false;
                return true;
            }
        }

        return false;
    }

    override async migrateItem(source: Record<string, unknown>): Promise<boolean> {
        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        const craftTypes = new Set(["weapon", "armour", "gear", "ammunition"]);
        if (craftTypes.has(source.type as string)) {
            if (!("craftsmanship" in system)) {
                system.craftsmanship = "common";
                return true;
            }
        }

        return false;
    }
}

export { Migration007LootSystem };
