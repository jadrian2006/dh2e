import { CheckDH2e } from "@check/check.ts";

/**
 * Overwatch handler.
 *
 * A combatant sets an Overwatch zone. When an enemy enters or acts within that zone,
 * the overwatch combatant makes a free attack at -20, consuming their reaction.
 */
class OverwatchHandler {
    /**
     * Set a combatant into Overwatch mode.
     * Requires a Half Action. Marks them via flag on their combatant document.
     */
    static async setOverwatch(combatant: any, weapon: any): Promise<void> {
        await combatant.setFlag(SYSTEM_ID, "overwatchActive", true);
        await combatant.setFlag(SYSTEM_ID, "overwatchWeaponId", weapon.id);

        const actor = combatant.actor;
        const content = `<div class="dh2e chat-card overwatch-card">
            <header class="card-header">
                <h3>${actor?.name ?? "?"} — Overwatch</h3>
            </header>
            <div class="card-body">
                <p>${actor?.name} enters Overwatch with ${weapon.name}.</p>
                <p class="ow-rule">Free attack at <strong>-20</strong> when an enemy enters the kill zone. Consumes Reaction.</p>
            </div>
        </div>`;

        await fd.ChatMessage.create({
            content,
            speaker: fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor?.name },
            flags: {
                [SYSTEM_ID]: {
                    type: "overwatch",
                    result: {
                        combatantId: combatant.id,
                        actorId: actor?.id,
                        weaponId: weapon.id,
                    },
                },
            },
        });
    }

    /** Trigger an overwatch attack against a moving target */
    static async triggerOverwatch(combatant: any, target: Actor): Promise<void> {
        const actor = combatant.actor;
        if (!actor) return;

        // Check if overwatch is still active and reaction is available
        const isActive = combatant.getFlag(SYSTEM_ID, "overwatchActive");
        if (!isActive) return;

        const hasReaction = combatant.hasAction?.("reaction") ?? true;
        if (!hasReaction) return;

        // Get the overwatch weapon
        const weaponId = combatant.getFlag(SYSTEM_ID, "overwatchWeaponId");
        const weapon = weaponId ? actor.items.get(weaponId) : null;
        if (!weapon) return;

        const sys = (weapon as any).system ?? {};
        const isMelee = sys.class === "melee";
        const charKey = isMelee ? "ws" : "bs";
        const charValue = (actor as any).system?.characteristics?.[charKey]?.value ?? 0;

        // Overwatch attack at -20
        const result = await CheckDH2e.roll({
            actor,
            characteristic: charKey as any,
            baseTarget: charValue - 20,
            label: `${actor.name} — Overwatch Attack vs ${target.name}`,
            domain: `attack:${isMelee ? "melee" : "ranged"}`,
            skipDialog: true,
        });

        // Consume reaction and clear overwatch
        if (combatant.useAction) await combatant.useAction("reaction");
        await combatant.setFlag(SYSTEM_ID, "overwatchActive", false);

        if (result && result.dos.success) {
            ui.notifications.info(`${actor.name}'s Overwatch hits ${target.name}!`);
        }
    }

    /** Clear overwatch status from a combatant */
    static async clearOverwatch(combatant: any): Promise<void> {
        await combatant.setFlag(SYSTEM_ID, "overwatchActive", false);
        await combatant.unsetFlag(SYSTEM_ID, "overwatchWeaponId");
    }
}

export { OverwatchHandler };
