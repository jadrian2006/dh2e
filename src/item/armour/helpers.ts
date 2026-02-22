import type { HitLocationKey } from "@actor/types.ts";

/**
 * Calculate total armour at each location from a list of armour items.
 * Supports layering: sums AP from all equipped armour covering each location.
 */
function calculateArmourByLocation(
    armourItems: any[],
): Record<HitLocationKey, number> {
    const locations: HitLocationKey[] = ["head", "rightArm", "leftArm", "body", "rightLeg", "leftLeg"];
    const result = {} as Record<HitLocationKey, number>;

    for (const loc of locations) {
        result[loc] = 0;
        for (const item of armourItems) {
            const sys = item.system ?? item.skillSystem ?? {};
            if (sys.equipped !== false) {
                result[loc] += sys.locations?.[loc] ?? 0;
            }
        }
    }

    return result;
}

export { calculateArmourByLocation };
