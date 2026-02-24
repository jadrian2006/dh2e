import { ItemDH2e } from "@item/base/document.ts";
import type { WeaponSystemSource } from "./data.ts";
import type { AmmunitionSystemSource } from "@item/ammunition/data.ts";

/** Weapon item — ranged and melee weapons */
class WeaponDH2e extends ItemDH2e {
    declare system: WeaponSystemSource;

    /** Get the loaded ammunition item, if any */
    get loadedAmmunition(): Item | null {
        const ammoId = this.system.loadedAmmoId;
        if (!ammoId || !this.parent) return null;
        return this.parent.items.get(ammoId) ?? null;
    }

    /** Get effective damage formula including ammo modifications */
    get effectiveDamage(): { formula: string; type: string; bonus: number; penetration: number } {
        const base = this.system.damage;
        const basePen = this.system.penetration;
        const ammo = this.loadedAmmunition;

        if (!ammo) {
            return {
                formula: base.formula,
                type: base.type,
                bonus: base.bonus,
                penetration: basePen,
            };
        }

        const ammoSys = ammo.system as unknown as AmmunitionSystemSource;
        return {
            formula: base.formula,
            type: ammoSys.damageType || base.type,
            bonus: base.bonus + (ammoSys.damageModifier ?? 0),
            penetration: basePen + (ammoSys.penetrationModifier ?? 0),
        };
    }

    /** Get combined qualities from weapon + ammo */
    get effectiveQualities(): string[] {
        const quals = [...this.system.qualities];
        const ammo = this.loadedAmmunition;
        if (ammo) {
            const ammoSys = ammo.system as unknown as AmmunitionSystemSource;
            if (ammoSys.qualities) {
                for (const q of ammoSys.qualities) {
                    if (!quals.includes(q)) quals.push(q);
                }
            }
        }
        return quals;
    }
}

export { WeaponDH2e };
