# DH2E Rules Engine

Reference for module developers. Covers the check system, combat, modifiers, and how they connect.

## Check System (d100 Roll-Under)

All tests in DH2E are d100 roll-under. Roll equal to or below the target number to succeed.

### Degrees of Success / Failure

```
Success (roll <= target): DoS = 1 + floor(target/10) - floor(roll/10)
Failure (roll >  target): DoF = 1 + floor(roll/10)  - floor(target/10)

Natural 1:   Always succeeds, minimum 1 DoS
Natural 100: Always fails, minimum 1 DoF
```

### Making a Check

```javascript
import { CheckDH2e } from "../../check/check.ts";

CheckDH2e.roll({
    actor,                              // The actor making the test
    characteristic: "ws",               // Which characteristic to test
    baseTarget: 45,                     // Characteristic value (before modifiers)
    label: "Weapon Skill Test",         // Display name for chat
    domain: "characteristic:ws",        // Domain for modifier lookup
    skipDialog: false,                  // true = skip modifier dialog (shift-click)
});
```

### Check Flow

1. **Build context** with actor, characteristic, base target, domain
2. **Collect modifiers** from `actor.synthetics.modifiers[domain]` (inherits parent domains)
3. **Show dialog** (unless `skipDialog`) where user toggles modifiers on/off
4. **Resolve modifiers**: apply predicates, exclusion groups, sum, clamp to +/-60
5. **Roll d100** against `baseTarget + modifierTotal`
6. **Calculate DoS/DoF**
7. **Apply DoS adjustments** from `AdjustDegree` rule elements
8. **Post chat card** with breakdown

### Check Result

```typescript
interface CheckResult {
    roll: number;                // d100 result
    target: number;              // baseTarget + modifierTotal
    dos: {
        success: boolean;
        degrees: number;         // Always >= 1
        roll: number;
        target: number;
    };
    appliedModifiers: Modifier[];
    modifierTotal: number;
    context: CheckContext;
}
```

---

## Modifier System

### ModifierDH2e

```typescript
class ModifierDH2e {
    label: string;               // Display name (e.g., "Aim Bonus")
    value: number;               // Positive = bonus, negative = penalty
    source: string;              // Origin tag: "equipment", "talent", "condition", etc.
    exclusionGroup: string|null; // For competing modifiers (only best wins)
    predicate: Predicate;        // Conditional activation
    enabled: boolean;            // User toggle state
    toggleable: boolean;         // Can the user toggle this in dialog?
}
```

### Stacking Rules (Tagged Stacking + Exclusion Groups)

- **Ungrouped modifiers**: Always stack with everything
- **Same exclusion group**: Only the **highest bonus** and **lowest penalty** apply
- **Modifier cap**: Total clamped to +/-60

Example: Two talents both give WS bonuses in the `"aim"` exclusion group. Only the larger bonus applies. But an ungrouped condition penalty stacks on top.

### Domains

Domains are namespace strings that organize where modifiers apply:

```
characteristic:ws          Weapon Skill tests
characteristic:bs          Ballistic Skill tests
skill:dodge                Dodge skill checks
skill:dodge:evade          Dodge (Evade) sub-use
attack:melee               Melee attack rolls
attack:ranged              Ranged attack rolls
damage:melee               Melee damage rolls
damage:ranged              Ranged damage rolls
armour:all                 All armour locations
armour:head                Head armour specifically
initiative                 Initiative rolls
```

**Domain inheritance**: Modifiers on `skill:dodge` also apply to `skill:dodge:evade`.

---

## Predicate System

Predicates control when modifiers/effects activate. They test against the current `rollOptions` set.

### Syntax

```javascript
// Atom: true if string is in rollOptions
"self:prone"

// Negation: true if NOT in rollOptions
"not:flanked"

// AND: all must pass
{ and: ["self:aim:full", "weapon:class:las"] }

// OR: any must pass
{ or: ["target:helpless", "target:stunned"] }

// Combined
{ and: ["self:aim", { or: ["weapon:class:las", "weapon:class:bolt"] }] }

// Empty predicate: always passes
[]
```

### Common Roll Options

```
self:prone              Actor is prone
self:aim                Actor used aim action
self:aim:full           Actor used full aim (2 half actions)
self:fatigued           Actor has fatigue
action:charge           Attack is a charge
weapon:class:melee      Weapon is melee
weapon:class:las        Weapon is las-type
weapon:quality:accurate Weapon has Accurate quality
target:helpless         Target is helpless
target:stunned          Target is stunned
target:prone            Target is prone
power:mode:pushed       Psychic power is being pushed
```

---

## Synthetics Registry

The central registry populated during `prepareDerivedData()` by all rule elements on all items:

```typescript
interface DH2eSynthetics {
    modifiers: Record<string, ModifierDH2e[]>;         // Domain-keyed modifiers
    rollOptions: Set<string>;                           // Active roll options
    dosAdjustments: DosAdjustment[];                    // Post-roll DoS/DoF tweaks
    diceOverrides: Record<string, DiceOverrideEntry[]>; // Damage dice modifications
    toughnessAdjustments: ToughnessAdjustment[];        // TB modifications
    resistances: ResistanceEntry[];                     // Damage resistances
    vfxOverrides: Record<string, VFXOverrideEntry>;     // Animation overrides
    attributeOverrides: AttributeOverrideEntry[];       // Characteristic swaps
}
```

### How Synthetics Are Built

1. `actor.prepareBaseData()` resets synthetics via `createSynthetics()`
2. `actor.prepareDerivedData()` iterates all items
3. Each item's `system.rules[]` entries are instantiated as `RuleElementDH2e` subclasses
4. Each rule element's `onPrepareData(synthetics)` injects its modifiers/options
5. Characteristics and armour are then calculated using the populated synthetics

---

## Combat

### Attack Flow

1. **Ammo check** (ranged only): verify sufficient loaded rounds
2. **Determine characteristic**: melee = WS, ranged = BS
3. **Synthesize weapon quality REs**: Accurate, Balanced, Tearing, etc.
4. **Apply craftsmanship**: Poor (-10), Common (0), Good (+5), Best (+10)
5. **Check target conditions**: Stunned (+20), Prone (+10 melee / -10 ranged)
6. **Helpless melee**: Auto-hit, WS value used as DoS
7. **Roll attack** via `CheckDH2e` on domain `attack:melee` or `attack:ranged`
8. **Calculate hits** by fire mode:
   - Single: 1 hit
   - Semi-auto: 1 + floor(DoS/2), capped at weapon RoF
   - Full-auto: 1 + DoS, capped at weapon RoF
9. **Determine hit locations**:
   - First hit: called shot location OR reversed d100 digits
   - Extra hits: random reversed d100
10. **Consume ammunition**: LIFO from weapon's `loadedRounds` stack
11. **Post attack chat card**

### Hit Locations

```
Roll (reversed d100) → Location
  01-10:  Head
  11-20:  Right Arm
  21-30:  Left Arm
  31-70:  Body
  71-85:  Right Leg
  86-100: Left Leg
```

### Damage Calculation

Per hit:
```
rawDamage     = roll(weapon.damage.formula) + weapon.damage.bonus + modifiers
effectiveAP   = max(0, locationAP - weapon.penetration)
effectiveTB   = TB + toughnessAdjustments (from Unnatural Toughness etc.)
resistances   = flat subtraction or halving from Resistance REs
woundsDealt   = max(0, rawDamage - effectiveAP - effectiveTB - resistances)
```

Dice overrides apply during damage roll:
- **Tearing**: Re-roll lowest die, keep higher
- **Proven(N)**: Treat dice below N as N
- **Primitive(N)**: Cap dice at N
- **Razor Sharp**: Double penetration on 3+ DoS

### Action Economy

Each combatant per turn gets:

```typescript
interface ActionsUsed {
    half: boolean;      // One half action
    full: boolean;      // One full action (consumes both halves)
    free: boolean;      // One free action
    reaction: boolean;  // One reaction (resets each turn)
}
```

```javascript
combatant.hasAction("half")    // Check availability
combatant.useAction("half")    // Consume action
combatant.resetActions()       // Called at turn start
```

### Initiative

- Formula: `1d10 + Agility Bonus`
- Can be overridden by `AttributeOverride` REs (e.g., use Int instead of Ag)
- Tiebreaker: higher Agility bonus, then alphabetical

### Combat Turn Processing

On `nextTurn()`:
1. Reset actions for current combatant
2. Clear overwatch flags
3. Check grapple maintenance (opposed Strength test)
4. Process condition effects:
   - **On Fire**: 1d10 Energy damage + 1 Fatigue
   - **Bleeding**: +1 Fatigue
5. Decrement `remainingRounds` on all conditions
6. Auto-remove conditions at 0 remaining rounds

### Critical Injuries

When wounds reach 0 and excess damage remains:
1. Look up `damageType x location x severity` on critical table
2. Create `critical-injury` item on actor
3. Apply condition effects (e.g., stunned for 3 rounds)
4. Post critical injury chat card

---

## Weapon Qualities

Weapon qualities are text strings in `weapon.system.qualities[]`. At attack time they are synthesized into temporary rule elements:

| Quality | Effect |
|---------|--------|
| Accurate | +10 ranged if aiming; +1 DoS if full aim |
| Balanced | +10 to parry |
| Tearing | Re-roll lowest damage die |
| Proven(N) | Minimum die value of N |
| Primitive(N) | Damage dice capped at N |
| Reliable | Roll option (used by jam mechanics) |
| Razor Sharp | Double penetration on 3+ DoS |
| Felling(N) | Reduce target's Unnatural Toughness by N |
| Blast(N) | Area effect radius |
| Flame | Sets target on fire |
| Spray | Cone attack |

### Craftsmanship Modifiers

| Grade | To-Hit | AP Bonus |
|-------|--------|----------|
| Poor | -10 | -1 |
| Common | 0 | 0 |
| Good | +5 | 0 |
| Best | +10 | +1 |

---

## Skill Checks

```javascript
// Skills are items on the actor
const dodgeSkill = actor.items.find(i => i.type === "skill" && i.name === "Dodge");

// Advancement tiers and bonuses:
// Tier 0 (untrained): +0
// Tier 1 (known):     +0
// Tier 2 (trained):   +10
// Tier 3 (experienced): +20
// Tier 4 (veteran):   +30

// Base target = linked characteristic value + advancement bonus
// Domain = "skill:{name}:{useSlug}"
```

Each skill has multiple **uses** (sub-actions). For example, Dodge has `dodge-attack` (Reaction) and `dodge-area` (Reaction).

---

## Psychic Powers

### Focus Power Flow

1. **Select mode**: Unfettered (safe) or Pushed (risky but stronger)
2. **Base target**: Willpower value (usually) + focus modifier
3. **PR multiplier**: Unfettered = +25, Pushed = +50
4. **Roll check** on domain `power:{slug}`
5. **Phenomena detection**:
   - Pushed: always triggers phenomena
   - Unfettered: triggers on doubles (tens == units digit)
6. **Roll phenomena/perils table** if triggered

---

## Fatigue

Fatigue applies -10 to ALL characteristics per fatigue level. When `fatigue > (TB + WPB)`, the actor falls unconscious.

---

## Grapple System

- **Initiate**: Opposed WS tests
- **Maintain**: Opposed Strength tests each round
- **Actions while grappling**: Damage (1d5+SB), Push (1m), Throw (SBm + prone), Break Free
