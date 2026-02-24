import type { CharacteristicAbbrev } from "@actor/types.ts";

/** Source data for horde actors */
export interface HordeSystemSource {
    characteristics: Record<CharacteristicAbbrev, { base: number; advances: number }>;
    magnitude: { value: number; max: number };
    /** Single flat armour value — hordes don't use per-location AP */
    armour: number;
    details: { notes: string };
}

/** Derived data for horde actors */
export interface HordeSystemData extends HordeSystemSource {
    characteristics: Record<CharacteristicAbbrev, {
        base: number;
        advances: number;
        value: number;
        bonus: number;
    }>;
    movement: {
        half: number;
        full: number;
        charge: number;
        run: number;
    };
}
