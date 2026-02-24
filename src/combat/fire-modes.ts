import type { FireMode } from "./types.ts";

/**
 * Calculate the number of hits based on fire mode and degrees of success.
 *
 * DH2E rules:
 * - Single: 1 hit
 * - Semi-Auto: 1 hit + 1 per 2 DoS, capped at RoF value
 * - Full-Auto: 1 hit + 1 per DoS, capped at RoF value
 *
 * @param mode The fire mode used
 * @param dos Degrees of success (must be >= 0, i.e. the attack succeeded)
 * @param rofValue The rate of fire value for that mode (e.g., semi=3 means up to 3 hits)
 */
function calculateHits(mode: FireMode, dos: number, rofValue: number): number {
    if (dos < 0) return 0;

    switch (mode) {
        case "single":
            return 1;
        case "semi":
            return Math.min(1 + Math.floor(dos / 2), rofValue);
        case "full":
            return Math.min(1 + dos, rofValue);
        case "suppressive":
            // Suppressive fire hits are rolled as 1d5 per target in zone
            return 0;
    }
}

export { calculateHits };
