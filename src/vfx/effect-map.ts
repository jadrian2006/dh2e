/**
 * Default mappings from weapon classes, psychic disciplines, and damage types
 * to JB2A animation database paths.
 *
 * Per-item overrides via `item.flags.dh2e.vfxProfile` take precedence.
 */

/** Weapon class → JB2A database path (dot notation for Sequencer) */
const WEAPON_EFFECTS: Record<string, string> = {
    las:    "jb2a.lasershot.red",
    bolt:   "jb2a.bullet.01.orange",
    plasma: "jb2a.energy_beam.normal.bluepink",
    solid:  "jb2a.bullet.Snipe.blue",
    melta:  "jb2a.fire_jet.orange",
    flame:  "jb2a.breath_weapons.fire.cone",
    melee:  "jb2a.melee_generic.slash.01",
    chain:  "jb2a.melee_generic.slash.02",
    shock:  "jb2a.chain_lightning.primary.blue",
    thrown: "jb2a.ranged.03.projectile",
};

/** Psychic discipline → JB2A database path */
const PSYCHIC_EFFECTS: Record<string, string> = {
    biomancy:    "jb2a.healing_generic.burst.greenorange",
    divination:  "jb2a.magic_signs.rune_circle.02.blue",
    pyromancy:   "jb2a.fire_bolt.orange",
    telekinesis: "jb2a.eldritch_blast.purple",
    telepathy:   "jb2a.token_stage.round.purple.400",
};

/** Damage type → impact effect path */
const DAMAGE_EFFECTS: Record<string, string> = {
    energy:    "jb2a.impact.004.orange",
    impact:    "jb2a.impact.ground_crack.orange.01",
    rending:   "jb2a.impact.003.blue",
    explosive: "jb2a.explosion.01.orange",
};

/** Condition slug → one-shot JB2A effect paths for apply/remove */
const CONDITION_EFFECTS: Record<string, { apply?: string; remove?: string }> = {
    "stunned":     { apply: "jb2a.static_electricity.03.blue" },
    "prone":       { apply: "jb2a.impact.ground_crack.orange.01" },
    "blinded":     { apply: "jb2a.darkness.01" },
    "deafened":    { apply: "jb2a.thunderwave.center.blue" },
    "on-fire":     { apply: "jb2a.fire_ring.500px.orange" },
    "bleeding":    { apply: "jb2a.impact.003.red" },
    "pinned":      { apply: "jb2a.bullet.01.orange" },
    "fatigued":    { apply: "jb2a.token_stage.round.blue.400" },
    "crippled":    { apply: "jb2a.impact.003.red" },
    "unconscious": { apply: "jb2a.token_stage.round.purple.400" },
    "helpless":    { apply: "jb2a.token_stage.round.purple.400" },
    "grappled":    { apply: "jb2a.energy_strands.range.standard.orange" },
    "immobilized": { apply: "jb2a.web.01" },
    "toxic":       { apply: "jb2a.poison_spray.dark_green" },
    "feared":      { apply: "jb2a.magic_signs.fear.orange" },
    "frenzied":    { apply: "jb2a.rage_of_the_storm.red" },
};

export { WEAPON_EFFECTS, PSYCHIC_EFFECTS, DAMAGE_EFFECTS, CONDITION_EFFECTS };
