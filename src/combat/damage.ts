import type { HitLocationKey } from "@actor/types.ts";
import type { DamageResult } from "./types.ts";
import type { ResistanceEntry, ToughnessAdjustment } from "@rules/synthetics.ts";

/** Options for damage calculation including synthetic adjustments */
interface DamageCalcOptions {
    rawDamage: number;
    locationAP: number;
    penetration: number;
    toughnessBonus: number;
    location: HitLocationKey;
    formula: string;
    damageType?: string;
    resistances?: ResistanceEntry[];
    toughnessAdjustments?: ToughnessAdjustment[];
}

/**
 * Calculate damage dealt for a single hit.
 *
 * DH2E formula:
 *   effectiveAP = max(0, locationAP - penetration)
 *   effectiveTB = TB + adjustments
 *   woundsDealt = max(0, rawDamage - effectiveAP - effectiveTB - resistances)
 *
 * @param rawDamage The total rolled damage (e.g., 1d10+3 = 8)
 * @param locationAP Armour points at the hit location
 * @param penetration Weapon's penetration value
 * @param toughnessBonus Target's Toughness Bonus
 * @param location Which body location was hit
 * @param formula The damage formula string for display
 */
function calculateDamage(
    rawDamage: number,
    locationAP: number,
    penetration: number,
    toughnessBonus: number,
    location: HitLocationKey,
    formula: string,
    options?: {
        damageType?: string;
        resistances?: ResistanceEntry[];
        toughnessAdjustments?: ToughnessAdjustment[];
    },
): DamageResult {
    const locationLabel = LOCATION_LABELS[location] ?? location;
    const effectiveAP = Math.max(0, locationAP - penetration);

    // Apply toughness adjustments from synthetics
    let effectiveTB = toughnessBonus;
    if (options?.toughnessAdjustments) {
        for (const adj of options.toughnessAdjustments) {
            if (adj.mode === "add") effectiveTB += adj.value;
            else if (adj.mode === "multiply") effectiveTB = Math.floor(effectiveTB * adj.value);
        }
    }

    let totalDamage = rawDamage;

    // Apply resistances
    if (options?.resistances && options.damageType) {
        for (const res of options.resistances) {
            if (res.damageType !== options.damageType && res.damageType !== "all") continue;
            if (res.mode === "flat") totalDamage -= res.value;
            else if (res.mode === "half") totalDamage = Math.floor(totalDamage / 2);
        }
        totalDamage = Math.max(0, totalDamage);
    }

    const woundsDealt = Math.max(0, totalDamage - effectiveAP - effectiveTB);

    return {
        location,
        locationLabel,
        rawDamage,
        armourPoints: locationAP,
        penetration,
        effectiveAP,
        toughnessBonus: effectiveTB,
        woundsDealt,
        formula,
    };
}

const LOCATION_LABELS: Record<string, string> = {
    head: "Head",
    rightArm: "Right Arm",
    leftArm: "Left Arm",
    body: "Body",
    rightLeg: "Right Leg",
    leftLeg: "Left Leg",
};

/**
 * Get the total armour points at a given location for an actor.
 *
 * Sums AP from all equipped armour items covering that location.
 * Supports armour layering (multiple pieces covering the same location).
 */
function getLocationAP(actor: Actor, location: HitLocationKey): number {
    const items = (actor as any).items;
    if (!items) return 0;

    let total = 0;
    for (const item of items) {
        if (item.type !== "armour") continue;
        const sys = item.system as any;
        if (!sys?.equipped) continue;
        const locAP = sys.locations?.[location] ?? 0;
        total += locAP;
    }
    return total;
}

export { calculateDamage, getLocationAP };
