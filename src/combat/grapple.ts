import { CheckDH2e } from "@check/check.ts";

/** Grapple action types */
type GrappleAction = "damage" | "push" | "throw" | "breakFree";

/**
 * Grapple handler.
 *
 * Initiating a grapple: opposed WS test.
 * Each round: opposed Strength tests to maintain.
 * Actions while grappling: damage, push, throw, break free.
 */
class GrappleHandler {
    /**
     * Initiate a grapple — opposed WS test.
     * On success, links the two combatants via flags.
     */
    static async initiate(attacker: Actor, defender: Actor): Promise<boolean> {
        const attackerWS = (attacker as any).system?.characteristics?.ws?.value ?? 0;
        const defenderWS = (defender as any).system?.characteristics?.ws?.value ?? 0;

        const attackerResult = await CheckDH2e.roll({
            actor: attacker,
            characteristic: "ws",
            baseTarget: attackerWS,
            label: `${attacker.name} — Grapple (Initiate)`,
            domain: "check:grapple",
            skipDialog: true,
        });

        const defenderResult = await CheckDH2e.roll({
            actor: defender,
            characteristic: "ws",
            baseTarget: defenderWS,
            label: `${defender.name} — Resist Grapple`,
            domain: "check:grapple",
            skipDialog: true,
        });

        if (!attackerResult || !defenderResult) return false;

        const attackerDoS = attackerResult.dos.success ? attackerResult.dos.degrees : -attackerResult.dos.degrees;
        const defenderDoS = defenderResult.dos.success ? defenderResult.dos.degrees : -defenderResult.dos.degrees;

        const success = attackerDoS > defenderDoS;

        if (success) {
            // Link combatants via grapple flag
            await GrappleHandler.#setGrappleFlags(attacker, defender);

            const content = `<div class="dh2e chat-card grapple-card">
                <header class="card-header"><h3>Grapple Initiated</h3></header>
                <div class="card-body">
                    <p><strong>${attacker.name}</strong> grapples <strong>${defender.name}</strong>!</p>
                    <p class="grapple-rule">Each round: opposed Strength tests. Actions: Damage, Push, Throw, Break Free.</p>
                    <div class="grapple-actions">
                        <button class="btn" data-action="grapple-action" data-grapple="damage">Damage</button>
                        <button class="btn" data-action="grapple-action" data-grapple="push">Push</button>
                        <button class="btn" data-action="grapple-action" data-grapple="throw">Throw</button>
                        <button class="btn" data-action="grapple-action" data-grapple="breakFree">Break Free</button>
                    </div>
                </div>
            </div>`;

            await fd.ChatMessage.create({
                content,
                flags: {
                    [SYSTEM_ID]: {
                        type: "grapple",
                        result: {
                            attackerId: attacker.id,
                            defenderId: defender.id,
                        },
                    },
                },
            });
        } else {
            ui.notifications.info(`${attacker.name} fails to grapple ${defender.name}.`);
        }

        return success;
    }

    /** Opposed Strength test each round to maintain the grapple */
    static async maintainGrapple(grappler: Actor, target: Actor): Promise<boolean> {
        const grapplerS = (grappler as any).system?.characteristics?.s?.value ?? 0;
        const targetS = (target as any).system?.characteristics?.s?.value ?? 0;

        const gResult = await CheckDH2e.roll({
            actor: grappler,
            characteristic: "s",
            baseTarget: grapplerS,
            label: `${grappler.name} — Maintain Grapple`,
            domain: "check:grapple",
            skipDialog: true,
        });

        const tResult = await CheckDH2e.roll({
            actor: target,
            characteristic: "s",
            baseTarget: targetS,
            label: `${target.name} — Escape Grapple`,
            domain: "check:grapple",
            skipDialog: true,
        });

        if (!gResult || !tResult) return true;

        const gDoS = gResult.dos.success ? gResult.dos.degrees : -gResult.dos.degrees;
        const tDoS = tResult.dos.success ? tResult.dos.degrees : -tResult.dos.degrees;

        return gDoS >= tDoS;
    }

    /** Execute a grapple action */
    static async executeAction(
        action: GrappleAction,
        grappler: Actor,
        target: Actor,
    ): Promise<void> {
        switch (action) {
            case "damage": {
                // Deal 1d5+SB damage
                const sBonus = (grappler as any).system?.characteristics?.s?.bonus ?? 0;
                const roll = new foundry.dice.Roll(`1d5+${sBonus}`);
                await roll.evaluate();
                ui.notifications.info(`${grappler.name} deals ${roll.total} damage to ${target.name} in grapple.`);
                break;
            }
            case "push": {
                ui.notifications.info(`${grappler.name} pushes ${target.name} 1 metre.`);
                break;
            }
            case "throw": {
                const sBonus = (grappler as any).system?.characteristics?.s?.bonus ?? 0;
                ui.notifications.info(`${grappler.name} throws ${target.name} ${sBonus} metres. Target is Prone.`);
                await GrappleHandler.#clearGrappleFlags(grappler, target);
                break;
            }
            case "breakFree": {
                const success = !(await GrappleHandler.maintainGrapple(grappler, target));
                if (success) {
                    ui.notifications.info(`${target.name} breaks free from ${grappler.name}'s grapple!`);
                    await GrappleHandler.#clearGrappleFlags(grappler, target);
                } else {
                    ui.notifications.info(`${target.name} fails to break free.`);
                }
                break;
            }
        }
    }

    static async #setGrappleFlags(attacker: Actor, defender: Actor): Promise<void> {
        const combat = (game as any).combat;
        if (!combat) return;

        const aCombatant = combat.combatants?.find((c: any) => c.actorId === attacker.id);
        const dCombatant = combat.combatants?.find((c: any) => c.actorId === defender.id);

        if (aCombatant) await aCombatant.setFlag(SYSTEM_ID, "grapplingWith", defender.id);
        if (dCombatant) await dCombatant.setFlag(SYSTEM_ID, "grapplingWith", attacker.id);
    }

    static async #clearGrappleFlags(attacker: Actor, defender: Actor): Promise<void> {
        const combat = (game as any).combat;
        if (!combat) return;

        const aCombatant = combat.combatants?.find((c: any) => c.actorId === attacker.id);
        const dCombatant = combat.combatants?.find((c: any) => c.actorId === defender.id);

        if (aCombatant) await aCombatant.unsetFlag(SYSTEM_ID, "grapplingWith");
        if (dCombatant) await dCombatant.unsetFlag(SYSTEM_ID, "grapplingWith");
    }
}

export { GrappleHandler };
export type { GrappleAction };
