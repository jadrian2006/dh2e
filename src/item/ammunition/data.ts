import type { LoadedRoundEntry } from "@item/weapon/data.ts";

export interface AmmunitionSystemSource {
    description: string;
    damageModifier: number;
    damageType: string;
    penetrationModifier: number;
    qualities: string[];
    quantity: number;
    weight: number;
    /** Weapon group this ammo is compatible with (empty = universal) */
    weaponGroup: string;
    availability: string;
    /** Craftsmanship quality: poor, common, good, best */
    craftsmanship: string;
    /** Magazine capacity (0 = loose rounds, >0 = magazine container) */
    capacity: number;
    /** Rounds loaded in the magazine, ordered bottom-to-top (LIFO) */
    loadedRounds: LoadedRoundEntry[];
    /** Weapon name this magazine is designed for (empty = generic) */
    forWeapon: string;
}
