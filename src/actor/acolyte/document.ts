import { ActorDH2e } from "@actor/base.ts";
import type { CharacteristicAbbrev, HitLocationKey } from "@actor/types.ts";
import type { AcolyteSystemData, AcolyteSystemSource, CharacteristicData, CompanionEntry } from "./data.ts";
import type { NpcDH2e } from "@actor/npc/document.ts";
import { createSynthetics } from "@rules/synthetics.ts";
import { instantiateRuleElement } from "@rules/rule-element/registry.ts";
import type { RuleElementSource } from "@rules/rule-element/base.ts";
import { CorruptionHandler } from "@corruption/corruption.ts";
import { InsanityHandler } from "@insanity/insanity.ts";
import { DivinationSessionHandler } from "@divination/session-effects.ts";
import { getArmourCraftsmanshipBonus } from "@combat/craftsmanship.ts";
import { ModifierDH2e } from "@rules/modifier.ts";

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

        // Resolve companion actor IDs → live actor references
        const companions = (this._source.system as unknown as AcolyteSystemSource).companions ?? [];
        const resolved: NpcDH2e[] = [];
        for (const entry of companions) {
            const actor = (game as any).actors?.get(entry.actorId) as NpcDH2e | null;
            if (actor && actor.type === "npc") {
                resolved.push(actor);
            }
        }
        (this.system as AcolyteSystemData).resolvedCompanions = resolved;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        // Calculate per-location armour: highest worn armour at each location (RAW: no stacking)
        const armour: Record<string, number> = { head: 0, rightArm: 0, leftArm: 0, body: 0, rightLeg: 0, leftLeg: 0 };
        const armourSources: Record<string, { label: string; value: number }[]> = {
            head: [], rightArm: [], leftArm: [], body: [], rightLeg: [], leftLeg: [],
        };
        // Track best worn armour per location (only highest counts)
        const bestWorn: Record<string, { name: string; value: number }> = {
            head: { name: "", value: 0 }, rightArm: { name: "", value: 0 },
            leftArm: { name: "", value: 0 }, body: { name: "", value: 0 },
            rightLeg: { name: "", value: 0 }, leftLeg: { name: "", value: 0 },
        };
        for (const item of this.items) {
            if (item.type !== "armour") continue;
            const sys = item.system as any;
            if (sys.equipped === false) continue;
            const craftBonus = getArmourCraftsmanshipBonus(sys.craftsmanship ?? "common");
            for (const loc of Object.keys(armour)) {
                const baseAP = sys.locations?.[loc] ?? 0;
                if (baseAP > 0 || craftBonus > 0) {
                    const val = Math.max(0, baseAP + craftBonus);
                    if (val > bestWorn[loc].value) {
                        bestWorn[loc] = { name: item.name!, value: val };
                    }
                }
            }
        }
        for (const loc of Object.keys(armour)) {
            if (bestWorn[loc].value > 0) {
                armour[loc] = bestWorn[loc].value;
                armourSources[loc].push({ label: bestWorn[loc].name, value: bestWorn[loc].value });
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

        // Apply fatigue penalty: -10 per fatigue level to ALL characteristics
        const fatigue = (this.system as any).fatigue ?? 0;
        if (fatigue > 0) {
            const fatiguePenalty = -10 * fatigue;
            const charDomains = ["characteristic:ws", "characteristic:bs", "characteristic:s",
                "characteristic:t", "characteristic:ag", "characteristic:int",
                "characteristic:per", "characteristic:wp", "characteristic:fel"];
            for (const domain of charDomains) {
                if (!this.synthetics.modifiers[domain]) this.synthetics.modifiers[domain] = [];
                this.synthetics.modifiers[domain].push(new ModifierDH2e({
                    label: "Fatigue",
                    value: fatiguePenalty,
                    source: "condition",
                }));
            }

            // Check fatigue threshold: TB + WPB — if exceeded, auto-apply unconscious
            const tBonus = this.system.characteristics.t.bonus;
            const wpBonus = this.system.characteristics.wp.bonus;
            const threshold = tBonus + wpBonus;
            if (fatigue > threshold) {
                this.synthetics.rollOptions.add("self:fatigued:unconscious");
            }
        }

        // Apply armour:all modifiers (Natural Armour, Machine, etc.) — additive
        const armourMods = this.synthetics.modifiers["armour:all"] ?? [];
        for (const m of armourMods) {
            for (const loc of Object.keys(armour)) {
                armour[loc] += m.value;
                armourSources[loc].push({ label: m.label, value: m.value });
            }
        }

        // Apply per-location armour modifiers (cybernetics, etc.) — additive
        const locationKeys: Record<string, string> = {
            head: "armour:head",
            rightArm: "armour:rightArm",
            leftArm: "armour:leftArm",
            body: "armour:body",
            rightLeg: "armour:rightLeg",
            leftLeg: "armour:leftLeg",
        };
        for (const [loc, domain] of Object.entries(locationKeys)) {
            const locMods = this.synthetics.modifiers[domain] ?? [];
            for (const m of locMods) {
                armour[loc] += m.value;
                armourSources[loc].push({ label: m.label, value: m.value });
            }
        }

        (this.system as any).armourSources = armourSources;
    }

    /** Iterate all owned items, instantiate their REs, and call onPrepareData */
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

    // ─── Companion Management ──────────────────────────────

    /** Add an NPC as a companion (deduplicates) */
    async addCompanion(npcActor: ActorDH2e, behavior: CompanionEntry["behavior"] = "follow"): Promise<void> {
        if (npcActor.type !== "npc") return;

        const current: CompanionEntry[] = (this._source.system as unknown as AcolyteSystemSource).companions ?? [];
        if (current.some(c => c.actorId === npcActor.id)) {
            ui.notifications?.info(game.i18n?.format("DH2E.Companion.Added", { name: npcActor.name ?? "" }) ?? `${npcActor.name} is already a companion.`);
            return;
        }

        const entry: CompanionEntry = { actorId: npcActor.id!, behavior };
        await this.update({ "system.companions": [...current, entry] });

        // Grant OWNER permission to the owning player
        const g = game as any;
        const ownerUser = g.users?.find((u: any) => !u.isGM && u.character?.id === this.id);
        if (ownerUser) {
            const ownership: Record<string, number> = { ...npcActor.ownership };
            ownership[ownerUser.id] = 3; // OWNER
            await npcActor.update({ ownership });
        }

        ui.notifications?.info(game.i18n?.format("DH2E.Companion.Added", { name: npcActor.name ?? "" }) ?? `${npcActor.name} assigned as companion.`);
    }

    /** Remove a companion by actor ID */
    async removeCompanion(actorId: string): Promise<void> {
        const current: CompanionEntry[] = (this._source.system as unknown as AcolyteSystemSource).companions ?? [];
        const filtered = current.filter(c => c.actorId !== actorId);
        await this.update({ "system.companions": filtered });
    }

    /** Update a companion's behavior directive */
    async setCompanionBehavior(actorId: string, behavior: CompanionEntry["behavior"]): Promise<void> {
        const current: CompanionEntry[] = (this._source.system as unknown as AcolyteSystemSource).companions ?? [];
        const updated = current.map(c => c.actorId === actorId ? { ...c, behavior } : c);
        await this.update({ "system.companions": updated });
    }

    /** Get a companion's current behavior */
    getCompanionBehavior(actorId: string): CompanionEntry["behavior"] | null {
        const current: CompanionEntry[] = (this._source.system as unknown as AcolyteSystemSource).companions ?? [];
        return current.find(c => c.actorId === actorId)?.behavior ?? null;
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
            // Check divination session effects for corruption changes
            void DivinationSessionHandler.onValueChanged(this, "corruption", oldVal, newVal);
        }

        if ("insanity" in sys) {
            const oldVal = this._source.system.insanity as number;
            const newVal = sys.insanity as number;
            const automate = (game as any).settings?.get?.(SYSTEM_ID, "automateInsanity") ?? true;
            if (automate && newVal > oldVal) {
                InsanityHandler.onInsanityChanged(this, oldVal, newVal);
            }
            // Check divination session effects for insanity changes
            void DivinationSessionHandler.onValueChanged(this, "insanity", oldVal, newVal);
        }

        if ("fatigue" in sys) {
            const oldVal = (this._source.system as any).fatigue as number ?? 0;
            const newVal = sys.fatigue as number;
            // Check divination session effects for fatigue changes
            void DivinationSessionHandler.onValueChanged(this, "fatigue", oldVal, newVal);
        }
    }
}

export { AcolyteDH2e };
