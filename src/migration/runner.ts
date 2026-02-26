import type { MigrationBase, MigrationResult } from "./types.ts";

/** Current schema version — bump when adding new migrations */
const LATEST_SCHEMA = "0.11.0";

/**
 * Compares two semver strings. Returns:
 *  -1 if a < b, 0 if equal, 1 if a > b
 */
function compareSemver(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        const va = pa[i] ?? 0;
        const vb = pb[i] ?? 0;
        if (va < vb) return -1;
        if (va > vb) return 1;
    }
    return 0;
}

class MigrationRunner {
    /** All registered migrations, sorted by version ascending */
    static #migrations: MigrationBase[] = [];

    /** Register migrations (called once at import time from index.ts) */
    static register(migrations: MigrationBase[]): void {
        this.#migrations = migrations.sort((a, b) => compareSemver(a.version, b.version));
    }

    /** Run pending migrations (GM only) */
    static async run(): Promise<void> {
        const g = game as any;
        if (!g.user?.isGM) return;

        const currentSchema = g.settings.get(SYSTEM_ID, "schemaVersion") as string;

        // Collect migrations that are newer than current schema
        const pending = this.#migrations.filter(
            (m) => compareSemver(m.version, currentSchema) > 0,
        );

        if (pending.length === 0) return;

        console.log(`DH2E | Running ${pending.length} migration(s) from ${currentSchema} to ${LATEST_SCHEMA}`);

        const result: MigrationResult = {
            actorsMigrated: 0,
            itemsMigrated: 0,
            errors: [],
        };

        const totalDocs = (g.actors?.size ?? 0) + (g.items?.size ?? 0);
        let processed = 0;

        // Show progress notification
        const notify = (msg: string) => {
            ui.notifications.info(msg, { permanent: false });
        };
        notify(`Migrating DH2E data (0/${totalDocs})...`);

        // Migrate world actors
        for (const actor of g.actors ?? []) {
            try {
                const source = actor.toObject();
                let modified = false;

                for (const migration of pending) {
                    if (await migration.migrateActor(source)) {
                        modified = true;
                    }

                    // Also migrate embedded items
                    if (Array.isArray(source.items)) {
                        for (const itemSource of source.items) {
                            if (await migration.migrateItem(itemSource)) {
                                modified = true;
                            }
                        }
                    }
                }

                if (modified) {
                    await actor.update(source, { diff: false, recursive: false });
                    result.actorsMigrated++;
                }
            } catch (e: any) {
                const msg = `Failed to migrate actor "${actor.name}": ${e.message}`;
                console.error(`DH2E | ${msg}`);
                result.errors.push(msg);
            }

            processed++;
            if (processed % 10 === 0) {
                notify(`Migrating DH2E data (${processed}/${totalDocs})...`);
            }
        }

        // Migrate world items (unowned)
        for (const item of g.items ?? []) {
            try {
                const source = item.toObject();
                let modified = false;

                for (const migration of pending) {
                    if (await migration.migrateItem(source)) {
                        modified = true;
                    }
                }

                if (modified) {
                    await item.update(source, { diff: false, recursive: false });
                    result.itemsMigrated++;
                }
            } catch (e: any) {
                const msg = `Failed to migrate item "${item.name}": ${e.message}`;
                console.error(`DH2E | ${msg}`);
                result.errors.push(msg);
            }

            processed++;
            if (processed % 10 === 0) {
                notify(`Migrating DH2E data (${processed}/${totalDocs})...`);
            }
        }

        // Update schema version
        await g.settings.set(SYSTEM_ID, "schemaVersion", LATEST_SCHEMA);

        // Report results
        const summary = `DH2E migration complete: ${result.actorsMigrated} actor(s), ${result.itemsMigrated} item(s) updated.`;
        if (result.errors.length > 0) {
            ui.notifications.warn(`${summary} ${result.errors.length} error(s) — see console.`);
        } else {
            ui.notifications.info(summary);
        }
        console.log(`DH2E | ${summary}`, result);
    }
}

export { MigrationRunner, LATEST_SCHEMA, compareSemver };
