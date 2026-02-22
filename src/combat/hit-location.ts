import { reverseDigits } from "@util/dice.ts";
import type { HitLocationKey } from "@actor/types.ts";
import type { HitResult } from "./types.ts";

/** Hit location table: d100 ranges mapped to body locations */
const HIT_LOCATION_TABLE: { key: HitLocationKey; label: string; min: number; max: number }[] = [
    { key: "head", label: "Head", min: 1, max: 10 },
    { key: "rightArm", label: "Right Arm", min: 11, max: 20 },
    { key: "leftArm", label: "Left Arm", min: 21, max: 30 },
    { key: "body", label: "Body", min: 31, max: 70 },
    { key: "rightLeg", label: "Right Leg", min: 71, max: 85 },
    { key: "leftLeg", label: "Left Leg", min: 86, max: 100 },
];

/**
 * Determine hit location from an attack roll.
 *
 * DH2E rule: reverse the digits of the d100 roll to get the hit location.
 * e.g., roll of 34 → reversed to 43 → Body (31-70).
 *
 * @param attackRoll The d100 attack roll
 * @param calledShot Optional forced location for called shots
 */
function determineHitLocation(
    attackRoll: number,
    calledShot?: HitLocationKey,
): HitResult {
    if (calledShot) {
        const entry = HIT_LOCATION_TABLE.find((e) => e.key === calledShot);
        return {
            location: calledShot,
            locationLabel: entry?.label ?? calledShot,
            locationRoll: 0,
        };
    }

    const reversed = reverseDigits(attackRoll);

    for (const entry of HIT_LOCATION_TABLE) {
        if (reversed >= entry.min && reversed <= entry.max) {
            return {
                location: entry.key,
                locationLabel: entry.label,
                locationRoll: reversed,
            };
        }
    }

    // Fallback: body
    return { location: "body", locationLabel: "Body", locationRoll: reversed };
}

export { determineHitLocation, HIT_LOCATION_TABLE };
