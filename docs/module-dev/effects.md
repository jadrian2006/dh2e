# DH2E Effects & Rule Elements

Reference for module developers. Covers conditions, traits, rule elements, and how to create custom effects.

## Overview

DH2E does **NOT** use Foundry's ActiveEffect system for game mechanics. Instead, it uses a custom **Rule Elements** system. Effects are data-driven JSON/YAML objects stored in item `system.rules[]` arrays. During actor data preparation, these are instantiated and inject modifiers into the **synthetics registry**.

Token status effect icons (skulls, fire, etc.) are visual-only overlays synced by condition item lifecycle hooks.

---

## Conditions

Conditions are item type `"condition"` embedded on actors. They represent temporary statuses.

### Data Schema

```json
{
    "name": "Stunned",
    "type": "condition",
    "system": {
        "slug": "stunned",
        "description": "Cannot take actions...",
        "duration": "1 round",
        "stackable": false,
        "remainingRounds": 1,
        "rules": [
            { "key": "RollOption", "option": "self:stunned" },
            { "key": "FlatModifier", "domain": "characteristic:ag", "value": -20 }
        ]
    }
}
```

### Built-in Conditions (16)

`stunned`, `prone`, `blinded`, `deafened`, `on-fire`, `bleeding`, `pinned`, `fatigued`, `crippled`, `unconscious`, `helpless`, `grappled`, `immobilized`, `toxic`, `feared`, `frenzied`

Each has an icon at `systems/dh2e/icons/conditions/{slug}.svg`.

### Applying Conditions

```javascript
// Add a condition to an actor
await actor.createEmbeddedDocuments("Item", [{
    name: "Stunned",
    type: "condition",
    system: {
        slug: "stunned",
        stackable: false,
        remainingRounds: 3,
        rules: [
            { key: "RollOption", option: "self:stunned" }
        ]
    }
}]);

// Remove by finding and deleting
const stunned = actor.items.find(i => i.type === "condition" && i.system.slug === "stunned");
if (stunned) await stunned.delete();
```

### Condition Lifecycle

- **Creation**: Token status effect icon is applied via `token.toggleActiveEffect()`
- **Combat turn**: `remainingRounds` decremented; auto-removed at 0
- **Special processing**: On Fire deals 1d10 Energy + 1 Fatigue per turn; Bleeding adds +1 Fatigue
- **Deletion**: Token status effect icon is removed

---

## Traits

Traits are permanent abilities on creatures/NPCs. Item type `"trait"`.

### Data Schema

```json
{
    "name": "Unnatural Toughness",
    "type": "trait",
    "system": {
        "hasRating": true,
        "rating": 2,
        "category": "physical",
        "immunities": [],
        "description": "Adds rating to Toughness Bonus for damage reduction.",
        "rules": [
            {
                "key": "AdjustToughness",
                "mode": "add",
                "value": "rating"
            }
        ]
    }
}
```

### Key Fields

- **hasRating / rating**: Some traits scale (e.g., "Brutal Charge (3)"). When `value: "rating"` is used in a rule element, it resolves to the trait's rating.
- **category**: Organizational grouping (physical, mental, movement, etc.)
- **immunities**: String array of things the trait grants immunity to (e.g., `["Fear", "Pinning"]`)

---

## Critical Injuries

Applied when an actor takes damage at 0 wounds. Item type `"critical-injury"`.

```json
{
    "name": "Shattered Kneecap",
    "type": "critical-injury",
    "system": {
        "location": "rightLeg",
        "damageType": "impact",
        "severity": 5,
        "effects": ["Cannot walk without aid"],
        "lethal": false,
        "duration": "Until treated",
        "penalties": [
            { "target": "characteristic:ag", "value": -20 }
        ]
    }
}
```

---

## Malignancies & Mental Disorders

**Malignancies** (corruption manifestations):
```json
{
    "type": "malignancy",
    "system": {
        "threshold": 30,
        "visible": true,
        "rules": [
            { "key": "FlatModifier", "domain": "characteristic:fel", "value": -10, "label": "Warp Taint" }
        ]
    }
}
```

**Mental Disorders** (insanity manifestations):
```json
{
    "type": "mental-disorder",
    "system": {
        "threshold": 20,
        "severity": "minor",
        "triggers": "Stressful combat situations",
        "rules": [
            { "key": "FlatModifier", "domain": "characteristic:wp", "value": -10, "label": "Paranoia" }
        ]
    }
}
```

---

## Rule Elements

Rule elements are the core building blocks for all mechanical effects. They live in item `system.rules[]` arrays. Items that support rule elements: **weapon, talent, trait, power, condition, cybernetic, malignancy, mental-disorder**.

### Available Rule Element Types (11)

#### 1. FlatModifier

Adds a numeric bonus or penalty to a domain.

```json
{
    "key": "FlatModifier",
    "domain": "characteristic:ws",
    "value": 10,
    "label": "Combat Training",
    "source": "talent",
    "exclusionGroup": "training",
    "predicate": ["self:aim"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `key` | Yes | `"FlatModifier"` |
| `domain` | Yes | Target domain (see Rules > Domains) |
| `value` | Yes | Number, or `"rating"` to use parent item's rating |
| `label` | No | Display name in modifier dialog |
| `source` | No | Origin tag for stacking rules |
| `exclusionGroup` | No | Competing group (only best bonus/worst penalty wins) |
| `predicate` | No | Conditions for activation |
| `toggleable` | No | Whether user can toggle in dialog (default: false) |

#### 2. RollOption

Injects a string into the actor's `rollOptions` set. Other rule elements can check for these via predicates.

```json
{
    "key": "RollOption",
    "option": "self:fearless"
}
```

#### 3. DiceOverride

Modifies damage dice behavior.

```json
// Tearing: re-roll lowest die
{ "key": "DiceOverride", "domain": "damage:melee", "mode": "rerollLowest" }

// Proven(3): minimum die value of 3
{ "key": "DiceOverride", "domain": "damage:ranged", "mode": "minimumDie", "value": 3 }

// Primitive(7): cap dice at 7
{ "key": "DiceOverride", "domain": "damage:melee", "mode": "maximizeDie", "value": 7 }
```

#### 4. AdjustDegree

Adjusts Degrees of Success/Failure after a roll.

```json
// Static adjustment
{ "key": "AdjustDegree", "domain": "attack:melee", "amount": 1, "predicate": ["action:charge"] }

// Dynamic (use actor's WP bonus)
{ "key": "AdjustDegree", "domain": "skill:intimidate", "amount": "actor:system.characteristics.wp.bonus" }
```

#### 5. Resistance

Provides damage reduction.

```json
// Flat reduction: subtract 2 from energy damage
{ "key": "Resistance", "damageType": "energy", "value": 2, "mode": "flat" }

// Halve: halve all impact damage
{ "key": "Resistance", "damageType": "impact", "mode": "half" }
```

#### 6. AdjustToughness

Modifies the actor's effective Toughness Bonus for damage soak.

```json
// Unnatural Toughness: TB += rating
{ "key": "AdjustToughness", "mode": "add", "value": "rating" }

// Double TB
{ "key": "AdjustToughness", "mode": "multiply", "value": 2 }
```

#### 7. AttributeOverride

Swaps which characteristic is used for a test domain.

```json
// Use Intelligence instead of Agility for initiative
{ "key": "AttributeOverride", "domain": "initiative", "characteristic": "int" }

// Use WP instead of Ag for dodge vs psychic powers
{ "key": "AttributeOverride", "domain": "skill:dodge", "characteristic": "wp", "predicate": ["attack:psychic"] }
```

#### 8. GrantItem

Auto-grants an embedded item when the parent item is added to an actor.

```json
{
    "key": "GrantItem",
    "uuid": "Compendium.dh2e-data.conditions.abc123",
    "cascadeDelete": true
}
```

#### 9. ChoiceSet

Prompts the user to select from options when the item is added. Stores selection as an item flag that other REs can reference.

```json
{
    "key": "ChoiceSet",
    "prompt": "Choose a specialization",
    "choices": [
        { "label": "Blades", "value": "blades" },
        { "label": "Chain", "value": "chain" }
    ],
    "flag": "weaponSpecialization"
}
```

#### 10. VFXOverride

Overrides JB2A animation paths for weapon/power effects.

```json
{
    "key": "VFXOverride",
    "domain": "attack:ranged",
    "path": "jb2a.lasershot.blue",
    "type": "projectile"
}
```

#### 11. ActorValue

Resolves a dynamic value from actor data. Supports transforms.

```json
// Half of Weapon Skill bonus (rounded up) as melee damage bonus
{
    "key": "ActorValue",
    "domain": "damage:melee",
    "path": "system.characteristics.ws.bonus",
    "transform": "half-ceil",
    "label": "Crushing Blow"
}
```

Transforms: `half-ceil`, `half-floor`, `negate`, `multiply:N`

---

## Creating Custom Effects for Modules

### Example: Custom Talent with Conditional Bonus

```javascript
// Add via compendium or createEmbeddedDocuments
await actor.createEmbeddedDocuments("Item", [{
    name: "Warp Sense",
    type: "talent",
    system: {
        tier: 2,
        aptitudes: ["Perception", "Psyker"],
        prerequisites: "Psy Rating 1",
        description: "Detect warp disturbances as a Free Action.",
        rules: [
            // Always-on roll option
            { key: "RollOption", option: "self:warp-sense" },
            // +10 to Perception when detecting psychic activity
            {
                key: "FlatModifier",
                domain: "characteristic:per",
                value: 10,
                label: "Warp Sense",
                predicate: ["action:detect-psychic"],
                toggleable: true
            }
        ]
    }
}]);
```

### Example: Custom Condition with Duration

```javascript
await actor.createEmbeddedDocuments("Item", [{
    name: "Inspired",
    type: "condition",
    system: {
        slug: "inspired",
        stackable: false,
        remainingRounds: 5,
        description: "Bolstered by faith. +10 to Willpower tests.",
        rules: [
            { key: "RollOption", option: "self:inspired" },
            { key: "FlatModifier", domain: "characteristic:wp", value: 10, label: "Inspired" }
        ]
    }
}]);
```

### Example: Custom Trait for a Creature

```javascript
await actor.createEmbeddedDocuments("Item", [{
    name: "Warp Instability",
    type: "trait",
    system: {
        hasRating: false,
        rating: 0,
        category: "warp",
        immunities: [],
        description: "When wounded, must pass WP test or be cast back into the Warp.",
        rules: [
            { key: "RollOption", option: "self:warp-unstable" }
        ]
    }
}]);
```

### Example: Cybernetic with Armour Bonus

```javascript
await actor.createEmbeddedDocuments("Item", [{
    name: "Cranial Armour",
    type: "cybernetic",
    system: {
        location: "Head",
        type: "enhancement",
        grade: "good",
        installed: true,
        weight: 0,
        description: "Subdermal armour plating protecting the skull.",
        rules: [
            { key: "FlatModifier", domain: "armour:head", value: 2, label: "Cranial Armour" }
        ]
    }
}]);
```

---

## VFX Integration

### JB2A Effect Mappings

Weapon effects are mapped by weapon group:
```
las     → jb2a.lasershot.red
bolt    → jb2a.bullet.01.orange
plasma  → jb2a.energy_beam.normal.bluepink
melee   → jb2a.melee_generic.slash.01
chain   → jb2a.melee_generic.slash.02
shock   → jb2a.chain_lightning.primary.blue
thrown  → jb2a.ranged.03.projectile
```

Condition effects play one-shot animations:
```
stunned  → jb2a.static_electricity.03.blue
prone    → jb2a.impact.ground_crack.orange.01
blinded  → jb2a.darkness.01
on-fire  → jb2a.fire_ring.500px.orange
bleeding → jb2a.impact.003.red
```

### TMFX Token Filters

Token Magic FX filters are auto-applied per condition with animated parameters (fire shimmer, blood tint, etc.). Filters auto-remove when the condition is deleted.

---

## How Effects Flow Through the System

```
Item created on actor
  ↓
actor.prepareDerivedData() runs
  ↓
Each item's system.rules[] instantiated as RuleElementDH2e subclasses
  ↓
Each RE's onPrepareData(synthetics) called
  ↓
Modifiers injected into synthetics.modifiers[domain]
Roll options injected into synthetics.rollOptions
DoS adjustments, resistances, etc. injected
  ↓
Characteristics calculated using synthetics
Armour AP calculated using synthetics
  ↓
At check time:
  CheckDH2e.roll() collects modifiers from synthetics for the domain
  Tests predicates against current rollOptions
  Resolves exclusion groups
  Applies to d100 target number
```
