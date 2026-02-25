import type { ModifierDH2e } from "@rules/modifier.ts";
import type { CharacteristicAbbrev, HitLocationKey } from "@actor/types.ts";
import type { DoSResult } from "@util/degree-of-success.ts";

/** Context for initiating a d100 check */
interface CheckContext {
    /** The actor making the check */
    actor: Actor;
    /** Which characteristic this check is based on (if any) */
    characteristic?: CharacteristicAbbrev;
    /** The base target number before modifiers */
    baseTarget: number;
    /** Label for the check, e.g. "Weapon Skill Test" */
    label: string;
    /** Domain string for collecting modifiers from synthetics */
    domain: string;
    /** Extra modifiers provided directly (not from synthetics) */
    modifiers?: ModifierDH2e[];
    /** Roll options for predicate matching */
    rollOptions?: Set<string>;
    /** Skip the roll dialog and roll immediately */
    skipDialog?: boolean;
    /** DoS threshold set by GM roll request (e.g. 3 means need 3+ DoS) */
    dosThreshold?: number;
    /** Skill description text shown as a foldout in the roll dialog */
    skillDescription?: string;
    /** Called shot target location — overrides random hit location on success */
    calledShot?: HitLocationKey;
    /** Whether this is an attack context where called shots can be selected */
    isAttack?: boolean;
    /** Fire mode for the attack — called shots restricted to "single" */
    fireMode?: string;
    /** Whether the skill being rolled is untrained (shown as badge on chat card) */
    untrained?: boolean;
}

/** The final result of a completed check */
interface CheckResult {
    /** The d100 roll result */
    roll: number;
    /** Target number after all modifiers */
    target: number;
    /** Degree of success/failure details */
    dos: DoSResult;
    /** Modifiers that were applied */
    appliedModifiers: ModifierDH2e[];
    /** Total modifier value */
    modifierTotal: number;
    /** The check context */
    context: CheckContext;
}

export type { CheckContext, CheckResult };
