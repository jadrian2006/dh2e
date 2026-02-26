import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { FireMode, AttackResult, DamageResult } from "./types.ts";
import { determineHitLocation } from "./hit-location.ts";
import { calculateHits } from "./fire-modes.ts";
import { calculateDamage, getLocationAP } from "./damage.ts";
import { CheckDH2e } from "@check/check.ts";
import { getQualityRuleElements } from "./weapon-qualities.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";
import { createSynthetics, type DH2eSynthetics } from "@rules/synthetics.ts";
import { resolveModifiers } from "@rules/modifier.ts";
import type { RuleElementSource } from "@rules/rule-element/base.ts";
import type { HordeDH2e } from "@actor/horde/document.ts";
import type { VehicleDH2e } from "@actor/vehicle/document.ts";
import { determineFacing } from "./vehicle-damage.ts";
import { VFXResolver } from "../vfx/resolver.ts";

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

        // Roll the attack check — pass isAttack and fireMode so the dialog
        // can offer Called Shot (only available on Standard Attack / single fire)
        const result = await CheckDH2e.roll({
            actor,
            characteristic,
            baseTarget: charValue,
            label: `${weapon.name} Attack (${fireMode === "single" ? "Single" : fireMode === "semi" ? "Semi-Auto" : "Full-Auto"})`,
            domain: `attack:${isMelee ? "melee" : "ranged"}`,
            rollOptions,
            isAttack: true,
            fireMode,
        });

        if (!result) return null; // User cancelled

        // Read called shot from the check context (set by dialog)
        const calledShot = result.context.calledShot;

        let attackResult: AttackResult;

        if (!result.dos.success) {
            // Attack missed
            attackResult = {
                success: false,
                degrees: result.dos.degrees,
                roll: result.roll,
                target: result.target,
                hitCount: 0,
                hits: [],
                fireMode,
                weaponName: weapon.name,
            };
        } else {
            // Calculate hits
            const hitCount = calculateHits(fireMode, result.dos.degrees, rofValue);

            // Determine hit locations
            const hits = [];
            // First hit: use called shot location if specified, else reversed digits
            hits.push(determineHitLocation(result.roll, calledShot));

            // Additional hits use random d100 reversed (no called shot override)
            for (let i = 1; i < hitCount; i++) {
                const randomRoll = Math.floor(Math.random() * 100) + 1;
                hits.push(determineHitLocation(randomRoll));
            }

            attackResult = {
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

        // Post attack card
        await AttackResolver.#postAttackCard(attackResult, weapon, actor);

        // Play VFX for both hits and misses
        if (VFXResolver.available) {
            const attackerToken = (actor as any).token ?? (actor as any).getActiveTokens?.()?.[0];
            const g = game as any;
            const targetToken = g.user?.targets?.first();
            if (attackerToken && targetToken) {
                VFXResolver.attack({
                    attackerToken,
                    targetToken,
                    weapon,
                    weaponClass: sys.class ?? "solid",
                    damageType: sys.damage?.type ?? "impact",
                    isAutofire: fireMode === "full" || fireMode === "semi",
                    miss: attackResult.hitCount === 0,
                });
            }
        }

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

            // Collect damage modifiers from attacker synthetics (Crushing Blow, Mighty Shot, etc.)
            const attacker = weapon.parent as Actor | undefined;
            const attackerSynthetics = (attacker as any)?.synthetics as DH2eSynthetics | undefined;
            if (attackerSynthetics) {
                const damageMods = [
                    ...(attackerSynthetics.modifiers[damageDomain] ?? []),
                    ...(attackerSynthetics.modifiers["damage:*"] ?? []),
                ];
                const { total: damageBonusTotal } = resolveModifiers(damageMods, attackerSynthetics.rollOptions);
                rawDamage += damageBonusTotal;
            }

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

        // Play damage impact VFX
        if (VFXResolver.available) {
            const targetToken = (target as any).token ?? (target as any).getActiveTokens?.()?.[0];
            if (targetToken) {
                const isCritical = results.some(r => r.woundsDealt > 0 &&
                    ((target as any).system?.wounds?.value ?? 0) <= 0);
                VFXResolver.damageImpact({
                    token: targetToken,
                    damageType: effective.type ?? "impact",
                    isCritical,
                });
            }
        }

        // Route damage to target — horde uses magnitude, others use wounds
        if ((target as any).type === "horde") {
            const horde = target as unknown as HordeDH2e;
            const totalWounds = results.reduce((sum, r) => sum + r.woundsDealt, 0);
            const qualities: string[] = weapon.effectiveQualities ?? sys.qualities ?? [];
            const isBlast = qualities.some((q: string) => q.toLowerCase().startsWith("blast"));
            const isFlame = qualities.some((q: string) => q.toLowerCase() === "flame");
            let blastRadius = 0;
            if (isBlast) {
                const blastMatch = qualities.find((q: string) => q.toLowerCase().startsWith("blast"))?.match(/\d+/);
                blastRadius = blastMatch ? parseInt(blastMatch[0], 10) : 0;
            }
            await horde.applyMagnitudeDamage(totalWounds, { isBlast, blastRadius, isFlame });
        } else if ((target as any).type === "vehicle") {
            // Determine facing from token positions if available
            const vehicle = target as unknown as VehicleDH2e;
            const totalWounds = results.reduce((sum, r) => sum + r.woundsDealt, 0);

            // Try to get token positions for facing calculation
            let facing: "front" | "side" | "rear" = "front";
            const attackerToken = (options.actor as any).token ?? (options.actor as any).getActiveTokens?.()?.[0];
            const targetToken = (target as any).token ?? (target as any).getActiveTokens?.()?.[0];
            if (attackerToken && targetToken) {
                facing = determineFacing(
                    { x: attackerToken.x, y: attackerToken.y },
                    { x: targetToken.x, y: targetToken.y, rotation: targetToken.rotation },
                );
            }

            await vehicle.applyVehicleDamage(totalWounds, facing);
        }

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
        const isGM = (game as any).user?.isGM ?? false;

        const templateData = {
            weaponName,
            targetName: target.name,
            targetId: target.id,
            hits: results,
            totalWounds,
            isGM,
            applied: false,
        };

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);

        await fd.ChatMessage.create({
            content,
            flags: {
                [SYSTEM_ID]: {
                    type: "damage",
                    result: templateData,
                    snapshot: {
                        targetId: target.id,
                        field: "system.wounds.value",
                        previous: (target as any).system?.wounds?.value ?? 0,
                        woundsDealt: totalWounds,
                        hitDetails: results.map((r) => ({
                            location: r.location,
                            woundsDealt: r.woundsDealt,
                        })),
                    },
                },
            },
        });
    }
}

export { AttackResolver };
