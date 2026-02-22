# Warhammer 40k Dark Heresy 2E — Foundry VTT Game System
## Product Requirements Document (PRD)

**System ID:** `dh2e`
**Status:** FINALIZED
**Last Updated:** 2026-02-22

---

## 1. Vision

Build a fully-featured Foundry VTT game system for **Warhammer 40,000: Dark Heresy 2nd Edition**, drawing architectural inspiration from the Pathfinder 2e system's rules engine, modifier pipeline, and data-driven design — but built entirely from scratch with original, optimized code re-envisioned for Dark Heresy's d100 roll-under mechanics.

### Design Principles
- **Full Automation, GM Override** — automate every mechanical resolution, but always provide GM override/rollback on any result
- **Data-Driven Mechanics** — game rules expressed as declarative data (Rule Elements), not hardcoded logic where possible
- **No Metagaming** — players see public information only; GMs see full breakdowns (enemy stats, DCs, resistances hidden from players)
- **Immersive but Readable** — grimdark Imperial Gothic theme, lightened for legibility (no dark text on dark backgrounds)
- **i18n from Day One** — all strings through Foundry's localization system

---

## 2. Scope & Constraints

| Aspect | Decision |
|---|---|
| **Edition** | Dark Heresy 2nd Edition |
| **Sourcebooks** | All published DH2 (Core, GM Kit, Enemies Within/Without/Beyond, Forgotten Gods) |
| **Content Delivery** | System ships mechanics only (no copyrighted data). Game content via separate community-installable module packs |
| **Foundry VTT** | V13 stable (13.351+) — ApplicationV2, native DOM, CSS Layers |
| **Developer** | Solo developer |
| **Code Origin** | 100% original code. Study PF2e architecture as reference, no forking or copying |

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety, IDE support, Foundry V13 ecosystem |
| UI Framework | Svelte 5 | Reactive character sheets, component reuse |
| Styling | SCSS | Theming, nesting, CSS variables for grimdark theme |
| Chat Templates | Handlebars | Foundry VTT standard for chat message rendering |
| Build | Vite | Fast builds, HMR for development |
| Testing | Vitest | Vite-native testing framework |
| Dice Parsing | Peggy (if needed) | Custom roll formula grammar for DH2 expressions |
| Localization | Foundry i18n (lang/en.json) | All UI strings through translation keys |

---

## 4. Core Mechanics

### 4.1 Characteristics

Nine core characteristics, each a value (typically 20–60+) used as a d100 roll-under target:

| Abbrev | Name | Description |
|---|---|---|
| WS | Weapon Skill | Melee combat |
| BS | Ballistic Skill | Ranged combat |
| S | Strength | Physical power, melee damage bonus |
| T | Toughness | Physical resilience, damage reduction |
| Ag | Agility | Speed, reflexes, initiative |
| Int | Intelligence | Reasoning, knowledge |
| Per | Perception | Awareness, detection |
| WP | Willpower | Mental fortitude, psychic resistance |
| Fel | Fellowship | Social influence, leadership |

**Derived values:** Characteristic Bonus = value ÷ 10 (rounded down). Used for damage, toughness reduction, wounds calculation, etc.

### 4.2 Skill Tests

- Roll **d100** ≤ target number (characteristic + modifiers) = success
- **Degrees of Success (DoS)** = (target − roll) ÷ 10 (rounded down), minimum 1 on success
- **Degrees of Failure (DoF)** = (roll − target) ÷ 10 (rounded down), minimum 1 on failure
- Skills have advancement tiers: Known → +10 → +20 → +30

### 4.3 Modifier Pipeline — Tagged Stacking with Exclusion Groups

The heart of the rules engine. Unlike PF2e's "typed stacking" (which prevents stacking), DH2 modifiers stack freely by design.

**Architecture:**
```
Modifier {
  label: string              // Display name ("Aim (Full)")
  value: number              // +20, -10, etc.
  source: string             // Source tag for audit ("action", "equipment", "talent", "condition", "range", "size", "situational")
  exclusionGroup?: string    // Only best bonus / worst penalty in group applies
  predicate?: Predicate[]    // Conditional logic (when does this apply?)
  enabled: boolean           // Can be toggled on/off
}
```

**Pipeline:**
1. Collect all active modifiers from items, talents, conditions, situational sources
2. Filter by predicates (is condition met?)
3. Within each exclusion group → keep only best bonus / worst penalty
4. Sum all remaining modifiers
5. Clamp to configurable global cap (default ±60)
6. Display full breakdown in chat (audit trail)

**Exclusion Groups (examples):**
- `aim` — half-aim (+10) OR full-aim (+20), not both
- `cover` — light cover (-10) OR heavy cover (-20)
- `range` — only one range bracket applies
- `size` — only one size modifier

**No exclusion group = always stacks.** This matches DH2 RAW where aim + range + equipment + talent bonuses all pile up intentionally.

### 4.4 Combat

#### Initiative
- Roll **d10 + Agility Bonus**
- Custom combat tracker with action economy display

#### Action Economy
- **Half Action** — one per turn (or two instead of a full action)
- **Full Action** — consumes the entire turn
- **Free Action** — limited supplementary actions
- **Reaction** — one per round (e.g., Dodge, Parry)
- Custom combat tracker tracks action usage per combatant per round

#### Attack Resolution
1. Roll d100 vs WS (melee) or BS (ranged) + modifiers
2. Determine success/failure and DoS/DoF
3. **Hit Location** — reverse d100 attack roll digits:
   - 01–10: Head | 11–20: Right Arm | 21–30: Left Arm
   - 31–70: Body | 71–85: Right Leg | 86–00: Left Leg
4. **Called Shots** — -20 penalty, force specific location on success

#### Fire Modes (fully automated)
- **Single Shot** — 1 attack, 1 hit max
- **Semi-Auto (RoF S/x/-)** — base hit + 1 per 2 DoS (max = RoF value)
- **Full-Auto (RoF S/-/x)** — base hit + 1 per DoS (max = RoF value). Each hit gets separate location.
- **Suppressive Fire** — targets in cone make Pinning test (WP) or take hits

#### Damage Calculation
```
Damage Dealt = Weapon Dice + Modifiers (e.g., SB for melee)
Effective AP = Location Armour − Weapon Penetration (min 0)
Toughness Reduction = Toughness Bonus
Wounds Taken = Damage − Effective AP − Toughness Reduction (min 0)
```

#### Armour — Full Location-Based with Layering
- Track AP per location: **Head / Body / Right Arm / Left Arm / Right Leg / Left Leg**
- Support wearing multiple armour pieces on the same location (stacking/layering)
- Primitive and Power armour special rules
- Auto-subtract armour (after penetration) from damage on hit

#### Critical Damage — Fully Automated Tables
- When wounds reach 0, excess damage = critical damage severity value
- System looks up: **damage type × hit location × severity**
- Auto-creates Critical Injury item on actor
- Auto-applies resulting conditions (Blinded, Stunned, etc.)
- Posts result to chat with full detail
- **GM can override, rollback, or substitute any critical result**

### 4.5 Psychic Powers — Full Phenomena + Perils Automation

1. Roll d100 vs **Willpower + (Psy Rating × 5)** + modifiers
2. Check for **Psychic Phenomena** — triggered on doubles (11, 22, 33, etc.)
3. If Phenomena triggered:
   - Roll d100 on Psychic Phenomena table
   - If result is 75+: escalate to **Perils of the Warp** table
   - Auto-apply result effects (damage, conditions, environmental)
4. **Pushing** — player can add +5 per extra Psy Rating beyond normal
   - Always triggers Phenomena
   - Perils triggered on doubles while pushing

### 4.6 Corruption & Insanity

- **Corruption Points** — track total, threshold effects at 10/20/30/etc.
  - Malignancy rolls at thresholds → auto-create Malignancy items
- **Insanity Points** — track total, threshold effects at 10/20/30/etc.
  - Trauma rolls at thresholds → auto-create Mental Disorder items
- Both tracked on character header (always visible)

### 4.7 Fate Points — Full Tracking + Auto-Effects

**Current / Maximum** tracked separately:
- **Spend** (temporary, refreshes each session):
  - Reroll a failed test
  - Add +10 bonus before rolling
  - Count as lightly wounded instead of heavily wounded
  - GM discretion option
- **Burn** (permanently reduces maximum by 1):
  - Survive otherwise lethal damage
  - Automatically pass a test
  - **Requires confirmation dialog** (irreversible)

### 4.8 Influence & Requisition

- **Influence** tracked as a characteristic-like stat on the sheet
- **Requisition tests** — automated rolls: d100 vs Influence + modifiers
- Item **availability** by rarity affects test difficulty
- Integrated with equipment system for acquisition workflow

### 4.9 Advancement — Full XP Shop

- **Aptitude-aware pricing** — each advance has two associated aptitudes. Matching 0/1/2 aptitudes changes XP cost tier.
- **Advancement Shop tab** on character sheet:
  - Lists all purchasable advances (characteristics, skills, talents)
  - Auto-calculates cost based on character's aptitudes
  - Click-to-buy with XP auto-deducted
  - Prerequisite gating (locked advances shown with requirements)
  - Filters: All / Affordable / Locked
- **XP ledger** — full transaction log of earned and spent XP

---

## 5. Data Models

### 5.1 Actor Types

| Actor Type | Description |
|---|---|
| **Acolyte** | Player character — full sheet with characteristics, skills, XP, aptitudes, advancement, inventory, psychic powers |
| **NPC** | GM-controlled — uses the same sheet as Acolyte with a **GM toggle** that flips to a compact single-page stat block card. Full sheet available for custom NPCs. |
| **Horde** | Dedicated actor type — groups of enemies as a single entity with Magnitude instead of Wounds, area damage bonuses, horde-specific actions |
| **Vehicle** | Transport — structural integrity, armour facing, mounted weapons, crew slots |

### 5.2 Item Types

| Item Type | Description |
|---|---|
| **Weapon** | Melee/ranged/thrown — damage, penetration, range, rate of fire (S/x/x), class, special qualities as Rule Elements |
| **Armour** | AP per location (H/B/RA/LA/RL/LL), max agility, weight, special qualities |
| **Gear** | General equipment — weight, description, optional Rule Elements for mechanical effects |
| **Ammunition** | Ammo types — modifiers to damage/penetration, clip size, current count |
| **Cybernetic** | Implants — modify characteristics or grant abilities via Rule Elements |
| **Talent** | Passive abilities — prerequisites, tier, aptitudes, effects as Rule Elements |
| **Trait** | Innate creature abilities — Unnatural Characteristics, Fear, Size, etc. |
| **Skill** | Trained/untrained — linked characteristic, advancement tier (Known/+10/+20/+30), specializations |
| **Psychic Power** | Action cost, range, threshold, sustain, psy rating requirement, effects |
| **Condition** | Active status effects — stunned, prone, on fire, blinded, pinned, etc. |
| **Critical Injury** | Location-specific lasting wounds with mechanical effects |
| **Malignancy** | Corruption-derived afflictions |
| **Mental Disorder** | Insanity-derived afflictions |

### 5.3 Rules Engine — Rule Elements

Declarative, JSON-driven mechanics attached to items. Inspired by PF2e's Rule Element pattern but adapted for DH2.

```typescript
interface RuleElementSource {
  key: string;              // Rule Element type
  selector?: string;        // What it targets (e.g., "ws", "ranged-attack", "damage")
  value?: number | string;  // Static value or formula
  exclusionGroup?: string;  // For modifier stacking control
  predicate?: PredicateStatement[]; // Conditional logic
  label?: string;           // i18n key for display
}
```

**Rule Element Types:**

| Key | Purpose | Example |
|---|---|---|
| `FlatModifier` | Add/subtract from tests | Accurate: +10 to BS when aiming |
| `DiceOverride` | Change damage dice | Tearing: roll extra die, drop lowest |
| `GrantItem` | Auto-add items | Talent grants a Trait |
| `RollOption` | Toggleable flags | Reliable: weapon jams only on 00 |
| `AdjustDegree` | Shift DoS/DoF | Talent shifts failure to success |
| `Resistance` | Extra damage reduction | Daemonic: ignore non-magical damage |
| `ChoiceSet` | Player picks from options | Scholastic Lore: choose specialty |
| `AdjustToughness` | Modify TB calculation | Felling(4): reduce unnatural TB by 4 |

**Weapon Quality Implementation:**
- **Generic qualities** (Accurate, Reliable, Tearing, Proven, etc.) → Rule Elements on weapon items, fully data-driven
- **Exotic/complex qualities** (Blast radius, Flame template, Haywire, Recharge) → dedicated TypeScript handlers with canvas/combat integration
- **Vendor flow** — pre-define enhanced weapon copies (Good/Best craftsmanship) with Rule Elements already applied

---

## 6. User Interface

### 6.1 Character Sheet — Hybrid Layout

**Always-visible header bar:**
```
[Portrait] Name / Role / Homeworld    W:12/14  F:3/4  C:8  I:15  Inf:32
           [Stunned] [Prone]          [Fatigue: 2]
```

**Tabbed body area (spacious, visually themed):**

| Tab | Content |
|---|---|
| **Summary** | Characteristics grid (all 9), derived values, quick-roll buttons |
| **Skills** | Compact list with inline rolls, trained/advancement pips, specialization sub-entries, filters (All/Trained/Combat) |
| **Combat** | Equipped weapons (click to attack), armour display by location, initiative, fire mode selection |
| **Talents & Traits** | Acquired talents, species/background traits, toggle-able effects |
| **Psychic** | Powers list, psy rating, push toggle, phenomena tracking |
| **Equipment** | Full inventory with encumbrance tracking, drag-and-drop |
| **Advancement** | XP shop with aptitude-aware pricing, transaction log, filters |
| **Background** | Home world, background, role, divination, elite advance, biography |

**Multiple view modes** — players can toggle between sheet view and a compact view per preference.

**Built-in Combat HUD** (Argon-style) — toggle between full sheet and an in-combat HUD with:
- Quick weapon actions (attack buttons with fire mode selection)
- Hit location display
- Action economy tracker (half/full/free/reaction)
- Active conditions
- Quick fate point spend/burn buttons

### 6.2 NPC Sheet — GM Toggle

- Opens as a full Acolyte-style sheet (for GM customization, adding items/talents)
- **GM toggle** flips to compact single-page stat block card optimized for quick reference in combat
- Stat block shows: all characteristics, wounds/armour, skills, talents/traits, weapons — no scrolling needed

### 6.3 Chat Message Cards — Rich Expandable

**Collapsed (default):**
```
BS Test (Lasgun) — Roll: 34 vs 55 ✔ SUCCESS (2 DoS) — Hit: Body
[▼ Details] [Roll Damage] [Spend Fate] [GM⚙]
```

**Expanded:**
- Full modifier breakdown (every bonus/penalty with source label)
- Base characteristic value + all applied modifiers = final target
- Hit location determination
- Action buttons: Roll Damage, Spend Fate Point, GM Override

**Visibility rules:**
- Players see: their roll, success/failure, DoS/DoF, hit location, their own modifier breakdown
- Players do NOT see: enemy armour values, toughness, remaining wounds, resistances
- GM sees: everything, plus override/rollback controls

### 6.4 Custom Combat Tracker

Replaces the default Foundry combat tracker with DH2-specific features:
```
┌─ Combat Round 3 ──────────────────┐
│ ▶ Acolyte Kael  Init:8  [H][F][ ] │
│   └ Stunned (1 round)              │
│   Acolyte Vera  Init:7  [ ][ ][ ] │
│   Cultist #1    Init:5  [H][ ][ ] │
│   Cultist #2    Init:3  [ ][ ][ ] │
├────────────────────────────────────┤
│ [H]=Half  [F]=Full  [✕]=Reaction   │
└────────────────────────────────────┘
```
- Initiative order (d10 + AgB)
- Action economy tracking per combatant per round
- Condition display with remaining duration
- Quick-action buttons

### 6.5 GM Roll Request System

Full socket-based roll request flow:
1. GM selects skill/characteristic + target player(s) + optional situational modifiers
2. Dialog appears on targeted player's screen with roll pre-configured
3. Player clicks Roll (or Decline)
4. Result posted to chat with full breakdown

Accessible via: right-click menu on skills list, chat command, or GM toolbar button.

### 6.6 GM Settings Panel

Comprehensive Foundry system settings:
- Global modifier cap (default ±60, configurable)
- Automation toggles per subsystem (combat, psychic, critical, etc.)
- Fate point refresh rules
- Optional rule toggles (called shots, suppressive fire)
- XP rate multiplier
- House rule overrides

---

## 7. Theme & Visual Design

**Direction:** Grimdark Imperial Gothic — lightened for readability

- Dark background tones (charcoal, deep blue-grey) with **lighter text** (cream, off-white)
- Gold/brass accents for borders, headers, and icons (Imperial Aquila motif)
- Red accent for critical information (wounds, corruption, critical damage)
- Parchment-tone panels for content areas (light enough for readable dark text)
- Gothic serif fonts for headers, clean sans-serif for body/data
- Subtle texture overlays (metal, worn parchment) — not overwhelming
- **Never dark text on dark background** — always ensure high contrast

---

## 8. Architecture

### 8.1 Codebase Structure — Feature-Based Modules

```
src/
├─ dh2e.ts                    # System entry point
├─ actor/
│  ├─ base.ts                 # Shared actor logic
│  ├─ acolyte/                # Acolyte model, sheet, helpers, creation wizard
│  ├─ npc/                    # NPC model, sheet (shared with Acolyte + GM toggle)
│  ├─ horde/                  # Horde model, sheet, magnitude logic
│  └─ vehicle/                # Vehicle model, sheet
├─ item/
│  ├─ base.ts                 # Shared item logic
│  ├─ weapon/                 # Weapon model, sheet, quality handlers
│  ├─ armour/                 # Armour model, sheet, location AP
│  ├─ talent/                 # Talent model, sheet, prerequisite logic
│  ├─ skill/                  # Skill model, advancement tiers
│  ├─ psychic-power/          # Power model, sheet
│  ├─ gear/                   # General equipment
│  ├─ ammunition/             # Ammo tracking
│  ├─ cybernetic/             # Implant model
│  ├─ condition/              # Status effect model
│  ├─ critical-injury/        # Critical wound model
│  ├─ malignancy/             # Corruption affliction
│  └─ mental-disorder/        # Insanity affliction
├─ combat/
│  ├─ attack.ts               # Attack resolution pipeline
│  ├─ damage.ts               # Damage calculation
│  ├─ hit-location.ts         # Location determination + tables
│  ├─ critical.ts             # Critical damage table lookup + application
│  ├─ fire-modes.ts           # Single/semi/full-auto/suppressive logic
│  ├─ tracker.ts              # Custom combat tracker
│  └─ action-economy.ts       # Half/full/free/reaction tracking
├─ rules/
│  ├─ modifier.ts             # Tagged stacking + exclusion group pipeline
│  ├─ predicate.ts            # Conditional logic engine
│  ├─ synthetics.ts           # Aggregated computed values
│  └─ rule-element/
│     ├─ base.ts              # Base RuleElement class
│     ├─ flat-modifier.ts
│     ├─ dice-override.ts
│     ├─ grant-item.ts
│     ├─ roll-option.ts
│     ├─ adjust-degree.ts
│     ├─ resistance.ts
│     ├─ choice-set.ts
│     └─ adjust-toughness.ts
├─ psychic/
│  ├─ phenomena.ts            # Psychic Phenomena detection + table
│  ├─ perils.ts               # Perils of the Warp table + effects
│  └─ focus-power.ts          # Focus Power test resolution
├─ advancement/
│  ├─ shop.ts                 # XP shop logic + aptitude pricing
│  ├─ aptitudes.ts            # Aptitude definitions + matching
│  └─ xp-ledger.ts            # Transaction log
├─ character-creation/
│  ├─ wizard.ts               # Step-by-step creation flow
│  ├─ homeworld.ts            # Homeworld selection + bonuses
│  ├─ background.ts           # Background selection
│  ├─ role.ts                 # Role selection
│  └─ divination.ts           # Divination roll
├─ social/
│  ├─ influence.ts            # Influence stat + requisition tests
│  └─ requisition.ts          # Item acquisition logic
├─ ui/
│  ├─ chat/                   # Chat message card templates + handlers
│  ├─ combat-hud/             # Argon-style combat HUD
│  ├─ roll-dialog/            # Roll configuration dialog
│  ├─ roll-request/           # GM → Player roll request system
│  ├─ fate-dialog/            # Fate point spend/burn UI
│  ├─ gm-override/            # GM override/rollback controls
│  └─ settings/               # System settings panel
├─ util/
│  ├─ dice.ts                 # d100, d10 helpers
│  ├─ degree-of-success.ts    # DoS/DoF calculation
│  └─ helpers.ts              # Shared utilities
└─ lang/
   └─ en.json                 # English translations
```

### 8.2 Data Flow — Attack Roll Example

```
Player clicks "Attack" on Lasgun (semi-auto, RoF 3)
  ↓
Collect modifiers: base BS, aim, range, equipment, talents, conditions
  ↓
Apply exclusion groups (best aim only, one range bracket, etc.)
  ↓
Clamp to global cap (±60)
  ↓
Show Roll Dialog (player sees modifier breakdown, can toggle situational mods)
  ↓
Roll d100 vs final target number
  ↓
Calculate DoS → semi-auto: 1 base hit + 1 per 2 DoS (max 3)
  ↓
For each hit: reverse roll digits → hit location
  ↓
Post Rich Chat Card: result, DoS, hits, locations
  [Roll Damage] [Spend Fate] [GM⚙]
  ↓
Player clicks Roll Damage → per-hit damage rolls
  ↓
Auto-calculate: damage − (location AP − penetration) − TB
  ↓
Apply wounds to target. If wounds ≤ 0 → trigger critical damage lookup
  ↓
Critical: damage type × location × severity → auto-apply injury + conditions
  ↓
GM can override any step via [GM⚙] controls
```

---

## 9. Phased Delivery

### Phase 1 — MVP: Core Loop
- [ ] System scaffolding (Foundry V13 manifest, Vite build, TypeScript, SCSS, i18n)
- [ ] Core data models (Acolyte actor, Weapon, Armour, Gear, Skill, Talent, Condition items)
- [ ] Characteristic tests with full modifier pipeline (tagged stacking + exclusion groups)
- [ ] Character sheet — hybrid layout with header + tabbed body (Summary, Skills, Combat, Equipment)
- [ ] Skill tests with inline rolling, DoS/DoF calculation
- [ ] Combat: attack rolls, hit location (reversed digits + called shots), damage calculation with armour/penetration/TB
- [ ] Fire modes: single, semi-auto, full-auto
- [ ] Location-based armour with layering
- [ ] Rich expandable chat cards with modifier breakdowns
- [ ] Basic item sheets (weapon, armour, gear, talent)
- [ ] Fate point tracking with spend/burn and auto-effects
- [ ] Wounds tracking with threshold alerts
- [ ] Guided character creation wizard (Homeworld → Background → Role → Divination)
- [ ] Grimdark Imperial Gothic theme (lightened)
- [ ] GM settings panel (core toggles)

### Phase 2 — Full Systems
- [ ] Rules Engine: full Rule Element library (FlatModifier, DiceOverride, GrantItem, RollOption, AdjustDegree, Resistance, ChoiceSet, AdjustToughness)
- [ ] Weapon qualities: generic via Rule Elements, exotic hardcoded handlers
- [ ] Critical damage: full automated tables (damage type × location × severity), auto-apply injuries/conditions
- [ ] Psychic powers: full Phenomena + Perils automation, pushing, focus power tests
- [ ] Corruption & Insanity: threshold tracking, auto-roll malignancy/disorder tables
- [ ] XP advancement shop: aptitude-aware pricing, click-to-buy, prerequisite gating, filters
- [ ] Influence & Requisition: automated acquisition tests, item availability by rarity
- [ ] NPC sheet: GM toggle between full sheet and compact stat block card
- [ ] Custom combat tracker: initiative, action economy (H/F/Free/Reaction), conditions with duration
- [ ] GM roll request system: socket-based, GM → Player dialog with pre-configured roll
- [ ] Suppressive fire mechanics
- [ ] GM override controls on all automated results

### Phase 3 — Advanced Features
- [ ] Built-in Combat HUD (Argon-style): quick actions, fire mode selection, action economy, conditions
- [ ] Multiple sheet view modes (player preference)
- [ ] Horde actor type: Magnitude tracking, area damage, horde-specific actions
- [ ] Vehicle actor type: structural integrity, armour facing, mounted weapons, crew
- [ ] Cybernetics item type with Rule Element integration
- [ ] Advanced combat: overwatch, grapple, environmental hazards
- [ ] Compendium browser (searchable, filterable)
- [ ] Community data pack template + documentation
- [ ] Migration system for data model version updates
- [ ] Polish: animations, sound effects, quality of life improvements

---

## 10. Decision Log

| # | Question | Decision |
|---|---|---|
| 1 | Edition | **DH2 (2nd Edition)** |
| 2 | Foundry VTT version | **V13 stable (13.351+)** — ApplicationV2, native DOM, CSS Layers |
| 3 | Team size | **Solo developer** |
| 4 | PF2e code reuse | **Fresh build, copy architectural patterns** — 100% original optimized code |
| 5 | Sourcebook scope | **All DH2 books** — phased delivery, core mechanics first |
| 6 | Content delivery | **Empty system + community packs** — no copyrighted data in system |
| 7 | UI/Theme | **Grimdark Imperial Gothic, slightly lightened** — immersive but readable, high contrast |
| 8 | Combat automation | **Full automation + universal GM override** on every result |
| 9 | Modifier stacking | **Tagged Stacking + Exclusion Groups** — free stacking, source tags, exclusion groups for conflicts, ±60 cap |
| 10 | Hit locations | **Auto-reverse digits + called shot (-20)** |
| 11 | Character creation | **Guided wizard in MVP** — Homeworld → Background → Role → Divination → Equipment |
| 12 | Fate points | **Full tracking + auto-effects** — spend (reroll/+10/half wounds) vs burn (survive/auto-pass) with confirmation |
| 13 | Influence | **Full system** — stat tracking, automated Requisition tests, item availability |
| 14 | Fire modes | **Full automation** — single, semi-auto, full-auto, suppressive fire |
| 15 | Critical damage | **Full automated tables** — type × location × severity, auto-apply, GM override |
| 16 | Armour | **Full location-based with layering** — AP per location, multiple pieces, penetration, primitive/power rules |
| 17 | Psychic powers | **Full Phenomena + Perils automation** — doubles detection, table lookups, pushing mechanics |
| 18 | XP advancement | **Full shop** — aptitude-aware pricing, click-to-buy, prerequisite gating |
| 19 | Sheet layout | **Hybrid** — compact header (always visible) + spacious tabbed body + multiple view modes |
| 20 | Skills UI | **Compact list** — inline rolls, advancement pips, specializations, filters |
| 21 | Combat HUD | **Built into system** — Argon-style, toggle from sheet view |
| 22 | GM roll requests | **Full system** — socket-based, GM selects skill/target/modifiers, dialog on player screen |
| 23 | Chat cards | **Rich expandable** — collapsed summary + expandable detail, player info filtering |
| 24 | Combat tracker | **Custom** — initiative, action economy (H/F/Free/Reaction), conditions with duration |
| 25 | GM settings | **Comprehensive panel** — automation toggles, modifier cap, optional rules, house rules |
| 26 | Weapon qualities | **Hybrid** — generic via Rule Elements, exotic hardcoded. Vendor flow for pre-enhanced copies. |
| 27 | NPC sheets | **Same sheet + GM toggle** — full sheet for customization, toggle to compact stat block card |
| 28 | Hordes | **Dedicated actor type** — Magnitude, area damage, horde actions |
| 29 | Code structure | **Feature-based modules** — co-located models/views/logic per game feature |
| 30 | System ID | **dh2e** |
| 31 | Localization | **i18n from day one** — all strings through lang/en.json |

---
