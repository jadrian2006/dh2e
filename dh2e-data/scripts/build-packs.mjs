/**
 * Build script: compiles JSON data files into Foundry VTT LevelDB compendium packs.
 *
 * Usage: node scripts/build-packs.mjs
 *
 * Reads data/*.json and writes LevelDB packs into packs/<name>/
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

/** Roll table definitions for d100 tables */
const TABLE_DEFS = [
    {
        name: "psychic-phenomena",
        label: "Psychic Phenomena",
        file: "../static/data/tables/psychic-phenomena.json",
        formula: "1d100",
        description:
            "Rolled when a psyker triggers Psychic Phenomena.",
        flagMap: (entry) => ({
            escalate: entry.escalate ?? false,
        }),
    },
    {
        name: "perils-of-the-warp",
        label: "Perils of the Warp",
        file: "../static/data/tables/perils-of-the-warp.json",
        formula: "1d100",
        description:
            "Rolled when Psychic Phenomena escalates to Perils of the Warp.",
        flagMap: (entry) => ({
            damage: entry.damage ?? "",
            conditions: entry.conditions ?? [],
        }),
    },
    {
        name: "malignancies",
        label: "Malignancies",
        file: "../static/data/tables/malignancies.json",
        formula: "1d100",
        description:
            "Rolled when a character crosses a Corruption threshold.",
        flagMap: (entry) => ({
            effect: entry.effect ?? "",
        }),
    },
    {
        name: "mental-disorders",
        label: "Mental Disorders",
        file: "../static/data/tables/mental-disorders.json",
        formula: "1d100",
        description:
            "Rolled when a character crosses an Insanity threshold.",
        flagMap: (entry) => ({
            effect: entry.effect ?? "",
            triggers: entry.triggers ?? "",
        }),
    },
    {
        name: "divinations",
        label: "Emperor's Divinations",
        file: "data/creation/divinations.json",
        formula: "1d100",
        description:
            "Rolled during character creation to determine the Emperor's Divination.",
        rangeExtract: (entry) => ({ min: entry.roll[0], max: entry.roll[1] }),
        flagMap: (entry) => ({
            effect: entry.effect ?? "",
        }),
    },
];

/** Pack definitions: maps pack name to data source and item collection key */
const PACKS = [
    { name: "skills", file: "data/skills.json", collection: "items" },
    { name: "talents", file: "data/talents.json", collection: "items" },
    { name: "weapons", file: "data/weapons.json", collection: "items" },
    { name: "armour", file: "data/armour.json", collection: "items" },
    { name: "gear", file: "data/gear.json", collection: "items" },
    { name: "powers", file: "data/powers.json", collection: "items" },
    { name: "homeworlds", file: "data/homeworlds.json", collection: "items" },
    { name: "backgrounds", file: "data/backgrounds.json", collection: "items" },
    { name: "roles", file: "data/roles.json", collection: "items" },
    { name: "ammunition", file: "data/ammunition.json", collection: "items" },
    { name: "cybernetics", file: "data/cybernetics.json", collection: "items" },
    { name: "traits", file: "data/traits.json", collection: "items" },
    { name: "npcs", file: "data/npcs.json", collection: "actors" },
    { name: "macros", file: "data/macros.json", collection: "macros" },
    { name: "guides", file: "data/guides.json", collection: "journal" },
];

async function buildPack(packDef) {
    const dataPath = resolve(ROOT, packDef.file);
    if (!existsSync(dataPath)) {
        console.warn(`  ⚠ Skipping ${packDef.name}: ${packDef.file} not found`);
        return 0;
    }

    const packDir = resolve(ROOT, "packs", packDef.name);

    // Clear existing pack
    if (existsSync(packDir)) {
        rmSync(packDir, { recursive: true });
    }
    mkdirSync(packDir, { recursive: true });

    // Read source data
    const items = JSON.parse(readFileSync(dataPath, "utf-8"));

    // Open LevelDB
    const db = new ClassicLevel(packDir, { valueEncoding: "json" });
    await db.open();

    let count = 0;
    const batch = db.batch();

    // Foundry V13 uses LevelDB sublevels for embedded documents.
    // Actor items stored at !actors.items!<actorId>.<itemId>
    // Journal pages stored at !journal.pages!<journalId>.<pageId>
    const embeddedKey = packDef.collection === "actors" ? "items"
        : packDef.collection === "journal" ? "pages"
        : null;

    for (const item of items) {
        const id = item._id || foundryId();

        // Process embedded documents (actor items or journal pages)
        const embeddedIds = [];
        if (embeddedKey && Array.isArray(item[embeddedKey])) {
            for (let i = 0; i < item[embeddedKey].length; i++) {
                const embedded = item[embeddedKey][i];
                const embeddedId = embedded._id || foundryId();

                let embeddedDoc;
                if (embeddedKey === "pages") {
                    // JournalEntryPage document
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
                        _stats: {
                            compendiumSource: null,
                            duplicateSource: null,
                            coreVersion: "13.351",
                            systemId: "dh2e",
                            systemVersion: "0.1.2",
                            createdTime: Date.now(),
                            modifiedTime: Date.now(),
                            lastModifiedBy: "dh2eBu1ldScr1pt",
                        },
                    };
                } else {
                    // Embedded Item document (for actors)
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
                        _stats: {
                            compendiumSource: null,
                            duplicateSource: null,
                            coreVersion: "13.351",
                            systemId: "dh2e",
                            systemVersion: "0.1.2",
                            createdTime: Date.now(),
                            modifiedTime: Date.now(),
                            lastModifiedBy: "dh2eBu1ldScr1pt",
                        },
                    };
                }

                const sublevelKey = `!${packDef.collection}.${embeddedKey}!${id}.${embeddedId}`;
                batch.put(sublevelKey, embeddedDoc);
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
                _stats: {
                    compendiumSource: null,
                    duplicateSource: null,
                    coreVersion: "13.351",
                    systemId: "dh2e",
                    systemVersion: "0.1.2",
                    createdTime: Date.now(),
                    modifiedTime: Date.now(),
                    lastModifiedBy: "dh2eBu1ldScr1pt",
                },
            };
        } else {
            doc = {
                _id: id,
                name: item.name,
                type: item.type,
                img: item.img || "icons/svg/item-bag.svg",
                ...(packDef.collection === "macros"
                    ? { command: item.command || "", scope: item.scope || "global" }
                    : { system: item.system || {} }),
                ...(embeddedKey && embeddedKey !== "pages" ? { [embeddedKey]: embeddedIds } : {}),
                effects: item.effects || [],
                flags: item.flags || {},
                sort: count * 100000,
                ownership: { default: 0 },
                _stats: {
                    compendiumSource: null,
                    duplicateSource: null,
                    coreVersion: "13.351",
                    systemId: "dh2e",
                    systemVersion: "0.1.2",
                    createdTime: Date.now(),
                    modifiedTime: Date.now(),
                    lastModifiedBy: "dh2eBu1ldScr1pt",
                },
            };
        }

        // LevelDB key format for Foundry V13 compendiums
        const key = `!${packDef.collection}!${id}`;
        batch.put(key, doc);

        count++;
    }

    await batch.write();
    await db.close();

    return count;
}

/** Build a single LevelDB pack containing all d100 RollTable documents */
async function buildTablePack() {
    const packDir = resolve(ROOT, "packs", "tables");
    if (existsSync(packDir)) rmSync(packDir, { recursive: true });
    mkdirSync(packDir, { recursive: true });

    const db = new ClassicLevel(packDir, { valueEncoding: "json" });
    await db.open();
    const batch = db.batch();
    let tableCount = 0;

    for (const def of TABLE_DEFS) {
        const dataPath = resolve(ROOT, def.file);
        if (!existsSync(dataPath)) {
            console.warn(`  ⚠ Skipping table ${def.name}: ${def.file} not found`);
            continue;
        }

        const entries = JSON.parse(readFileSync(dataPath, "utf-8"));
        const tableId = foundryId();
        const resultIds = [];

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const resultId = foundryId();
            const range = def.rangeExtract
                ? def.rangeExtract(entry)
                : { min: entry.min, max: entry.max };

            const result = {
                _id: resultId,
                type: 0, // RESULT_TYPES.TEXT
                text: entry.title ?? entry.text ?? "",
                range: [range.min, range.max],
                weight: 1,
                drawn: false,
                img: null,
                documentCollection: "",
                documentId: null,
                flags: {
                    dh2e: {
                        description: entry.description ?? "",
                        ...def.flagMap(entry),
                    },
                },
                _stats: {
                    compendiumSource: null,
                    duplicateSource: null,
                    coreVersion: "13.351",
                    systemId: "dh2e",
                    systemVersion: "0.1.2",
                    createdTime: Date.now(),
                    modifiedTime: Date.now(),
                    lastModifiedBy: "dh2eBu1ldScr1pt",
                },
            };

            batch.put(`!tables.results!${tableId}.${resultId}`, result);
            resultIds.push(resultId);
        }

        const tableDoc = {
            _id: tableId,
            name: def.label,
            img: "icons/svg/d20-grey.svg",
            description: def.description,
            formula: def.formula,
            replacement: true,
            displayRoll: true,
            results: resultIds,
            folder: null,
            sort: tableCount * 100000,
            ownership: { default: 0 },
            flags: { dh2e: { tableKey: def.name } },
            _stats: {
                compendiumSource: null,
                duplicateSource: null,
                coreVersion: "13.351",
                systemId: "dh2e",
                systemVersion: "0.1.2",
                createdTime: Date.now(),
                modifiedTime: Date.now(),
                lastModifiedBy: "dh2eBu1ldScr1pt",
            },
        };

        batch.put(`!tables!${tableId}`, tableDoc);
        tableCount++;
    }

    await batch.write();
    await db.close();
    return tableCount;
}

async function main() {
    console.log("Building DH2E data packs...\n");

    let totalItems = 0;
    for (const pack of PACKS) {
        process.stdout.write(`  📦 ${pack.name}... `);
        const count = await buildPack(pack);
        console.log(`${count} items`);
        totalItems += count;
    }

    process.stdout.write("  📦 tables... ");
    const tableCount = await buildTablePack();
    console.log(`${tableCount} tables`);

    console.log(
        `\n✅ Done! ${totalItems} total items across ${PACKS.length} packs + ${tableCount} roll tables.`,
    );
}

main().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
