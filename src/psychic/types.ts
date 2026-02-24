import type { CharacteristicAbbrev } from "@actor/types.ts";
import type { CheckResult } from "@check/types.ts";

/** Psyker casting mode */
type PsykerMode = "unfettered" | "pushed";

/** Context for resolving a Focus Power test */
interface FocusPowerContext {
    actor: Actor;
    power: Item;
    /** Which characteristic to test against (default: wp) */
    focusCharacteristic: CharacteristicAbbrev;
    /** Base modifier from the power itself */
    focusModifier: number;
    /** Psy Rating value */
    psyRating: number;
    /** Psyker mode chosen by user */
    mode?: PsykerMode;
    /** Skip dialog */
    skipDialog?: boolean;
}

/** Full result of a focus power test */
interface FocusPowerResult {
    checkResult: CheckResult;
    mode: PsykerMode;
    psyRating: number;
    effectivePR: number;
    phenomenaTriggered: boolean;
    phenomenaEntry?: PhenomenaEntry;
    perilsEntry?: PerilsEntry;
}

/** Single entry from the Psychic Phenomena d100 table */
interface PhenomenaEntry {
    min: number;
    max: number;
    title: string;
    description: string;
    effect: string;
    escalate?: boolean;
}

/** Single entry from the Perils of the Warp d100 table */
interface PerilsEntry {
    min: number;
    max: number;
    title: string;
    description: string;
    effect: string;
    damage?: string;
    conditions?: string[];
}

export type {
    PsykerMode,
    FocusPowerContext,
    FocusPowerResult,
    PhenomenaEntry,
    PerilsEntry,
};
