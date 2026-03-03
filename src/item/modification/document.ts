import { ItemDH2e } from "@item/base/document.ts";
import type { ModificationSystemSource, ModType, ModSlot } from "./data.ts";
import { MOD_TYPES, MOD_SLOTS } from "./data.ts";

/** Modification item — weapon/armour upgrades with slot-based exclusion */
class ModificationDH2e extends ItemDH2e {
    declare system: ModificationSystemSource;

    get modType(): ModType {
        return this.system.modType;
    }

    get slot(): ModSlot {
        return this.system.slot;
    }

    /** Check whether this modification can attach to a given item */
    canAttachTo(item: Item): { allowed: boolean; reason?: string } {
        const targetType = item.type;

        // Check modType matches target
        if (this.system.modType === "weapon" && targetType !== "weapon") {
            return { allowed: false, reason: game.i18n?.localize("DH2E.Modification.CannotAttach") ?? "Wrong item type" };
        }
        if (this.system.modType === "armour" && targetType !== "armour") {
            return { allowed: false, reason: game.i18n?.localize("DH2E.Modification.CannotAttach") ?? "Wrong item type" };
        }

        // Check slot conflict
        const existingMods: string[] = (item.system as any).modifications ?? [];
        if (existingMods.length > 0 && this.system.slot !== "general") {
            // Will need to resolve UUIDs to check slots — done at call site
        }

        return { allowed: true };
    }

    /** Validate modType and slot values */
    static validateData(data: Record<string, unknown>): void {
        const sys = data.system as Record<string, unknown> | undefined;
        if (sys) {
            if (sys.modType && !MOD_TYPES.includes(sys.modType as ModType)) {
                sys.modType = "weapon";
            }
            if (sys.slot && !MOD_SLOTS.includes(sys.slot as ModSlot)) {
                sys.slot = "general";
            }
        }
    }
}

export { ModificationDH2e };
