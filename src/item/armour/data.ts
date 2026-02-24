import type { HitLocationKey } from "@actor/types.ts";

export interface ArmourSystemSource {
    description: string;
    locations: Record<HitLocationKey, number>;
    maxAgility: number;    // 0 = no limit
    qualities: string[];
    weight: number;
    equipped: boolean;
    availability: string;
}
