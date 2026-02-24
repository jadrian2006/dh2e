/** Result of a d100 roll-under test */
export interface DoSResult {
    /** Whether the test succeeded (roll <= target) */
    success: boolean;
    /** Number of degrees (always >= 1) */
    degrees: number;
    /** The original d100 roll */
    roll: number;
    /** The target number after modifiers */
    target: number;
}

/**
 * Calculate Degrees of Success or Failure for a DH2E d100 roll-under test.
 *
 * Core Rulebook tens-digit method:
 *   DoS = 1 + floor(target / 10) - floor(roll / 10)  (if roll <= target)
 *   DoF = 1 + floor(roll / 10) - floor(target / 10)   (if roll > target)
 *
 * Natural 1 always succeeds with at least 1 DoS.
 * Natural 100 always fails with at least 1 DoF.
 */
export function calculateDoS(roll: number, target: number): DoSResult {
    // Natural 1 always succeeds
    if (roll === 1) {
        const degrees = Math.max(1, 1 + Math.floor(target / 10) - Math.floor(roll / 10));
        return { success: true, degrees, roll, target };
    }

    // Natural 100 always fails
    if (roll === 100) {
        const degrees = Math.max(1, 1 + Math.floor(roll / 10) - Math.floor(target / 10));
        return { success: false, degrees, roll, target };
    }

    if (roll <= target) {
        const degrees = 1 + Math.floor(target / 10) - Math.floor(roll / 10);
        return { success: true, degrees, roll, target };
    }

    const degrees = 1 + Math.floor(roll / 10) - Math.floor(target / 10);
    return { success: false, degrees, roll, target };
}
