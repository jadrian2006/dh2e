import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { FireMode, MeleeMode, AttackResult, DamageResult, DamageModifierEntry } from "./types.ts";
import { determineHitLocation } from "./hit-location.ts";
import { calculateHits } from "./fire-modes.ts";
import { calculateDamage, getLocationAP } from "./damage.ts";
import { CheckDH2e } from "@check/check.ts";
import { ModifierDH2e, resolveModifiers } from "@rules/modifier.ts";
import { getQualityRuleElements } from "./weapon-qualities.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";
import { createSynthetics, type DH2eSynthetics } from "@rules/synthetics.ts";
import type { RuleElementSource } from "@rules/rule-element/base.ts";
import type { HordeDH2e } from "@actor/horde/document.ts";
import type { VehicleDH2e } from "@actor/vehicle/document.ts";
import { determineFacing } from "./vehicle-damage.ts";
import { VFXResolver } from "../vfx/resolver.ts";
import { consumeAmmo, canFire } from "./ammo.ts";
import { getTargetConditionBonuses } from "./target-condition-modifiers.ts";
import { getCraftsmanshipRuleElements } from "./craftsmanship.ts";
import { isInCombat, consumeCombatAction } from "./combat-state.ts";
import { applyDiceOverrides } from "./dice-overrides.ts";

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
        isCharge?: boolean;
        meleeMode?: MeleeMode;
        isDualWield?: boolean;
        isOffHand?: boolean;
    }): Promise<AttackResult | null> {
        const { actor, weapon, fireMode, isCharge, meleeMode, isDualWield, isOffHand } = options;
        const sys = weapon.system ?? weapon.skillSystem ?? {};

        // Check ammo availability for ranged weapons before proceeding
        const magMax = sys.magazine?.max ?? 0;
        if (magMax > 0 && !canFire(weapon, fireMode)) {
            const modeLabel = fireMode === "single" ? "Single Shot" : fireMode === "semi" ? "Semi-Auto" : "Full Auto";
            ui.notifications.warn(game.i18n?.format("DH2E.Ammo.Insufficient", {
                mode: modeLabel,
                required: String(fireMode === "single" ? 1 : fireMode === "semi" ? (sys.rof?.semi ?? 2) : (sys.rof?.full ?? 4)),
                available: String(sys.magazine?.value ?? 0),
            }) ?? `Insufficient ammunition for ${modeLabel}.`);
            return null;
        }

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

        // Add weapon group roll option (for Mono Upgrade predicate etc.)
        const weaponGroup = sys.weaponGroup ?? sys.group;
        if (weaponGroup) {
            rollOptions.add(`weapon-group:${weaponGroup}`);
        }

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

        // Synthesize craftsmanship modifiers for the weapon
        const craftsmanship = sys.craftsmanship ?? "common";
        const craftsmanshipREs = getCraftsmanshipRuleElements(craftsmanship);
        for (const reSrc of craftsmanshipREs) {
            const re = instantiateRuleElement(reSrc, weapon);
            if (re) re.onPrepareData(weaponSynthetics);
        }

        // Resolve and process weapon modification REs
        const modificationUuids: string[] = sys.modifications ?? [];
        for (const uuid of modificationUuids) {
            try {
                const modItem = await fromUuid(uuid);
                if (!modItem) continue;
                const modRules: RuleElementSource[] = (modItem as any).system?.rules ?? [];
                for (const reSrc of modRules) {
                    const re = instantiateRuleElement(reSrc, weapon);
                    if (re) re.onPrepareData(weaponSynthetics);
                }
            } catch {
                // Skip unresolvable modification UUIDs
            }
        }

        // Weapon Training: untrained penalty (-20)
        const actorSynthetics = (actor as any).synthetics as DH2eSynthetics | undefined;
        if (weaponGroup && actorSynthetics) {
            if (!actorSynthetics.rollOptions.has(`weapon-training:${weaponGroup}`)) {
                const untrainedRE: RuleElementSource = {
                    key: "FlatModifier",
                    domain: `attack:${isMelee ? "melee" : "ranged"}`,
                    value: -20,
                    label: game.i18n?.localize("DH2E.Attack.Untrained") ?? "Untrained Weapon (-20)",
                    source: "weapon-training",
                    toggleable: false,
                };
                const re = instantiateRuleElement(untrainedRE, weapon);
                if (re) re.onPrepareData(weaponSynthetics);
            }
        }

        // Two-Weapon Fighting penalties
        if (isDualWield && actorSynthetics) {
            const hasTWM = actorSynthetics.rollOptions.has("talent:two-weapon-master");
            const hasAmbi = actorSynthetics.rollOptions.has("talent:ambidextrous");
            const hasTWW = isMelee
                ? actorSynthetics.rollOptions.has("talent:two-weapon-wielder:melee")
                : actorSynthetics.rollOptions.has("talent:two-weapon-wielder:ranged");

            let penalty = 0;
            if (hasTWM) {
                penalty = 0;
            } else if (hasTWW && hasAmbi) {
                penalty = -10;
            } else if (hasTWW && isOffHand) {
                penalty = -20;
            } else if (hasTWW) {
                penalty = -10;
            }

            if (penalty !== 0) {
                const twfLabel = isOffHand
                    ? (game.i18n?.localize("DH2E.Attack.OffHandPenalty") ?? "Off-Hand Penalty")
                    : (game.i18n?.localize("DH2E.Attack.DualWieldPenalty") ?? "Two-Weapon Penalty");
                const twfRE: RuleElementSource = {
                    key: "FlatModifier",
                    domain: `attack:${isMelee ? "melee" : "ranged"}`,
                    value: penalty,
                    label: twfLabel,
                    source: "two-weapon-fighting",
                    toggleable: false,
                };
                const re = instantiateRuleElement(twfRE, weapon);
                if (re) re.onPrepareData(weaponSynthetics);
            }

            rollOptions.add("attack:dual-wield");
            if (isOffHand) rollOptions.add("attack:off-hand");
        }

        // Inject target condition roll options and attacker bonuses
        const g = game as any;
        const targetToken = g.user?.targets?.first();
        const targetActor = targetToken?.actor as Actor | undefined;
        let targetIsHelpless = false;

        if (targetActor) {
            const targetBonuses = getTargetConditionBonuses(targetActor, isMelee);
            for (const opt of targetBonuses.rollOptions) {
                rollOptions.add(opt);
            }
            // Inject target condition modifier REs into weapon synthetics
            for (const reSrc of targetBonuses.modifiers) {
                const re = instantiateRuleElement(reSrc, weapon);
                if (re) re.onPrepareData(weaponSynthetics);
            }
            targetIsHelpless = rollOptions.has("target:helpless");
        }

        // Range band detection — determine distance, set roll options, inject modifiers
        const attackerToken = (actor as any).token ?? (actor as any).getActiveTokens?.()?.[0];
        if (targetToken && attackerToken) {
            const scene = g.scenes?.active;
            const gridSize = scene?.grid?.size ?? 100;
            const gridDistance = scene?.grid?.distance ?? 1;

            // Edge-to-edge distance (handles tokens of any size)
            const t1 = attackerToken.document ?? attackerToken;
            const t2 = targetToken.document ?? targetToken;
            const w1 = (t1.width ?? 1) * gridSize;
            const h1 = (t1.height ?? 1) * gridSize;
            const w2 = (t2.width ?? 1) * gridSize;
            const h2 = (t2.height ?? 1) * gridSize;
            const gapX = Math.max(0, Math.max(t2.x - (t1.x + w1), t1.x - (t2.x + w2)));
            const gapY = Math.max(0, Math.max(t2.y - (t1.y + h1), t1.y - (t2.y + h2)));
            const distanceMetres = (Math.hypot(gapX, gapY) / gridSize) * gridDistance;

            if (isMelee) {
                // Melee: must be adjacent (within 1 grid square edge-to-edge)
                // Skip check for charges (movement is part of the charge action)
                if (!isCharge && distanceMetres > gridDistance) {
                    ui.notifications.warn(
                        game.i18n?.format("DH2E.Attack.OutOfMeleeRange", {
                            distance: distanceMetres.toFixed(1),
                        }) ?? `Target is ${distanceMetres.toFixed(1)}m away — too far for melee.`,
                    );
                    return null;
                }

                // Ganging Up: +10 WS per additional ally in melee with the same target
                const allyCount = AttackResolver.#countMeleeAllies(actor, targetToken, gridSize, gridDistance);
                if (allyCount > 0) {
                    rollOptions.add("melee:ganging-up");
                    const gangUpRE: RuleElementSource = {
                        key: "FlatModifier",
                        domain: "attack:melee",
                        value: 10 * allyCount,
                        label: game.i18n?.format("DH2E.Attack.GangingUp", {
                            count: String(allyCount),
                        }) ?? `Ganging Up (${allyCount} ${allyCount === 1 ? "ally" : "allies"})`,
                        source: "situational",
                        toggleable: false,
                    };
                    const re = instantiateRuleElement(gangUpRE, weapon);
                    if (re) re.onPrepareData(weaponSynthetics);
                }

                // Fanatic: Hatred — +10 WS on melee attacks while hatred is active
                const hatredCombatId = (actor as any).getFlag?.(SYSTEM_ID, "hatredActive");
                if (hatredCombatId && hatredCombatId === g.combat?.id) {
                    rollOptions.add("melee:hatred");
                    const hatredRE: RuleElementSource = {
                        key: "FlatModifier",
                        domain: "attack:melee",
                        value: 10,
                        label: game.i18n?.localize("DH2E.Hatred.Label") ?? "Hatred",
                        source: game.i18n?.localize("DH2E.FatePoint") ?? "Fate Point",
                        toggleable: false,
                    };
                    const hatredEl = instantiateRuleElement(hatredRE, weapon);
                    if (hatredEl) hatredEl.onPrepareData(weaponSynthetics);
                }
            } else {
                // Ranged: determine range band
                const weaponRange = sys.range ?? 0;
                if (weaponRange > 0) {
                    let rangeBand: string;
                    let rangeMod = 0;
                    let rangeLabelKey: string;

                    if (distanceMetres <= 3) {
                        rangeBand = "point-blank";
                        rangeMod = 30;
                        rangeLabelKey = "DH2E.Range.PointBlank";
                    } else if (distanceMetres <= weaponRange / 2) {
                        rangeBand = "short";
                        rangeMod = 10;
                        rangeLabelKey = "DH2E.Range.Short";
                    } else if (distanceMetres <= weaponRange) {
                        rangeBand = "standard";
                        rangeMod = 0;
                        rangeLabelKey = "DH2E.Range.Standard";
                    } else if (distanceMetres <= weaponRange * 2) {
                        rangeBand = "long";
                        rangeMod = -10;
                        rangeLabelKey = "DH2E.Range.Long";
                    } else if (distanceMetres <= weaponRange * 3) {
                        rangeBand = "extreme";
                        rangeMod = -30;
                        rangeLabelKey = "DH2E.Range.Extreme";
                    } else {
                        ui.notifications.warn(
                            game.i18n?.format("DH2E.Attack.OutOfRange", {
                                distance: distanceMetres.toFixed(0),
                                max: String(weaponRange * 3),
                            }) ?? `Target is ${distanceMetres.toFixed(0)}m away — beyond maximum range (${weaponRange * 3}m).`,
                        );
                        return null;
                    }

                    rollOptions.add(`range:${rangeBand}`);

                    // Marksman: negate long/extreme range penalties
                    if (rangeMod < 0 && actorSynthetics?.rollOptions?.has("talent:marksman")) {
                        rangeMod = 0;
                    }

                    if (rangeMod !== 0) {
                        const rangeModRE: RuleElementSource = {
                            key: "FlatModifier",
                            domain: "attack:ranged",
                            value: rangeMod,
                            label: game.i18n?.localize(rangeLabelKey!) ?? rangeBand,
                            source: "range",
                            toggleable: false,
                        };
                        const re = instantiateRuleElement(rangeModRE, weapon);
                        if (re) re.onPrepareData(weaponSynthetics);
                    }
                }
            }
        }

        // Charge: add roll option and +20 WS modifier (melee only)
        if (isCharge && isMelee) {
            rollOptions.add("action:charge");
            const chargeModRE: RuleElementSource = {
                key: "FlatModifier",
                domain: `attack:melee`,
                value: 20,
                label: game.i18n?.localize("DH2E.Attack.ChargeBonus") ?? "Charge (+20 WS)",
                source: "charge",
                toggleable: false,
            };
            const re = instantiateRuleElement(chargeModRE, weapon);
            if (re) re.onPrepareData(weaponSynthetics);
        }

        // All Out Attack: add roll option for Hammer Blow predicate
        if (meleeMode === "standard" && isMelee) {
            // All Out Attack is detected from combat HUD — check for the action flag
            const combatant = g.combat?.getCombatantByActor?.(actor.id);
            const turnEffects = combatant?.getFlag?.(SYSTEM_ID, "turnEffects") ?? [];
            if ((turnEffects as string[]).includes("all-out-attack")) {
                rollOptions.add("action:all-out-attack");
            }
        }

        // Melee multi-attack mode roll options
        if (meleeMode === "swift") rollOptions.add("attack:swift-attack");
        if (meleeMode === "lightning") rollOptions.add("attack:lightning-attack");

        // Collect weapon-local attack modifiers and pass as direct modifiers to CheckDH2e
        const attackDomain = `attack:${isMelee ? "melee" : "ranged"}`;
        const weaponAttackMods: ModifierDH2e[] = [];
        for (const mod of weaponSynthetics.modifiers[attackDomain] ?? []) {
            weaponAttackMods.push(mod);
        }

        // Resolve penetration bonus from weapon modifications (Mono Upgrade etc.)
        let penetrationBonus = 0;
        const penMods = weaponSynthetics.modifiers["penetration"] ?? [];
        if (penMods.length > 0) {
            const { total: penTotal } = resolveModifiers(penMods, rollOptions);
            penetrationBonus = penTotal;
        }

        // Helpless melee: auto-hit with DoS = attacker's WS bonus (skip roll)
        if (targetIsHelpless && isMelee) {
            const wsBonus = actorSys?.characteristics?.ws?.bonus ?? 0;
            const calledShot = undefined; // No called shot on auto-hit

            const hits = [];
            hits.push(determineHitLocation(Math.floor(Math.random() * 100) + 1, calledShot));

            const attackResult: AttackResult = {
                success: true,
                degrees: wsBonus,
                roll: 0,
                target: charValue,
                hitCount: 1,
                hits,
                fireMode,
                meleeMode,
                weaponName: weapon.name,
                attackRollOptions: [...rollOptions],
                penetrationBonus,
            };

            // Consume combat action (charge = full, standard = half)
            const helplessActionType = isCharge ? "full" : "half";
            const consumed = await consumeCombatAction(actor.id!, helplessActionType);
            if (!consumed) return null;

            // Consume ammunition for ranged weapons
            let roundsConsumed = 0;
            if (magMax > 0) {
                const ammoResult = await consumeAmmo(weapon, fireMode);
                if (ammoResult) roundsConsumed = ammoResult.consumed;
            }

            await AttackResolver.#postAttackCard(attackResult, weapon, actor, roundsConsumed, targetActor?.id);
            return attackResult;
        }

        // Build attack label
        let attackLabel: string;
        if (isCharge) {
            attackLabel = game.i18n?.format("DH2E.Attack.ChargeLabel", { weapon: weapon.name }) ?? `${weapon.name} Charge Attack`;
        } else if (meleeMode === "swift") {
            attackLabel = `${weapon.name} ${game.i18n?.localize("DH2E.Attack.SwiftAttack") ?? "Swift Attack"}`;
        } else if (meleeMode === "lightning") {
            attackLabel = `${weapon.name} ${game.i18n?.localize("DH2E.Attack.LightningAttack") ?? "Lightning Attack"}`;
        } else {
            attackLabel = `${weapon.name} Attack (${fireMode === "single" ? "Single" : fireMode === "semi" ? "Semi-Auto" : "Full-Auto"})`;
        }

        const result = await CheckDH2e.roll({
            actor,
            characteristic,
            baseTarget: charValue,
            label: attackLabel,
            domain: attackDomain,
            rollOptions,
            modifiers: weaponAttackMods,
            isAttack: true,
            fireMode,
        });

        if (!result) return null; // User cancelled

        // Consume combat action
        const isFullAction = isCharge || meleeMode === "swift" || meleeMode === "lightning";
        const actionType = isFullAction ? "full" : "half";
        const actionConsumed = await consumeCombatAction(actor.id!, actionType);
        if (!actionConsumed) return null;

        // Read called shot from the check context (set by dialog)
        const calledShot = result.context.calledShot;

        // Close Quarters Discipline: +1 DoS on melee or point-blank/short range attacks
        if (result.dos.success) {
            const actorSynth = (actor as any).synthetics;
            if (actorSynth?.rollOptions?.has("self:background:close-quarters-discipline")) {
                if (isMelee || rollOptions.has("range:point-blank") || rollOptions.has("range:short")) {
                    result.dos.degrees += 1;
                }
            }
        }

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
                meleeMode,
                weaponName: weapon.name,
                attackRollOptions: [...rollOptions],
                penetrationBonus,
                isDualWield,
                isOffHand,
            };
        } else {
            // Calculate hits — melee multi-attack uses same logic as fire modes
            let hitCount: number;
            if (meleeMode === "swift") {
                hitCount = 1 + Math.floor(result.dos.degrees / 2);
            } else if (meleeMode === "lightning") {
                hitCount = 1 + result.dos.degrees;
            } else {
                hitCount = calculateHits(fireMode, result.dos.degrees, rofValue);
            }

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
                meleeMode,
                weaponName: weapon.name,
                attackRollOptions: [...rollOptions],
                penetrationBonus,
                isDualWield,
                isOffHand,
            };
        }

        // Consume ammunition for ranged weapons (with out-of-combat confirmation)
        let roundsConsumed = 0;
        if (magMax > 0) {
            const roundsNeeded = fireMode === "single" ? 1 : fireMode === "semi" ? (sys.rof?.semi ?? 2) : (sys.rof?.full ?? 4);
            let shouldConsume = true;

            if (!isInCombat()) {
                // Out of combat — prompt for confirmation
                shouldConsume = await new Promise<boolean>((resolve) => {
                    const d = new (fd.DialogV2 ?? fd.Dialog as any)({
                        window: { title: game.i18n?.localize("DH2E.Ammo.OutOfCombatTitle") ?? "Out of Combat" },
                        content: `<p>${game.i18n?.format("DH2E.Ammo.OutOfCombatPrompt", {
                            rounds: String(roundsNeeded),
                            weapon: weapon.name,
                        }) ?? `You are not in combat. Consume ${roundsNeeded} round(s) from ${weapon.name}?`}</p>`,
                        buttons: [{
                            action: "yes",
                            label: game.i18n?.localize("DH2E.Confirm") ?? "Yes",
                            callback: () => resolve(true),
                        }, {
                            action: "no",
                            label: game.i18n?.localize("DH2E.Cancel") ?? "No",
                            callback: () => resolve(false),
                        }],
                        close: () => resolve(false),
                    });
                    d.render({ force: true });
                });
            }

            if (shouldConsume) {
                const ammoResult = await consumeAmmo(weapon, fireMode);
                if (ammoResult) {
                    roundsConsumed = ammoResult.consumed;
                }
            }
        }

        // Post attack card
        await AttackResolver.#postAttackCard(attackResult, weapon, actor, roundsConsumed, targetActor?.id);

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
        attackRollOptions?: string[],
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
        let penetration = effective.penetration;
        const damageType = effective.type;

        // Apply penetration bonus from weapon modifications (Mono Upgrade etc.)
        if (attackResult.penetrationBonus) {
            penetration += attackResult.penetrationBonus;
        }

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

        // Hammer of the Emperor: re-roll 1s and 2s if an ally attacked the same target
        const attacker = weapon.parent as Actor | undefined;
        const attackerSynthetics = (attacker as any)?.synthetics as DH2eSynthetics | undefined;
        if (attackerSynthetics?.rollOptions?.has("self:background:hammer-of-the-emperor")) {
            if (AttackResolver.#checkAllyAttacked(attacker!.id!, target.id!)) {
                diceOverrides.push({
                    mode: "rerollBelow",
                    value: 2,
                    source: game.i18n?.localize("DH2E.HammerOfTheEmperor.Label") ?? "Hammer of the Emperor",
                });
                ui.notifications.info(
                    game.i18n?.format("DH2E.HammerOfTheEmperor.Applied", {
                        actor: attacker!.name ?? "",
                    }) ?? "Hammer of the Emperor: Re-rolling 1s and 2s on damage.",
                );
            }
        }

        // Check if target is helpless for double-damage rule
        const targetConditions = new Set<string>();
        for (const item of target.items) {
            if (item.type !== "condition") continue;
            const slug = (item.system as any)?.slug;
            if (slug) targetConditions.add(slug);
        }
        const targetSynth = (target as any).synthetics;
        const isHelpless = targetConditions.has("helpless") ||
            targetSynth?.rollOptions?.has("self:helpless");

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

            // Track damage modifier breakdown
            const modifierBreakdown: DamageModifierEntry[] = [];

            // Collect damage modifiers from attacker synthetics (Crushing Blow, Mighty Shot, etc.)
            if (attackerSynthetics) {
                const damageMods = [
                    ...(attackerSynthetics.modifiers[damageDomain] ?? []),
                    ...(attackerSynthetics.modifiers["damage:*"] ?? []),
                ];
                // Merge attack-time rollOptions so predicated damage modifiers (e.g. Brutal Charge) resolve correctly
                const damageRollOptions = new Set(attackerSynthetics.rollOptions);
                if (attackRollOptions) {
                    for (const opt of attackRollOptions) damageRollOptions.add(opt);
                }
                const { total: damageBonusTotal, applied } = resolveModifiers(damageMods, damageRollOptions);
                rawDamage += damageBonusTotal;

                // Record each applied modifier for breakdown
                for (const mod of applied) {
                    modifierBreakdown.push({
                        label: mod.label,
                        value: mod.value,
                        source: mod.source,
                    });
                }
            }

            // Helpless: roll damage twice, sum both results
            if (isHelpless) {
                const roll2 = new foundry.dice.Roll(formula);
                await roll2.evaluate();
                let rawDamage2 = roll2.total ?? 0;
                if (diceOverrides.length > 0 && roll2.dice?.length) {
                    rawDamage2 = AttackResolver.#applyDiceOverrides(roll2, diceOverrides);
                }
                rawDamage2 += effective.bonus;
                rawDamage += rawDamage2;
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

            // Attach modifier breakdown
            damageResult.modifiers = modifierBreakdown;

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
            const atkToken = (attacker as any)?.token ?? (attacker as any)?.getActiveTokens?.()?.[0];
            const tgtToken = (target as any).token ?? (target as any).getActiveTokens?.()?.[0];
            if (atkToken && tgtToken) {
                facing = determineFacing(
                    { x: atkToken.x, y: atkToken.y },
                    { x: tgtToken.x, y: tgtToken.y, rotation: tgtToken.rotation },
                );
            }

            await vehicle.applyVehicleDamage(totalWounds, facing);
        }

        return results;
    }

    /** Apply dice override effects — delegates to shared utility */
    static #applyDiceOverrides(
        roll: any,
        overrides: { mode: string; value?: number; source: string }[],
    ): number {
        return applyDiceOverrides(roll, overrides);
    }

    /** Check if any ally attacked the same target in recent chat messages */
    /** Count friendly tokens in melee range of the target (excluding the attacker) */
    static #countMeleeAllies(attacker: Actor, targetToken: any, gridSize: number, gridDistance: number): number {
        const scene = (game as any).scenes?.active;
        if (!scene) return 0;
        const t2 = targetToken.document ?? targetToken;
        const w2 = (t2.width ?? 1) * gridSize;
        const h2 = (t2.height ?? 1) * gridSize;

        // Get all tokens on the scene that are friendly to the attacker
        const attackerDisposition = ((attacker as any).token?.document ?? (attacker as any).getActiveTokens?.()?.[0]?.document)?.disposition ?? 1;

        let count = 0;
        for (const token of scene.tokens ?? []) {
            // Skip the attacker and the target
            if (token.actor?.id === attacker.id) continue;
            if (token.actor?.id === t2.actorId) continue;
            // Only count tokens with the same disposition (friendly)
            if ((token.disposition ?? 1) !== attackerDisposition) continue;
            // Check if this token is adjacent to the target (edge-to-edge ≤ 1 grid square)
            const tw = (token.width ?? 1) * gridSize;
            const th = (token.height ?? 1) * gridSize;
            const gX = Math.max(0, Math.max(t2.x - (token.x + tw), token.x - (t2.x + w2)));
            const gY = Math.max(0, Math.max(t2.y - (token.y + th), token.y - (t2.y + h2)));
            const edgeDist = (Math.hypot(gX, gY) / gridSize) * gridDistance;
            if (edgeDist <= gridDistance) count++;
        }
        return count;
    }

    static #checkAllyAttacked(attackerId: string, targetId: string): boolean {
        const g = game as any;
        const messages = g.messages?.contents ?? [];
        // Scan last 30 messages for ally attack cards targeting the same actor
        const recent = messages.slice(-30);
        for (const msg of recent) {
            const flags = msg.flags?.[SYSTEM_ID];
            if (!flags || flags.type !== "attack") continue;
            const result = flags.result;
            if (!result) continue;
            // Different attacker (ally), same target
            if (result.actorId !== attackerId && result.targetActorId === targetId) {
                return true;
            }
        }
        return false;
    }

    static async #postAttackCard(
        result: AttackResult,
        weapon: any,
        actor: Actor,
        roundsConsumed: number = 0,
        targetActorId?: string,
    ): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/attack-card.hbs`;
        const sys = weapon.system ?? {};
        const isMelee = sys.class === "melee";
        const templateData = {
            success: result.success,
            degrees: result.degrees,
            roll: result.roll,
            target: result.target,
            hitCount: result.hitCount,
            hits: result.hits,
            fireMode: result.fireMode,
            meleeMode: result.meleeMode,
            weaponName: result.weaponName,
            weaponId: weapon.id,
            actorId: actor.id,
            targetActorId: targetActorId ?? undefined,
            isRanged: !isMelee,
            hasAmmo: roundsConsumed > 0,
            roundsConsumed,
            clipRemaining: sys.magazine?.value ?? 0,
            attackRollOptions: result.attackRollOptions ?? [],
            penetrationBonus: result.penetrationBonus ?? 0,
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
                    ammo: roundsConsumed > 0 ? {
                        weaponId: weapon.id,
                        roundsConsumed,
                        recovered: false,
                    } : undefined,
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
