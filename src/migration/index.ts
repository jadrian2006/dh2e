export { MigrationBase } from "./types.ts";
export type { MigrationResult } from "./types.ts";
export { MigrationRunner, LATEST_SCHEMA } from "./runner.ts";

// Register all migrations
import { MigrationRunner } from "./runner.ts";
import { Migration001HordeType } from "./migrations/001-horde-type.ts";
import { Migration002VehicleType } from "./migrations/002-vehicle-type.ts";

MigrationRunner.register([
    new Migration001HordeType(),
    new Migration002VehicleType(),
]);
