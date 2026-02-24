/** Motive system types */
export type MotiveSystem = "wheeled" | "tracked" | "hover" | "walker";

/** Vehicle size categories */
export type VehicleSize = "hulking" | "enormous" | "massive" | "immense";

/** Armour facing direction */
export type FacingDirection = "front" | "side" | "rear";

/** Fire arc for mounted weapons */
export type FireArc = "front" | "turret" | "left" | "right" | "rear" | "all";

/** Crew position roles */
export type CrewRole = "driver" | "gunner" | "commander" | "passenger";

/** A mounted weapon slot on the vehicle */
export interface VehicleWeaponSlot {
    weaponId: string;
    weaponName: string;
    fireArc: FireArc;
    crewPosition: number;
}

/** A crew position on the vehicle */
export interface CrewPosition {
    role: CrewRole;
    label: string;
    actorId: string;
    actorName: string;
}

/** Source data for vehicle actors */
export interface VehicleSystemSource {
    structuralIntegrity: { value: number; max: number };
    armour: { front: number; side: number; rear: number };
    motiveSystem: MotiveSystem;
    speed: { tactical: number; cruising: number; max: number };
    handling: number;
    mountedWeapons: VehicleWeaponSlot[];
    crewPositions: CrewPosition[];
    size: VehicleSize;
    details: { notes: string };
}

/** Derived data for vehicle actors */
export interface VehicleSystemData extends VehicleSystemSource {}
