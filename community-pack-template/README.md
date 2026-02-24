# DH2E Community Data Pack Template

This template helps you create custom compendium data packs for the DH2E (Dark Heresy 2nd Edition) Foundry VTT system.

## Quick Start

1. Copy this entire directory
2. Edit `module.json` — change `id`, `title`, `description`, `authors`
3. Add your data as JSON files in the `data/` directory
4. Run `node scripts/build-packs.mjs` to build LevelDB packs
5. Copy the output to your Foundry `Data/modules/<your-module-id>/` directory

## Prerequisites

```bash
npm init -y
npm install classic-level
```

## Directory Structure

```
your-pack/
  module.json           # Foundry module manifest
  data/
    weapons.json        # Weapon item data (array of objects)
    armour.json         # Armour item data
    gear.json           # General gear data
    talents.json        # Talent data
    npcs.json           # NPC actor data
  scripts/
    build-packs.mjs     # Build script (JSON -> LevelDB)
  packs/                # Generated LevelDB output (don't edit)
```

## Item Types

The DH2E system supports these item types:

| Type | Description | Key Fields |
|------|-------------|------------|
| `weapon` | Weapons (melee, ranged) | `class`, `range`, `rof`, `damage`, `penetration`, `clip`, `qualities` |
| `armour` | Protective gear | `ap` (per location), `maxAgility`, `locations` |
| `gear` | General equipment | `weight`, `quantity`, `description` |
| `skill` | Skills | `linkedCharacteristic`, `specialist`, `specialization` |
| `talent` | Talents & traits | `tier`, `aptitudes`, `prerequisites` |
| `condition` | Status conditions | `remainingRounds`, `description` |
| `power` | Psychic powers | `discipline`, `cost`, `focusTest`, `range`, `sustained` |
| `trait` | NPC/creature traits | `category`, `rating`, `hasRating` |
| `cybernetic` | Cybernetic implants | `location`, `cyberneticType`, `grade`, `installed` |
| `ammunition` | Special ammo types | `damageModifier`, `penetrationModifier`, `qualities` |

## Rule Elements

Items can embed Rule Elements in `system.ruleElements` (array). These modify actor stats when the item is owned.

### Rule Element Types

| Type | Purpose | Key Fields |
|------|---------|------------|
| `FlatModifier` | Add a flat bonus/penalty | `selector`, `value`, `label` |
| `DiceOverride` | Change dice formula | `selector`, `formula`, `label` |
| `RollOption` | Set a flag for conditional logic | `domain`, `option` |
| `BaseAdjust` | Modify base characteristic | `characteristic`, `value` |
| `GrantItem` | Auto-grant another item | `uuid` |
| `TokenEffect` | Apply a token status icon | `icon`, `label` |
| `Resistance` | Reduce specific damage types | `damageType`, `value` |
| `Vulnerability` | Increase specific damage types | `damageType`, `value` |

### Example: Weapon with Rule Elements

```json
{
    "name": "Blessed Autopistol",
    "type": "weapon",
    "system": {
        "class": "pistol",
        "damage": { "formula": "1d10+2", "type": "impact" },
        "penetration": 0,
        "qualities": ["reliable"],
        "ruleElements": [
            {
                "type": "FlatModifier",
                "selector": "ranged-attack",
                "value": 5,
                "label": "Blessed Sights"
            },
            {
                "type": "RollOption",
                "domain": "weapon",
                "option": "weapon:sanctified"
            }
        ]
    }
}
```

### Example: Talent with Rule Elements

```json
{
    "name": "Iron Jaw",
    "type": "talent",
    "system": {
        "tier": 1,
        "aptitudes": ["toughness", "defence"],
        "description": "The character can shrug off blows.",
        "ruleElements": [
            {
                "type": "FlatModifier",
                "selector": "toughness-test",
                "value": 10,
                "label": "Iron Jaw"
            }
        ]
    }
}
```

## Actor Types

For NPC data packs, use these actor types:

| Type | Description | Key Fields |
|------|-------------|------------|
| `npc` | NPCs and creatures | Same as `acolyte` — characteristics, wounds, armour, items |
| `horde` | Horde groups | `magnitude`, flat `armour`, characteristics |
| `vehicle` | Vehicles | `structuralIntegrity`, `armour` (front/side/rear), `speed`, `mountedWeapons` |

## Building

```bash
node scripts/build-packs.mjs
```

This reads each JSON file from `data/` and writes LevelDB packs to `packs/`.

## Deploying

Copy the entire module directory to your Foundry installation:

```bash
cp -r . /path/to/foundry/Data/modules/your-pack-id/
```

Or for Docker deployments:

```bash
tar -cf - -C . . | docker exec -i foundry tar -xf - -C /data/Data/modules/your-pack-id/
```

Then enable the module in Foundry's Module Management screen.

## Tips

- Item `_id` fields are optional — the build script generates them automatically
- Use `img` to set custom icons (path relative to Foundry's data directory)
- The `system.description` field supports HTML
- Rule Elements are processed during `prepareDerivedData` — they affect the actor's synthetics
- Cybernetics only apply Rule Elements when `system.installed` is `true`
- Test your data by dragging items from the compendium to a character sheet
