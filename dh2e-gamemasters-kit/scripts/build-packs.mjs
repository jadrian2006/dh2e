/**
 * Build script: compiles JSON data files into Foundry VTT LevelDB compendium packs.
 *
 * Adventure module variant — builds standard packs (actors, journals, items, scenes)
 * plus a single Adventure compendium that bundles everything for one-click import.
 *
 * Usage: node scripts/build-packs.mjs
 */

import { ClassicLevel } from "classic-level";
import { readFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/** Generate a Foundry-compatible 16-char random ID */
function foundryId() {
    return randomUUID().replace(/-/g, "").slice(0, 16);
}

/** Standard _stats block for all documents */
function makeStats() {
    return {
        compendiumSource: null,
        duplicateSource: null,
        coreVersion: "13.351",
        systemId: "dh2e",
        systemVersion: "0.1.2",
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        lastModifiedBy: "dh2eBu1ldScr1pt",
    };
}

/** Pack definitions for standard (non-adventure) packs */
const PACKS = [
    { name: "npcs", file: "data/npcs.json", collection: "actors" },
    { name: "journals", file: "data/journals.json", collection: "journal" },
    { name: "items", file: "data/items.json", collection: "items" },
    { name: "scenes", file: "data/scenes.json", collection: "scenes" },
];

/**
 * Build a standard compendium pack.
 * Handles actors (with embedded items), journals (with pages), items, and scenes.
 */
async function buildPack(packDef) {
    const dataPath = resolve(ROOT, packDef.file);
    if (!existsSync(dataPath)) {
        console.warn(`  ⚠ Skipping ${packDef.name}: ${packDef.file} not found`);
        return { count: 0, docs: [] };
    }

    const packDir = resolve(ROOT, "packs", packDef.name);
    if (existsSync(packDir)) rmSync(packDir, { recursive: true });
    mkdirSync(packDir, { recursive: true });

    const items = JSON.parse(readFileSync(dataPath, "utf-8"));
    const db = new ClassicLevel(packDir, { valueEncoding: "json" });
    await db.open();

    let count = 0;
    const batch = db.batch();
    const builtDocs = []; // Track built docs for adventure assembly

    // Determine embedded document key
    const embeddedKey =
        packDef.collection === "actors" ? "items" :
        packDef.collection === "journal" ? "pages" :
        null;

    for (const item of items) {
        const id = item._id || foundryId();

        // Process embedded documents
        const embeddedIds = [];
        if (embeddedKey && Array.isArray(item[embeddedKey])) {
            for (let i = 0; i < item[embeddedKey].length; i++) {
                const embedded = item[embeddedKey][i];
                const embeddedId = embedded._id || foundryId();

                let embeddedDoc;
                if (embeddedKey === "pages") {
                    embeddedDoc = {
                        _id: embeddedId,
                        name: embedded.name,
                        type: embedded.type || "text",
                        title: { show: true, level: 1 },
                        text: embedded.text || { content: "", format: 1 },
                        image: embedded.image || {},
                        video: embedded.video || {},
                        src: embedded.src || null,
                        sort: embedded.sort ?? i * 100000,
                        ownership: { default: -1 },
                        flags: embedded.flags || {},
                        _stats: makeStats(),
                    };
                } else {
                    embeddedDoc = {
                        _id: embeddedId,
                        name: embedded.name,
                        type: embedded.type,
                        img: embedded.img || "icons/svg/item-bag.svg",
                        system: embedded.system || {},
                        effects: embedded.effects || [],
                        flags: embedded.flags || {},
                        sort: i * 100000,
                        ownership: { default: 0 },
                        _stats: makeStats(),
                    };
                }

                batch.put(`!${packDef.collection}.${embeddedKey}!${id}.${embeddedId}`, embeddedDoc);
                embeddedIds.push(embeddedId);
            }
        }

        // Build top-level document
        let doc;
        if (packDef.collection === "journal") {
            doc = {
                _id: id,
                name: item.name,
                img: item.img || null,
                pages: embeddedIds,
                folder: null,
                sort: count * 100000,
                ownership: { default: 0 },
                flags: item.flags || {},
                _stats: makeStats(),
            };
        } else if (packDef.collection === "scenes") {
            doc = {
                _id: id,
                name: item.name,
                active: false,
                navigation: false,
                navOrder: 0,
                navName: "",
                foreground: null,
                background: item.background || { src: null },
                drawings: [],
                lights: [],
                notes: [],
                sounds: [],
                templates: [],
                tokens: [],
                tiles: [],
                walls: [],
                regions: [],
                grid: item.grid || { type: 1, size: 100, distance: 5, units: "ft" },
                width: item.width || 3000,
                height: item.height || 2000,
                initial: item.initial || { x: 1500, y: 1000, scale: 1 },
                environment: item.environment || {},
                folder: null,
                sort: count * 100000,
                ownership: { default: 0 },
                flags: item.flags || {},
                _stats: makeStats(),
            };
        } else {
            doc = {
                _id: id,
                name: item.name,
                type: item.type,
                img: item.img || "icons/svg/item-bag.svg",
                system: item.system || {},
                ...(embeddedKey ? { [embeddedKey]: embeddedIds } : {}),
                effects: item.effects || [],
                flags: item.flags || {},
                sort: count * 100000,
                ownership: { default: 0 },
                _stats: makeStats(),
            };
        }

        batch.put(`!${packDef.collection}!${id}`, doc);
        builtDocs.push({ id, doc, embeddedKey, embeddedIds, rawItem: item });
        count++;
    }

    await batch.write();
    await db.close();

    return { count, docs: builtDocs };
}

/**
 * Build the Adventure compendium pack.
 * Reads all data files and assembles them into a single Adventure document
 * with proper LevelDB sublevel keys.
 */
async function buildAdventurePack(packResults) {
    const advDataPath = resolve(ROOT, "data/adventure.json");
    if (!existsSync(advDataPath)) {
        console.warn("  ⚠ Skipping adventure: data/adventure.json not found");
        return 0;
    }

    const packDir = resolve(ROOT, "packs", "adventure");
    if (existsSync(packDir)) rmSync(packDir, { recursive: true });
    mkdirSync(packDir, { recursive: true });

    const advMeta = JSON.parse(readFileSync(advDataPath, "utf-8"));
    const advId = advMeta._id || foundryId();

    const db = new ClassicLevel(packDir, { valueEncoding: "json" });
    await db.open();
    const batch = db.batch();

    // Collect IDs by document type
    const actorIds = [];
    const journalIds = [];
    const itemIds = [];
    const sceneIds = [];

    // Map pack name to adventure sublevel prefix
    const packMap = {
        npcs: { prefix: "actors", ids: actorIds, embeddedPrefix: "actors.items" },
        journals: { prefix: "journal", ids: journalIds, embeddedPrefix: "journal.pages" },
        items: { prefix: "items", ids: itemIds, embeddedPrefix: null },
        scenes: { prefix: "scenes", ids: sceneIds, embeddedPrefix: null },
    };

    for (const [packName, config] of Object.entries(packMap)) {
        const result = packResults[packName];
        if (!result) continue;

        for (const { id, doc, embeddedKey, rawItem } of result.docs) {
            config.ids.push(id);

            // Write the document at adventure sublevel
            batch.put(`!adventures.${config.prefix}!${advId}.${id}`, doc);

            // Write embedded documents at adventure sub-sublevel
            if (embeddedKey && config.embeddedPrefix && Array.isArray(rawItem[embeddedKey])) {
                const embeddedIds = doc[embeddedKey] || doc.pages || [];
                for (let i = 0; i < rawItem[embeddedKey].length; i++) {
                    const embedded = rawItem[embeddedKey][i];
                    const embeddedId = embeddedIds[i];
                    if (!embeddedId) continue;

                    let embeddedDoc;
                    if (embeddedKey === "pages") {
                        embeddedDoc = {
                            _id: embeddedId,
                            name: embedded.name,
                            type: embedded.type || "text",
                            title: { show: true, level: 1 },
                            text: embedded.text || { content: "", format: 1 },
                            image: embedded.image || {},
                            video: embedded.video || {},
                            src: embedded.src || null,
                            sort: embedded.sort ?? i * 100000,
                            ownership: { default: -1 },
                            flags: embedded.flags || {},
                            _stats: makeStats(),
                        };
                    } else {
                        embeddedDoc = {
                            _id: embeddedId,
                            name: embedded.name,
                            type: embedded.type,
                            img: embedded.img || "icons/svg/item-bag.svg",
                            system: embedded.system || {},
                            effects: embedded.effects || [],
                            flags: embedded.flags || {},
                            sort: i * 100000,
                            ownership: { default: 0 },
                            _stats: makeStats(),
                        };
                    }

                    batch.put(`!adventures.${config.embeddedPrefix}!${advId}.${id}.${embeddedId}`, embeddedDoc);
                }
            }
        }
    }

    // Write top-level Adventure document
    const adventureDoc = {
        _id: advId,
        name: advMeta.name || "Adventure",
        img: advMeta.img || null,
        caption: advMeta.caption || "",
        description: advMeta.description || "",
        actors: actorIds,
        combats: [],
        items: itemIds,
        journal: journalIds,
        scenes: sceneIds,
        tables: [],
        macros: [],
        playlists: [],
        folders: [],
        sort: 0,
        ownership: { default: 0 },
        flags: { dh2e: { source: advMeta.source || "" } },
        _stats: makeStats(),
    };

    batch.put(`!adventures!${advId}`, adventureDoc);

    await batch.write();
    await db.close();

    return 1;
}

async function main() {
    console.log("Building DH2E Game Master's Kit packs...\n");

    const packResults = {};
    let totalItems = 0;

    // Build standard packs
    for (const pack of PACKS) {
        process.stdout.write(`  📦 ${pack.name}... `);
        const result = await buildPack(pack);
        console.log(`${result.count} items`);
        packResults[pack.name] = result;
        totalItems += result.count;
    }

    // Build adventure pack (references all other pack data)
    process.stdout.write("  📦 adventure... ");
    const advCount = await buildAdventurePack(packResults);
    console.log(`${advCount} adventure`);

    console.log(
        `\n✅ Done! ${totalItems} total items across ${PACKS.length} packs + ${advCount} adventure.`,
    );
}

main().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
