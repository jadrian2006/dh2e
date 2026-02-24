import type { FacingDirection } from "@actor/vehicle/data.ts";

/**
 * Determine the facing direction from attacker to vehicle based on token positions.
 *
 * Uses the angle between the attacker's position and the vehicle token's
 * position + rotation to determine front (±45°), rear (±45° from back),
 * or side.
 */
function determineFacing(
    attackerToken: { x: number; y: number },
    vehicleToken: { x: number; y: number; rotation?: number },
): FacingDirection {
    const dx = attackerToken.x - vehicleToken.x;
    const dy = attackerToken.y - vehicleToken.y;

    // Angle from vehicle to attacker (degrees, 0 = right, counterclockwise)
    let angle = Math.atan2(-dy, dx) * (180 / Math.PI);

    // Adjust for vehicle rotation (Foundry rotation: 0 = south, clockwise)
    const vehicleRotation = vehicleToken.rotation ?? 0;
    angle = ((angle - vehicleRotation + 360 + 90) % 360);

    // Front: 315-360 and 0-45 (i.e., ±45° from 0/360)
    // Rear: 135-225 (±45° from 180)
    // Side: everything else
    if (angle >= 315 || angle < 45) return "front";
    if (angle >= 135 && angle < 225) return "rear";
    return "side";
}

export { determineFacing };
