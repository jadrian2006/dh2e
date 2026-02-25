import { ActorDH2e } from "@actor/base.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { HordeSystemData, HordeSystemSource } from "./data.ts";
import { createSynthetics } from "@rules/synthetics.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";
import type { RuleElementSource } from "@rules/rule-element/base.ts";

/** Horde actor — large groups of enemies treated as a single entity */
class HordeDH2e extends ActorDH2e {
    declare system: HordeSystemData;

    get magnitude(): number {
        return this.system.magnitude.value;
    }

    get magnitudeMax(): number {
        return this.system.magnitude.max;
    }

    get isBroken(): boolean {
        return this.system.magnitude.value <= 0;
    }

    getCharacteristic(key: CharacteristicAbbrev) {
        return this.system.characteristics[key];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.synthetics = createSynthetics();

        const system = this.system;
        const source = this._source.system as unknown as HordeSystemSource;

        // Calculate characteristic values and bonuses
        for (const key of Object.keys(source.characteristics) as CharacteristicAbbrev[]) {
            const char = system.characteristics[key];
            const src = source.characteristics[key];
            char.base = src.base;
            char.advances = src.advances;
            char.value = src.base + src.advances * 5;
            char.bonus = Math.floor(char.value / 10);
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Derive movement from Agility bonus
        const agBonus = this.system.characteristics.ag.bonus;
        (this.system as any).movement = {
            half: agBonus,
            full: agBonus * 2,
            charge: agBonus * 3,
            run: agBonus * 6,
        };

        // Process Rule Elements from owned items
        this._processRuleElements();
    }

    /**
     * Apply magnitude damage to the horde.
     *
     * Each wound past armour+TB = -1 Magnitude.
     * Blast(X) adds floor(X/2) extra magnitude damage.
     * Flame adds 1d10 extra magnitude damage.
     */
    async applyMagnitudeDamage(
        wounds: number,
        options?: { isBlast?: boolean; blastRadius?: number; isFlame?: boolean },
    ): Promise<void> {
        let magnitudeLoss = wounds;

        if (options?.isBlast && options.blastRadius) {
            magnitudeLoss += Math.floor(options.blastRadius / 2);
        }

        if (options?.isFlame) {
            const flameRoll = new foundry.dice.Roll("1d10");
            await flameRoll.evaluate();
            magnitudeLoss += flameRoll.total ?? 0;
        }

        const current = this.system.magnitude.value;
        const newValue = Math.max(0, current - magnitudeLoss);
        await this.update({ "system.magnitude.value": newValue });

        if (newValue <= 0) {
            ui.notifications.warn(`${this.name} has been broken! Magnitude reduced to 0.`);
        } else {
            ui.notifications.info(`${this.name} loses ${magnitudeLoss} Magnitude (${current} → ${newValue}).`);
        }
    }

    protected _processRuleElements(): void {
        for (const item of this.items) {
            const rules = (item.system as any)?.rules as RuleElementSource[] | undefined;
            if (!rules || !Array.isArray(rules)) continue;

            for (const source of rules) {
                const re = instantiateRuleElement(source, item);
                if (re) {
                    try {
                        re.onPrepareData(this.synthetics);
                    } catch (e) {
                        console.warn(`DH2E | Error processing RE "${source.key}" on "${item.name}"`, e);
                    }
                }
            }
        }
    }
}

export { HordeDH2e };
