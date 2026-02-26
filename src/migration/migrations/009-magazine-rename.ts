import { MigrationBase } from "../types.ts";

/** Individual-loading weapons (load rounds one at a time, not magazine swap) */
const INDIVIDUAL_LOAD_WEAPONS = new Set([
    "Stub Revolver",
    "Hand Cannon",
    "Shotgun",
    "Grenade Launcher",
    "Missile Launcher",
]);

/**
 * Migration 009: Rename clip → magazine on weapons, add magazine system fields.
 * - Weapons: clip → magazine, add loadType / loadedMagazineName / loadedRounds
 * - Ammunition: replace loaded/loadedAmmoName with loadedRounds, add forWeapon
 * - Fix Shotgun weaponGroup from "sp" to "shotgun"
 */
class Migration009MagazineRename extends MigrationBase {
    readonly version = "0.10.0";

    override async migrateItem(source: Record<string, unknown>): Promise<boolean> {
        const type = source.type as string;
        if (type === "weapon") return this.#migrateWeapon(source);
        if (type === "ammunition") return this.#migrateAmmunition(source);
        return false;
    }

    #migrateWeapon(source: Record<string, unknown>): boolean {
        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        let modified = false;

        // Rename clip → magazine
        if ("clip" in system) {
            const clip = system.clip as { value?: number; max?: number } | undefined;
            system.magazine = {
                value: clip?.value ?? 0,
                max: clip?.max ?? 0,
            };
            delete system.clip;
            modified = true;
        }

        // Add loadType if missing
        if (!("loadType" in system)) {
            const mag = system.magazine as { max?: number } | undefined;
            const magMax = mag?.max ?? 0;
            const name = (source.name as string) ?? "";

            if (magMax === 0) {
                system.loadType = ""; // melee/thrown
            } else if (INDIVIDUAL_LOAD_WEAPONS.has(name)) {
                system.loadType = "individual";
            } else {
                system.loadType = "magazine";
            }
            modified = true;
        }

        // Add loadedMagazineName if missing
        if (!("loadedMagazineName" in system)) {
            system.loadedMagazineName = "";
            modified = true;
        }

        // Convert existing loaded state to loadedRounds array
        if (!("loadedRounds" in system)) {
            const loadedRounds: Array<{ name: string; count: number }> = [];
            const mag = system.magazine as { value?: number } | undefined;
            const magValue = mag?.value ?? 0;

            if (magValue > 0) {
                // Try to resolve the ammo name from the loaded ammo ID
                // In migration context we can't resolve IDs, so use a generic name based on weapon group
                const weaponGroup = (system.weaponGroup as string) ?? "";
                const groupNames: Record<string, string> = {
                    sp: "Solid Rounds",
                    las: "Charge Pack",
                    bolt: "Bolt Shells",
                    flame: "Promethium",
                    melta: "Melta Fuel",
                    plasma: "Plasma",
                    shotgun: "Shotgun Shells",
                    launcher: "Frag Grenades",
                };
                const ammoName = groupNames[weaponGroup] ?? "Rounds";
                loadedRounds.push({ name: ammoName, count: magValue });
            }

            system.loadedRounds = loadedRounds;
            modified = true;
        }

        // Fix Shotgun weaponGroup: "sp" → "shotgun"
        if ((source.name as string) === "Shotgun" && system.weaponGroup === "sp") {
            system.weaponGroup = "shotgun";
            modified = true;
        }

        return modified;
    }

    #migrateAmmunition(source: Record<string, unknown>): boolean {
        const system = source.system as Record<string, unknown> | undefined;
        if (!system) return false;

        let modified = false;

        // Convert loaded/loadedAmmoName → loadedRounds
        if ("loaded" in system || "loadedAmmoName" in system) {
            const loaded = (system.loaded as number) ?? 0;
            const loadedAmmoName = (system.loadedAmmoName as string) ?? "";

            const loadedRounds: Array<{ name: string; count: number }> = [];
            if (loaded > 0 && loadedAmmoName) {
                loadedRounds.push({ name: loadedAmmoName, count: loaded });
            }
            system.loadedRounds = loadedRounds;

            delete system.loaded;
            delete system.loadedAmmoName;
            modified = true;
        }

        // Add loadedRounds if somehow missing
        if (!("loadedRounds" in system)) {
            system.loadedRounds = [];
            modified = true;
        }

        // Add forWeapon if missing
        if (!("forWeapon" in system)) {
            system.forWeapon = "";
            modified = true;
        }

        return modified;
    }
}

export { Migration009MagazineRename };
