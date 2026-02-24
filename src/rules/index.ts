export { Predicate } from "./predicate.ts";
export type { PredicateStatement } from "./predicate.ts";

export { ModifierDH2e, resolveModifiers, applyExclusionGroups } from "./modifier.ts";
export type { ModifierParams } from "./modifier.ts";

export { createSynthetics, getModifiers, getDiceOverrides } from "./synthetics.ts";
export type {
    DH2eSynthetics,
    DosAdjustment,
    DiceOverrideEntry,
    ToughnessAdjustment,
    ResistanceEntry,
} from "./synthetics.ts";

export { RuleElementDH2e } from "./rule-element/base.ts";
export type { RuleElementSource } from "./rule-element/base.ts";

export { FlatModifierRE } from "./rule-element/flat-modifier.ts";
export { RollOptionRE } from "./rule-element/roll-option.ts";
export { DiceOverrideRE } from "./rule-element/dice-override.ts";
export { AdjustDegreeRE } from "./rule-element/adjust-degree.ts";
export { GrantItemRE } from "./rule-element/grant-item.ts";
export { ResistanceRE } from "./rule-element/resistance.ts";
export { AdjustToughnessRE } from "./rule-element/adjust-toughness.ts";
export { ChoiceSetRE } from "./rule-element/choice-set.ts";

export { RE_REGISTRY, instantiateRuleElement } from "./rule-element/registry.ts";

export { rulesToYaml, yamlToRules, validateRules } from "./rule-element/yaml-editor.ts";
