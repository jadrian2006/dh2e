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
    { name: "npcs", file: "data/npcs.json", collection: "actors" },
    { name: "macros", file: "data/macros.json", collection: "macros" },
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

    for (const item of items) {
        const id = item._id || foundryId();
        const doc = {
            _id: id,
            name: item.name,
            type: item.type,
            img: item.img || "icons/svg/item-bag.svg",
            ...(packDef.collection === "macros"
                ? { command: item.command || "", scope: item.scope || "global" }
                : { system: item.system || {} }),
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
                lastModifiedBy: "build-script",
            },
        };

        // LevelDB key format for Foundry V13 compendiums
        const key = `!${packDef.collection}!${id}`;
        batch.put(key, doc);
        count++;
    }

    await batch.write();
    await db.close();

    return count;
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

    console.log(`\n✅ Done! ${totalItems} total items across ${PACKS.length} packs.`);
}

main().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
