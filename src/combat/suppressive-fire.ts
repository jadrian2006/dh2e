import { CheckDH2e } from "@check/check.ts";
import { VFXResolver } from "../vfx/resolver.ts";

/**
 * Suppressive Fire resolution.
 *
 * The attacker creates a 30° kill zone. Any target that starts or moves
 * through the zone must pass a WP test (Pinning) or become Pinned.
 * Targets that continue acting in the zone take 1d5 auto-hits.
 *
 * Requires a Full Action and expends full ammo (entire magazine or full-auto rounds).
 */
class SuppressiveFireResolver {
    /**
     * Initiate suppressive fire.
     * Posts a chat card describing the zone and triggers pinning tests for targets.
     */
    static async resolve(options: {
        actor: Actor;
        weapon: any;
        targetIds?: string[];
    }): Promise<void> {
        const { actor, weapon, targetIds } = options;
        const sys = weapon.system ?? {};

        // Expend ammo (full magazine or full-auto equivalent)
        const magMax = sys.magazine?.max ?? 0;
        const roundsConsumed = sys.magazine?.value ?? 0;
        if (magMax > 0) {
            await weapon.update({
                "system.magazine.value": 0,
                "system.loadedRounds": [],
            });
        }

        // Post the suppressive fire card
        const content = `<div class="dh2e chat-card suppressive-fire-card">
            <header class="card-header">
                <h3>${weapon.name} — Suppressive Fire</h3>
            </header>
            <div class="card-body">
                <p class="sf-desc">Establishes a 30° kill zone. All targets in the zone must test <strong>Willpower</strong> or become <strong>Pinned</strong>.</p>
                <p class="sf-ammo">Ammo expended: ${roundsConsumed} rounds.</p>
                <p class="sf-hits">Targets acting in the zone take <strong>1d5 hits</strong>.</p>
                ${targetIds?.length ? `<div class="sf-targets">
                    <button class="btn" data-action="resolve-pinning">Roll Pinning Tests</button>
                </div>` : ""}
            </div>
        </div>`;

        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
        await fd.ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "suppressive-fire",
                    result: {
                        actorId: actor.id,
                        weaponId: weapon.id,
                        weaponName: weapon.name,
                        targetIds: targetIds ?? [],
                    },
                    ammo: roundsConsumed > 0 ? {
                        weaponId: weapon.id,
                        roundsConsumed,
                        recovered: false,
                    } : undefined,
                },
            },
        });

        // Play VFX if available
        if (VFXResolver.available) {
            const attackerToken = (actor as any).token ?? (actor as any).getActiveTokens?.()?.[0];
            if (attackerToken) {
                VFXResolver.suppressiveFire({ attackerToken });
            }
        }
    }

    /** Roll pinning WP tests for each target in the zone */
    static async resolvePinning(targetIds: string[]): Promise<void> {
        const g = game as any;
        for (const id of targetIds) {
            const target = g.actors?.get(id) as Actor | undefined;
            if (!target) continue;

            const wpValue = (target as any).system?.characteristics?.wp?.value ?? 0;
            const result = await CheckDH2e.roll({
                actor: target,
                characteristic: "wp",
                baseTarget: wpValue,
                label: `${target.name} — Pinning Test`,
                domain: "check:pinning",
                skipDialog: true,
            });

            if (result && !result.dos.success) {
                ui.notifications.warn(`${target.name} is Pinned!`);
            }
        }
    }

    /** Roll 1d5 suppressive fire hits for a target remaining in the zone */
    static async rollSuppressiveHits(): Promise<number> {
        const roll = new foundry.dice.Roll("1d5");
        await roll.evaluate();
        return roll.total ?? 1;
    }
}

export { SuppressiveFireResolver };
