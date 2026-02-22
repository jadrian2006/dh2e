import { ActorDH2e } from "@actor/base.ts";
import type { CharacteristicAbbrev, HitLocationKey } from "@actor/types.ts";
import type { AcolyteSystemData, AcolyteSystemSource, CharacteristicData } from "./data.ts";

/** The Acolyte (player character) actor */
class AcolyteDH2e extends ActorDH2e {
    override get system(): AcolyteSystemData {
        return super.system as unknown as AcolyteSystemData;
    }

    /** Get a characteristic by abbreviation */
    getCharacteristic(key: CharacteristicAbbrev): CharacteristicData {
        return this.system.characteristics[key];
    }

    /** Get armour protection at a hit location */
    getLocationAP(location: HitLocationKey): number {
        return this.system.armour[location] ?? 0;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        const system = this.system;
        const source = this._source.system as unknown as AcolyteSystemSource;

        // Calculate characteristic values and bonuses
        for (const key of Object.keys(source.characteristics) as CharacteristicAbbrev[]) {
            const char = system.characteristics[key];
            const src = source.characteristics[key];
            char.base = src.base;
            char.advances = src.advances;
            char.value = src.base + src.advances * 5;
            char.bonus = Math.floor(char.value / 10);
        }

        // Calculate available XP
        (system.xp as AcolyteSystemData["xp"]).available = system.xp.total - system.xp.spent;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Calculate per-location armour totals from equipped items
        const armour: Record<string, number> = { head: 0, rightArm: 0, leftArm: 0, body: 0, rightLeg: 0, leftLeg: 0 };
        for (const item of this.items) {
            if (item.type !== "armour") continue;
            const sys = item.system as any;
            if (sys.equipped === false) continue;
            for (const loc of Object.keys(armour)) {
                armour[loc] += sys.locations?.[loc] ?? 0;
            }
        }
        (this.system as any).armour = armour;
    }

    /**
     * Apply damage to this actor, reducing current wounds.
     * @param wounds Number of wounds to apply
     * @param location The hit location (for logging/future critical effects)
     */
    async applyDamage(wounds: number, _location?: HitLocationKey): Promise<void> {
        const current = this.system.wounds.value;
        const newValue = Math.max(0, current - wounds);
        await this.update({ "system.wounds.value": newValue });

        if (newValue <= 0) {
            ui.notifications.warn(`${this.name} has reached 0 wounds! Critical damage!`);
        }
    }

    /** Heal wounds on this actor */
    async healDamage(wounds: number): Promise<void> {
        const current = this.system.wounds.value;
        const max = this.system.wounds.max;
        const newValue = Math.min(max, current + wounds);
        await this.update({ "system.wounds.value": newValue });
    }
}

export { AcolyteDH2e };
