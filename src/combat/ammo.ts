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

/**
 * Unload a weapon's clip back into the actor's inventory as loose ammo.
 * Creates a new ammo item (or adds to existing) matching the loaded type.
 */
async function unloadWeapon(actor: any, weapon: any): Promise<{ unloaded: number; ammoName: string } | null> {
    const sys = weapon.system ?? {};
    const clipValue = sys.clip?.value ?? 0;
    if (clipValue <= 0) return null;

    const loadedAmmoId = sys.loadedAmmoId ?? "";

    // Find the ammo template from the loaded ID or from compatible ammo
    let ammoName = "Rounds";
    let matchingAmmo: any = null;

    if (loadedAmmoId) {
        matchingAmmo = actor.items.get(loadedAmmoId);
    }
    if (!matchingAmmo) {
        // Find any compatible ammo to use as template
        const compatible = getCompatibleAmmo(actor, weapon);
        matchingAmmo = compatible[0] ?? null;
    }

    if (matchingAmmo) {
        ammoName = matchingAmmo.name;
        // Add rounds back to the existing ammo stack
        const currentQty = matchingAmmo.system?.quantity ?? 0;
        await matchingAmmo.update({ "system.quantity": currentQty + clipValue });
    } else {
        // No ammo item found — create a generic ammo item
        const weaponGroup = sys.weaponGroup ?? "";
        await actor.createEmbeddedDocuments("Item", [{
            name: ammoName,
            type: "ammunition",
            system: {
                quantity: clipValue,
                weaponGroup,
            },
        }]);
    }

    // Empty the weapon clip
    await weapon.update({
        "system.clip.value": 0,
        "system.loadedAmmoId": "",
    });

    return { unloaded: clipValue, ammoName };
}

/**
 * Load loose ammo rounds into a magazine/clip item.
 * The magazine must have capacity > 0.
 */
async function loadMagazine(actor: any, magazine: any, ammoItem?: any): Promise<{ loaded: number; ammoName: string } | null> {
    const sys = magazine.system ?? {};
    const capacity = sys.capacity ?? 0;
    const currentLoaded = sys.loaded ?? 0;
    if (capacity <= 0 || currentLoaded >= capacity) return null;

    const roundsNeeded = capacity - currentLoaded;
    const magGroup = sys.weaponGroup ?? "";

    // Find compatible loose ammo (not magazines)
    if (!ammoItem) {
        const loose = actor.items.filter((i: any) => {
            if (i.type !== "ammunition") return false;
            if (i.id === magazine.id) return false;
            if ((i.system?.capacity ?? 0) > 0) return false; // skip other magazines
            if ((i.system?.quantity ?? 0) <= 0) return false;
            const aGroup = i.system?.weaponGroup ?? "";
            return aGroup === magGroup || aGroup === "";
        });
        // Prefer matching the currently loaded type
        const loadedName = sys.loadedAmmoName ?? "";
        if (loadedName) {
            ammoItem = loose.find((a: any) => a.name === loadedName);
        }
        if (!ammoItem) ammoItem = loose[0];
    }

    if (!ammoItem) return null;

    const ammoQty = ammoItem.system?.quantity ?? 0;
    if (ammoQty <= 0) return null;

    const loaded = Math.min(roundsNeeded, ammoQty);
    const newLoaded = currentLoaded + loaded;
    const newAmmoQty = ammoQty - loaded;

    // Update magazine
    await magazine.update({
        "system.loaded": newLoaded,
        "system.loadedAmmoName": ammoItem.name,
    });

    // Update or delete loose ammo
    if (newAmmoQty <= 0) {
        await actor.deleteEmbeddedDocuments("Item", [ammoItem.id]);
    } else {
        await ammoItem.update({ "system.quantity": newAmmoQty });
    }

    return { loaded, ammoName: ammoItem.name };
}

/**
 * Unload a magazine — extract loaded rounds back to inventory as loose ammo.
 */
async function unloadMagazine(actor: any, magazine: any): Promise<{ unloaded: number; ammoName: string } | null> {
    const sys = magazine.system ?? {};
    const currentLoaded = sys.loaded ?? 0;
    if (currentLoaded <= 0) return null;

    const loadedAmmoName = sys.loadedAmmoName ?? "Rounds";

    // Find existing loose ammo of the same name
    const existing = actor.items.find((i: any) =>
        i.type === "ammunition" && i.name === loadedAmmoName && i.id !== magazine.id && (i.system?.capacity ?? 0) === 0,
    );

    if (existing) {
        const qty = existing.system?.quantity ?? 0;
        await existing.update({ "system.quantity": qty + currentLoaded });
    } else {
        // Create new loose ammo stack
        const magGroup = sys.weaponGroup ?? "";
        await actor.createEmbeddedDocuments("Item", [{
            name: loadedAmmoName,
            type: "ammunition",
            system: {
                quantity: currentLoaded,
                weaponGroup: magGroup,
            },
        }]);
    }

    // Empty the magazine
    await magazine.update({
        "system.loaded": 0,
        "system.loadedAmmoName": "",
    });

    return { unloaded: currentLoaded, ammoName: loadedAmmoName };
}

export {
    canFire,
    consumeAmmo,
    recoverAmmo,
    getCompatibleAmmo,
    reloadWeapon,
    unloadWeapon,
    loadMagazine,
    unloadMagazine,
    parseReloadCost,
};
export type { ConsumeResult, ReloadResult, ReloadCost };
