import { CheckDH2e } from "@check/check.ts";

/** Environmental hazard types */
type HazardType = "fire" | "vacuum" | "toxic" | "gravity";

/**
 * Environmental hazard handler.
 *
 * - Fire: 1d10 E damage per round
 * - Vacuum: suffocation + 1d10 damage per round
 * - Toxic: Toughness test or take damage/conditions
 * - Gravity: movement modifiers
 */
class EnvironmentHandler {
    /** Apply fire damage to an actor (1d10 E per round) */
    static async applyFire(actor: Actor): Promise<void> {
        const roll = new foundry.dice.Roll("1d10");
        await roll.evaluate();
        const damage = roll.total ?? 0;

        ui.notifications.info(`${actor.name} takes ${damage} Energy damage from fire!`);

        if ((actor as any).applyDamage) {
            await (actor as any).applyDamage(damage, "body", "energy");
        }
    }

    /** Apply vacuum effects: suffocation track + damage */
    static async applyVacuum(actor: Actor): Promise<void> {
        const tBonus = (actor as any).system?.characteristics?.t?.bonus ?? 0;
        const roll = new foundry.dice.Roll("1d10");
        await roll.evaluate();
        const damage = roll.total ?? 0;

        ui.notifications.warn(`${actor.name} suffocates in vacuum! ${damage} damage. T Bonus rounds until death: ${tBonus}`);

        if ((actor as any).applyDamage) {
            await (actor as any).applyDamage(damage, "body", "impact");
        }
    }

    /** Apply toxic environment: Toughness test or take effects */
    static async applyToxic(actor: Actor, toxicity: number = 0): Promise<void> {
        const tValue = (actor as any).system?.characteristics?.t?.value ?? 0;

        const result = await CheckDH2e.roll({
            actor,
            characteristic: "t",
            baseTarget: tValue - toxicity,
            label: `${actor.name} — Toxic Resistance`,
            domain: "check:toxic",
            skipDialog: true,
        });

        if (result && !result.dos.success) {
            ui.notifications.warn(`${actor.name} fails the Toxicity test! Apply poison effects.`);
        } else {
            ui.notifications.info(`${actor.name} resists the toxic environment.`);
        }
    }

    /** Get movement modifier for gravity conditions */
    static getGravityModifier(gravity: "low" | "high" | "zero"): { movementMult: number; agMod: number } {
        switch (gravity) {
            case "low":
                return { movementMult: 2, agMod: 10 };
            case "high":
                return { movementMult: 0.5, agMod: -10 };
            case "zero":
                return { movementMult: 0, agMod: -20 };
        }
    }
}

export { EnvironmentHandler };
export type { HazardType };
