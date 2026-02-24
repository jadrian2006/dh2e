import type { HitLocationKey } from "@actor/types.ts";

/**
 * Exotic quality handlers for weapon qualities that need
 * special attack flow rather than simple modifier injection.
 *
 * These are not implemented as Rule Elements because they
 * fundamentally change the attack resolution flow.
 */

/** Blast: hits all targets within radius metres of impact point */
interface BlastContext {
    radius: number;
    impactLocation: HitLocationKey;
}

/**
 * Get all tokens within blast radius of a target token.
 * Returns tokens that should be hit (excluding original target if desired).
 */
function getBlastTargets(
    targetToken: any,
    radiusMetres: number,
): any[] {
    const scene = (game as any).scenes?.active;
    if (!scene) return [];

    const gridSize = scene.grid?.size ?? 1;
    const gridDistance = scene.grid?.distance ?? 1;
    const radiusPixels = (radiusMetres / gridDistance) * gridSize;

    const results: any[] = [];
    const tx = targetToken.x + (targetToken.width * gridSize) / 2;
    const ty = targetToken.y + (targetToken.height * gridSize) / 2;

    for (const token of scene.tokens ?? []) {
        if (token.id === targetToken.id) continue;
        const ox = token.x + (token.width * gridSize) / 2;
        const oy = token.y + (token.height * gridSize) / 2;
        const dist = Math.hypot(ox - tx, oy - ty);
        if (dist <= radiusPixels) results.push(token);
    }

    return results;
}

/** Flame: cone attack, no BS test required, targets must pass Ag test or catch fire */
interface FlameContext {
    /** Cone length in metres (= weapon range) */
    range: number;
}

/** Spray: 30-degree cone, auto-hits, no BS test */
interface SprayContext {
    /** Cone length in metres (= 30m for most spray weapons) */
    range: number;
}

/** Haywire: disrupts machinery, roll on haywire table */
interface HaywireResult {
    /** d10 roll for haywire effect */
    roll: number;
    /** Description of the haywire effect */
    effect: string;
}

const HAYWIRE_TABLE: { range: [number, number]; effect: string }[] = [
    { range: [1, 1], effect: "Target unaffected." },
    { range: [2, 3], effect: "All electronics within 1d10m malfunction for 1 round." },
    { range: [4, 5], effect: "All electronics within 2d10m malfunction for 1d5 rounds." },
    { range: [6, 7], effect: "All electronics within 3d10m are disabled for 1d10 rounds." },
    { range: [8, 9], effect: "All electronics within 4d10m are destroyed permanently." },
    { range: [10, 10], effect: "Target and all electronics within 5d10m are destroyed in an electromagnetic pulse." },
];

function lookupHaywireEffect(roll: number): string {
    const entry = HAYWIRE_TABLE.find((e) => roll >= e.range[0] && roll <= e.range[1]);
    return entry?.effect ?? "No effect.";
}

export {
    getBlastTargets,
    lookupHaywireEffect,
};
export type {
    BlastContext,
    FlameContext,
    SprayContext,
    HaywireResult,
};
