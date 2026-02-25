import type { SkillUse } from "./data.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";

/**
 * Default linked characteristic for each non-specialist skill.
 * Used to synthesize skill entries for the Actions view when
 * the actor doesn't own the skill as an embedded item.
 */
export const CANONICAL_SKILL_CHARS: Record<string, CharacteristicAbbrev> = {
    "Acrobatics": "ag",
    "Athletics": "s",
    "Awareness": "per",
    "Charm": "fel",
    "Command": "fel",
    "Commerce": "int",
    "Deceive": "fel",
    "Dodge": "ag",
    "Inquiry": "fel",
    "Interrogation": "wp",
    "Intimidate": "s",
    "Logic": "int",
    "Medicae": "int",
    "Parry": "ws",
    "Psyniscience": "per",
    "Scrutiny": "per",
    "Security": "int",
    "Sleight of Hand": "ag",
    "Stealth": "ag",
    "Survival": "per",
    "Tech-Use": "int",
};

/**
 * Canonical skill uses for non-specialist skills.
 * Used as a fallback when the embedded item doesn't have uses populated
 * (e.g. skills created before the uses feature was added).
 */
export const CANONICAL_SKILL_USES: Record<string, SkillUse[]> = {
    "Acrobatics": [
        { slug: "contortion", label: "Contortion", description: "Escape bonds, squeeze through tight spaces, or wriggle free of a grapple using flexibility.", actionTime: "Full Action", tags: [] },
        { slug: "dodge-fall", label: "Dodge Fall", description: "Reduce falling damage by half a metre per DoS on a successful test.", actionTime: "Reaction", tags: [] },
        { slug: "balance", label: "Balance", description: "Maintain balance on narrow or unstable surfaces. Failure means falling.", actionTime: "Free Action", tags: [] },
        { slug: "tumble", label: "Tumble", description: "Perform an acrobatic tumble to move through a threatened area without provoking free attacks.", actionTime: "Half Action", tags: ["combat"] },
    ],
    "Athletics": [
        { slug: "climb", label: "Climb", description: "Scale vertical surfaces. Each DoS grants 1 metre of progress. Failure means no progress; 4+ DoF means falling.", actionTime: "Full Action", tags: [] },
        { slug: "jump", label: "Jump", description: "Leap across gaps or over obstacles. Standing jump = SB/2 metres; running jump = SB metres. +1 per DoS.", actionTime: "Free Action", tags: [] },
        { slug: "swim", label: "Swim", description: "Move through water or other liquids. Each DoS grants 1 metre. Failure means sinking and possible drowning.", actionTime: "Full Action", tags: [] },
    ],
    "Awareness": [
        { slug: "spot", label: "Spot", description: "Notice something using sight \u2014 hidden objects, concealed doors, lurking enemies, or visual clues.", actionTime: "Free Action", tags: ["opposed"] },
        { slug: "listen", label: "Listen", description: "Detect sounds \u2014 footsteps, whispered conversations, mechanisms, or other auditory cues.", actionTime: "Free Action", tags: ["opposed"] },
        { slug: "detect-ambush", label: "Detect Ambush", description: "Sense an impending ambush or trap before it is sprung. Opposed by enemy Stealth.", actionTime: "Free Action", tags: ["combat", "opposed"] },
    ],
    "Charm": [
        { slug: "persuade", label: "Persuade", description: "Convince a person to agree with you or cooperate through friendly persuasion. Opposed by Willpower.", actionTime: "Full Action", tags: ["social", "opposed"] },
        { slug: "flatter", label: "Flatter", description: "Win favour through compliments and social grace. Improves disposition of an NPC.", actionTime: "Extended", tags: ["social"] },
    ],
    "Command": [
        { slug: "issue-order", label: "Issue Order", description: "Command subordinates to perform a specific action in combat. NPCs must obey on success.", actionTime: "Half Action", tags: ["combat"] },
        { slug: "inspire", label: "Inspire", description: "Rally allies with a rousing speech or display of leadership. Grants +10 to their next Willpower or Fear test.", actionTime: "Half Action", tags: ["social"] },
        { slug: "compel", label: "Compel", description: "Force an unwilling subordinate to obey through authority and rank. Opposed by Willpower.", actionTime: "Full Action", tags: ["social", "opposed"] },
    ],
    "Commerce": [
        { slug: "evaluate", label: "Evaluate", description: "Determine the fair market value of an item, good, or service.", actionTime: "Full Action", tags: [] },
        { slug: "barter", label: "Barter", description: "Negotiate a better price when buying or selling goods. Opposed by target's Commerce.", actionTime: "Extended", tags: ["social", "opposed"] },
    ],
    "Deceive": [
        { slug: "lie", label: "Lie", description: "Tell a convincing falsehood. Opposed by the target's Scrutiny.", actionTime: "Free Action", tags: ["social", "opposed"] },
        { slug: "disguise", label: "Disguise", description: "Create a false appearance using clothing, makeup, and mannerisms. Opposed by Scrutiny to see through.", actionTime: "Extended", tags: ["social", "opposed"] },
        { slug: "distract", label: "Distract", description: "Create a diversion or misdirection to draw attention away from something. Opposed by Awareness.", actionTime: "Half Action", tags: ["social", "opposed"] },
    ],
    "Dodge": [
        { slug: "dodge-attack", label: "Dodge Attack", description: "Evade a single incoming melee or ranged attack as a Reaction. Negates one hit per DoS.", actionTime: "Reaction", tags: ["combat"] },
        { slug: "dodge-area", label: "Dodge Area", description: "Dive clear of an area-effect attack (blast, flame). Must move out of the area to succeed.", actionTime: "Reaction", tags: ["combat"] },
    ],
    "Inquiry": [
        { slug: "canvass", label: "Canvass", description: "Gather information by talking to locals in an area. Each DoS reveals an additional piece of useful information.", actionTime: "Extended", tags: ["social"] },
        { slug: "interview", label: "Interview", description: "Question a willing subject to extract specific information through conversation and directed questioning.", actionTime: "Extended", tags: ["social"] },
    ],
    "Interrogation": [
        { slug: "coerce", label: "Coerce", description: "Extract information through psychological pressure and threats. Opposed by target's Willpower.", actionTime: "Extended", tags: ["social", "opposed"] },
        { slug: "torture", label: "Torture", description: "Extract information through physical pain. Opposed by Toughness. Each DoS reveals one piece of information.", characteristicOverride: "wp", actionTime: "Extended", tags: ["social", "opposed"] },
    ],
    "Intimidate": [
        { slug: "threaten", label: "Threaten", description: "Frighten a target into compliance through verbal threats and body language. Opposed by Willpower.", actionTime: "Half Action", tags: ["social", "opposed"] },
        { slug: "terrify", label: "Terrify", description: "Inspire terror in a group of enemies. May cause them to flee or become stunned. Opposed by Willpower.", actionTime: "Full Action", tags: ["combat", "opposed"] },
    ],
    "Logic": [
        { slug: "analyse", label: "Analyse", description: "Process complex data, patterns, or evidence to draw conclusions. Each DoS reveals an additional insight.", actionTime: "Extended", tags: [] },
        { slug: "solve-puzzle", label: "Solve Puzzle", description: "Work through a logic puzzle, cypher, or mathematical problem.", actionTime: "Extended", tags: [] },
        { slug: "gambling", label: "Gambling", description: "Use probability and game theory to gain an edge in games of chance. Opposed by opponent's Logic.", actionTime: "Extended", tags: ["opposed"] },
    ],
    "Medicae": [
        { slug: "first-aid", label: "First Aid", description: "Restore 1d5 wounds to a Lightly Damaged character (or stabilise a Heavily Damaged one). Usable once per injury.", actionTime: "Full Action", tags: [] },
        { slug: "extended-care", label: "Extended Care", description: "Provide long-term medical care. Patient recovers additional wounds per day equal to the carer's Intelligence Bonus.", actionTime: "Extended", tags: [] },
        { slug: "diagnose", label: "Diagnose", description: "Identify a disease, poison, or medical condition and determine the appropriate treatment.", passive: true, actionTime: "Full Action", tags: [] },
    ],
    "Parry": [
        { slug: "parry-attack", label: "Parry Attack", description: "Deflect an incoming melee attack with a weapon or shield as a Reaction. Negates one hit per DoS.", actionTime: "Reaction", tags: ["combat"] },
    ],
    "Psyniscience": [
        { slug: "detect-warp", label: "Detect Warp", description: "Sense the presence of warp activity, psychic phenomena, or daemonic taint in the area.", actionTime: "Half Action", tags: [] },
        { slug: "locate-psyker", label: "Locate Psyker", description: "Detect the direction and approximate distance to a psyker or psychic disturbance.", actionTime: "Full Action", tags: [] },
    ],
    "Scrutiny": [
        { slug: "detect-lie", label: "Detect Lie", description: "Determine whether a person is lying or withholding information. Opposed by Deceive.", actionTime: "Free Action", tags: ["social", "opposed"] },
        { slug: "assess-motives", label: "Assess Motives", description: "Read body language and emotional cues to gauge a person's intentions and emotional state.", actionTime: "Full Action", tags: ["social"] },
        { slug: "see-through-disguise", label: "See Through Disguise", description: "Identify that someone is wearing a disguise or false identity. Opposed by Deceive.", actionTime: "Full Action", tags: ["social", "opposed"] },
    ],
    "Security": [
        { slug: "pick-lock", label: "Pick Lock", description: "Open a mechanical or electronic lock without the proper key or access code.", characteristicOverride: "ag", actionTime: "Full Action", tags: [] },
        { slug: "disable-alarm", label: "Disable Alarm", description: "Deactivate an alarm system or electronic security measure without triggering it.", actionTime: "Full Action", tags: [] },
        { slug: "set-trap", label: "Set Trap", description: "Rig a trap or alarm system in an area. Quality depends on DoS.", actionTime: "Extended", tags: [] },
        { slug: "detect-trap", label: "Detect Trap", description: "Identify the presence and mechanism of traps or security measures.", actionTime: "Full Action", tags: [] },
    ],
    "Sleight of Hand": [
        { slug: "pickpocket", label: "Pickpocket", description: "Steal a small item from a person without them noticing. Opposed by Awareness.", actionTime: "Half Action", tags: ["opposed"] },
        { slug: "palm-object", label: "Palm Object", description: "Conceal a small object in your hand or elsewhere on your person without being noticed.", actionTime: "Free Action", tags: ["opposed"] },
        { slug: "plant-item", label: "Plant Item", description: "Secretly place a small item on a person or in their belongings. Opposed by Awareness.", actionTime: "Half Action", tags: ["opposed"] },
    ],
    "Stealth": [
        { slug: "sneak", label: "Sneak", description: "Move silently to avoid detection. Opposed by Awareness.", actionTime: "Half Action", tags: ["opposed"] },
        { slug: "hide", label: "Hide", description: "Conceal oneself from sight using cover and shadows. Opposed by Awareness.", actionTime: "Half Action", tags: ["opposed"] },
        { slug: "shadow", label: "Shadow", description: "Follow a target covertly without being noticed. Opposed by target's Awareness.", actionTime: "Extended", tags: ["opposed"] },
    ],
    "Survival": [
        { slug: "forage", label: "Forage", description: "Find food and water in a wilderness environment. Each DoS provides sustenance for one additional person.", actionTime: "Extended", tags: [] },
        { slug: "track", label: "Track", description: "Follow a trail left by a creature or person through the wilderness. Opposed by target's Stealth if they covered their tracks.", actionTime: "Extended", tags: ["opposed"] },
        { slug: "shelter", label: "Build Shelter", description: "Construct a temporary shelter from available materials to protect against environmental hazards.", actionTime: "Extended", tags: [] },
        { slug: "navigate", label: "Navigate", description: "Find your way through unfamiliar terrain using natural signs, stars, and landmarks.", actionTime: "Extended", tags: [] },
    ],
    "Tech-Use": [
        { slug: "operate-device", label: "Operate Device", description: "Use an unfamiliar or complex piece of Imperial technology (cogitator, auspex, vox-caster).", actionTime: "Half Action", tags: [] },
        { slug: "repair", label: "Repair", description: "Fix a damaged or malfunctioning piece of technology. Time and difficulty depend on the damage severity.", actionTime: "Extended", tags: [] },
        { slug: "maintain", label: "Maintain", description: "Perform the rites of maintenance to keep technology functioning. Prevents malfunctions and degradation.", actionTime: "Extended", tags: [] },
    ],
};
