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
    /** Magazine capacity (0 = loose rounds, >0 = magazine/clip container) */
    capacity: number;
    /** Current rounds loaded in the magazine (only used when capacity > 0) */
    loaded: number;
    /** Name of the ammo type currently loaded in the magazine */
    loadedAmmoName: string;
}
