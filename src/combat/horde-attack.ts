import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { FireMode, AttackResult, HitResult } from "./types.ts";
import { determineHitLocation } from "./hit-location.ts";
import { CheckDH2e } from "@check/check.ts";

/**
 * Horde attack resolution.
 *
 * Hordes make a single attack check:
 * - 1 base hit + 1 per DoS, all directed at a single target.
 * - Hit locations are randomised per hit.
 */
class HordeAttackResolver {
    static async resolve(options: {
        actor: Actor;
        weapon: any;
        fireMode: FireMode;
    }): Promise<AttackResult | null> {
        const { actor, weapon, fireMode } = options;
        const sys = weapon.system ?? {};

        const isMelee = sys.class === "melee";
        const characteristic: CharacteristicAbbrev = isMelee ? "ws" : "bs";
        const actorSys = (actor as any).system;
        const charValue = actorSys?.characteristics?.[characteristic]?.value ?? 0;

        const result = await CheckDH2e.roll({
            actor,
            characteristic,
            baseTarget: charValue,
            label: `${weapon.name} Horde Attack`,
            domain: `attack:${isMelee ? "melee" : "ranged"}`,
        });

        if (!result) return null;

        if (!result.dos.success) {
            return {
                success: false,
                degrees: result.dos.degrees,
                roll: result.roll,
                target: result.target,
                hitCount: 0,
                hits: [],
                fireMode,
                weaponName: weapon.name,
            };
        }

        // Horde rule: 1 base hit + 1 per DoS
        const hitCount = 1 + result.dos.degrees;

        const hits: HitResult[] = [];
        for (let i = 0; i < hitCount; i++) {
            const roll = Math.floor(Math.random() * 100) + 1;
            hits.push(determineHitLocation(roll));
        }

        return {
            success: true,
            degrees: result.dos.degrees,
            roll: result.roll,
            target: result.target,
            hitCount,
            hits,
            fireMode,
            weaponName: weapon.name,
        };
    }
}

export { HordeAttackResolver };
