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
}
