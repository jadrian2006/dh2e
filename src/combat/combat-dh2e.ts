import type { DH2eSynthetics } from "@rules/synthetics.ts";

/**
 * Custom Combat document for DH2E.
 *
 * - Initiative formula: 1d10 + Agility Bonus (or overridden by AttributeOverride)
 * - nextTurn: resets combatant actions, decrements condition durations
 * - Custom sorting: descending initiative, ties broken by Agility
 */
class CombatDH2e extends Combat {
    /** Override initiative formula per-combatant based on AttributeOverride REs */
    override _getInitiativeFormula(combatant: Combatant): string {
        const actor = combatant.actor as any;
        const synthetics = actor?.synthetics as DH2eSynthetics | undefined;

        if (synthetics) {
            const override = synthetics.attributeOverrides.find(o => o.domain === "initiative");
            if (override) {
                const bonus = actor.system?.characteristics?.[override.characteristic]?.bonus ?? 0;
                // Constant Vigilance: roll 2d10kh (keep highest)
                const hasCV = synthetics.rollOptions.has("talent:constant-vigilance");
                const dice = hasCV ? "2d10kh" : "1d10";
                return `${dice} + ${bonus}`;
            }
        }

        return CONFIG.Combat.initiative?.formula ?? "1d10 + @characteristics.ag.bonus";
    }

    /** Advance to the next turn, resetting actions and decrementing conditions */
    override async nextTurn(): Promise<this> {
        // Get the combatant whose turn is ending
        const current = this.combatant as CombatantDH2e | undefined;
        if (current) {
            // Reset action economy flags
            await current.resetActions();

            // Clear overwatch at end of turn
            const overwatchActive = (current as any).getFlag?.(SYSTEM_ID, "overwatchActive");
            if (overwatchActive) {
                const { OverwatchHandler } = await import("./overwatch.ts");
                await OverwatchHandler.clearOverwatch(current);
            }

            // Check grapple maintenance
            const grappleTarget = (current as any).getFlag?.(SYSTEM_ID, "grapplingWith");
            if (grappleTarget) {
                const actor = current.actor;
                const target = (game as any).actors?.get(grappleTarget);
                if (actor && target) {
                    const { GrappleHandler } = await import("./grapple.ts");
                    const maintained = await GrappleHandler.maintainGrapple(actor, target);
                    if (!maintained) {
                        ui.notifications.info(`${actor.name}'s grapple on ${target.name} is broken!`);
                    }
                }
            }

            // Process turn-start condition effects (On Fire, Bleeding)
            const actor = current.actor;
            if (actor) {
                await CombatDH2e.#processConditionEffects(actor);

                // Decrement condition durations
                await CombatDH2e.#decrementConditions(actor);
            }
        }

        return super.nextTurn() as Promise<this>;
    }

    /** Sort combatants by initiative (descending), then Agility bonus as tiebreaker */
    override _sortCombatants(
        a: Combatant,
        b: Combatant,
    ): number {
        const ia = a.initiative ?? -Infinity;
        const ib = b.initiative ?? -Infinity;
        if (ia !== ib) return ib - ia;

        // Tiebreaker: Agility bonus (higher goes first)
        const agA = (a.actor as any)?.system?.characteristics?.ag?.bonus ?? 0;
        const agB = (b.actor as any)?.system?.characteristics?.ag?.bonus ?? 0;
        if (agA !== agB) return agB - agA;

        // Final tiebreaker: alphabetical by name
        return (a.name ?? "").localeCompare(b.name ?? "");
    }

    /** Process turn-start effects for active conditions (On Fire, Bleeding) */
    static async #processConditionEffects(actor: Actor): Promise<void> {
        const conditions = actor.items.filter((i: Item) => i.type === "condition");
        const slugs = new Set(conditions.map((c: Item) => (c.system as any)?.slug));
        const actorSys = (actor as any).system;

        // On Fire: 1d10 Energy damage (ignoring armour but not TB), +1 fatigue
        if (slugs.has("on-fire")) {
            const roll = new foundry.dice.Roll("1d10");
            await roll.evaluate();
            const rawDamage = roll.total ?? 0;
            const tBonus = actorSys?.characteristics?.t?.bonus ?? 0;
            const woundsDealt = Math.max(0, rawDamage - tBonus);

            // Apply damage
            if (woundsDealt > 0) {
                const currentWounds = actorSys?.wounds?.value ?? 0;
                await actor.update({ "system.wounds.value": Math.max(0, currentWounds - woundsDealt) });
            }

            // Increment fatigue
            const currentFatigue = actorSys?.fatigue ?? 0;
            await actor.update({ "system.fatigue": currentFatigue + 1 });

            // Post chat message
            await fd.ChatMessage.create({
                content: `<div class="dh2e-condition-effect">
                    <strong>${actor.name}</strong> is <strong>On Fire!</strong>
                    <br>Takes ${rawDamage} Energy damage (${woundsDealt} after TB ${tBonus}) and gains 1 Fatigue.
                </div>`,
                speaker: fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name },
                flags: { [SYSTEM_ID]: { type: "condition-effect", condition: "on-fire" } },
            });
        }

        // Bleeding: +1 fatigue
        if (slugs.has("bleeding")) {
            const currentFatigue = actorSys?.fatigue ?? 0;
            await actor.update({ "system.fatigue": currentFatigue + 1 });

            await fd.ChatMessage.create({
                content: `<div class="dh2e-condition-effect">
                    <strong>${actor.name}</strong> is <strong>Bleeding!</strong>
                    <br>Gains 1 Fatigue from blood loss.
                </div>`,
                speaker: fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name },
                flags: { [SYSTEM_ID]: { type: "condition-effect", condition: "bleeding" } },
            });
        }
    }

    /** Decrement remainingRounds on all conditions, auto-delete expired ones */
    static async #decrementConditions(actor: Actor): Promise<void> {
        const conditions = actor.items.filter((i: Item) => i.type === "condition");
        const toDelete: string[] = [];
        const toUpdate: { _id: string; "system.remainingRounds": number }[] = [];

        for (const cond of conditions) {
            const remaining = (cond.system as any)?.remainingRounds ?? 0;
            if (remaining <= 0) continue; // 0 = permanent, skip

            const newRemaining = remaining - 1;
            if (newRemaining <= 0) {
                toDelete.push(cond.id!);
            } else {
                toUpdate.push({
                    _id: cond.id!,
                    "system.remainingRounds": newRemaining,
                });
            }
        }

        if (toUpdate.length > 0) {
            await actor.updateEmbeddedDocuments("Item", toUpdate);
        }
        if (toDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("Item", toDelete);
        }
    }
}

// Reference the custom combatant for type checking
type CombatantDH2e = InstanceType<typeof import("./combatant-dh2e.ts").CombatantDH2e>;

export { CombatDH2e };
