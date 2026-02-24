/**
 * Enrichment script: adds skills, talents, traits, and powers to NPC data.
 *
 * Usage: node scripts/enrich-npcs.mjs
 *
 * Reads data/npcs.json plus skill/talent/trait/power JSON, merges embedded items,
 * writes back to data/npcs.json.
 *
 * Based on DH2E Core Rulebook NPC stat blocks (Chapter XII: NPCs and Adversaries).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function readJSON(relPath) {
    return JSON.parse(readFileSync(resolve(ROOT, relPath), "utf-8"));
}

const skillsDB = readJSON("data/skills.json");
const talentsDB = readJSON("data/talents.json");
const traitsDB = readJSON("data/traits.json");
const powersDB = readJSON("data/powers.json");

/** Create an embedded skill item. advancement: 0=Known, 1=+10, 2=+20, 3=+30 */
function skill(name, advancement = 0) {
    const src = skillsDB.find((s) => s.name === name);
    if (!src) {
        console.warn(`  ⚠ Skill not found: ${name}`);
        return null;
    }
    return {
        name: src.name,
        type: "skill",
        img: src.img,
        system: { ...src.system, advancement },
    };
}

/** Create an embedded talent item */
function talent(name) {
    const src = talentsDB.find((t) => t.name === name);
    if (!src) {
        console.warn(`  ⚠ Talent not found: ${name}`);
        return null;
    }
    return {
        name: src.name,
        type: "talent",
        img: src.img,
        system: { ...src.system },
    };
}

/** Create an embedded trait item with optional rating override */
function trait(name, ratingOverride) {
    const src = traitsDB.find((t) => t.name === name);
    if (!src) {
        console.warn(`  ⚠ Trait not found: ${name}`);
        return null;
    }
    const sys = { ...src.system };
    if (ratingOverride !== undefined) {
        sys.rating = ratingOverride;
        sys.hasRating = true;
    }
    return {
        name: src.name,
        type: "trait",
        img: src.img,
        system: sys,
    };
}

/** Create an embedded power item */
function power(name) {
    const src = powersDB.find((p) => p.name === name);
    if (!src) {
        console.warn(`  ⚠ Power not found: ${name}`);
        return null;
    }
    return {
        name: src.name,
        type: "power",
        img: src.img,
        system: { ...src.system },
    };
}

/**
 * NPC enrichment data — skills, talents, traits, powers for each NPC.
 * Based on DH2E Core Rulebook Chapter XII stat blocks.
 *
 * Skill advancement: 0 = Known, 1 = +10, 2 = +20, 3 = +30
 */
const NPC_DATA = {
    "Hive Ganger": {
        skills: [
            skill("Athletics"),
            skill("Awareness"),
            skill("Dodge"),
            skill("Intimidate"),
            skill("Stealth"),
            skill("Common Lore (Underworld)"),
        ],
        talents: [
            talent("Quick Draw"),
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Solid Projectile)"),
        ],
    },

    "PDF Conscript": {
        skills: [
            skill("Athletics"),
            skill("Awareness"),
            skill("Dodge"),
            skill("Navigate (Surface)"),
            skill("Common Lore (Imperial Guard)"),
        ],
        talents: [
            talent("Weapon Training (Las)"),
            talent("Weapon Training (Low-Tech)"),
        ],
    },

    "Underhive Scum": {
        skills: [
            skill("Awareness"),
            skill("Deceive"),
            skill("Dodge"),
            skill("Sleight of Hand"),
            skill("Stealth"),
            skill("Common Lore (Underworld)"),
        ],
        talents: [
            talent("Quick Draw"),
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Solid Projectile)"),
        ],
    },

    "Cultist": {
        skills: [
            skill("Awareness"),
            skill("Deceive"),
            skill("Dodge"),
            skill("Common Lore (Imperial Creed)"),
        ],
        talents: [
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Solid Projectile)"),
        ],
    },

    "Imperial Guardsman": {
        skills: [
            skill("Athletics"),
            skill("Awareness"),
            skill("Dodge"),
            skill("Navigate (Surface)"),
            skill("Operate (Surface)"),
            skill("Common Lore (Imperial Guard)"),
            skill("Common Lore (War)"),
        ],
        talents: [
            talent("Weapon Training (Las)"),
            talent("Weapon Training (Low-Tech)"),
            talent("Rapid Reload"),
        ],
    },

    "Pilgrim Fanatic": {
        skills: [
            skill("Athletics"),
            skill("Awareness"),
            skill("Dodge"),
            skill("Common Lore (Imperial Creed)"),
        ],
        talents: [
            talent("Frenzy"),
            talent("Weapon Training (Low-Tech)"),
        ],
    },

    "Hive Gang Leader": {
        skills: [
            skill("Athletics", 1),
            skill("Awareness", 1),
            skill("Command"),
            skill("Dodge", 1),
            skill("Intimidate", 1),
            skill("Stealth"),
            skill("Common Lore (Underworld)", 1),
        ],
        talents: [
            talent("Quick Draw"),
            talent("Combat Master"),
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Chain)"),
            talent("Weapon Training (Solid Projectile)"),
        ],
    },

    "Enforcer": {
        skills: [
            skill("Awareness", 1),
            skill("Dodge"),
            skill("Intimidate", 1),
            skill("Scrutiny"),
            skill("Common Lore (Adeptus Arbites)"),
        ],
        talents: [
            talent("Weapon Training (Shock)"),
            talent("Weapon Training (Solid Projectile)"),
            talent("Quick Draw"),
            talent("Takedown"),
        ],
    },

    "Rogue Psyker": {
        skills: [
            skill("Awareness"),
            skill("Deceive"),
            skill("Dodge"),
            skill("Psyniscience", 1),
            skill("Forbidden Lore (Psykers)"),
            skill("Forbidden Lore (The Warp)"),
        ],
        talents: [
            talent("Warp Sense"),
            talent("Weapon Training (Low-Tech)"),
        ],
        powers: [
            power("Psychic Shriek"),
            power("Telekinetic Control"),
        ],
    },

    "Chaos Cult Magus": {
        skills: [
            skill("Awareness", 1),
            skill("Command", 1),
            skill("Deceive", 1),
            skill("Dodge"),
            skill("Intimidate"),
            skill("Scrutiny"),
            skill("Forbidden Lore (Heresy)", 1),
            skill("Forbidden Lore (Daemonology)"),
        ],
        talents: [
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Solid Projectile)"),
            talent("Die Hard"),
        ],
    },

    "Bounty Hunter": {
        skills: [
            skill("Awareness", 1),
            skill("Dodge", 1),
            skill("Intimidate"),
            skill("Stealth", 1),
            skill("Survival"),
            skill("Scrutiny"),
        ],
        talents: [
            talent("Quick Draw"),
            talent("Marksman"),
            talent("Rapid Reload"),
            talent("Weapon Training (Solid Projectile)"),
            talent("Weapon Training (Las)"),
            talent("Weapon Training (Chain)"),
        ],
    },

    "Tech-Heretek": {
        skills: [
            skill("Awareness"),
            skill("Dodge"),
            skill("Tech-Use", 2),
            skill("Security", 1),
            skill("Logic"),
            skill("Forbidden Lore (Archaeotech)"),
            skill("Common Lore (Adeptus Mechanicus)"),
            skill("Common Lore (Tech)", 1),
        ],
        talents: [
            talent("Technical Knock"),
            talent("Weapon-Tech"),
            talent("Weapon Training (Las)"),
            talent("Weapon Training (Solid Projectile)"),
            talent("Mechadendrite Use (Utility)"),
        ],
    },

    "Adepta Sororitas Battle Sister": {
        skills: [
            skill("Athletics"),
            skill("Awareness", 1),
            skill("Charm"),
            skill("Command"),
            skill("Dodge", 1),
            skill("Parry"),
            skill("Medicae"),
            skill("Common Lore (Adepta Sororitas)"),
            skill("Common Lore (Imperial Creed)", 1),
            skill("Common Lore (Ecclesiarchy)"),
        ],
        talents: [
            talent("Weapon Training (Bolt)"),
            talent("Weapon Training (Chain)"),
            talent("Weapon Training (Flame)"),
            talent("Rapid Reload"),
            talent("Hatred (Heretics)"),
            talent("Jaded"),
        ],
    },

    "Commissar": {
        skills: [
            skill("Athletics"),
            skill("Awareness", 1),
            skill("Command", 2),
            skill("Dodge", 1),
            skill("Intimidate", 2),
            skill("Parry"),
            skill("Scrutiny"),
            skill("Common Lore (Imperial Guard)", 1),
            skill("Common Lore (War)", 1),
            skill("Scholastic Lore (Tactica Imperialis)"),
        ],
        talents: [
            talent("Weapon Training (Bolt)"),
            talent("Weapon Training (Power)"),
            talent("Weapon Training (Las)"),
            talent("Iron Jaw"),
            talent("Jaded"),
            talent("Rapid Reload"),
        ],
    },

    "Chaos Space Marine": {
        skills: [
            skill("Athletics", 2),
            skill("Awareness", 2),
            skill("Command", 1),
            skill("Dodge", 2),
            skill("Intimidate", 2),
            skill("Parry", 2),
            skill("Stealth"),
            skill("Survival"),
            skill("Navigate (Surface)"),
            skill("Common Lore (War)", 2),
            skill("Forbidden Lore (Heresy)", 1),
            skill("Forbidden Lore (The Horus Heresy and the Long War)"),
        ],
        talents: [
            talent("Weapon Training (Bolt)"),
            talent("Weapon Training (Chain)"),
            talent("Weapon Training (Power)"),
            talent("Weapon Training (Heavy)"),
            talent("Bulging Biceps"),
            talent("Combat Master"),
            talent("Crushing Blow"),
            talent("Rapid Reload"),
            talent("Swift Attack"),
            talent("True Grit"),
            talent("Hatred (Heretics)"),
        ],
        traits: [
            trait("Size (Hulking)"),
        ],
    },

    "Daemon Prince (Lesser)": {
        skills: [
            skill("Athletics", 2),
            skill("Awareness", 2),
            skill("Command", 2),
            skill("Dodge", 2),
            skill("Intimidate", 3),
            skill("Parry", 2),
            skill("Forbidden Lore (Daemonology)", 2),
            skill("Forbidden Lore (The Warp)", 2),
        ],
        talents: [
            talent("Combat Master"),
            talent("Crushing Blow"),
            talent("Lightning Attack"),
            talent("Swift Attack"),
            talent("Weapon Training (Power)"),
        ],
        traits: [
            trait("Daemonic", 5),
            trait("Fear", 4),
            trait("From Beyond"),
            trait("Natural Armour", 4),
            trait("Size (Enormous)"),
            trait("Warp Instability"),
            trait("Deadly Natural Weapons"),
        ],
    },

    "Inquisitor": {
        skills: [
            skill("Athletics", 1),
            skill("Awareness", 2),
            skill("Charm", 1),
            skill("Command", 2),
            skill("Deceive", 1),
            skill("Dodge", 2),
            skill("Inquiry", 2),
            skill("Interrogation", 2),
            skill("Intimidate", 2),
            skill("Logic", 1),
            skill("Parry", 1),
            skill("Scrutiny", 2),
            skill("Forbidden Lore (Heresy)", 2),
            skill("Forbidden Lore (Inquisition)", 2),
            skill("Forbidden Lore (Xenos)", 1),
            skill("Forbidden Lore (Daemonology)", 1),
            skill("Common Lore (Imperium)", 2),
        ],
        talents: [
            talent("Weapon Training (Bolt)"),
            talent("Weapon Training (Power)"),
            talent("Weapon Training (Las)"),
            talent("Combat Master"),
            talent("Strong Minded"),
            talent("Halo of Command"),
            talent("Jaded"),
            talent("Step Aside"),
            talent("Swift Attack"),
        ],
    },

    "Ork Boy": {
        skills: [
            skill("Athletics"),
            skill("Awareness"),
            skill("Dodge"),
            skill("Intimidate"),
            skill("Survival"),
        ],
        talents: [
            talent("Frenzy"),
            talent("Iron Jaw"),
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Solid Projectile)"),
        ],
        traits: [
            trait("Brutal Charge", 2),
            trait("Sturdy"),
        ],
    },

    "Ork Nob": {
        skills: [
            skill("Athletics", 1),
            skill("Awareness"),
            skill("Command"),
            skill("Dodge"),
            skill("Intimidate", 1),
            skill("Survival"),
        ],
        talents: [
            talent("Frenzy"),
            talent("Iron Jaw"),
            talent("Crushing Blow"),
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Chain)"),
            talent("Weapon Training (Solid Projectile)"),
        ],
        traits: [
            trait("Brutal Charge", 3),
            trait("Sturdy"),
            trait("Size (Hulking)"),
        ],
    },

    "Ork Warboss": {
        skills: [
            skill("Athletics", 2),
            skill("Awareness", 1),
            skill("Command", 2),
            skill("Dodge", 1),
            skill("Intimidate", 2),
            skill("Parry", 1),
            skill("Survival", 1),
        ],
        talents: [
            talent("Frenzy"),
            talent("Iron Jaw"),
            talent("Crushing Blow"),
            talent("Combat Master"),
            talent("Swift Attack"),
            talent("Thunder Charge"),
            talent("True Grit"),
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Chain)"),
            talent("Weapon Training (Power)"),
            talent("Weapon Training (Solid Projectile)"),
            talent("Weapon Training (Heavy)"),
        ],
        traits: [
            trait("Brutal Charge", 4),
            trait("Sturdy"),
            trait("Size (Enormous)"),
            trait("Fear", 2),
        ],
    },

    "Eldar Guardian": {
        skills: [
            skill("Acrobatics"),
            skill("Awareness", 1),
            skill("Dodge", 1),
            skill("Parry"),
            skill("Stealth"),
        ],
        talents: [
            talent("Catfall"),
            talent("Hard Target"),
            talent("Weapon Training (Las)"),
            talent("Weapon Training (Power)"),
        ],
    },

    "Eldar Ranger": {
        skills: [
            skill("Acrobatics"),
            skill("Awareness", 2),
            skill("Dodge", 1),
            skill("Navigate (Surface)", 1),
            skill("Stealth", 2),
            skill("Survival", 1),
        ],
        talents: [
            talent("Catfall"),
            talent("Hard Target"),
            talent("Marksman"),
            talent("Precision Killer (Ranged)"),
            talent("Weapon Training (Las)"),
        ],
    },

    "Dark Eldar Kabalite Warrior": {
        skills: [
            skill("Acrobatics"),
            skill("Awareness", 1),
            skill("Dodge", 1),
            skill("Intimidate"),
            skill("Parry"),
            skill("Stealth"),
        ],
        talents: [
            talent("Catfall"),
            talent("Quick Draw"),
            talent("Hard Target"),
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Power)"),
        ],
    },

    "Hormagaunt": {
        skills: [
            skill("Acrobatics"),
            skill("Athletics", 1),
            skill("Awareness"),
            skill("Dodge"),
        ],
        traits: [
            trait("Bestial"),
            trait("Brutal Charge", 2),
            trait("Deadly Natural Weapons"),
            trait("Natural Weapons"),
            trait("Size (Scrawny)"),
        ],
    },

    "Termagant": {
        skills: [
            skill("Awareness"),
            skill("Dodge"),
        ],
        traits: [
            trait("Bestial"),
            trait("Natural Weapons"),
            trait("Size (Scrawny)"),
        ],
    },

    "Tyranid Warrior": {
        skills: [
            skill("Athletics", 1),
            skill("Awareness", 1),
            skill("Dodge", 1),
            skill("Parry", 1),
        ],
        traits: [
            trait("Brutal Charge", 3),
            trait("Deadly Natural Weapons"),
            trait("Fear", 2),
            trait("Natural Armour", 4),
            trait("Natural Weapons"),
            trait("Size (Hulking)"),
        ],
    },

    "Genestealer": {
        skills: [
            skill("Acrobatics", 1),
            skill("Athletics", 2),
            skill("Awareness", 1),
            skill("Dodge", 1),
            skill("Stealth", 2),
        ],
        traits: [
            trait("Deadly Natural Weapons"),
            trait("Fear", 2),
            trait("Natural Armour", 2),
            trait("Natural Weapons"),
        ],
    },

    "Carnifex": {
        skills: [
            skill("Athletics", 1),
            skill("Awareness"),
        ],
        traits: [
            trait("Bestial"),
            trait("Brutal Charge", 6),
            trait("Deadly Natural Weapons"),
            trait("Fear", 3),
            trait("Natural Armour", 6),
            trait("Natural Weapons"),
            trait("Size (Massive)"),
            trait("Sturdy"),
        ],
    },

    "Kroot Carnivore": {
        skills: [
            skill("Athletics"),
            skill("Awareness"),
            skill("Dodge"),
            skill("Stealth", 1),
            skill("Survival", 1),
        ],
        talents: [
            talent("Weapon Training (Low-Tech)"),
            talent("Weapon Training (Solid Projectile)"),
        ],
        traits: [
            trait("Natural Weapons"),
        ],
    },

    "Bloodletter": {
        skills: [
            skill("Athletics", 1),
            skill("Awareness", 1),
            skill("Dodge", 1),
            skill("Parry", 1),
            skill("Intimidate", 1),
        ],
        traits: [
            trait("Daemonic", 3),
            trait("Deadly Natural Weapons"),
            trait("Fear", 2),
            trait("From Beyond"),
            trait("Warp Instability"),
        ],
    },

    "Plaguebearer": {
        skills: [
            skill("Athletics"),
            skill("Awareness", 1),
            skill("Parry"),
            skill("Intimidate"),
        ],
        traits: [
            trait("Daemonic", 3),
            trait("Deadly Natural Weapons"),
            trait("Fear", 2),
            trait("From Beyond"),
            trait("Natural Armour", 2),
            trait("Sturdy"),
            trait("Toxic", 2),
            trait("Warp Instability"),
        ],
    },

    "Pink Horror": {
        skills: [
            skill("Awareness", 1),
            skill("Dodge", 1),
            skill("Psyniscience", 1),
        ],
        talents: [
            talent("Warp Sense"),
        ],
        traits: [
            trait("Daemonic", 2),
            trait("Fear", 1),
            trait("From Beyond"),
            trait("Warp Instability"),
        ],
        powers: [
            power("Psychic Shriek"),
        ],
    },

    "Daemonette": {
        skills: [
            skill("Acrobatics", 1),
            skill("Athletics", 1),
            skill("Awareness", 1),
            skill("Charm", 2),
            skill("Deceive", 2),
            skill("Dodge", 1),
        ],
        traits: [
            trait("Daemonic", 2),
            trait("Deadly Natural Weapons"),
            trait("Fear", 2),
            trait("From Beyond"),
            trait("Warp Instability"),
        ],
    },

    "Nurgling Swarm": {
        traits: [
            trait("Daemonic", 1),
            trait("Fear", 1),
            trait("From Beyond"),
            trait("Size (Scrawny)"),
            trait("Warp Instability"),
        ],
    },

    "Flesh Hound": {
        skills: [
            skill("Athletics", 1),
            skill("Awareness", 2),
            skill("Dodge"),
            skill("Stealth"),
            skill("Survival", 1),
        ],
        traits: [
            trait("Bestial"),
            trait("Brutal Charge", 3),
            trait("Daemonic", 3),
            trait("Fear", 1),
            trait("From Beyond"),
            trait("Natural Weapons"),
            trait("Quadruped"),
            trait("Warp Instability"),
        ],
    },

    "Plague Zombie": {
        traits: [
            trait("Fear", 1),
            trait("Natural Weapons"),
            trait("Sturdy"),
        ],
    },

    "Warp Ghost": {
        skills: [
            skill("Awareness", 1),
            skill("Dodge"),
            skill("Stealth", 2),
        ],
        traits: [
            trait("Daemonic", 2),
            trait("Fear", 2),
            trait("From Beyond"),
            trait("Phase"),
            trait("Warp Instability"),
        ],
    },

    "Cyber-Mastiff": {
        skills: [
            skill("Athletics"),
            skill("Awareness", 1),
            skill("Dodge"),
            skill("Survival"),
        ],
        traits: [
            trait("Machine", 2),
            trait("Natural Weapons"),
            trait("Quadruped"),
            trait("Dark-sight"),
        ],
    },

    "Ambull": {
        skills: [
            skill("Athletics", 1),
            skill("Awareness"),
            skill("Survival"),
        ],
        traits: [
            trait("Bestial"),
            trait("Brutal Charge", 4),
            trait("Deadly Natural Weapons"),
            trait("Fear", 2),
            trait("Natural Armour", 5),
            trait("Natural Weapons"),
            trait("Size (Enormous)"),
            trait("Sturdy"),
        ],
    },

    "Psychneuein": {
        skills: [
            skill("Awareness", 1),
            skill("Dodge", 1),
            skill("Psyniscience", 2),
            skill("Stealth"),
        ],
        traits: [
            trait("Fear", 1),
            trait("Flyer"),
            trait("Size (Scrawny)"),
            trait("Deadly Natural Weapons"),
            trait("Natural Weapons"),
        ],
    },
};

// --- Main ---
const npcs = readJSON("data/npcs.json");
let enriched = 0;

for (const npc of npcs) {
    const data = NPC_DATA[npc.name];
    if (!data) {
        console.log(`  ⚠ No enrichment data for: ${npc.name}`);
        continue;
    }

    // Gather new embedded items (filter nulls from missing lookups)
    const newItems = [
        ...(data.skills || []),
        ...(data.talents || []),
        ...(data.traits || []),
        ...(data.powers || []),
    ].filter(Boolean);

    if (newItems.length === 0) continue;

    // Preserve existing weapons/armour, add new items
    npc.items = [...(npc.items || []), ...newItems];
    enriched++;
    console.log(`  ✅ ${npc.name}: +${newItems.length} items (${npc.items.length} total)`);
}

// Write back
const outPath = resolve(ROOT, "data/npcs.json");
writeFileSync(outPath, JSON.stringify(npcs, null, 4) + "\n", "utf-8");

console.log(`\n✅ Enriched ${enriched}/${npcs.length} NPCs.`);
