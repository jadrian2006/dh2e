/**
 * Vehicle critical hit table lookup.
 *
 * When a vehicle reaches 0 SI, excess damage determines severity.
 * Roll 1d5 + severity to find the critical effect.
 */

interface VehicleCriticalEntry {
    roll: number;
    effect: string;
    catastrophic: boolean;
}

const VEHICLE_CRITICAL_TABLE: VehicleCriticalEntry[] = [
    { roll: 1, effect: "Jarring Blow — all crew must pass Ag test or be Stunned for 1 round.", catastrophic: false },
    { roll: 2, effect: "Weapon Disabled — one random mounted weapon ceases to function.", catastrophic: false },
    { roll: 3, effect: "Motive System Damaged — speed halved, -20 to Operate tests.", catastrophic: false },
    { roll: 4, effect: "Structural Breach — armour halved on one random facing.", catastrophic: false },
    { roll: 5, effect: "Crew Hit — one random crew member takes 2d10 Impact damage.", catastrophic: false },
    { roll: 6, effect: "Engine Crippled — vehicle immobilised. Cannot move until repaired.", catastrophic: false },
    { roll: 7, effect: "Fuel Leak — vehicle catches fire. 1d10 E damage per round to all crew.", catastrophic: false },
    { roll: 8, effect: "Total System Failure — all weapons and motive offline. Crew must evacuate.", catastrophic: true },
    { roll: 9, effect: "Catastrophic Explosion — vehicle destroyed. All crew take 3d10+10 E damage.", catastrophic: true },
    { roll: 10, effect: "Annihilated — vehicle utterly destroyed. All crew killed unless Fate spent.", catastrophic: true },
];

/**
 * Look up a vehicle critical effect.
 * @param severity Excess damage beyond 0 SI
 * @returns The critical entry
 */
async function lookupVehicleCritical(severity: number): Promise<VehicleCriticalEntry> {
    const roll = new foundry.dice.Roll("1d5");
    await roll.evaluate();
    const total = Math.min(10, (roll.total ?? 1) + severity);
    const entry = VEHICLE_CRITICAL_TABLE.find((e) => e.roll === total)
        ?? VEHICLE_CRITICAL_TABLE[VEHICLE_CRITICAL_TABLE.length - 1];
    return entry;
}

export { lookupVehicleCritical, VEHICLE_CRITICAL_TABLE };
export type { VehicleCriticalEntry };
