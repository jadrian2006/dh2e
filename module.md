# DH2E Data Module Creation Guide

Step-by-step process for creating a new DH2E compendium data module from a book PDF.

## Prerequisites

- Node.js 18+
- `pdfjs-dist` installed at `/tmp/node_modules/pdfjs-dist`
- `classic-level` (installed via `@foundryvtt/foundryvtt-cli` dependency)
- Source PDF in `/mnt/f/projects/dh2e_books/`

## Step 1: Scaffold Module Directory

Clone from an existing module (e.g., `dh2e-enemies-beyond`):

```bash
mkdir -p dh2e-<module-name>/{data/creation,scripts,packs}
```

### 1.1 `module.json`

Required fields:
```json
{
    "id": "dh2e-<module-name>",
    "title": "DH2E - <Book Title> Data",
    "description": "Compendium data for DH2E: <book>. FOR PERSONAL USE ONLY.",
    "version": "0.1.0",
    "compatibility": { "minimum": "13.348", "verified": "13.351", "maximum": "13" },
    "authors": [{ "name": "jadrian2006" }],
    "relationships": {
        "systems": [{ "id": "dh2e", "type": "system", "compatibility": { "minimum": "0.1.0" } }]
    },
    "packFolders": [
        { "name": "<PREFIX> Equipment", "color": "#<hex>", "packs": ["weapons", "armour", "gear"] },
        { "name": "<PREFIX> Character", "color": "#<hex>", "packs": ["talents", "powers", "traits"] },
        { "name": "<PREFIX> Creation", "color": "#<hex>", "packs": ["homeworlds", "backgrounds", "roles"] },
        { "name": "<PREFIX> Actors", "color": "#<hex>", "packs": ["npcs"] }
    ],
    "packs": [
        // One entry per pack — see schema below
    ]
}
```

Pack entry schema:
```json
{
    "name": "<pack-name>",
    "label": "<PREFIX> <Pack Label>",
    "path": "packs/<pack-name>",
    "type": "Item",         // or "Actor" for npcs
    "ownership": { "PLAYER": "OBSERVER", "ASSISTANT": "OWNER" },
    "system": "dh2e"
}
```

NPCs use `"type": "Actor"` and `"PLAYER": "NONE"`.

Pick a unique folder color per module:
- Core data: `#4a4a4a`
- Enemies Beyond: `#6a5aae` (purple)
- Enemies Within: `#8b6914` (gold/amber)

Omit packs that don't exist in the book (e.g., no `powers` if no psychic disciplines).

### 1.2 `package.json`

```json
{
    "name": "dh2e-<module-name>",
    "version": "0.1.0",
    "private": true,
    "description": "DH2E <Book Title> compendium data module",
    "type": "module",
    "scripts": { "build": "node scripts/build-packs.mjs" },
    "dependencies": { "@foundryvtt/foundryvtt-cli": "^1.0.4" }
}
```

### 1.3 `scripts/build-packs.mjs`

Clone from any existing module. Update:
- The console log title string
- The `PACKS` array to match only the packs this module has

The build script is generic — reads `data/*.json`, writes LevelDB to `packs/<name>/`.

## Step 2: Extract PDF Text

Write an extraction script at `/tmp/extract-<abbrev>.mjs`:

```js
import { getDocument } from "/tmp/node_modules/pdfjs-dist/legacy/build/pdf.mjs";

const PDF_PATH = "/mnt/f/projects/dh2e_books/<filename>.pdf";
const startPage = parseInt(process.argv[2]) || 1;
const endPage = parseInt(process.argv[3]) || 999;

async function extractPages(pdfPath, start, end) {
    const doc = await getDocument(pdfPath).promise;
    const actualEnd = Math.min(end, doc.numPages);
    for (let i = start; i <= actualEnd; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(" ");
        console.log(`\n=== PAGE ${i} ===`);
        console.log(text);
    }
    await doc.destroy();
}

extractPages(PDF_PATH, startPage, endPage).catch(err => {
    console.error(err);
    process.exit(1);
});
```

Run: `node /tmp/extract-<abbrev>.mjs <startPage> <endPage> > /tmp/<section>.txt`

Extract in logical chunks matching the book's table of contents.

## Step 3: Parse Extracted Text into JSON

Each content type has two formats:
1. **Compendium format** (`data/<type>.json`) — full Foundry item with `type`, `img`, `system` wrapper
2. **Creation format** (`data/creation/<type>.json`) — flat fields, used by character creation wizard

### JSON Schemas

---

#### Homeworld (Compendium)

All mechanical data lives in the `rules[]` array as Rule Elements. The only non-RE fields are `description`, `source`, `bonus`, and `bonusDescription`.

```json
{
    "name": "World Name",
    "type": "homeworld",
    "img": "systems/dh2e/icons/default-icons/homeworld.svg",
    "system": {
        "description": "Lore text...",
        "bonus": "Bonus Name",
        "bonusDescription": "What the bonus does...",
        "source": "<module-source>",
        "rules": [
            { "key": "CreationBonus", "characteristic": "stat1", "value": 5 },
            { "key": "CreationBonus", "characteristic": "stat2", "value": 5 },
            { "key": "CreationBonus", "characteristic": "stat3", "value": -5 },
            { "key": "CreationFate", "threshold": 2, "blessing": 4 },
            { "key": "CreationWounds", "formula": "8+1d5" },
            { "key": "GrantAptitude", "aptitude": "Aptitude Name" },
            { "key": "RollOption", "option": "self:homeworld:bonus-slug" }
        ]
    }
}
```

Characteristic abbreviations: `ws`, `bs`, `s`, `t`, `ag`, `int`, `per`, `wp`, `fel`, `inf`

Note: `inf` (Influence) is special — not a standard CharacteristicAbbrev but valid for `CreationBonus`.

**Optional REs:**
- `{ "key": "Grant", "type": "talent", "options": ["Talent A", "Talent B"] }` — homeworld talent choice (e.g., Forge World)
- `{ "key": "Grant", "type": "trait", "name": "Trait Name" }` — homeworld trait (e.g., Agri-World Brutal Charge)
- `{ "key": "Grant", "type": "skill", "name": "Psyniscience" }` — homeworld skill (e.g., Daemon World)
- `{ "key": "CreationCorruption", "formula": "1d10+5" }` — starting corruption (e.g., Daemon World)
- `{ "key": "FlatModifier", ... }` — runtime modifiers from homeworld bonus

#### Homeworld (Creation Fallback)

Same fields without `type`/`img`/`system` wrapper — flat OriginOption format:

```json
{
    "name": "World Name",
    "description": "...",
    "bonus": "Bonus Name",
    "bonusDescription": "...",
    "source": "<module-source>",
    "rules": [
        { "key": "CreationBonus", "characteristic": "stat1", "value": 5 },
        { "key": "CreationFate", "threshold": 2, "blessing": 4 },
        { "key": "CreationWounds", "formula": "8+1d5" },
        { "key": "GrantAptitude", "aptitude": "Aptitude Name" }
    ]
}
```

---

#### Background (Compendium)

Skills, talents, and equipment are all `Grant` REs. "X or Y" choices use `options[]`. Multi-item choices (e.g., "Hand flamer, or warhammer and stub revolver") use `optionSets[]`.

```json
{
    "name": "Background Name",
    "type": "background",
    "img": "systems/dh2e/icons/default-icons/background.svg",
    "system": {
        "description": "...",
        "bonus": "Bonus Name",
        "bonusDescription": "...",
        "source": "<module-source>",
        "rules": [
            { "key": "GrantAptitude", "options": ["Apt1", "Apt2"] },
            { "key": "Grant", "type": "skill", "name": "Skill Name" },
            { "key": "Grant", "type": "skill", "options": ["Skill A", "Skill B"] },
            { "key": "Grant", "type": "skill", "name": "Scholastic Lore", "pick": true },
            { "key": "Grant", "type": "talent", "options": ["Weapon Training (Las)", "Weapon Training (Solid Projectile)"] },
            { "key": "Grant", "type": "weapon", "options": ["Laspistol", "Stub Automatic"] },
            { "key": "Grant", "type": "weapon", "optionSets": [
                { "label": "Hand Flamer", "items": [{ "type": "weapon", "name": "Hand Flamer" }] },
                { "label": "Warhammer + Stub Revolver", "items": [
                    { "type": "weapon", "name": "Warhammer" },
                    { "type": "weapon", "name": "Stub Revolver" }
                ]}
            ], "equipped": true },
            { "key": "Grant", "type": "armour", "name": "Flak Vest", "equipped": true },
            { "key": "Grant", "type": "gear", "name": "Stimm", "quantity": 3 },
            { "key": "Grant", "type": "cybernetic", "name": "Mechanicus Implants", "installed": true },
            { "key": "Grant", "type": "companion", "name": "Servo-skull (Utility)" },
            { "key": "RollOption", "option": "self:background:bonus-slug" }
        ]
    }
}
```

**Grant modifiers:** `equipped` (auto-equip), `installed` (cybernetics), `quantity` (multiples), `pick` (player picks specialization), `advancement` (skill rank), `rating` (trait rating).

#### Background (Creation Fallback)

Same fields without `type`/`img`/`system` wrapper.

---

#### Role (Compendium)

Each aptitude is a separate `GrantAptitude` RE. Talent choice uses a `Grant` with `options[]`. Fate-point abilities use `FateOption` REs.

```json
{
    "name": "Role Name",
    "type": "role",
    "img": "systems/dh2e/icons/default-icons/role.svg",
    "system": {
        "description": "...",
        "bonus": "Bonus Name",
        "bonusDescription": "...",
        "source": "<module-source>",
        "rules": [
            { "key": "GrantAptitude", "aptitude": "Apt1" },
            { "key": "GrantAptitude", "aptitude": "Apt2" },
            { "key": "GrantAptitude", "aptitude": "Apt3" },
            { "key": "GrantAptitude", "aptitude": "Apt4" },
            { "key": "GrantAptitude", "aptitude": "Apt5" },
            { "key": "Grant", "type": "talent", "options": ["Talent A", "Talent B"] },
            { "key": "FateOption", "slug": "bonus-slug", "label": "Bonus Name", "description": "...", "effectType": "reroll" }
        ]
    }
}
```

**Optional REs:**
- `{ "key": "Grant", "type": "eliteAdvance", "name": "psyker" }` — for Mystic role
- `{ "key": "GrantAptitude", "options": ["Apt A", "Apt B"] }` — choice aptitude

#### Role (Creation Fallback)

Same fields without `type`/`img`/`system` wrapper.

---

#### Talent

```json
{
    "name": "Talent Name",
    "type": "talent",
    "img": "systems/dh2e/icons/items/talent.svg",
    "system": {
        "description": "...",
        "tier": 1,
        "aptitudes": ["Apt1", "Apt2"],
        "prerequisites": "WS 35",
        "specialist": false,
        "rules": [],
        "source": "<module-source>"
    }
}
```

Tier mapping: Tier 1 = 200/300/600xp, Tier 2 = 300/450/900xp, Tier 3 = 400/600/1200xp.

---

#### Weapon

```json
{
    "name": "Weapon Name",
    "type": "weapon",
    "img": "systems/dh2e/icons/items/weapon.svg",
    "system": {
        "description": "...",
        "class": "melee|ranged|thrown",
        "range": 0,
        "rof": { "single": true, "semi": 0, "full": 0 },
        "damage": { "formula": "1d10+X", "type": "impact|rending|energy|explosive", "bonus": 0 },
        "penetration": 0,
        "reload": "",
        "weight": 5,
        "qualities": [],
        "equipped": false,
        "weaponGroup": "low-tech|chain|power|bolt|las|solid-projectile|flame|melta|plasma|launcher|exotic",
        "craftsmanship": "common",
        "magazine": { "value": 0, "max": 0 },
        "loadType": "",
        "loadedMagazineName": "",
        "loadedRounds": [],
        "source": "<module-source>"
    }
}
```

For melee weapons: `range: 0`, `rof: { single: false, semi: 0, full: 0 }`, `magazine: { value: 0, max: 0 }`.

---

#### Armour

```json
{
    "name": "Armour Name",
    "type": "armour",
    "img": "systems/dh2e/icons/items/armour.svg",
    "system": {
        "description": "...",
        "locations": {
            "head": 0, "rightArm": 0, "leftArm": 0,
            "body": 0, "rightLeg": 0, "leftLeg": 0
        },
        "maxAgility": 0,
        "qualities": [],
        "weight": 0,
        "equipped": false,
        "craftsmanship": "common",
        "source": "<module-source>"
    }
}
```

Set `maxAgility: 0` if no max Ag restriction.

---

#### Gear

```json
{
    "name": "Gear Name",
    "type": "gear",
    "img": "systems/dh2e/icons/items/gear.svg",
    "system": {
        "description": "...",
        "weight": 1,
        "quantity": 1,
        "craftsmanship": "common",
        "source": "<module-source>"
    }
}
```

---

#### Trait

```json
{
    "name": "Trait Name",
    "type": "trait",
    "img": "systems/dh2e/icons/default-icons/trait.svg",
    "system": {
        "description": "...",
        "rules": [],
        "hasRating": false,
        "rating": 0,
        "category": "physical|mental|warp",
        "source": "<module-source>"
    }
}
```

---

#### NPC

```json
{
    "name": "NPC Name",
    "type": "npc",
    "img": "systems/dh2e/icons/items/npc.svg",
    "system": {
        "characteristics": {
            "ws": { "base": 0, "advances": 0 },
            "bs": { "base": 0, "advances": 0 },
            "s": { "base": 0, "advances": 0 },
            "t": { "base": 0, "advances": 0 },
            "ag": { "base": 0, "advances": 0 },
            "int": { "base": 0, "advances": 0 },
            "per": { "base": 0, "advances": 0 },
            "wp": { "base": 0, "advances": 0 },
            "fel": { "base": 0, "advances": 0 }
        },
        "wounds": { "value": 0, "max": 0 },
        "fate": { "value": 0, "max": 0 },
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
            "role": "Troop|Elite|Master",
            "divination": "",
            "notes": "Lore + Traits + Special abilities"
        },
        "source": "<module-source>"
    },
    "items": [
        {
            "name": "Embedded Weapon/Trait",
            "type": "weapon|trait|talent",
            "img": "...",
            "system": { }
        }
    ]
}
```

NPC role is the threat level, not a character role. Embed weapons, traits, and talents as items.

---

## Step 4: Build Packs

```bash
cd dh2e-<module-name>
npm install
node scripts/build-packs.mjs
```

Verify: no errors, all packs built with correct item counts.

## Step 5: Deploy

**ALWAYS ask before deploying.** Use the `/deploy` command or manual process:

1. Stop Foundry: `ssh 192.168.100.12 "cd /home/netadmin/foundry && docker compose stop dh2e"`
2. Deploy module: `scp -r ./ 192.168.100.12:/home/netadmin/foundry/dh2e/Data/modules/dh2e-<module-name>/`
3. Remove lock: `ssh 192.168.100.12 "rm -rf /home/netadmin/foundry/dh2e/Config/options.json.lock"`
4. Start Foundry: `ssh 192.168.100.12 "cd /home/netadmin/foundry && docker compose up -d dh2e"`
5. Verify: `ssh 192.168.100.12 "docker compose -f /home/netadmin/foundry/docker-compose.yml logs --tail=20 dh2e"`

## Modules Created

| Module | Book | Folder Color | Packs |
|--------|------|-------------|-------|
| `dh2e-data` | Core Rulebook | `#4a4a4a` | 15 packs |
| `dh2e-enemies-beyond` | Enemies Beyond | `#6a5aae` | 10 packs (incl. powers) |
| `dh2e-enemies-within` | Enemies Within | `#8b6914` | 9 packs (no powers) |
| `dh2e-enemies-without` | Enemies Without | `#2d6b4e` | 8 packs (no armour, no powers) |
| `dh2e-forgotten-gods` | Forgotten Gods (Adventure) | `#8b2500` | 5 packs (see adventure.md) |
| `dh2e-gamemasters-kit` | Game Master's Kit (Adventure) | `#4a6741` | 5 packs (see adventure.md) |
| `dh2e-dark-pursuits` | Core Rulebook (Adventure) | `#5c4033` | 5 packs (see adventure.md) |
