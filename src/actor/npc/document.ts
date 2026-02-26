import { ActorDH2e } from "@actor/base.ts";
import type { HitLocationKey } from "@actor/types.ts";
import { createSynthetics } from "@rules/synthetics.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";
import type { RuleElementSource } from "@rules/rule-element/base.ts";
import { getSetting } from "../../ui/settings/settings.ts";

/** NPC actor — shares Acolyte data structure for Phase 1 */
class NpcDH2e extends ActorDH2e {
    /** Whether this NPC has been defeated (0 wounds + lethal critical) */
    get isDefeated(): boolean {
        return (this.system as any).defeated === true;
    }

    /** Mark this NPC as defeated (GM toggle) */
    async markDefeated(): Promise<void> {
        await this.update({ "system.defeated": true });
        // Apply skull overlay on tokens
        for (const token of this.getActiveTokens()) {
            await token.document?.update({ overlayEffect: "icons/svg/skull.svg" });
        }
    }

    /** Restore this NPC to alive state (GM toggle) */
    async markAlive(): Promise<void> {
        await this.update({ "system.defeated": false });
        for (const token of this.getActiveTokens()) {
            await token.document?.update({ overlayEffect: "" });
        }
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Reset synthetics
        this.synthetics = createSynthetics();

        const system = this.system as Record<string, unknown>;
        const source = this._source.system as Record<string, unknown>;
        const chars = source.characteristics as Record<string, { base: number; advances: number }>;

        if (chars) {
            const sysChars = system.characteristics as Record<
                string,
                { base: number; advances: number; value: number; bonus: number }
            >;
            for (const [key, src] of Object.entries(chars)) {
                if (sysChars[key]) {
                    sysChars[key].base = src.base;
                    sysChars[key].advances = src.advances;
                    sysChars[key].value = src.base + src.advances * 5;
                    sysChars[key].bonus = Math.floor(sysChars[key].value / 10);
                }
            }
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Calculate armour from equipped items
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

        // Derive movement from Agility bonus
        const sysChars = (this.system as any).characteristics;
        const agBonus = sysChars?.ag?.bonus ?? 0;
        (this.system as any).movement = {
            half: agBonus,
            full: agBonus * 2,
            charge: agBonus * 3,
            run: agBonus * 6,
        };

        // Process Rule Elements
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

    /** Get armour protection at a hit location */
    getLocationAP(location: HitLocationKey): number {
        return (this.system as any).armour?.[location] ?? 0;
    }

    /**
     * Apply damage to this NPC, with critical damage on reaching 0 wounds.
     * @param killingDoS Degrees of success of the attack (used for loot degradation)
     */
    async applyDamage(wounds: number, location?: HitLocationKey, damageType?: string, killingDoS?: number): Promise<void> {
        const current = (this.system as any).wounds?.value ?? 0;
        const newValue = current - wounds;

        if (newValue <= 0) {
            await this.update({ "system.wounds.value": 0 });

            const excess = Math.abs(newValue);
            const severity = Math.max(1, excess);
            const loc = location ?? "body";
            const type = damageType ?? "impact";

            ui.notifications.warn(`${this.name} has reached 0 wounds! Critical Damage (Severity ${severity})!`);

            try {
                const { lookupCritical, applyCriticalInjury } = await import("@combat/critical.ts");
                const entry = await lookupCritical(type, loc, severity);
                if (entry) {
                    await applyCriticalInjury(this, entry, loc);
                }
            } catch (e) {
                console.error("DH2E | Failed to apply critical injury to NPC", e);
            }

            // Mark defeated and optionally degrade equipment
            if (!this.isDefeated) {
                await this.markDefeated();

                if (getSetting<boolean>("lootDegradation") && killingDoS !== undefined) {
                    try {
                        const { degradeNpcEquipment } = await import("@combat/loot-degradation.ts");
                        await degradeNpcEquipment(this, killingDoS);
                    } catch (e) {
                        console.error("DH2E | Failed to degrade NPC equipment", e);
                    }
                }
            }
        } else {
            await this.update({ "system.wounds.value": newValue });
        }
    }

    protected _processRuleElements(): void {
        for (const item of this.items) {
            // Skip non-functional cybernetics (uninstalled or total failure)
            if (item.type === "cybernetic") {
                if (!(item as any).isFunctional) continue;
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
}

export { NpcDH2e };
