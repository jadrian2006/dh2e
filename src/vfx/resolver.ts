/**
 * Central VFX resolver for JB2A + Sequencer integration.
 *
 * When both the Sequencer module and a JB2A animation pack are installed,
 * this class plays visual effects on attacks, psychic powers, and combat actions.
 * Gracefully degrades to a no-op when modules are absent.
 */

import { getSetting } from "../ui/settings/settings.ts";
import { WEAPON_EFFECTS, PSYCHIC_EFFECTS, DAMAGE_EFFECTS, CONDITION_EFFECTS } from "./effect-map.ts";

type VFXIntensity = "minimal" | "normal" | "full";

class VFXResolver {
    /** Check if Sequencer + JB2A are active and VFX are enabled */
    static get available(): boolean {
        const g = game as any;
        if (!g.modules) return false;

        const sequencerActive = g.modules.get("sequencer")?.active ?? false;
        const jb2aFreeActive = g.modules.get("JB2A_DnD5e")?.active ?? false;
        const jb2aPremiumActive = g.modules.get("jb2a_patreon")?.active ?? false;

        if (!sequencerActive || (!jb2aFreeActive && !jb2aPremiumActive)) return false;

        // Check client setting
        try {
            return getSetting<boolean>("enableVFX");
        } catch {
            return false;
        }
    }

    /** Current intensity setting */
    static get #intensity(): VFXIntensity {
        try {
            return getSetting<string>("vfxIntensity") as VFXIntensity;
        } catch {
            return "normal";
        }
    }

    /** Play an attack effect (projectile from attacker → target) */
    static async attack(opts: {
        attackerToken: any;
        targetToken: any;
        weapon?: any;
        weaponClass: string;
        damageType: string;
        isAutofire: boolean;
        miss?: boolean;
    }): Promise<void> {
        if (!VFXResolver.available) return;

        // Miss VFX only plays at "normal" or "full" intensity
        if (opts.miss && VFXResolver.#intensity === "minimal") return;

        const Sequence = VFXResolver.#getSequence();
        if (!Sequence) return;

        // Priority: 1) actor synthetics vfxOverrides[weapon.id]
        //           2) weapon.flags.dh2e.vfxProfile
        //           3) WEAPON_EFFECTS[weaponClass] default
        const actor = opts.weapon?.parent;
        const synthOverride = actor?.synthetics?.vfxOverrides?.[opts.weapon?.id];
        const overridePath = synthOverride?.effectPath
            ?? opts.weapon?.flags?.dh2e?.vfxProfile;
        const effectPath = overridePath ?? WEAPON_EFFECTS[opts.weaponClass] ?? WEAPON_EFFECTS.solid;

        // If synthetics specify effectType, use that; otherwise infer from weaponClass
        const effectType = synthOverride?.effectType;
        const scale = synthOverride?.scale ?? 1.5;

        const seq = new Sequence();
        const isMelee = effectType
            ? effectType === "melee"
            : (opts.weaponClass === "melee" || opts.weaponClass === "chain");
        const isFlame = effectType
            ? effectType === "cone"
            : opts.weaponClass === "flame";

        if (isMelee) {
            if (opts.miss) {
                // Melee miss: short whoosh, offset from target
                seq.effect()
                    .file(effectPath)
                    .atLocation(opts.targetToken)
                    .scaleToObject(scale * 0.8)
                    .fadeIn(50)
                    .fadeOut(100);
            } else {
                // Melee hit: play on target
                seq.effect()
                    .file(effectPath)
                    .atLocation(opts.targetToken)
                    .scaleToObject(scale)
                    .fadeIn(100)
                    .fadeOut(200);
            }
        } else if (isFlame) {
            // Flame: same cone regardless of hit/miss (flamer doesn't "miss" visually)
            seq.effect()
                .file(effectPath)
                .atLocation(opts.attackerToken)
                .stretchTo(opts.targetToken)
                .fadeIn(100)
                .fadeOut(300);
        } else if (opts.miss) {
            // Ranged miss: single projectile that streaks past the target
            const offset = {
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 200,
            };
            seq.effect()
                .file(effectPath)
                .atLocation(opts.attackerToken)
                .stretchTo(opts.targetToken, { offset })
                .fadeIn(100)
                .fadeOut(200);
        } else {
            // Ranged projectile hit
            const count = opts.isAutofire ? 3 : 1;
            for (let i = 0; i < count; i++) {
                seq.effect()
                    .file(effectPath)
                    .atLocation(opts.attackerToken)
                    .stretchTo(opts.targetToken)
                    .fadeIn(100)
                    .fadeOut(200);

                if (i < count - 1) {
                    seq.wait(100);
                }
            }
        }

        await seq.play();
    }

    /** Play a psychic power effect */
    static async psychicPower(opts: {
        casterToken: any;
        targetToken?: any;
        power?: any;
        discipline: string;
        powerName: string;
    }): Promise<void> {
        if (!VFXResolver.available) return;
        if (VFXResolver.#intensity === "minimal") return;

        const Sequence = VFXResolver.#getSequence();
        if (!Sequence) return;

        // Priority: 1) actor synthetics vfxOverrides[power.id]
        //           2) power.flags.dh2e.vfxProfile
        //           3) PSYCHIC_EFFECTS[discipline] default
        const caster = opts.power?.parent;
        const synthOverride = caster?.synthetics?.vfxOverrides?.[opts.power?.id];
        const overridePath = synthOverride?.effectPath
            ?? opts.power?.flags?.dh2e?.vfxProfile;
        const discipline = opts.discipline.toLowerCase().replace(/\s+/g, "");
        const effectPath = overridePath ?? PSYCHIC_EFFECTS[discipline] ?? PSYCHIC_EFFECTS.telepathy;

        const seq = new Sequence();

        if (opts.targetToken && opts.targetToken !== opts.casterToken) {
            // Targeted power: projectile from caster to target
            seq.effect()
                .file(effectPath)
                .atLocation(opts.casterToken)
                .stretchTo(opts.targetToken)
                .fadeIn(200)
                .fadeOut(300);
        } else {
            // Self-targeting / aura
            seq.effect()
                .file(effectPath)
                .atLocation(opts.casterToken)
                .scaleToObject(2)
                .duration(2000)
                .fadeIn(300)
                .fadeOut(500);
        }

        await seq.play();
    }

    /** Play a damage/impact effect on a token */
    static async damageImpact(opts: {
        token: any;
        damageType: string;
        isCritical: boolean;
    }): Promise<void> {
        if (!VFXResolver.available) return;
        if (VFXResolver.#intensity === "minimal") return;

        const Sequence = VFXResolver.#getSequence();
        if (!Sequence) return;

        const effectPath = DAMAGE_EFFECTS[opts.damageType] ?? DAMAGE_EFFECTS.impact;
        const scale = opts.isCritical ? 2.0 : 1.5;

        const seq = new Sequence();
        seq.effect()
            .file(effectPath)
            .atLocation(opts.token)
            .scaleToObject(scale)
            .fadeIn(100);

        await seq.play();
    }

    /** Play a suppressive fire area effect */
    static async suppressiveFire(opts: {
        attackerToken: any;
        template?: any;
    }): Promise<void> {
        if (!VFXResolver.available) return;
        if (VFXResolver.#intensity !== "full") return;

        const Sequence = VFXResolver.#getSequence();
        if (!Sequence) return;

        const effectPath = WEAPON_EFFECTS.solid;

        const seq = new Sequence();

        if (opts.template) {
            seq.effect()
                .file(effectPath)
                .atLocation(opts.template)
                .scaleToObject(2)
                .duration(1500)
                .fadeIn(200)
                .fadeOut(400);
        } else {
            // No template: play rapid-fire burst from attacker
            for (let i = 0; i < 5; i++) {
                seq.effect()
                    .file(effectPath)
                    .atLocation(opts.attackerToken)
                    .scaleToObject(1.5)
                    .fadeIn(50)
                    .fadeOut(100);
                seq.wait(80);
            }
        }

        await seq.play();
    }

    /** Play a one-shot VFX when a condition is applied or removed */
    static async condition(opts: {
        token: any;
        slug: string;
        applied: boolean;
    }): Promise<void> {
        if (!VFXResolver.available) return;

        const Sequence = VFXResolver.#getSequence();
        if (!Sequence) return;

        const fx = CONDITION_EFFECTS[opts.slug];
        const path = opts.applied ? fx?.apply : fx?.remove;
        if (!path) return;

        const seq = new Sequence();
        seq.effect()
            .file(path)
            .atLocation(opts.token)
            .scaleToObject(1.5)
            .fadeIn(200)
            .fadeOut(300);

        await seq.play();
    }

    /** Get the Sequencer Sequence class from the global scope */
    static #getSequence(): (new () => any) | null {
        const g = globalThis as any;
        return g.Sequence ?? null;
    }
}

export { VFXResolver };
