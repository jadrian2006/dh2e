import type { FireMode } from "@item/weapon/types.ts";
import type { LoadedRoundEntry } from "@item/weapon/data.ts";

interface ConsumeResult {
    consumed: number;
    remaining: number;
    /** Ammo types consumed in this burst, ordered by hit (for damage resolution) */
    consumedTypes: Array<{ name: string; count: number }>;
}

interface ReloadResult {
    loaded: number;
    ammoName: string;
    partial: boolean;
    newMagValue: number;
    /** True if this was a magazine swap (vs individual round loading) */
    magazineSwap: boolean;
}

interface ReloadCost {
    actionType: "half" | "full";
    count: number;
}

/**
 * Get total rounds in a loadedRounds array.
 */
function totalLoaded(rounds: LoadedRoundEntry[]): number {
    return rounds.reduce((sum, r) => sum + r.count, 0);
}

/**
 * Check whether a weapon has enough ammo to fire in the given mode.
 * Melee/thrown weapons (magazine.max === 0) always return true.
 */
function canFire(weapon: any, fireMode: FireMode): boolean {
    const sys = weapon.system ?? {};
    const magMax = sys.magazine?.max ?? 0;
    if (magMax === 0) return true; // melee/thrown

    const magValue = sys.magazine?.value ?? 0;
    switch (fireMode) {
        case "single": return magValue >= 1;
        case "semi": return magValue >= (sys.rof?.semi ?? 2);
        case "full": return magValue >= (sys.rof?.full ?? 4);
        default: return magValue >= 1;
    }
}

/**
 * Consume ammunition for a ranged attack.
 * Uses LIFO ordering — consumes from the last entry in loadedRounds first.
 * For mixed loads, alternates between types (round-robin from top of stack down).
 * Returns null if insufficient ammo (caller should abort attack).
 */
async function consumeAmmo(weapon: any, fireMode: FireMode): Promise<ConsumeResult | null> {
    const sys = weapon.system ?? {};
    const magMax = sys.magazine?.max ?? 0;
    if (magMax === 0) return null; // melee/thrown — no ammo to consume

    const magValue = sys.magazine?.value ?? 0;
    let loadedRounds: LoadedRoundEntry[] = sys.loadedRounds ? [...sys.loadedRounds.map((r: any) => ({ ...r }))] : [];

    // Fallback: if magazine has rounds but loadedRounds is empty, synthesize an entry
    // This handles weapons loaded before the loadedRounds system existed or data mismatches
    if (loadedRounds.length === 0 && magValue > 0) {
        const weaponGroup = sys.weaponGroup ?? "";
        const groupNames: Record<string, string> = {
            sp: "Solid Rounds", las: "Charge Pack", bolt: "Bolt Shells",
            flame: "Promethium", melta: "Melta Fuel", plasma: "Plasma",
            shotgun: "Shotgun Shells", launcher: "Frag Grenades",
        };
        loadedRounds = [{ name: groupNames[weaponGroup] ?? "Rounds", count: magValue }];
    }

    let required: number;
    switch (fireMode) {
        case "single": required = 1; break;
        case "semi": required = sys.rof?.semi ?? 2; break;
        case "full": required = sys.rof?.full ?? 4; break;
        default: required = 1;
    }

    if (magValue < required) return null;

    // Track what was consumed per type
    const consumedMap = new Map<string, number>();
    let consumed = 0;

    if (loadedRounds.length <= 1) {
        // Single type or empty — simple consumption from last entry
        if (loadedRounds.length === 1) {
            const entry = loadedRounds[0];
            const take = Math.min(required, entry.count);
            entry.count -= take;
            consumed = take;
            consumedMap.set(entry.name, take);
            if (entry.count <= 0) loadedRounds.splice(0, 1);
        }
    } else {
        // Mixed ammo — alternate LIFO (round-robin from top of stack down)
        // Walk backwards through the array, cycling for each round
        let roundsLeft = required;
        while (roundsLeft > 0 && loadedRounds.length > 0) {
            // Iterate from end (top of magazine) toward start
            for (let i = loadedRounds.length - 1; i >= 0 && roundsLeft > 0; i--) {
                const entry = loadedRounds[i];
                if (entry.count <= 0) continue;
                entry.count--;
                roundsLeft--;
                consumed++;
                consumedMap.set(entry.name, (consumedMap.get(entry.name) ?? 0) + 1);
            }
            // Clean up empty entries
            for (let i = loadedRounds.length - 1; i >= 0; i--) {
                if (loadedRounds[i].count <= 0) loadedRounds.splice(i, 1);
            }
        }
    }

    const remaining = magValue - consumed;

    // Build consumedTypes array (ordered by most consumed first)
    const consumedTypes: Array<{ name: string; count: number }> = [];
    for (const [name, count] of consumedMap) {
        consumedTypes.push({ name, count });
    }

    await weapon.update({
        "system.magazine.value": remaining,
        "system.loadedRounds": loadedRounds,
    });

    return { consumed, remaining, consumedTypes };
}

/**
 * Recover (undo) ammo consumption — add rounds back to weapon, capped at max.
 * Adds to last entry in loadedRounds (or creates a generic one).
 */
async function recoverAmmo(weapon: any, rounds: number, ammoName?: string): Promise<void> {
    const sys = weapon.system ?? {};
    const magMax = sys.magazine?.max ?? 0;
    const magValue = sys.magazine?.value ?? 0;
    const newValue = Math.min(magMax, magValue + rounds);
    const added = newValue - magValue;

    const loadedRounds: LoadedRoundEntry[] = sys.loadedRounds ? [...sys.loadedRounds.map((r: any) => ({ ...r }))] : [];

    if (added > 0) {
        const name = ammoName ?? "Rounds";
        const last = loadedRounds.length > 0 ? loadedRounds[loadedRounds.length - 1] : null;
        if (last && last.name === name) {
            last.count += added;
        } else {
            loadedRounds.push({ name, count: added });
        }
    }

    await weapon.update({
        "system.magazine.value": newValue,
        "system.loadedRounds": loadedRounds,
    });
}

/**
 * Get all compatible loose ammunition items in an actor's inventory.
 * Compatible = same weaponGroup OR universal (empty weaponGroup).
 * Excludes magazines (capacity > 0).
 */
function getCompatibleAmmo(actor: any, weapon: any): any[] {
    const weaponGroup = weapon.system?.weaponGroup ?? "";
    if (!weaponGroup) return []; // no group = can't match

    return actor.items.filter((item: any) => {
        if (item.type !== "ammunition") return false;
        if ((item.system?.quantity ?? 0) <= 0) return false;
        if ((item.system?.capacity ?? 0) > 0) return false; // skip magazines
        const ammoGroup = item.system?.weaponGroup ?? "";
        return ammoGroup === weaponGroup || ammoGroup === "";
    });
}

/**
 * Get all compatible loaded magazines in an actor's inventory.
 * A magazine is compatible if forWeapon matches or (weaponGroup matches and it's a magazine).
 */
function getCompatibleMagazines(actor: any, weapon: any): any[] {
    const weaponName = weapon.name ?? "";
    const weaponGroup = weapon.system?.weaponGroup ?? "";
    if (!weaponGroup) return [];

    return actor.items.filter((item: any) => {
        if (item.type !== "ammunition") return false;
        const sys = item.system ?? {};
        if ((sys.capacity ?? 0) <= 0) return false; // must be a magazine
        const loaded = totalLoaded(sys.loadedRounds ?? []);
        if (loaded <= 0) return false; // must have rounds loaded

        // Match by forWeapon name or by weaponGroup
        const forWeapon = sys.forWeapon ?? "";
        if (forWeapon && forWeapon === weaponName) return true;
        const magGroup = sys.weaponGroup ?? "";
        return magGroup === weaponGroup;
    });
}

/**
 * Dispatch reload to the appropriate method based on weapon loadType.
 */
async function reloadWeapon(actor: any, weapon: any, ammoOrMag?: any): Promise<ReloadResult | null> {
    const loadType = weapon.system?.loadType ?? "magazine";
    if (loadType === "individual") return reloadIndividual(actor, weapon, ammoOrMag);
    return reloadMagazineSwap(actor, weapon, ammoOrMag);
}

/**
 * Magazine swap reload: eject current magazine (if any), insert new one.
 */
async function reloadMagazineSwap(actor: any, weapon: any, newMagazine?: any): Promise<ReloadResult | null> {
    const sys = weapon.system ?? {};
    const magMax = sys.magazine?.max ?? 0;
    const magValue = sys.magazine?.value ?? 0;

    // Find a compatible magazine if not specified
    if (!newMagazine) {
        const compatible = getCompatibleMagazines(actor, weapon);
        if (compatible.length === 0) return null;
        newMagazine = compatible[0];
    }

    const newMagSys = newMagazine.system ?? {};
    const newMagRounds: LoadedRoundEntry[] = newMagSys.loadedRounds ?? [];
    const newMagLoaded = totalLoaded(newMagRounds);
    if (newMagLoaded <= 0) return null;

    // 1. Eject current magazine (if weapon has rounds loaded)
    if (magValue > 0) {
        await ejectMagazine(actor, weapon);
    }

    // 2. Insert new magazine
    const loadedValue = Math.min(newMagLoaded, magMax); // may be less if extended mag weapon, standard mag
    // If the new mag has more rounds than weapon can hold, truncate (shouldn't normally happen)
    const roundsToLoad = [...newMagRounds];

    // Determine the primary ammo name (last entry = top of stack)
    const primaryAmmoName = roundsToLoad.length > 0 ? roundsToLoad[roundsToLoad.length - 1].name : "";

    await weapon.update({
        "system.magazine.value": loadedValue,
        "system.loadedRounds": roundsToLoad,
        "system.loadedMagazineName": newMagazine.name,
        "system.loadedAmmoId": "",
        "system.reloadProgress": 0,
    });

    // Delete the magazine item from inventory
    await actor.deleteEmbeddedDocuments("Item", [newMagazine.id]);

    return {
        loaded: loadedValue,
        ammoName: primaryAmmoName,
        partial: loadedValue < magMax,
        newMagValue: loadedValue,
        magazineSwap: true,
    };
}

/**
 * Eject the current magazine from a weapon back into inventory.
 */
async function ejectMagazine(actor: any, weapon: any): Promise<any | null> {
    const sys = weapon.system ?? {};
    const magValue = sys.magazine?.value ?? 0;
    const magMax = sys.magazine?.max ?? 0;
    if (magValue <= 0) return null;

    const loadedRounds: LoadedRoundEntry[] = sys.loadedRounds ?? [];
    const magazineName = sys.loadedMagazineName || `${weapon.name} Magazine`;
    const weaponGroup = sys.weaponGroup ?? "";

    // Create ejected magazine item in inventory
    const [created] = await actor.createEmbeddedDocuments("Item", [{
        name: magazineName,
        type: "ammunition",
        system: {
            capacity: magMax,
            loadedRounds: [...loadedRounds],
            forWeapon: weapon.name,
            weaponGroup,
            quantity: 1,
            damageModifier: 0,
            penetrationModifier: 0,
            qualities: [],
        },
    }]);

    // Clear weapon's loaded state
    await weapon.update({
        "system.magazine.value": 0,
        "system.loadedRounds": [],
        "system.loadedMagazineName": "",
        "system.loadedAmmoId": "",
    });

    return created;
}

/**
 * Individual round loading (revolvers, shotguns, etc.).
 * Loads from loose ammo stacks into the weapon.
 */
async function reloadIndividual(actor: any, weapon: any, ammoItem?: any): Promise<ReloadResult | null> {
    const sys = weapon.system ?? {};
    const magMax = sys.magazine?.max ?? 0;
    const magValue = sys.magazine?.value ?? 0;
    const roundsNeeded = magMax - magValue;

    if (roundsNeeded <= 0) return null; // already full

    // Find ammo if not specified
    if (!ammoItem) {
        const compatible = getCompatibleAmmo(actor, weapon);
        if (compatible.length === 0) return null;

        // Prefer matching the currently loaded ammo type
        const loadedRounds: LoadedRoundEntry[] = sys.loadedRounds ?? [];
        const currentType = loadedRounds.length > 0 ? loadedRounds[loadedRounds.length - 1].name : "";
        if (currentType) {
            ammoItem = compatible.find((a: any) => a.name === currentType);
        }
        // Fall back to first compatible
        if (!ammoItem) ammoItem = compatible[0];
    }

    const ammoQty = ammoItem.system?.quantity ?? 0;
    if (ammoQty <= 0) return null;

    const loaded = Math.min(roundsNeeded, ammoQty);
    const partial = loaded < roundsNeeded;
    const newMagValue = magValue + loaded;
    const newAmmoQty = ammoQty - loaded;

    // Update loadedRounds — add to top of stack (LIFO)
    const loadedRounds: LoadedRoundEntry[] = sys.loadedRounds ? [...sys.loadedRounds.map((r: any) => ({ ...r }))] : [];
    const lastEntry = loadedRounds.length > 0 ? loadedRounds[loadedRounds.length - 1] : null;
    if (lastEntry && lastEntry.name === ammoItem.name) {
        lastEntry.count += loaded;
    } else {
        loadedRounds.push({ name: ammoItem.name, count: loaded });
    }

    // Update weapon
    await weapon.update({
        "system.magazine.value": newMagValue,
        "system.loadedRounds": loadedRounds,
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
        newMagValue,
        magazineSwap: false,
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
 * Unload a weapon back into the actor's inventory.
 * For magazine-type: ejects the magazine as an inventory item.
 * For individual-type: dumps rounds back as loose ammo.
 */
async function unloadWeapon(actor: any, weapon: any): Promise<{ unloaded: number; ammoName: string } | null> {
    const sys = weapon.system ?? {};
    const magValue = sys.magazine?.value ?? 0;
    if (magValue <= 0) return null;

    const loadType = sys.loadType ?? "magazine";

    if (loadType === "magazine") {
        // Eject as a magazine item
        const loadedRounds: LoadedRoundEntry[] = sys.loadedRounds ?? [];
        const ammoName = loadedRounds.length > 0 ? loadedRounds[loadedRounds.length - 1].name : "Rounds";
        await ejectMagazine(actor, weapon);
        return { unloaded: magValue, ammoName };
    }

    // Individual-type: dump as loose rounds per type
    const loadedRounds: LoadedRoundEntry[] = sys.loadedRounds ?? [];
    let ammoName = "Rounds";

    for (const entry of loadedRounds) {
        if (entry.count <= 0) continue;
        ammoName = entry.name;

        // Find existing loose ammo stack of this name
        const existing = actor.items.find((i: any) =>
            i.type === "ammunition" && i.name === entry.name && (i.system?.capacity ?? 0) === 0,
        );

        if (existing) {
            const qty = existing.system?.quantity ?? 0;
            await existing.update({ "system.quantity": qty + entry.count });
        } else {
            const weaponGroup = sys.weaponGroup ?? "";
            await actor.createEmbeddedDocuments("Item", [{
                name: entry.name,
                type: "ammunition",
                system: {
                    quantity: entry.count,
                    weaponGroup,
                },
            }]);
        }
    }

    // Empty the weapon
    await weapon.update({
        "system.magazine.value": 0,
        "system.loadedRounds": [],
        "system.loadedAmmoId": "",
    });

    return { unloaded: magValue, ammoName };
}

/**
 * Load loose ammo rounds into a magazine item.
 * Accepts an array of loads for mixed ammo support.
 */
async function loadMagazine(
    actor: any,
    magazine: any,
    loads?: Array<{ ammoItem: any; count: number }>,
): Promise<{ loaded: number; ammoName: string } | null> {
    const sys = magazine.system ?? {};
    const capacity = sys.capacity ?? 0;
    const currentRounds: LoadedRoundEntry[] = sys.loadedRounds ? [...sys.loadedRounds.map((r: any) => ({ ...r }))] : [];
    const currentLoaded = totalLoaded(currentRounds);
    if (capacity <= 0 || currentLoaded >= capacity) return null;

    const remaining = capacity - currentLoaded;
    const magGroup = sys.weaponGroup ?? "";

    // If no loads specified, auto-find compatible loose ammo
    if (!loads || loads.length === 0) {
        const loose = actor.items.filter((i: any) => {
            if (i.type !== "ammunition") return false;
            if (i.id === magazine.id) return false;
            if ((i.system?.capacity ?? 0) > 0) return false; // skip other magazines
            if ((i.system?.quantity ?? 0) <= 0) return false;
            const aGroup = i.system?.weaponGroup ?? "";
            return aGroup === magGroup || aGroup === "";
        });

        if (loose.length === 0) return null;

        // Default: load from first compatible ammo
        const ammoItem = loose[0];
        const ammoQty = ammoItem.system?.quantity ?? 0;
        const toLoad = Math.min(remaining, ammoQty);
        loads = [{ ammoItem, count: toLoad }];
    }

    // Validate total doesn't exceed remaining
    const totalRequested = loads.reduce((sum, l) => sum + l.count, 0);
    if (totalRequested <= 0) return null;

    let totalActuallyLoaded = 0;
    let lastAmmoName = "";

    for (const load of loads) {
        if (load.count <= 0) continue;

        const ammoQty = load.ammoItem.system?.quantity ?? 0;
        const actualCount = Math.min(load.count, ammoQty, remaining - totalActuallyLoaded);
        if (actualCount <= 0) continue;

        // Add to loadedRounds (push to top of stack)
        const lastEntry = currentRounds.length > 0 ? currentRounds[currentRounds.length - 1] : null;
        if (lastEntry && lastEntry.name === load.ammoItem.name) {
            lastEntry.count += actualCount;
        } else {
            currentRounds.push({ name: load.ammoItem.name, count: actualCount });
        }

        totalActuallyLoaded += actualCount;
        lastAmmoName = load.ammoItem.name;

        // Update or delete loose ammo
        const newQty = ammoQty - actualCount;
        if (newQty <= 0) {
            await actor.deleteEmbeddedDocuments("Item", [load.ammoItem.id]);
        } else {
            await load.ammoItem.update({ "system.quantity": newQty });
        }
    }

    if (totalActuallyLoaded <= 0) return null;

    // Update magazine
    await magazine.update({
        "system.loadedRounds": currentRounds,
    });

    return { loaded: totalActuallyLoaded, ammoName: lastAmmoName };
}

/**
 * Unload a magazine — extract loaded rounds back to inventory as loose ammo.
 */
async function unloadMagazine(actor: any, magazine: any): Promise<{ unloaded: number; ammoName: string } | null> {
    const sys = magazine.system ?? {};
    const loadedRounds: LoadedRoundEntry[] = sys.loadedRounds ?? [];
    const currentLoaded = totalLoaded(loadedRounds);
    if (currentLoaded <= 0) return null;

    let lastAmmoName = "Rounds";

    for (const entry of loadedRounds) {
        if (entry.count <= 0) continue;
        lastAmmoName = entry.name;

        // Find existing loose ammo of the same name
        const existing = actor.items.find((i: any) =>
            i.type === "ammunition" && i.name === entry.name && i.id !== magazine.id && (i.system?.capacity ?? 0) === 0,
        );

        if (existing) {
            const qty = existing.system?.quantity ?? 0;
            await existing.update({ "system.quantity": qty + entry.count });
        } else {
            const magGroup = sys.weaponGroup ?? "";
            await actor.createEmbeddedDocuments("Item", [{
                name: entry.name,
                type: "ammunition",
                system: {
                    quantity: entry.count,
                    weaponGroup: magGroup,
                },
            }]);
        }
    }

    // Empty the magazine
    await magazine.update({
        "system.loadedRounds": [],
    });

    return { unloaded: currentLoaded, ammoName: lastAmmoName };
}

export {
    canFire,
    consumeAmmo,
    recoverAmmo,
    getCompatibleAmmo,
    getCompatibleMagazines,
    reloadWeapon,
    reloadMagazineSwap,
    reloadIndividual,
    ejectMagazine,
    unloadWeapon,
    loadMagazine,
    unloadMagazine,
    parseReloadCost,
    totalLoaded,
};
export type { ConsumeResult, ReloadResult, ReloadCost };
