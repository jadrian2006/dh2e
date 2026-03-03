import type { PowerAttackData, PowerEffect, PsykerMode } from "./types.ts";
import type { DamageResult } from "@combat/types.ts";
import type { DH2eSynthetics } from "@rules/synthetics.ts";
import { substitutePR, evaluatePRNumber, substitutePRInQualities } from "./pr-formula.ts";
import { calculateDamage, getLocationAP } from "@combat/damage.ts";
import { determineHitLocation } from "@combat/hit-location.ts";
import { getQualityRuleElements } from "@combat/weapon-qualities.ts";
import { applyDiceOverrides } from "@combat/dice-overrides.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";
import { createSynthetics } from "@rules/synthetics.ts";
import { ChatApplyHandler } from "@chat/apply-handler.ts";
import { applyConditionBySlug } from "@combat/critical.ts";

/**
 * Resolves damage for psychic attack powers using the same damage pipeline
 * as weapon attacks: roll → dice overrides → AP/TB → wounds.
 */
class PowerDamageResolver {
    /**
     * Roll damage for a psychic attack power against a target.
     */
    static async rollDamage(
        actor: Actor,
        power: any,
        target: Actor,
        psyRating: number,
        dos: number,
        focusRoll: number,
        _mode: PsykerMode,
    ): Promise<DamageResult | null> {
        const sys = power.system ?? {};
        const attack: PowerAttackData = sys.attack ?? {};
        if (!attack.formula) return null;

        // Substitute PR in formula, penetration, and qualities
        const damageFormula = substitutePR(attack.formula, psyRating);
        const penetration = evaluatePRNumber(attack.penetration || "0", psyRating);
        const resolvedQualities = substitutePRInQualities(attack.qualities ?? [], psyRating);
        const damageType = attack.damageType || "energy";

        // Build dice overrides from resolved qualities
        const qualityRESources = getQualityRuleElements(resolvedQualities);
        const powerSynthetics = createSynthetics();
        for (const reSrc of qualityRESources) {
            const re = instantiateRuleElement(reSrc, power);
            if (re) re.onPrepareData(powerSynthetics);
        }
        const diceOverrides = [
            ...(powerSynthetics.diceOverrides["damage:*"] ?? []),
            ...(powerSynthetics.diceOverrides["damage:psychic"] ?? []),
        ];

        // Determine hit location from reversed focus power roll digits
        const hit = determineHitLocation(focusRoll);

        // Roll damage
        const roll = new foundry.dice.Roll(damageFormula);
        await roll.evaluate();
        let rawDamage = roll.total ?? 0;

        // Apply dice overrides
        if (diceOverrides.length > 0 && roll.dice?.length) {
            rawDamage = applyDiceOverrides(roll, diceOverrides);
        }

        // Target defenses
        const targetSys = (target as any).system;
        let toughnessBonus = targetSys?.characteristics?.t?.bonus ??
            Math.floor((targetSys?.characteristics?.t?.value ?? 0) / 10);
        let locationAP = getLocationAP(target, hit.location);

        // Power-specific bypasses
        if (attack.ignoreTB) toughnessBonus = 0;
        if (attack.ignoreAP) locationAP = 0;

        // Collect resistances and TB adjustments from target synthetics
        const targetSynthetics = (target as any).synthetics as DH2eSynthetics | undefined;
        const resistances = attack.ignoreTB ? undefined : targetSynthetics?.resistances;
        const toughnessAdjustments = attack.ignoreTB ? undefined : targetSynthetics?.toughnessAdjustments;

        const damageResult = calculateDamage(
            rawDamage,
            locationAP,
            penetration,
            toughnessBonus,
            hit.location,
            damageFormula,
            { damageType, resistances, toughnessAdjustments },
        );

        // Post damage card (reuse same template as weapon attacks)
        await PowerDamageResolver.#postDamageCard(damageResult, power.name ?? "Power", target);

        // Apply effects
        if (sys.effects?.length) {
            await PowerDamageResolver.#applyEffects(sys.effects, dos, target);
        }

        return damageResult;
    }

    /**
     * Apply healing from a psychic power to a target.
     */
    static async rollHealing(
        actor: Actor,
        power: any,
        target: Actor,
        psyRating: number,
    ): Promise<number> {
        const sys = power.system ?? {};
        if (!sys.healing) return 0;

        const woundsHealed = evaluatePRNumber(sys.healing, psyRating);
        if (woundsHealed <= 0) return 0;

        await ChatApplyHandler.applyHealing(target.id!, woundsHealed);

        // Post system note
        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
        await fd.ChatMessage.create({
            content: `<div class="dh2e chat-card system-note"><em>${game.i18n?.format("DH2E.Psychic.HealedWounds", {
                power: power.name,
                target: target.name!,
                wounds: String(woundsHealed),
            }) ?? `${power.name} healed ${woundsHealed} wounds on ${target.name}.`}</em></div>`,
            speaker,
        });

        return woundsHealed;
    }

    /** Apply condition effects from a power based on trigger conditions */
    static async #applyEffects(effects: PowerEffect[], dos: number, target: Actor): Promise<void> {
        for (const effect of effects) {
            let shouldApply = false;

            if (effect.trigger === "onSuccess") {
                shouldApply = true;
            } else if (effect.trigger === "onDoS") {
                shouldApply = dos >= (effect.dosThreshold ?? 1);
            }

            if (!shouldApply) continue;

            // Build slug with optional duration (e.g. "stunned-1")
            const slug = effect.duration
                ? `${effect.conditionSlug}-${effect.duration}`
                : effect.conditionSlug;

            await applyConditionBySlug(target, slug);
        }
    }

    static async #postDamageCard(
        result: DamageResult,
        powerName: string,
        target: Actor,
    ): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/damage-card.hbs`;
        const isGM = (game as any).user?.isGM ?? false;

        const templateData = {
            weaponName: powerName,
            targetName: target.name,
            targetId: target.id,
            hits: [result],
            totalWounds: result.woundsDealt,
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
                        woundsDealt: result.woundsDealt,
                        hitDetails: [{
                            location: result.location,
                            woundsDealt: result.woundsDealt,
                        }],
                    },
                },
            },
        });
    }
}

export { PowerDamageResolver };
