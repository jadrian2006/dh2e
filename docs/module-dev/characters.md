# DH2E Characters & Actors

Reference for module developers working with the DH2E Foundry VTT system.

## Actor Types

The system defines 6 actor types:

| Type | Purpose |
|------|---------|
| `acolyte` | Player characters |
| `npc` | Non-player characters and creatures |
| `horde` | Swarm/mob groups with magnitude instead of wounds |
| `vehicle` | Vehicles with crew positions, facing armour, mounted weapons |
| `warband` | Campaign-level party tracker with requisitions and chronicle |
| `loot` | Salvageable containers with DoS-gated sections |

---

## Characteristics

All actors (acolyte, npc, horde) share 9 characteristics:

| Key | Abbreviation | Name |
|-----|-------------|------|
| `ws` | WS | Weapon Skill |
| `bs` | BS | Ballistic Skill |
| `s` | S | Strength |
| `t` | T | Toughness |
| `ag` | Ag | Agility |
| `int` | Int | Intelligence |
| `per` | Per | Perception |
| `wp` | WP | Willpower |
| `fel` | Fel | Fellowship |

### Data Structure

```javascript
// Stored fields
actor.system.characteristics.ws.base     // Base value (e.g., 30)
actor.system.characteristics.ws.advances // Advancement purchases (0-4)

// Derived fields (calculated in prepareDerivedData)
actor.system.characteristics.ws.value    // base + (advances * 5)
actor.system.characteristics.ws.bonus    // Math.floor(value / 10)
```

**Influence** is a special case: stored at `actor.system.influence` (number), NOT in the characteristics object. It functions as a characteristic in the rules but is handled separately in code.

---

## Core Resources

```javascript
actor.system.wounds.value    // Current wounds
actor.system.wounds.max      // Maximum wounds
actor.system.fate.value      // Current fate points (acolyte only; NPC max=0)
actor.system.fate.max        // Maximum fate points
actor.system.fatigue         // Fatigue level (applies -10 per level to ALL characteristics)
actor.system.corruption      // Corruption points (threshold-based mutations)
actor.system.insanity        // Insanity points (threshold-based disorders)
actor.system.influence       // Influence score (acolyte=25 base, NPC=0)
```

### XP

```javascript
actor.system.xp.total        // Total XP earned
actor.system.xp.spent        // XP spent on advances
actor.system.xp.available    // DERIVED: total - spent
```

---

## Derived Data (Acolyte)

These are calculated during `prepareDerivedData()`:

### Movement Rates
```javascript
actor.system.movement.half    // Agility bonus
actor.system.movement.full    // Agility bonus * 2
actor.system.movement.charge  // Agility bonus * 3
actor.system.movement.run     // Agility bonus * 6
```

### Encumbrance
```javascript
actor.system.encumbrance.current        // Sum of carried item weights
actor.system.encumbrance.carry          // SB + TB
actor.system.encumbrance.lift           // carry * 2
actor.system.encumbrance.push           // carry * 4
actor.system.encumbrance.overloaded     // current > carry
actor.system.encumbrance.overencumbered // current > lift
```

### Armour (Per Location)
```javascript
actor.system.armour.head      // Total AP at head
actor.system.armour.body      // Total AP at body
actor.system.armour.rightArm  // Total AP at right arm
actor.system.armour.leftArm   // Total AP at left arm
actor.system.armour.rightLeg  // Total AP at right leg
actor.system.armour.leftLeg   // Total AP at left leg
```

Armour is aggregated from all equipped armour items + craftsmanship bonuses + rule element modifiers on domains `armour:all` and `armour:<location>`.

---

## Acolyte Details

```javascript
actor.system.details.homeworld   // Name string (resolved by lookup)
actor.system.details.background  // Name string
actor.system.details.role        // Name string
actor.system.details.divination  // Divination text
actor.system.details.notes       // Player notes
actor.system.details.biography   // Character biography
actor.system.details.appearance  // Physical description
actor.system.details.age         // Age string
actor.system.details.sex         // Sex/gender string
actor.system.details.height      // Height string
actor.system.details.weight      // Weight string
actor.system.aptitudes           // string[] of aptitudes (affect XP costs)
actor.system.eliteAdvances       // string[] (e.g., ["psyker"])
```

### Companions (Acolyte Only)
```javascript
actor.system.companions          // CompanionEntry[]
// { actorId: string, behavior: "follow" | "stay" }

// Methods:
actor.addCompanion(npc, behavior)
actor.removeCompanion(actorId)
actor.setCompanionBehavior(actorId, behavior)
actor.system.resolvedCompanions  // DERIVED: actual actor references
```

---

## NPC-Specific

```javascript
actor.system.defeated            // boolean - GM toggle for death/loot state
actor.system.details.gmNotes     // GM-only notes (hidden from players)

// Methods:
actor.markDefeated()  // Sets defeated, applies skull overlay, grants loot permissions
actor.markAlive()     // Clears defeated, revokes permissions
actor.applyDamage(wounds, location, damageType, killingDoS)
```

When `defeated === true` and viewed by a player, the sheet renders in **loot mode** (read-only, shows only lootable items).

---

## Horde Actor

Hordes represent mobs/swarms. They use **magnitude** instead of wounds:

```javascript
actor.system.magnitude.value   // Current magnitude (individuals in horde)
actor.system.magnitude.max     // Starting magnitude
actor.system.armour             // Single flat number (not per-location)
```

---

## Vehicle Actor

```javascript
actor.system.structuralIntegrity.value  // Current SI
actor.system.structuralIntegrity.max    // Maximum SI
actor.system.armour.front               // Front armour value
actor.system.armour.side                // Side armour value
actor.system.armour.rear                // Rear armour value
actor.system.motiveSystem               // "wheeled" | "tracked" | "hover" | "walker"
actor.system.speed.tactical             // Tactical speed
actor.system.speed.cruising             // Cruising speed
actor.system.speed.max                  // Maximum speed
actor.system.handling                   // Handling modifier
actor.system.size                       // "hulking" | "enormous" | "massive" | "immense"

actor.system.crewPositions[]            // { role, label, actorId, actorName }
actor.system.mountedWeapons[]           // { weaponId, weaponName, fireArc, crewPosition }
```

---

## Warband Actor

Campaign-level tracking for the party:

```javascript
actor.system.members[]                  // { uuid: string } acolyte references
actor.system.reinforcements[]           // { actorId, controllerId, name, notes }
actor.system.inquisitor                 // { uuid: string }
actor.system.pendingRequisitions[]      // Requisition requests with status tracking
actor.system.chronicle.currentDate      // Current Imperial date
actor.system.chronicle.entries[]        // { date, title, body, author, category }
actor.system.chronicle.deadlines[]      // { objectiveId, deadline, dismissed }
```

---

## Accessing Actor Items

Items are embedded on actors via Foundry's standard collection:

```javascript
const weapons    = actor.items.filter(i => i.type === "weapon");
const armour     = actor.items.filter(i => i.type === "armour");
const skills     = actor.items.filter(i => i.type === "skill");
const talents    = actor.items.filter(i => i.type === "talent");
const traits     = actor.items.filter(i => i.type === "trait");
const powers     = actor.items.filter(i => i.type === "power");
const conditions = actor.items.filter(i => i.type === "condition");
const gear       = actor.items.filter(i => i.type === "gear");
const cybernetics = actor.items.filter(i => i.type === "cybernetic");
const ammunition = actor.items.filter(i => i.type === "ammunition");
const criticalInjuries = actor.items.filter(i => i.type === "critical-injury");
const malignancies = actor.items.filter(i => i.type === "malignancy");
const mentalDisorders = actor.items.filter(i => i.type === "mental-disorder");
```

### Adding Items to Actors

```javascript
// From compendium UUID
const item = await fromUuid("Compendium.dh2e-data.traits.abc123");
await actor.createEmbeddedDocuments("Item", [item.toObject()]);

// From raw data
await actor.createEmbeddedDocuments("Item", [{
    name: "Custom Trait",
    type: "trait",
    system: {
        hasRating: true,
        rating: 2,
        category: "physical",
        rules: [
            { key: "FlatModifier", domain: "characteristic:s", value: 10, label: "Mighty" }
        ]
    }
}]);
```

### Updating Actor Data

```javascript
await actor.update({
    "system.wounds.value": 5,
    "system.characteristics.ws.base": 35,
    "system.details.notes": "Took a bolt round to the shoulder"
});
```
