/**
 * TMFX filter parameter definitions for each DH2E condition slug.
 * Each entry maps a condition slug to an array of TokenMagic filter params.
 */

interface TMFXFilterParam {
    filterType: string;
    filterId: string;
    [key: string]: unknown;
}

/** Build a standard filter ID for precise removal */
function fid(slug: string): string {
    return `dh2e-condition-${slug}`;
}

const CONDITION_FILTERS: Record<string, TMFXFilterParam[]> = {
    "on-fire": [{
        filterType: "fire",
        filterId: fid("on-fire"),
        intensity: 1,
        color: 0xff6600,
        blend: 1,
        animated: {
            time: { active: true, speed: 0.0018, animType: "move" },
            intensity: { active: true, loopDuration: 1500, animType: "syncCosOscillation", val1: 0.8, val2: 1.2 },
        },
    }],

    "bleeding": [{
        filterType: "splash",
        filterId: fid("bleeding"),
        color: 0xaa0000,
        padding: 10,
        time: 0,
        seed: 0.5,
        splashFactor: 1,
        spread: 0.8,
        blend: 1,
        animated: {
            time: { active: true, speed: 0.0005, animType: "move" },
        },
    }],

    "stunned": [{
        filterType: "electric",
        filterId: fid("stunned"),
        color: 0xffff00,
        time: 0,
        blend: 1,
        intensity: 3,
        animated: {
            time: { active: true, speed: 0.0050, animType: "move" },
        },
    }],

    "toxic": [{
        filterType: "fog",
        filterId: fid("toxic"),
        color: 0x22aa22,
        density: 0.5,
        time: 0,
        dimX: 1,
        dimY: 1,
        blend: 1,
        animated: {
            time: { active: true, speed: 0.0008, animType: "move" },
        },
    }],

    "feared": [{
        filterType: "transform",
        filterId: fid("feared"),
        twRadiusPercent: 0,
        padding: 10,
        animated: {
            twRotation: { active: true, animType: "sinOscillation", val1: -5, val2: 5, loopDuration: 400 },
            twRadiusPercent: { active: true, animType: "cosOscillation", val1: 0, val2: 3, loopDuration: 400 },
        },
    }],

    "blinded": [{
        filterType: "blur",
        filterId: fid("blinded"),
        strength: 6,
        blur: 4,
        quality: 4,
        animated: {
            blur: { active: true, animType: "syncCosOscillation", loopDuration: 1500, val1: 3, val2: 5 },
        },
    }],

    "unconscious": [{
        filterType: "blur",
        filterId: fid("unconscious"),
        strength: 3,
        blur: 2,
        quality: 4,
    }, {
        filterType: "adjustment",
        filterId: `${fid("unconscious")}-dim`,
        brightness: 0.5,
        contrast: 0.8,
        saturation: 0.4,
    }],

    "grappled": [{
        filterType: "outline",
        filterId: fid("grappled"),
        color: 0xdd8800,
        thickness: 2,
        quality: 5,
        padding: 10,
        animated: {
            thickness: { active: true, animType: "cosOscillation", loopDuration: 1200, val1: 1, val2: 3 },
        },
    }],

    "immobilized": [{
        filterType: "outline",
        filterId: fid("immobilized"),
        color: 0x888888,
        thickness: 2,
        quality: 5,
        padding: 10,
    }],

    "pinned": [{
        filterType: "outline",
        filterId: fid("pinned"),
        color: 0xcccc00,
        thickness: 2,
        quality: 5,
        padding: 10,
        animated: {
            thickness: { active: true, animType: "cosOscillation", loopDuration: 800, val1: 1, val2: 3 },
        },
    }],

    "prone": [{
        filterType: "blur",
        filterId: fid("prone"),
        strength: 2,
        blur: 1,
        quality: 4,
    }, {
        filterType: "adjustment",
        filterId: `${fid("prone")}-dim`,
        brightness: 0.7,
    }],

    "deafened": [{
        filterType: "wave",
        filterId: fid("deafened"),
        time: 0,
        strength: 0.01,
        frequency: 8,
        maxIntensity: 0.5,
        minIntensity: 0,
        padding: 10,
        animated: {
            time: { active: true, speed: 0.0008, animType: "move" },
        },
    }],

    "fatigued": [{
        filterType: "adjustment",
        filterId: fid("fatigued"),
        saturation: 0.2,
        brightness: 0.8,
    }],

    "crippled": [{
        filterType: "outline",
        filterId: fid("crippled"),
        color: 0xcc0000,
        thickness: 2,
        quality: 5,
        padding: 10,
    }, {
        filterType: "blur",
        filterId: `${fid("crippled")}-blur`,
        strength: 1,
        blur: 1,
        quality: 4,
    }],

    "helpless": [{
        filterType: "adjustment",
        filterId: fid("helpless"),
        brightness: 0.3,
        saturation: 0.1,
        contrast: 0.7,
    }],
};

export { CONDITION_FILTERS };
export type { TMFXFilterParam };
