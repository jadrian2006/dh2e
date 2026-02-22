import type { CharacteristicAbbrev, HitLocationKey } from "@actor/types.ts";

/** Shared base data common to all actor types */
export interface ActorBaseSystemSource {
    characteristics: Record<CharacteristicAbbrev, { base: number; advances: number }>;
    wounds: { value: number; max: number };
    fate: { value: number; max: number };
    corruption: number;
    insanity: number;
    influence: number;
    armour: Record<HitLocationKey, number>;
}
