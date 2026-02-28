# DH2E Adventure Module Creation Guide

Extends `module.md` with adventure-specific patterns. Read `module.md` first for the base module scaffolding process.

## Overview

An adventure module bundles NPCs, journal entries, objectives, scenes, and an **Adventure compendium document** for one-click import into a Foundry world. Unlike data modules which provide standalone compendium items, an adventure module wraps all content into a single importable Adventure document.

## Adventure Document Structure

Foundry's Adventure document type bundles multiple document types:
- **Actors** — NPCs with embedded items (weapons, skills, talents, traits)
- **JournalEntry** — Chapter text, read-aloud boxes, GM notes, handouts, Vox transmissions
- **Items** — Objectives, key gear, unique weapons
- **Scenes** — Map placeholders (or full maps with walls/lights/tokens)

When imported, Foundry creates all bundled documents in the world.

### LevelDB Key Hierarchy

The adventure pack uses sublevel keys to store embedded content:

```
!adventures!<advId>                                    → Adventure document (top-level)
!adventures.actors!<advId>.<actorId>                   → NPC actor
!adventures.actors.items!<advId>.<actorId>.<itemId>    → NPC embedded item
!adventures.journal!<advId>.<journalId>                → Journal entry
!adventures.journal.pages!<advId>.<journalId>.<pageId> → Journal page
!adventures.items!<advId>.<itemId>                     → Item (objective, gear)
!adventures.scenes!<advId>.<sceneId>                   → Scene
```

The top-level Adventure document stores ID arrays:
```json
{
    "_id": "<advId>",
    "name": "Adventure Name",
    "actors": ["<actorId1>", "<actorId2>"],
    "journal": ["<journalId1>"],
    "items": ["<itemId1>"],
    "scenes": ["<sceneId1>"],
    "macros": [],
    "playlists": [],
    "folders": [],
    "tables": []
}
```

## Journal Structure

Each chapter is one JournalEntry with multiple JournalEntryPage documents. Additional entries for handouts and Vox transmissions.

### Page Types

- **GM Notes** — Standard `type: "text"` pages with chapter narrative, encounter details, skill checks
- **Read-Aloud** — Pages flagged with `flags.dh2e.readAloud: true` for boxed text the GM reads to players
- **Handouts** — Player-visible documents (reports, data-slates, cult texts)
- **Vox Transmissions** — Pages with `flags.dh2e.voxReady: true` and `flags.dh2e.voxSender: "Sender Name"` for delivery via the Vox Terminal system

### Journal Entry Format

```json
{
    "name": "Chapter I: Standing in the Shadow",
    "img": "icons/svg/book.svg",
    "pages": [
        {
            "name": "Crime Scene",
            "type": "text",
            "text": {
                "content": "<h2>Crime Scene</h2><p>GM narrative...</p><blockquote class=\"read-aloud\">Read-aloud text...</blockquote>",
                "format": 1
            },
            "flags": {},
            "sort": 100000
        },
        {
            "name": "Vox: Inquisitor's Briefing",
            "type": "text",
            "text": {
                "content": "<p>Transmission content...</p>",
                "format": 1
            },
            "flags": {
                "dh2e": {
                    "voxReady": true,
                    "voxSender": "Inquisitor"
                }
            },
            "sort": 200000
        }
    ]
}
```

## Objective Items

Uses the `objective` item type from template.json:

```json
{
    "name": "Investigate the Crime Scene",
    "type": "objective",
    "img": "systems/dh2e/icons/items/objective.svg",
    "system": {
        "description": "<p>Detailed objective text...</p>",
        "source": "forgotten-gods",
        "status": "active",
        "assignedBy": "",
        "timestamp": 0,
        "completedTimestamp": 0,
        "scope": "warband",
        "format": "parchment"
    }
}
```

Scope is typically `"warband"` for adventure objectives (shared party goals).

## Scene Placeholders

Scene documents without background images — placeholders for the GM to attach maps later.

```json
{
    "name": "Gallowsway Crime Scene",
    "active": false,
    "navigation": false,
    "navOrder": 0,
    "navName": "",
    "foreground": null,
    "background": { "src": null },
    "drawings": [], "lights": [], "notes": [], "sounds": [],
    "templates": [], "tokens": [], "tiles": [], "walls": [], "regions": [],
    "grid": { "type": 1, "size": 100, "distance": 5, "units": "ft" },
    "width": 3000,
    "height": 2000,
    "initial": { "x": 1500, "y": 1000, "scale": 1 },
    "environment": {},
    "flags": {
        "dh2e": {
            "chapter": 1,
            "description": "Lower hive crime scene, dim lighting"
        }
    }
}
```

Grid types: `1` = square, `2` = hex (rows), `3` = hex (columns). Use hex for outdoor/wilderness scenes.

### Adding Maps Later

To upgrade a placeholder scene to a full map:
1. Import the Adventure into a world
2. Open the scene, set `background.src` to an image path
3. Adjust `width`/`height` to match the image dimensions
4. Add walls, lights, and tokens as needed
5. (Optional) Re-export the scene back to the adventure module

## Build Process

### Directory Structure

```
dh2e-<adventure>/
├── module.json
├── package.json
├── scripts/build-packs.mjs
├── data/
│   ├── npcs.json          (NPC actors with embedded items)
│   ├── journals.json      (JournalEntries with pages)
│   ├── items.json         (objectives, key gear)
│   ├── scenes.json        (scene placeholders)
│   └── adventure.json     (adventure wrapper metadata)
└── packs/                 (generated by build)
    ├── npcs/
    ├── journals/
    ├── items/
    ├── scenes/
    └── adventure/
```

### Build Script

The adventure build script extends the standard build script with:

1. **Scene pack builder** — Writes `!scenes!<id>` keys (no embedded collections for placeholders)
2. **Adventure pack builder** — Reads ALL data files, writes sublevel keys, assembles the Adventure document

The adventure pack is built last, after all other packs, because it references IDs from every other data file.

### Pack Configuration

Adventure modules use 5 packs:

| Pack | Type | Contents |
|------|------|----------|
| `npcs` | Actor | All NPCs |
| `journals` | JournalEntry | Chapter text, handouts, vox entries |
| `items` | Item | Objectives, key gear |
| `scenes` | Scene | Map placeholders |
| `adventure` | Adventure | One-click import bundle |

### module.json Pack Folders

Use two folder groups:
- **"<PREFIX> Adventure"** — Contains the adventure pack (main import point)
- **"<PREFIX> Reference"** — Contains npcs, journals, items, scenes (for browsing individual entries)

## Conventions

- Adventure source string: lowercase hyphenated book name (e.g., `"forgotten-gods"`)
- Pack label prefix: 2-letter abbreviation (e.g., `FG` for Forgotten Gods)
- NPC `details.role`: Use threat level (`Troop`, `Elite`, `Master`), not character role
- Embed all NPC equipment as items array — weapons, armour, skills, talents, traits
- Chapter numbering in scene flags: `chapter: 1`, `chapter: 2`, `chapter: 3`
- Vox entries: Always set both `voxReady: true` and `voxSender` for Vox Terminal compatibility

## Modules Created

| Module | Adventure | Folder Color | Packs |
|--------|-----------|-------------|-------|
| `dh2e-forgotten-gods` | Forgotten Gods | `#8b2500` | 5 (npcs, journals, items, scenes, adventure) |
| `dh2e-gamemasters-kit` | Desolation of the Dead | `#4a6741` | 5 (npcs, journals, items, scenes, adventure) |
| `dh2e-dark-pursuits` | Dark Pursuits | `#5c4033` | 5 (npcs, journals, items, scenes, adventure) |
