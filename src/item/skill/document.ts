import { ItemDH2e } from "@item/base/document.ts";
import { ADVANCEMENT_BONUS, type SkillSystemSource } from "./data.ts";
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
}

export { SkillDH2e };
