import type { WeaponClass, FireMode, DamageType } from "./types.ts";
import type { RuleElementSource } from "@rules/rule-element/base.ts";

export interface WeaponSystemSource {
    description: string;
    class: WeaponClass;
    range: number;
    rof: {
        single: boolean;
        semi: number;    // 0 = not available, 2-4 = rate of fire
        full: number;    // 0 = not available, 4-10 = rate of fire
    };
    damage: {
        formula: string;   // e.g., "1d10", "2d10"
        type: DamageType;
        bonus: number;     // flat bonus added to roll (often SB or 0)
    };
    penetration: number;
    clip: {
        value: number;     // current ammo
        max: number;       // magazine capacity (0 = unlimited/melee)
    };
    reload: string;        // e.g., "Full", "Half", "2 Full"
    weight: number;
    qualities: string[];   // e.g., ["Reliable", "Tearing"]
    equipped: boolean;
    /** UUID of loaded ammunition item (empty = no special ammo) */
    loadedAmmoId: string;
    /** Rule elements from weapon qualities or manual configuration */
    rules: RuleElementSource[];
}
