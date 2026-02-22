import type { HitLocationKey } from "@actor/types.ts";
import type { DamageResult } from "./types.ts";

/**
 * Calculate damage dealt for a single hit.
 *
 * DH2E formula:
 *   effectiveAP = max(0, locationAP - penetration)
 *   woundsDealt = max(0, rawDamage - effectiveAP - TB)
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
): DamageResult {
    const locationLabel = LOCATION_LABELS[location] ?? location;
    const effectiveAP = Math.max(0, locationAP - penetration);
    const woundsDealt = Math.max(0, rawDamage - effectiveAP - toughnessBonus);

    return {
        location,
        locationLabel,
        rawDamage,
        armourPoints: locationAP,
        penetration,
        effectiveAP,
        toughnessBonus,
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
