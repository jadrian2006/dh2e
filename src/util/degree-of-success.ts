/** Result of a d100 roll-under test */
export interface DoSResult {
    /** Whether the test succeeded (roll <= target) */
    success: boolean;
    /** Number of degrees (always positive) */
    degrees: number;
    /** The original d100 roll */
    roll: number;
    /** The target number after modifiers */
    target: number;
}

/**
 * Calculate Degrees of Success or Failure for a DH2E d100 roll-under test.
 *
 * DoS = floor((target - roll) / 10)  (if roll <= target)
 * DoF = floor((roll - target) / 10)  (if roll > target)
 *
 * Natural 1 always succeeds with at least 1 DoS.
 * Natural 100 always fails with at least 1 DoF.
 */
export function calculateDoS(roll: number, target: number): DoSResult {
    // Natural 1 always succeeds
    if (roll === 1) {
        const degrees = Math.max(1, Math.floor((target - roll) / 10));
        return { success: true, degrees, roll, target };
    }

    // Natural 100 always fails
    if (roll === 100) {
        const degrees = Math.max(1, Math.floor((roll - target) / 10));
        return { success: false, degrees, roll, target };
    }

    if (roll <= target) {
        const degrees = Math.floor((target - roll) / 10);
        return { success: true, degrees, roll, target };
    } else {
        const degrees = Math.floor((roll - target) / 10);
        return { success: false, degrees, roll, target };
    }
}
