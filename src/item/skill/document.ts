import { ItemDH2e } from "@item/base/document.ts";
import { ADVANCEMENT_BONUS, type SkillSystemSource, type SkillUse } from "./data.ts";
import { CANONICAL_SKILL_USES } from "./uses.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";

/** Skill item — trained skills with advancement tiers */
class SkillDH2e extends ItemDH2e {
    /** Get typed system data */
    get skillSystem(): SkillSystemSource {
        return this.system as unknown as SkillSystemSource;
    }

    /** The linked characteristic abbreviation */
    get linkedCharacteristic(): CharacteristicAbbrev {
        return this.skillSystem.linkedCharacteristic;
    }

    /** Advancement tier (0-4) */
    get advancement(): number {
        return this.skillSystem.advancement;
    }

    /** Bonus from advancement tier */
    get advancementBonus(): number {
        return ADVANCEMENT_BONUS[this.advancement] ?? 0;
    }

    /** Whether this skill is trained (advancement >= 1) */
    get isTrained(): boolean {
        return this.advancement >= 1;
    }

    /** The linked characteristic value from the owning actor */
    get linkedCharValue(): number {
        const actor = this.parent as any;
        if (!actor?.system?.characteristics) return 0;
        const char = actor.system.characteristics[this.linkedCharacteristic];
        return char?.value ?? char?.base ?? 0;
    }

    /** Total target number: linked characteristic value + advancement bonus */
    get totalTarget(): number {
        return this.linkedCharValue + this.advancementBonus;
    }

    /** Display name including specialization if applicable */
    get displayName(): string {
        if (this.skillSystem.isSpecialist && this.skillSystem.specialization) {
            return `${this.name} (${this.skillSystem.specialization})`;
        }
        return this.name;
    }

    /** Skill uses / sub-actions. Falls back to canonical map for legacy items without embedded uses. */
    get uses(): SkillUse[] {
        const embedded = this.skillSystem.uses;
        if (embedded && embedded.length > 0) return embedded;
        return CANONICAL_SKILL_USES[this.name] ?? [];
    }

    /** Whether this skill has any uses defined */
    get hasUses(): boolean {
        return this.uses.length > 0;
    }

    /** Get a specific use by slug */
    getUse(slug: string): SkillUse | undefined {
        return this.uses.find((u) => u.slug === slug);
    }
}

export { SkillDH2e };
