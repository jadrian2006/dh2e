import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { FireMode, AttackResult, DamageResult } from "./types.ts";
import { determineHitLocation } from "./hit-location.ts";
import { calculateHits } from "./fire-modes.ts";
import { calculateDamage, getLocationAP } from "./damage.ts";
import { CheckDH2e } from "@check/check.ts";
import { getQualityRuleElements } from "./weapon-qualities.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";
import { createSynthetics, type DH2eSynthetics } from "@rules/synthetics.ts";
import type { RuleElementSource } from "@rules/rule-element/base.ts";

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

        // Collect weapon quality REs for roll options
        const qualities: string[] = weapon.effectiveQualities ?? sys.qualities ?? [];
        const qualityRESources = getQualityRuleElements(qualities);

        // Build weapon-specific roll options
        const rollOptions = new Set<string>();
        rollOptions.add(`weapon:class:${sys.class}`);
        if (fireMode !== "single") rollOptions.add(`weapon:firemode:${fireMode}`);

        // Inject quality roll options (apply quality REs to a temporary synthetics)
        const weaponSynthetics = createSynthetics();
        for (const reSrc of qualityRESources) {
            const re = instantiateRuleElement(reSrc, weapon);
            if (re) re.onPrepareData(weaponSynthetics);
        }
        // Merge weapon quality roll options
        for (const opt of weaponSynthetics.rollOptions) {
            rollOptions.add(opt);
        }

        // Roll the attack check
        const result = await CheckDH2e.roll({
            actor,
            characteristic,
            baseTarget: charValue,
            label: `${weapon.name} Attack (${fireMode === "single" ? "Single" : fireMode === "semi" ? "Semi-Auto" : "Full-Auto"})`,
            domain: `attack:${isMelee ? "melee" : "ranged"}`,
            rollOptions,
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

        // Use effective damage (includes ammo mods) if available
        const effective = weapon.effectiveDamage ?? {
            formula: sys.damage?.formula ?? "1d10",
            type: sys.damage?.type ?? "impact",
            bonus: sys.damage?.bonus ?? 0,
            penetration: sys.penetration ?? 0,
        };
        const formula = effective.formula;
        const penetration = effective.penetration;
        const damageType = effective.type;

        const targetSys = (target as any).system;
        const toughnessBonus = targetSys?.characteristics?.t?.bonus ??
            Math.floor((targetSys?.characteristics?.t?.value ?? 0) / 10);

        // Collect resistances and TB adjustments from target synthetics
        const targetSynthetics = (target as any).synthetics as DH2eSynthetics | undefined;
        const resistances = targetSynthetics?.resistances;
        const toughnessAdjustments = targetSynthetics?.toughnessAdjustments;

        // Collect dice overrides from weapon qualities
        const qualities: string[] = weapon.effectiveQualities ?? sys.qualities ?? [];
        const qualityRESources = getQualityRuleElements(qualities);
        const weaponSynthetics = createSynthetics();
        for (const reSrc of qualityRESources) {
            const re = instantiateRuleElement(reSrc, weapon);
            if (re) re.onPrepareData(weaponSynthetics);
        }
        const isMelee = sys.class === "melee";
        const damageDomain = `damage:${isMelee ? "melee" : "ranged"}`;
        const diceOverrides = [
            ...(weaponSynthetics.diceOverrides[damageDomain] ?? []),
            ...(weaponSynthetics.diceOverrides["damage:*"] ?? []),
        ];

        const results: DamageResult[] = [];

        for (const hit of attackResult.hits) {
            const roll = new foundry.dice.Roll(formula);
            await roll.evaluate();
            let rawDamage = roll.total ?? 0;

            // Apply dice overrides
            if (diceOverrides.length > 0 && roll.dice?.length) {
                rawDamage = AttackResolver.#applyDiceOverrides(roll, diceOverrides);
            }

            // Add damage bonus
            rawDamage += effective.bonus;

            const locationAP = getLocationAP(target, hit.location);

            const damageResult = calculateDamage(
                rawDamage,
                locationAP,
                penetration,
                toughnessBonus,
                hit.location,
                formula,
                { damageType, resistances, toughnessAdjustments },
            );

            results.push(damageResult);
        }

        // Post damage card
        await AttackResolver.#postDamageCard(results, attackResult.weaponName, target);

        return results;
    }

    /** Apply dice override effects (Tearing, Proven, Primitive) to a damage roll */
    static #applyDiceOverrides(
        roll: any,
        overrides: { mode: string; value?: number; source: string }[],
    ): number {
        const dice = roll.dice ?? [];
        if (dice.length === 0) return roll.total ?? 0;

        // Get all individual die results
        let results: number[] = [];
        for (const die of dice) {
            results.push(...(die.results?.map((r: any) => r.result) ?? []));
        }

        for (const override of overrides) {
            if (override.mode === "rerollLowest" && results.length > 0) {
                // Tearing: re-roll the lowest die
                const minIdx = results.indexOf(Math.min(...results));
                const faces = dice[0]?.faces ?? 10;
                results[minIdx] = Math.floor(Math.random() * faces) + 1;
            } else if (override.mode === "minimumDie" && override.value) {
                // Proven: any die below the value counts as the value
                results = results.map((r) => Math.max(r, override.value!));
            } else if (override.mode === "maximizeDie" && override.value) {
                // Primitive: cap each die at the given value
                results = results.map((r) => Math.min(r, override.value!));
            }
        }

        return results.reduce((sum, r) => sum + r, 0);
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

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);
        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };

        await fd.ChatMessage.create({
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

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);

        await fd.ChatMessage.create({
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
