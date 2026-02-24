/**
 * DH2E status effects for token overlays.
 *
 * Maps condition slugs to icon paths and localization keys.
 * Registered to CONFIG.statusEffects during init.
 */

interface DH2EStatusEffect {
    id: string;
    label: string;
    icon: string;
}

const DH2E_STATUS_EFFECTS: DH2EStatusEffect[] = [
    {
        id: "stunned",
        label: "DH2E.Condition.Status.Stunned",
        icon: "systems/dh2e/icons/conditions/stunned.svg",
    },
    {
        id: "prone",
        label: "DH2E.Condition.Status.Prone",
        icon: "systems/dh2e/icons/conditions/prone.svg",
    },
    {
        id: "blinded",
        label: "DH2E.Condition.Status.Blinded",
        icon: "systems/dh2e/icons/conditions/blinded.svg",
    },
    {
        id: "deafened",
        label: "DH2E.Condition.Status.Deafened",
        icon: "systems/dh2e/icons/conditions/deafened.svg",
    },
    {
        id: "on-fire",
        label: "DH2E.Condition.Status.OnFire",
        icon: "systems/dh2e/icons/conditions/on-fire.svg",
    },
    {
        id: "bleeding",
        label: "DH2E.Condition.Status.Bleeding",
        icon: "systems/dh2e/icons/conditions/bleeding.svg",
    },
    {
        id: "pinned",
        label: "DH2E.Condition.Status.Pinned",
        icon: "systems/dh2e/icons/conditions/pinned.svg",
    },
    {
        id: "fatigued",
        label: "DH2E.Condition.Status.Fatigued",
        icon: "systems/dh2e/icons/conditions/fatigued.svg",
    },
    {
        id: "crippled",
        label: "DH2E.Condition.Status.Crippled",
        icon: "systems/dh2e/icons/conditions/crippled.svg",
    },
    {
        id: "unconscious",
        label: "DH2E.Condition.Status.Unconscious",
        icon: "systems/dh2e/icons/conditions/unconscious.svg",
    },
    {
        id: "helpless",
        label: "DH2E.Condition.Status.Helpless",
        icon: "systems/dh2e/icons/conditions/helpless.svg",
    },
    {
        id: "grappled",
        label: "DH2E.Condition.Status.Grappled",
        icon: "systems/dh2e/icons/conditions/grappled.svg",
    },
    {
        id: "immobilized",
        label: "DH2E.Condition.Status.Immobilized",
        icon: "systems/dh2e/icons/conditions/immobilized.svg",
    },
    {
        id: "toxic",
        label: "DH2E.Condition.Status.Toxic",
        icon: "systems/dh2e/icons/conditions/toxic.svg",
    },
    {
        id: "feared",
        label: "DH2E.Condition.Status.Feared",
        icon: "systems/dh2e/icons/conditions/feared.svg",
    },
];

export { DH2E_STATUS_EFFECTS };
export type { DH2EStatusEffect };
