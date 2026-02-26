export { MigrationBase } from "./types.ts";
export type { MigrationResult } from "./types.ts";
export { MigrationRunner, LATEST_SCHEMA } from "./runner.ts";

// Register all migrations
import { MigrationRunner } from "./runner.ts";
import { Migration001HordeType } from "./migrations/001-horde-type.ts";
import { Migration002VehicleType } from "./migrations/002-vehicle-type.ts";
import { Migration003WarbandChronicle } from "./migrations/003-warband-chronicle.ts";
import { Migration004SkillUses } from "./migrations/004-skill-uses.ts";
import { Migration005CyberneticMaintenance } from "./migrations/005-cybernetic-maintenance.ts";
import { Migration006AmmoTracking } from "./migrations/006-ammo-tracking.ts";
import { Migration007LootSystem } from "./migrations/007-loot-system.ts";
import { Migration008FatigueField } from "./migrations/008-fatigue-field.ts";

MigrationRunner.register([
    new Migration001HordeType(),
    new Migration002VehicleType(),
    new Migration003WarbandChronicle(),
    new Migration004SkillUses(),
    new Migration005CyberneticMaintenance(),
    new Migration006AmmoTracking(),
    new Migration007LootSystem(),
    new Migration008FatigueField(),
]);
