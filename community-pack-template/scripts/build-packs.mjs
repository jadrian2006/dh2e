/**
 * Build script: compiles JSON data files into Foundry VTT LevelDB compendium packs.
 *
 * Usage: node scripts/build-packs.mjs
 *
 * Prerequisites: npm install classic-level
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

/**
 * Pack definitions — add your own packs here.
 * Each entry maps a pack name to a data JSON file and collection type.
 */
const PACKS = [
    { name: "weapons", file: "data/weapons.json", collection: "items" },
    { name: "armour", file: "data/armour.json", collection: "items" },
    { name: "gear", file: "data/gear.json", collection: "items" },
    { name: "talents", file: "data/talents.json", collection: "items" },
    { name: "npcs", file: "data/npcs.json", collection: "actors" },
];

async function buildPack(packDef) {
    const dataPath = resolve(ROOT, packDef.file);
    if (!existsSync(dataPath)) {
        console.warn(`  Skipping ${packDef.name}: ${packDef.file} not found`);
        return 0;
    }

    const packDir = resolve(ROOT, "packs", packDef.name);

    // Clear existing pack
    if (existsSync(packDir)) {
        rmSync(packDir, { recursive: true });
    }
    mkdirSync(packDir, { recursive: true });

    const raw = readFileSync(dataPath, "utf-8");
    const entries = JSON.parse(raw);

    const db = new ClassicLevel(packDir, {
        keyEncoding: "utf8",
        valueEncoding: "utf8",
    });

    let count = 0;
    const batch = db.batch();
    for (const entry of entries) {
        if (!entry._id) entry._id = foundryId();
        const key = `!${packDef.collection}!${entry._id}`;
        batch.put(key, JSON.stringify(entry));
        count++;
    }
    await batch.write();
    await db.close();

    console.log(`  Built ${packDef.name}: ${count} entries`);
    return count;
}

async function main() {
    console.log("Building compendium packs...\n");
    let total = 0;
    for (const packDef of PACKS) {
        total += await buildPack(packDef);
    }
    console.log(`\nDone. ${total} total entries built.`);
}

main().catch(console.error);
