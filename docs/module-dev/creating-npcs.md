# Creating NPCs & Creatures for DH2E

Step-by-step guide for module developers building NPC/creature compendium packs.

## NPC Data Structure

Every NPC is an actor of type `"npc"` with embedded items for weapons, traits, skills, etc.

```json
{
    "name": "NPC Name",
    "type": "npc",
    "img": "modules/your-module/icons/npc-name.webp",
    "system": { ... },
    "items": [ ... ]
}
```

---

## Step 1: Set Characteristics

All 9 characteristics need `base` and `advances`. For NPCs, `advances` is typically 0 (the base already represents their total value).

```json
"characteristics": {
    "ws":  { "base": 35, "advances": 0 },
    "bs":  { "base": 30, "advances": 0 },
    "s":   { "base": 40, "advances": 0 },
    "t":   { "base": 40, "advances": 0 },
    "ag":  { "base": 25, "advances": 0 },
    "int": { "base": 20, "advances": 0 },
    "per": { "base": 30, "advances": 0 },
    "wp":  { "base": 25, "advances": 0 },
    "fel": { "base": 15, "advances": 0 }
}
```

**Derived values** (calculated automatically):
- `value` = base + (advances * 5)
- `bonus` = floor(value / 10)

### Characteristic Ranges by Threat Level

| Threat | Typical Range | Example |
|--------|--------------|---------|
| Troop | 20-35 | Hive Ganger, Servitor |
| Elite | 30-50 | Chaos Marine, Bloodletter |
| Master | 40-65 | Greater Daemon, Archon |

---

## Step 2: Set Resources

```json
"wounds": { "value": 12, "max": 12 },
"fate": { "value": 0, "max": 0 },
"fatigue": 0,
"corruption": 0,
"insanity": 0,
"influence": 0,
"xp": { "total": 0, "spent": 0 },
"aptitudes": [],
```

- **Fate points**: Usually 0 for NPCs. Give 1-3 to important recurring villains.
- **Wounds**: Troops 8-12, Elites 15-25, Masters 30+

---

## Step 3: Set Armour

NPC armour can be set two ways:

### Option A: Direct armour values (simple NPCs)
```json
"armour": {
    "head": 3,
    "rightArm": 4,
    "leftArm": 4,
    "body": 5,
    "rightLeg": 3,
    "leftLeg": 3
}
```

### Option B: Armour items (for lootable NPCs)
Set base armour to 0 and add armour items. The system will aggregate all equipped armour item AP values per location.

```json
"armour": { "head": 0, "rightArm": 0, "leftArm": 0, "body": 0, "rightLeg": 0, "leftLeg": 0 }
```
Then add armour items to the `items` array (see Step 5).

---

## Step 4: Set Details

```json
"details": {
    "homeworld": "",
    "background": "",
    "role": "Troop",
    "divination": "",
    "notes": "A brief description of this NPC visible to players when inspecting.",
    "gmNotes": "Private GM notes about tactics, motivations, etc."
}
```

**Role** is a free-text field for NPCs. Common values: `"Troop"`, `"Elite"`, `"Master"`, or a descriptive role like `"Cult Leader"`.

---

## Step 5: Add Embedded Items

Items go in the `items` array. Each is a complete item document.

### Weapons

```json
{
    "name": "Autogun",
    "type": "weapon",
    "system": {
        "class": "ranged",
        "range": 100,
        "rof": { "single": true, "semi": 3, "full": 10 },
        "damage": { "formula": "1d10", "type": "impact", "bonus": 3 },
        "penetration": 0,
        "magazine": { "value": 30, "max": 30 },
        "reload": "Full",
        "weight": 5,
        "qualities": [],
        "equipped": true,
        "weaponGroup": "sp",
        "loadType": "magazine",
        "loadedAmmoId": "",
        "loadedMagazineName": "",
        "loadedRounds": [{ "name": "Solid Rounds", "count": 30 }],
        "reloadProgress": 0,
        "rules": [],
        "availability": "Average",
        "craftsmanship": "common"
    }
}
```

### Melee Weapon

```json
{
    "name": "Chain Sword",
    "type": "weapon",
    "system": {
        "class": "melee",
        "range": 0,
        "rof": { "single": true, "semi": 0, "full": 0 },
        "damage": { "formula": "1d10", "type": "rending", "bonus": 4 },
        "penetration": 2,
        "magazine": { "value": 0, "max": 0 },
        "reload": "",
        "weight": 6,
        "qualities": ["Tearing", "Balanced"],
        "equipped": true,
        "weaponGroup": "",
        "loadType": "",
        "loadedAmmoId": "",
        "loadedMagazineName": "",
        "loadedRounds": [],
        "reloadProgress": 0,
        "rules": [],
        "availability": "Scarce",
        "craftsmanship": "common"
    }
}
```

### Traits

Traits define the creature's special abilities. Use rule elements for mechanical effects.

```json
{
    "name": "Unnatural Strength",
    "type": "trait",
    "system": {
        "hasRating": true,
        "rating": 3,
        "category": "physical",
        "immunities": [],
        "description": "This creature's Strength Bonus is increased by its rating for damage.",
        "rules": [
            {
                "key": "FlatModifier",
                "domain": "damage:melee",
                "value": "rating",
                "label": "Unnatural Strength"
            }
        ]
    }
}
```

### Common Traits Reference

| Trait | Rating? | Rule Elements |
|-------|---------|---------------|
| Brutal Charge(N) | Yes | FlatModifier: damage:melee +rating on charge |
| Daemonic(N) | Yes | AdjustToughness: add rating |
| Deadly Natural Weapons | No | RollOption: self:natural-weapons |
| Fear(N) | Yes | RollOption: self:fear |
| From Beyond | No | Immunities: Fear, Pinning, Insanity, psychic powers |
| Natural Armour(N) | Yes | FlatModifier: armour:all +rating |
| Regeneration(N) | Yes | (Narrative: regain N wounds per round) |
| Size(category) | No | RollOption: self:size:{category} |
| Stuff of Nightmares | No | Immunities: critical, bleeding, stun |
| Unnatural Strength(N) | Yes | FlatModifier: damage:melee +rating |
| Unnatural Toughness(N) | Yes | AdjustToughness: add rating |
| Warp Instability | No | RollOption: self:warp-unstable |

### Skills (Optional)

NPCs don't need all 106 skills. Only add skills they'd actually use.

```json
{
    "name": "Intimidate",
    "type": "skill",
    "system": {
        "linkedCharacteristic": "s",
        "advancement": 2,
        "isSpecialist": false,
        "specialization": "",
        "aptitude": "Social",
        "uses": []
    }
}
```

### Talents (Optional)

```json
{
    "name": "Swift Attack",
    "type": "talent",
    "system": {
        "tier": 2,
        "aptitudes": [],
        "prerequisites": "WS 30",
        "description": "May make a second melee attack as part of a Swift Attack action.",
        "rules": []
    }
}
```

---

## Step 6: Complete Example — Hive Ganger

```json
{
    "name": "Hive Ganger",
    "type": "npc",
    "img": "modules/my-module/icons/hive-ganger.webp",
    "system": {
        "characteristics": {
            "ws":  { "base": 30, "advances": 0 },
            "bs":  { "base": 30, "advances": 0 },
            "s":   { "base": 30, "advances": 0 },
            "t":   { "base": 30, "advances": 0 },
            "ag":  { "base": 30, "advances": 0 },
            "int": { "base": 25, "advances": 0 },
            "per": { "base": 25, "advances": 0 },
            "wp":  { "base": 20, "advances": 0 },
            "fel": { "base": 20, "advances": 0 }
        },
        "wounds": { "value": 10, "max": 10 },
        "fate": { "value": 0, "max": 0 },
        "fatigue": 0,
        "corruption": 0,
        "insanity": 0,
        "influence": 0,
        "xp": { "total": 0, "spent": 0 },
        "aptitudes": [],
        "armour": {
            "head": 0, "rightArm": 1, "leftArm": 1,
            "body": 2, "rightLeg": 1, "leftLeg": 1
        },
        "details": {
            "homeworld": "",
            "background": "",
            "role": "Troop",
            "divination": "",
            "notes": "Common underhive muscle. Aggressive but cowardly when outmatched.",
            "gmNotes": "Will flee at half wounds unless leader present."
        }
    },
    "items": [
        {
            "name": "Stub Revolver",
            "type": "weapon",
            "system": {
                "class": "ranged",
                "range": 30,
                "rof": { "single": true, "semi": 0, "full": 0 },
                "damage": { "formula": "1d10", "type": "impact", "bonus": 3 },
                "penetration": 0,
                "magazine": { "value": 6, "max": 6 },
                "reload": "Full",
                "weight": 1.5,
                "qualities": ["Reliable"],
                "equipped": true,
                "weaponGroup": "sp",
                "loadType": "individual",
                "loadedAmmoId": "",
                "loadedMagazineName": "",
                "loadedRounds": [{ "name": "Stub Rounds", "count": 6 }],
                "reloadProgress": 0,
                "rules": [],
                "availability": "Average",
                "craftsmanship": "common"
            }
        },
        {
            "name": "Knife",
            "type": "weapon",
            "system": {
                "class": "melee",
                "range": 0,
                "rof": { "single": true, "semi": 0, "full": 0 },
                "damage": { "formula": "1d5", "type": "rending", "bonus": 3 },
                "penetration": 0,
                "magazine": { "value": 0, "max": 0 },
                "reload": "",
                "weight": 0.5,
                "qualities": [],
                "equipped": true,
                "weaponGroup": "",
                "loadType": "",
                "loadedAmmoId": "",
                "loadedMagazineName": "",
                "loadedRounds": [],
                "reloadProgress": 0,
                "rules": [],
                "availability": "Common",
                "craftsmanship": "common"
            }
        },
        {
            "name": "Dodge",
            "type": "skill",
            "system": {
                "linkedCharacteristic": "ag",
                "advancement": 1,
                "isSpecialist": false,
                "specialization": "",
                "aptitude": "Defence",
                "uses": []
            }
        }
    ]
}
```

---

## Step 7: Build the Pack

### Project Structure

```
my-dh2e-bestiary/
├── module.json
├── data/
│   └── creatures.json        # Array of NPC objects
├── packs/
│   └── creatures/            # LevelDB output (built)
└── scripts/
    └── build-packs.mjs       # Build script (copy from dh2e-data)
```

### Build Script

Copy and adapt `dh2e-data/scripts/build-packs.mjs`. The core logic:

1. Read your JSON file
2. Generate `_id` for each entry (16 hex chars)
3. Generate `_id` for each embedded item
4. Write to LevelDB using ClassicLevel:

```javascript
import { ClassicLevel } from "classic-level";

const db = new ClassicLevel("packs/creatures", { keyEncoding: "utf8", valueEncoding: "json" });
for (const actor of creatures) {
    actor._id = actor._id || randomId();
    await db.put(`!actors!${actor._id}`, actor);
    for (const item of actor.items ?? []) {
        item._id = item._id || randomId();
        await db.put(`!actors.items!${actor._id}.${item._id}`, item);
    }
}
await db.close();
```

### Deploy

Build the packs, then place the module in Foundry's `Data/modules/` directory. Remember: stop Foundry before deploying LevelDB packs.

---

## Tips

- **Damage bonus**: For melee weapons, add the creature's Strength bonus manually to `damage.bonus`. The system does not auto-add SB to melee damage (it's part of the base profile).
- **Favourite items**: Players/GMs can star items via the sheet UI. Pre-starred items can be set with `flags.dh2e.favorite: true`.
- **Trait ratings**: When a rule element uses `value: "rating"`, it automatically resolves to the parent trait's `system.rating`.
- **Immunities**: Set on traits via `system.immunities[]`. These are displayed on the NPC sheet as immunity tags.
- **Missing fields**: Foundry validates against `template.json`. If a field exists in your JSON but not in the template, Foundry strips it. If a required field is missing, it gets the template default.
- **Images**: Use `.webp` format for best performance. Place in your module directory.
