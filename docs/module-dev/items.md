# DH2E Item Types & Data Packs

Reference for module developers. Covers all 19 item types, their schemas, and how to build data packs.

## Item Types (19 Total)

### Equipment

| Type | Description | Key Fields |
|------|-------------|------------|
| `weapon` | Melee and ranged weapons | class, rof, damage, penetration, magazine, qualities, craftsmanship, rules |
| `armour` | Body protection | locations (per hit location AP), maxAgility, qualities, craftsmanship |
| `ammunition` | Rounds and magazines | damageModifier, penetrationModifier, qualities, capacity, weaponGroup |
| `gear` | Miscellaneous items | weight, quantity, craftsmanship |
| `treasure` | Valuables and loot | value (Thrones), category, quantity |
| `cybernetic` | Augmentations | location, type (replacement/enhancement), grade, installed, rules |

### Abilities

| Type | Description | Key Fields |
|------|-------------|------------|
| `skill` | Learnable abilities | linkedCharacteristic, advancement (0-4), uses (sub-actions), isSpecialist |
| `talent` | Special abilities | tier, aptitudes, prerequisites, rules |
| `trait` | Permanent creature abilities | hasRating, rating, category, immunities, rules |
| `power` | Psychic powers | discipline, cost, focusTest, focusModifier, sustained, action, rules |
| `condition` | Temporary statuses | slug, stackable, remainingRounds, rules |

### Afflictions

| Type | Description | Key Fields |
|------|-------------|------------|
| `critical-injury` | Wound effects | location, damageType, severity, lethal, penalties |
| `malignancy` | Corruption mutations | threshold, visible, rules |
| `mental-disorder` | Insanity effects | threshold, severity (minor/severe/acute), triggers, rules |

### Character Creation

| Type | Description | Key Fields |
|------|-------------|------------|
| `homeworld` | Origin world | characteristicBonuses, fate, woundsFormula, aptitude |
| `background` | Career path | skills, talents, equipment, aptitude, bonus |
| `role` | Character archetype | aptitudes, talent, eliteAdvances, bonus |

### Personal

| Type | Description | Key Fields |
|------|-------------|------------|
| `objective` | Mission directives | status, assignedBy, scope (personal/warband), format |
| `note` | Journal entries | content (rich HTML), timestamp, gameDate |

---

## Detailed Schemas

### Weapon

```json
{
    "name": "Laspistol",
    "type": "weapon",
    "system": {
        "description": "Standard sidearm of the Imperium.",
        "class": "ranged",
        "range": 30,
        "rof": { "single": true, "semi": 2, "full": 0 },
        "damage": { "formula": "1d10", "type": "energy", "bonus": 2 },
        "penetration": 0,
        "magazine": { "value": 30, "max": 30 },
        "reload": "Half",
        "weight": 1.5,
        "qualities": ["Reliable"],
        "equipped": true,
        "weaponGroup": "las",
        "loadType": "magazine",
        "loadedAmmoId": "",
        "loadedMagazineName": "",
        "loadedRounds": [{ "name": "Standard Charge Pack", "count": 30 }],
        "reloadProgress": 0,
        "rules": [],
        "availability": "Common",
        "craftsmanship": "common"
    }
}
```

**Weapon Groups**: `bolt`, `las`, `sp`, `flame`, `melta`, `plasma`, `shotgun`, `launcher`, `crossbow`, `bow`, `needler`

**Damage Types**: `energy`, `impact`, `rending`, `explosive`

### Armour

```json
{
    "name": "Flak Jacket",
    "type": "armour",
    "system": {
        "description": "Standard-issue body armour.",
        "locations": {
            "head": 0,
            "rightArm": 2,
            "leftArm": 2,
            "body": 3,
            "rightLeg": 2,
            "leftLeg": 2
        },
        "maxAgility": 0,
        "qualities": [],
        "weight": 5,
        "equipped": true,
        "availability": "Average",
        "craftsmanship": "common"
    }
}
```

### Skill

```json
{
    "name": "Dodge",
    "type": "skill",
    "system": {
        "description": "Evade attacks and hazards.",
        "linkedCharacteristic": "ag",
        "advancement": 2,
        "isSpecialist": false,
        "specialization": "",
        "aptitude": "Defence",
        "uses": [
            {
                "slug": "dodge-attack",
                "label": "Dodge Attack",
                "description": "Avoid a single melee or ranged attack.",
                "actionTime": "Reaction",
                "tags": ["combat"]
            },
            {
                "slug": "dodge-area",
                "label": "Dodge Area",
                "description": "Avoid an area effect.",
                "actionTime": "Reaction",
                "defaultModifier": -10,
                "defaultModifierLabel": "Area Effect",
                "tags": ["combat"]
            }
        ]
    }
}
```

**Advancement Tiers**:
| Tier | Name | Bonus |
|------|------|-------|
| 0 | Untrained | +0 |
| 1 | Known | +0 |
| 2 | Trained | +10 |
| 3 | Experienced | +20 |
| 4 | Veteran | +30 |

### Trait (with Rule Elements)

```json
{
    "name": "Brutal Charge",
    "type": "trait",
    "system": {
        "description": "Gains bonus damage when charging.",
        "hasRating": true,
        "rating": 3,
        "category": "physical",
        "immunities": [],
        "rules": [
            {
                "key": "FlatModifier",
                "domain": "damage:melee",
                "value": "rating",
                "label": "Brutal Charge",
                "predicate": ["action:charge"]
            }
        ]
    }
}
```

### Ammunition (Magazine)

```json
{
    "name": "Bolt Pistol Magazine",
    "type": "ammunition",
    "system": {
        "description": "Standard bolt pistol magazine.",
        "damageModifier": 0,
        "damageType": "",
        "penetrationModifier": 0,
        "qualities": [],
        "quantity": 3,
        "weight": 0.5,
        "weaponGroup": "bolt",
        "availability": "Scarce",
        "craftsmanship": "common",
        "capacity": 8,
        "loadedRounds": [{ "name": "Bolt Rounds", "count": 8 }],
        "forWeapon": ""
    }
}
```

### NPC Actor (with Embedded Items)

```json
{
    "name": "Bloodletter",
    "type": "npc",
    "system": {
        "characteristics": {
            "ws":  { "base": 50, "advances": 0 },
            "bs":  { "base": 20, "advances": 0 },
            "s":   { "base": 50, "advances": 0 },
            "t":   { "base": 45, "advances": 0 },
            "ag":  { "base": 40, "advances": 0 },
            "int": { "base": 25, "advances": 0 },
            "per": { "base": 35, "advances": 0 },
            "wp":  { "base": 45, "advances": 0 },
            "fel": { "base": 10, "advances": 0 }
        },
        "wounds": { "value": 15, "max": 15 },
        "fate": { "value": 0, "max": 0 },
        "fatigue": 0,
        "corruption": 0,
        "insanity": 0,
        "influence": 0,
        "xp": { "total": 0, "spent": 0 },
        "aptitudes": [],
        "armour": {
            "head": 0, "rightArm": 0, "leftArm": 0,
            "body": 0, "rightLeg": 0, "leftLeg": 0
        },
        "details": {
            "homeworld": "",
            "background": "",
            "role": "Elite",
            "divination": "",
            "notes": "A lesser daemon of Khorne."
        }
    },
    "items": [
        {
            "name": "Hellblade",
            "type": "weapon",
            "system": {
                "class": "melee",
                "range": 0,
                "rof": { "single": true, "semi": 0, "full": 0 },
                "damage": { "formula": "1d10", "type": "rending", "bonus": 9 },
                "penetration": 5,
                "magazine": { "value": 0, "max": 0 },
                "qualities": ["Tearing"],
                "equipped": true,
                "weaponGroup": "",
                "rules": []
            }
        },
        {
            "name": "Daemonic",
            "type": "trait",
            "system": {
                "hasRating": false,
                "rating": 0,
                "category": "warp",
                "immunities": ["Fear", "Pinning", "Disease", "Poison"],
                "rules": [
                    { "key": "AdjustToughness", "mode": "add", "value": 2 },
                    { "key": "RollOption", "option": "self:daemonic" }
                ]
            }
        },
        {
            "name": "Fear",
            "type": "trait",
            "system": {
                "hasRating": true,
                "rating": 2,
                "category": "mental",
                "immunities": [],
                "rules": [
                    { "key": "RollOption", "option": "self:fear" }
                ]
            }
        }
    ]
}
```

---

## Data Pack Structure

### Directory Layout

```
dh2e-data/
├── module.json                 # Module manifest with pack definitions
├── data/                       # JSON source files
│   ├── weapons.json            # 55 weapons
│   ├── armour.json             # 22 armour sets
│   ├── gear.json               # 40 items
│   ├── ammunition.json         # 10 ammo types
│   ├── cybernetics.json        # 20 augmentations
│   ├── skills.json             # 106 skills
│   ├── talents.json            # 130 talents
│   ├── powers.json             # 45 psychic powers
│   ├── traits.json             # 29 traits
│   ├── conditions.json         # 16 conditions
│   ├── homeworlds.json         # 6 homeworlds
│   ├── backgrounds.json        # 7 backgrounds
│   ├── roles.json              # 8 roles
│   ├── npcs.json               # 40+ NPC actors
│   ├── macros.json             # Utility macros
│   ├── guides.json             # System guide journal
│   └── creation/               # Chargen simplified data
│       ├── homeworlds.json
│       ├── backgrounds.json
│       └── divinations.json
├── packs/                      # LevelDB compiled packs (built from data/)
│   ├── skills/
│   ├── talents/
│   ├── weapons/
│   └── ... (15 pack directories)
└── scripts/
    └── build-packs.mjs         # Compiles JSON → LevelDB
```

### module.json Pack Definition

```json
{
    "packs": [
        {
            "name": "weapons",
            "label": "DH2E Weapons",
            "path": "packs/weapons",
            "type": "Item",
            "system": "dh2e"
        },
        {
            "name": "npcs",
            "label": "DH2E NPCs",
            "path": "packs/npcs",
            "type": "Actor",
            "system": "dh2e"
        }
    ],
    "packFolders": [
        {
            "name": "DH2E Equipment",
            "packs": ["weapons", "armour", "gear", "ammunition", "cybernetics"]
        },
        {
            "name": "DH2E Character",
            "packs": ["skills", "talents", "powers", "traits", "conditions"]
        }
    ]
}
```

### Build Process

```bash
cd dh2e-data && node scripts/build-packs.mjs
```

1. Reads JSON source files from `data/`
2. Generates 16-character IDs for items without `_id`
3. Compiles to LevelDB format in `packs/<name>/`
4. Uses Foundry V13 key format: `!items!<id>`, `!actors!<id>`, etc.
5. Embedded items use: `!actors.items!<actorId>.<itemId>`

### Deploy Gotcha

**MUST stop Foundry before deploying LevelDB packs.** Foundry holds locks on LevelDB and compaction will overwrite files deployed while running.

---

## Creating a Custom Module

### Minimal module.json

```json
{
    "id": "my-dh2e-bestiary",
    "title": "My DH2E Bestiary",
    "version": "1.0.0",
    "compatibility": {
        "minimum": "13.351",
        "verified": "13.351"
    },
    "relationships": {
        "systems": [{
            "id": "dh2e",
            "type": "system",
            "compatibility": { "minimum": "0.1.0" }
        }]
    },
    "packs": [
        {
            "name": "creatures",
            "label": "My Creatures",
            "path": "packs/creatures",
            "type": "Actor",
            "system": "dh2e"
        }
    ]
}
```

### JSON Source Format for Custom NPCs

Each entry in your JSON array should follow the NPC actor schema shown above. Items are embedded directly in the `items` array. Rule elements go in `system.rules[]` on the appropriate items.

### Cross-Referencing System Packs

To reference items from the base system's compendiums:

```javascript
// UUID format for compendium items
"Compendium.dh2e-data.traits.abc123def456"
"Compendium.dh2e-data.weapons.xyz789abc123"

// Resolve at runtime
const trait = await fromUuid("Compendium.dh2e-data.traits.abc123def456");
```

For `GrantItem` rule elements, use the UUID to auto-grant items from any compendium.

---

## Availability Scale

Used on all equipment items:

| Level | Description |
|-------|-------------|
| Common | Readily available everywhere |
| Average | Available in most settlements |
| Scarce | Requires some searching |
| Rare | Difficult to locate |
| Very Rare | Extremely hard to find |
| Extremely Rare | Legendary, unique items |
| Near Unique | One of a kind |

### Craftsmanship Scale

| Grade | To-Hit Mod | AP Mod | Cost Multiplier |
|-------|-----------|--------|-----------------|
| Poor | -10 | -1 | x0.5 |
| Common | 0 | 0 | x1 |
| Good | +5 | 0 | x3 |
| Best | +10 | +1 | x5 |
