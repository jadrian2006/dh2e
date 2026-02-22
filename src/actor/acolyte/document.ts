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

        // Future: calculate per-location armour totals from equipped items
        // Future: calculate wound max from TB + homeworld modifier
    }
}

export { AcolyteDH2e };
