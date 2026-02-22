import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { FireMode, AttackResult, DamageResult } from "./types.ts";
import { determineHitLocation } from "./hit-location.ts";
import { calculateHits } from "./fire-modes.ts";
import { calculateDamage, getLocationAP } from "./damage.ts";
import { CheckDH2e } from "@check/check.ts";

/**
 * Resolves a full attack sequence:
 * 1. Determine linked characteristic (WS for melee, BS for ranged)
 * 2. Roll check via CheckDH2e
 * 3. On success: determine hit count from fire mode
 * 4. Determine hit locations (reversed digits for first, random for extras)
 * 5. Post attack card with [Roll Damage] button
 */
class AttackResolver {
    static async resolve(options: {
        actor: Actor;
        weapon: any;
        fireMode: FireMode;
    }): Promise<AttackResult | null> {
        const { actor, weapon, fireMode } = options;
        const sys = weapon.system ?? weapon.skillSystem ?? {};

        // Determine linked characteristic
        const isMelee = sys.class === "melee";
        const characteristic: CharacteristicAbbrev = isMelee ? "ws" : "bs";
        const actorSys = (actor as any).system;
        const charValue = actorSys?.characteristics?.[characteristic]?.value ?? 0;

        // Determine RoF value
        let rofValue = 1;
        if (fireMode === "semi") rofValue = sys.rof?.semi ?? 2;
        if (fireMode === "full") rofValue = sys.rof?.full ?? 4;

        // Roll the attack check
        const result = await CheckDH2e.roll({
            actor,
            characteristic,
            baseTarget: charValue,
            label: `${weapon.name} Attack (${fireMode === "single" ? "Single" : fireMode === "semi" ? "Semi-Auto" : "Full-Auto"})`,
            domain: `attack:${isMelee ? "melee" : "ranged"}`,
        });

        if (!result) return null; // User cancelled

        if (!result.dos.success) {
            // Attack missed
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

        // Calculate hits
        const hitCount = calculateHits(fireMode, result.dos.degrees, rofValue);

        // Determine hit locations
        const hits = [];
        // First hit uses reversed digits of the attack roll
        hits.push(determineHitLocation(result.roll));

        // Additional hits use random d100 reversed
        for (let i = 1; i < hitCount; i++) {
            const randomRoll = Math.floor(Math.random() * 100) + 1;
            hits.push(determineHitLocation(randomRoll));
        }

        const attackResult: AttackResult = {
            success: true,
            degrees: result.dos.degrees,
            roll: result.roll,
            target: result.target,
            hitCount,
            hits,
            fireMode,
            weaponName: weapon.name,
        };

        // Post attack card
        await AttackResolver.#postAttackCard(attackResult, weapon, actor);

        return attackResult;
    }

    /** Roll damage for all hits in an attack result */
    static async rollDamage(
        attackResult: AttackResult,
        weapon: any,
        target: Actor,
    ): Promise<DamageResult[]> {
        const sys = weapon.system ?? {};
        const formula = sys.damage?.formula ?? "1d10";
        const penetration = sys.penetration ?? 0;
        const targetSys = (target as any).system;
        const toughnessBonus = targetSys?.characteristics?.t?.bonus ??
            Math.floor((targetSys?.characteristics?.t?.value ?? 0) / 10);

        const results: DamageResult[] = [];

        for (const hit of attackResult.hits) {
            const roll = new Roll(formula);
            await roll.evaluate();
            const rawDamage = roll.total ?? 0;

            const locationAP = getLocationAP(target, hit.location);

            const damageResult = calculateDamage(
                rawDamage,
                locationAP,
                penetration,
                toughnessBonus,
                hit.location,
                formula,
            );

            results.push(damageResult);
        }

        // Post damage card
        await AttackResolver.#postDamageCard(results, attackResult.weaponName, target);

        return results;
    }

    static async #postAttackCard(
        result: AttackResult,
        weapon: any,
        actor: Actor,
    ): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/attack-card.hbs`;
        const templateData = {
            success: result.success,
            degrees: result.degrees,
            roll: result.roll,
            target: result.target,
            hitCount: result.hitCount,
            hits: result.hits,
            fireMode: result.fireMode,
            weaponName: result.weaponName,
            weaponId: weapon.id,
            actorId: actor.id,
        };

        const content = await renderTemplate(templatePath, templateData);
        const speaker = ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };

        await ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "attack",
                    result: templateData,
                },
            },
        });
    }

    static async #postDamageCard(
        results: DamageResult[],
        weaponName: string,
        target: Actor,
    ): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/damage-card.hbs`;
        const totalWounds = results.reduce((sum, r) => sum + r.woundsDealt, 0);

        const templateData = {
            weaponName,
            targetName: target.name,
            hits: results,
            totalWounds,
        };

        const content = await renderTemplate(templatePath, templateData);

        await ChatMessage.create({
            content,
            flags: {
                [SYSTEM_ID]: {
                    type: "damage",
                    result: templateData,
                },
            },
        });
    }
}

export { AttackResolver };
