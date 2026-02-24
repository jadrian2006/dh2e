/**
 * Default mappings from weapon classes, psychic disciplines, and damage types
 * to JB2A animation database paths.
 *
 * Per-item overrides via `item.flags.dh2e.vfxProfile` take precedence.
 */

/** Weapon class → JB2A path fragment */
const WEAPON_EFFECTS: Record<string, string> = {
    las:    "jb2a.lasers.laser_beam",
    bolt:   "jb2a.bullet.snipe",
    plasma: "jb2a.energy_beam.normal",
    solid:  "jb2a.bullet.snipe",
    melta:  "jb2a.fire_jet.orange",
    flame:  "jb2a.breath_weapons.fire.cone",
    melee:  "jb2a.melee_generic.slash",
    chain:  "jb2a.melee_generic.slash",
    shock:  "jb2a.chain_lightning.primary",
    thrown: "jb2a.throwable.launch.boulder",
};

/** Psychic discipline → JB2A path fragment */
const PSYCHIC_EFFECTS: Record<string, string> = {
    biomancy:    "jb2a.healing_generic.burst",
    divination:  "jb2a.magic_signs.rune_circle",
    pyromancy:   "jb2a.fire_bolt.orange",
    telekinesis: "jb2a.magic_missile.purple",
    telepathy:   "jb2a.token_stage.round.purple",
};

/** Damage type → impact effect path */
const DAMAGE_EFFECTS: Record<string, string> = {
    energy:    "jb2a.impact.004.orange",
    impact:    "jb2a.impact.ground_crack.orange",
    rending:   "jb2a.impact.003.red",
    explosive: "jb2a.explosion.orange",
};

export { WEAPON_EFFECTS, PSYCHIC_EFFECTS, DAMAGE_EFFECTS };
