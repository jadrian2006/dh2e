import { ActorDH2e } from "@actor/base.ts";
import type { CharacteristicAbbrev, HitLocationKey } from "@actor/types.ts";
import type { AcolyteSystemData, AcolyteSystemSource, CharacteristicData } from "./data.ts";
import { createSynthetics } from "@rules/synthetics.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";
import type { RuleElementSource } from "@rules/rule-element/base.ts";
import { CorruptionHandler } from "@corruption/corruption.ts";
import { InsanityHandler } from "@insanity/insanity.ts";

/** The Acolyte (player character) actor */
class AcolyteDH2e extends ActorDH2e {
    declare system: AcolyteSystemData;

    /** Find the embedded homeworld origin item */
    get homeworldItem(): Item | undefined {
        return this.items.find((i: Item) => i.type === "homeworld");
    }

    /** Find the embedded background origin item */
    get backgroundItem(): Item | undefined {
        return this.items.find((i: Item) => i.type === "background");
    }

    /** Find the embedded role origin item */
    get roleItem(): Item | undefined {
        return this.items.find((i: Item) => i.type === "role");
    }

    /** Get a characteristic by abbreviation */
    getCharacteristic(key: CharacteristicAbbrev): CharacteristicData {
        return this.system.characteristics[key];
    }

    /** Get armour protection at a hit location */
    getLocationAP(location: HitLocationKey): number {
        return this.system.armour[location] ?? 0;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Reset synthetics for fresh data preparation
        this.synthetics = createSynthetics();

        const system = this.system;
        const source = this._source.system as unknown as AcolyteSystemSource;

        // Calculate characteristic values and bonuses
        for (const key of Object.keys(source.characteristics) as CharacteristicAbbrev[]) {
            const char = system.characteristics[key];
            const src = source.characteristics[key];
            char.base = src.base;
            char.advances = src.advances;
            char.value = src.base + src.advances * 5;
            char.bonus = Math.floor(char.value / 10);
        }

        // Calculate available XP
        (system.xp as AcolyteSystemData["xp"]).available = system.xp.total - system.xp.spent;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Calculate per-location armour totals from equipped items
        const armour: Record<string, number> = { head: 0, rightArm: 0, leftArm: 0, body: 0, rightLeg: 0, leftLeg: 0 };
        for (const item of this.items) {
            if (item.type !== "armour") continue;
            const sys = item.system as any;
            if (sys.equipped === false) continue;
            for (const loc of Object.keys(armour)) {
                armour[loc] += sys.locations?.[loc] ?? 0;
            }
        }
        (this.system as any).armour = armour;

        // Derive movement rates from Agility bonus
        const agBonus = this.system.characteristics.ag.bonus;
        (this.system as any).movement = {
            half: agBonus,
            full: agBonus * 2,
            charge: agBonus * 3,
            run: agBonus * 6,
        };

        // Calculate encumbrance (Core Rulebook p.247)
        const sBonus = this.system.characteristics.s.bonus;
        const tBonus = this.system.characteristics.t.bonus;
        const carry = sBonus + tBonus;
        const lift = carry * 2;
        const push = carry * 4;

        let totalWeight = 0;
        for (const item of this.items) {
            const sys = item.system as any;
            const weight = sys.weight ?? 0;
            const quantity = sys.quantity ?? 1;
            totalWeight += weight * quantity;
        }

        const overloaded = totalWeight > carry;
        const overencumbered = totalWeight > lift;

        (this.system as any).encumbrance = {
            current: totalWeight,
            carry,
            lift,
            push,
            overloaded,
            overencumbered,
        };

        // Process Rule Elements from all items
        this._processRuleElements();

        // Apply armour:all modifiers (Natural Armour, Machine, etc.)
        const armourMods = this.synthetics.modifiers["armour:all"] ?? [];
        if (armourMods.length > 0) {
            const bonus = armourMods.reduce((sum, m) => sum + m.value, 0);
            for (const loc of Object.keys(armour)) {
                armour[loc] += bonus;
            }
        }
    }

    /** Iterate all owned items, instantiate their REs, and call onPrepareData */
    protected _processRuleElements(): void {
        for (const item of this.items) {
            // Skip uninstalled cybernetics — their REs should not contribute
            if (item.type === "cybernetic") {
                const sys = item.system as any;
                if (!sys.installed) continue;
            }

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

    /**
     * Apply damage to this actor, reducing current wounds.
     * When wounds reach 0, excess damage triggers critical effects.
     *
     * @param wounds Number of wounds to apply
     * @param location The hit location
     * @param damageType The damage type for critical table lookup
     */
    async applyDamage(wounds: number, location?: HitLocationKey, damageType?: string): Promise<void> {
        const current = this.system.wounds.value;
        const newValue = current - wounds;

        if (newValue <= 0) {
            // Wounds reduced to 0 — excess becomes critical severity
            await this.update({ "system.wounds.value": 0 });

            const excess = Math.abs(newValue);
            const severity = Math.max(1, excess);
            const loc = location ?? "body";
            const type = damageType ?? "impact";

            ui.notifications.warn(`${this.name} has reached 0 wounds! Critical Damage (Severity ${severity})!`);

            // Look up and apply critical injury
            try {
                const { lookupCritical, applyCriticalInjury } = await import("@combat/critical.ts");
                const entry = await lookupCritical(type, loc, severity);
                if (entry) {
                    await applyCriticalInjury(this, entry, loc);
                }
            } catch (e) {
                console.error("DH2E | Failed to apply critical injury", e);
            }
        } else {
            await this.update({ "system.wounds.value": newValue });
        }
    }

    /** Heal wounds on this actor */
    async healDamage(wounds: number): Promise<void> {
        const current = this.system.wounds.value;
        const max = this.system.wounds.max;
        const newValue = Math.min(max, current + wounds);
        await this.update({ "system.wounds.value": newValue });
    }

    /** Detect corruption/insanity changes and trigger threshold checks */
    override _onUpdate(
        changed: Record<string, unknown>,
        options: Record<string, unknown>,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);

        // Only run on the triggering user's client
        if ((game as any).user?.id !== userId) return;

        const sys = changed.system as Record<string, unknown> | undefined;
        if (!sys) return;

        if ("corruption" in sys) {
            const oldVal = this._source.system.corruption as number;
            const newVal = sys.corruption as number;
            const automate = (game as any).settings?.get?.(SYSTEM_ID, "automateCorruption") ?? true;
            if (automate && newVal > oldVal) {
                CorruptionHandler.onCorruptionChanged(this, oldVal, newVal);
            }
        }

        if ("insanity" in sys) {
            const oldVal = this._source.system.insanity as number;
            const newVal = sys.insanity as number;
            const automate = (game as any).settings?.get?.(SYSTEM_ID, "automateInsanity") ?? true;
            if (automate && newVal > oldVal) {
                InsanityHandler.onInsanityChanged(this, oldVal, newVal);
            }
        }
    }
}

export { AcolyteDH2e };
