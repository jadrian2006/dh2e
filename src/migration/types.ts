/** Base class for all data migrations */
abstract class MigrationBase {
    /** The schema version this migration targets (semver string) */
    abstract readonly version: string;

    /** Migrate an actor's source data in place. Return true if modified. */
    async migrateActor(_source: Record<string, unknown>): Promise<boolean> {
        return false;
    }

    /** Migrate an item's source data in place. Return true if modified. */
    async migrateItem(_source: Record<string, unknown>): Promise<boolean> {
        return false;
    }
}

interface MigrationResult {
    actorsMigrated: number;
    itemsMigrated: number;
    errors: string[];
}

export { MigrationBase };
export type { MigrationResult };
