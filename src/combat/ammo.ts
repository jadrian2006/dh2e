import type { FireMode } from "@item/weapon/types.ts";

interface ConsumeResult {
    consumed: number;
    remaining: number;
}

interface ReloadResult {
    loaded: number;
    ammoName: string;
    partial: boolean;
    newClipValue: number;
}

interface ReloadCost {
    actionType: "half" | "full";
    count: number;
}

/**
 * Check whether a weapon has enough ammo to fire in the given mode.
 * Melee/thrown weapons (clip.max === 0) always return true.
 */
function canFire(weapon: any, fireMode: FireMode): boolean {
    const sys = weapon.system ?? {};
    const clipMax = sys.clip?.max ?? 0;
    if (clipMax === 0) return true; // melee/thrown

    const clipValue = sys.clip?.value ?? 0;
    switch (fireMode) {
        case "single": return clipValue >= 1;
        case "semi": return clipValue >= (sys.rof?.semi ?? 2);
        case "full": return clipValue >= (sys.rof?.full ?? 4);
        default: return clipValue >= 1;
    }
}

/**
 * Consume ammunition for a ranged attack.
 * Returns null if insufficient ammo (caller should abort attack).
 */
async function consumeAmmo(weapon: any, fireMode: FireMode): Promise<ConsumeResult | null> {
    const sys = weapon.system ?? {};
    const clipMax = sys.clip?.max ?? 0;
    if (clipMax === 0) return null; // melee/thrown — no ammo to consume

    const clipValue = sys.clip?.value ?? 0;

    let required: number;
    switch (fireMode) {
        case "single": required = 1; break;
        case "semi": required = sys.rof?.semi ?? 2; break;
        case "full": required = sys.rof?.full ?? 4; break;
        default: required = 1;
    }

    if (clipValue < required) return null;

    const remaining = clipValue - required;
    await weapon.update({ "system.clip.value": remaining });
    return { consumed: required, remaining };
}

/**
 * Recover (undo) ammo consumption — add rounds back to clip, capped at max.
 */
async function recoverAmmo(weapon: any, rounds: number): Promise<void> {
    const sys = weapon.system ?? {};
    const clipMax = sys.clip?.max ?? 0;
    const clipValue = sys.clip?.value ?? 0;
    const newValue = Math.min(clipMax, clipValue + rounds);
    await weapon.update({ "system.clip.value": newValue });
}

/**
 * Get all compatible ammunition items in an actor's inventory.
 * Compatible = same weaponGroup OR universal (empty weaponGroup).
 */
function getCompatibleAmmo(actor: any, weapon: any): any[] {
    const weaponGroup = weapon.system?.weaponGroup ?? "";
    if (!weaponGroup) return []; // no group = can't match

    return actor.items.filter((item: any) => {
        if (item.type !== "ammunition") return false;
        if ((item.system?.quantity ?? 0) <= 0) return false;
        const ammoGroup = item.system?.weaponGroup ?? "";
        return ammoGroup === weaponGroup || ammoGroup === "";
    });
}

/**
 * Reload a weapon from an actor's inventory ammo.
 * If ammoItem is not specified, finds compatible ammo automatically
 * (preferring the currently loaded type if set).
 */
async function reloadWeapon(actor: any, weapon: any, ammoItem?: any): Promise<ReloadResult | null> {
    const sys = weapon.system ?? {};
    const clipMax = sys.clip?.max ?? 0;
    const clipValue = sys.clip?.value ?? 0;
    const roundsNeeded = clipMax - clipValue;

    if (roundsNeeded <= 0) return null; // already full

    // Find ammo if not specified
    if (!ammoItem) {
        const compatible = getCompatibleAmmo(actor, weapon);
        if (compatible.length === 0) return null;

        // Prefer currently loaded ammo type
        const loadedId = sys.loadedAmmoId ?? "";
        if (loadedId) {
            ammoItem = compatible.find((a: any) => a.id === loadedId);
        }
        // Fall back to first compatible
        if (!ammoItem) {
            ammoItem = compatible[0];
        }
    }

    const ammoQty = ammoItem.system?.quantity ?? 0;
    if (ammoQty <= 0) return null;

    const loaded = Math.min(roundsNeeded, ammoQty);
    const partial = loaded < roundsNeeded;
    const newClipValue = clipValue + loaded;
    const newAmmoQty = ammoQty - loaded;

    // Update weapon clip and loaded ammo reference
    await weapon.update({
        "system.clip.value": newClipValue,
        "system.loadedAmmoId": ammoItem.id,
        "system.reloadProgress": 0,
    });

    // Update or delete ammo item
    if (newAmmoQty <= 0) {
        await actor.deleteEmbeddedDocuments("Item", [ammoItem.id]);
    } else {
        await ammoItem.update({ "system.quantity": newAmmoQty });
    }

    return {
        loaded,
        ammoName: ammoItem.name,
        partial,
        newClipValue,
    };
}

/**
 * Parse the weapon reload field into an action cost.
 * "Half" → {half, 1}, "Full" → {full, 1}, "2Full" → {full, 2}, etc.
 */
function parseReloadCost(reloadStr: string): ReloadCost {
    if (!reloadStr) return { actionType: "full", count: 1 };

    const normalized = reloadStr.replace(/\s+/g, "").toLowerCase();
    if (normalized === "half") return { actionType: "half", count: 1 };
    if (normalized === "full") return { actionType: "full", count: 1 };

    const match = normalized.match(/^(\d+)full$/);
    if (match) {
        return { actionType: "full", count: parseInt(match[1]) };
    }

    // Default fallback
    return { actionType: "full", count: 1 };
}

export {
    canFire,
    consumeAmmo,
    recoverAmmo,
    getCompatibleAmmo,
    reloadWeapon,
    parseReloadCost,
};
export type { ConsumeResult, ReloadResult, ReloadCost };
