/**
 * FX Master weather/battle preset definitions for Warhammer 40k themes.
 */

interface FXMasterPreset {
    id: string;
    nameKey: string;
    descKey: string;
    icon: string;
    effects: Record<string, FXMasterEffect>;
}

interface FXMasterEffect {
    type: string;
    options: Record<string, unknown>;
}

const PRESETS: FXMasterPreset[] = [
    {
        id: "ash-waste-storm",
        nameKey: "DH2E.FXMaster.AshWasteStorm.Name",
        descKey: "DH2E.FXMaster.AshWasteStorm.Desc",
        icon: "fa-solid fa-smog",
        effects: {
            "dh2e-ash-embers": {
                type: "embers",
                options: { density: 0.5, speed: 3, tint: { value: "#cc6600", apply: true } },
            },
            "dh2e-ash-fog": {
                type: "fog",
                options: { density: 0.4, speed: 1.5, tint: { value: "#664422", apply: true } },
            },
        },
    },
    {
        id: "acid-rain",
        nameKey: "DH2E.FXMaster.AcidRain.Name",
        descKey: "DH2E.FXMaster.AcidRain.Desc",
        icon: "fa-solid fa-cloud-rain",
        effects: {
            "dh2e-acid-rain": {
                type: "rain",
                options: { density: 0.6, speed: 4, tint: { value: "#44aa22", apply: true } },
            },
            "dh2e-acid-fog": {
                type: "fog",
                options: { density: 0.3, speed: 0.5, tint: { value: "#226611", apply: true } },
            },
        },
    },
    {
        id: "hive-smog",
        nameKey: "DH2E.FXMaster.HiveSmog.Name",
        descKey: "DH2E.FXMaster.HiveSmog.Desc",
        icon: "fa-solid fa-city",
        effects: {
            "dh2e-smog-fog": {
                type: "fog",
                options: { density: 0.7, speed: 0.8, tint: { value: "#555555", apply: true } },
            },
            "dh2e-smog-lightning": {
                type: "lightning",
                options: { frequency: 300, spark_duration: 200, brightness: 1.2 },
            },
        },
    },
    {
        id: "warp-rift",
        nameKey: "DH2E.FXMaster.WarpRift.Name",
        descKey: "DH2E.FXMaster.WarpRift.Desc",
        icon: "fa-solid fa-burst",
        effects: {
            "dh2e-warp-stars": {
                type: "stars",
                options: { density: 0.4, speed: 2, tint: { value: "#8833cc", apply: true } },
            },
            "dh2e-warp-fog": {
                type: "fog",
                options: { density: 0.5, speed: 1.2, tint: { value: "#4400aa", apply: true } },
            },
        },
    },
    {
        id: "void-exposure",
        nameKey: "DH2E.FXMaster.VoidExposure.Name",
        descKey: "DH2E.FXMaster.VoidExposure.Desc",
        icon: "fa-solid fa-moon",
        effects: {
            "dh2e-void-stars": {
                type: "stars",
                options: { density: 0.1, speed: 0.2 },
            },
        },
    },
    {
        id: "promethium-fire",
        nameKey: "DH2E.FXMaster.PromethiumFire.Name",
        descKey: "DH2E.FXMaster.PromethiumFire.Desc",
        icon: "fa-solid fa-fire",
        effects: {
            "dh2e-fire-embers": {
                type: "embers",
                options: { density: 0.7, speed: 2, tint: { value: "#ff4400", apply: true } },
            },
        },
    },
    {
        id: "blizzard",
        nameKey: "DH2E.FXMaster.Blizzard.Name",
        descKey: "DH2E.FXMaster.Blizzard.Desc",
        icon: "fa-solid fa-snowflake",
        effects: {
            "dh2e-blizzard-snow": {
                type: "snow",
                options: { density: 0.8, speed: 5 },
            },
        },
    },
    {
        id: "blood-rain",
        nameKey: "DH2E.FXMaster.BloodRain.Name",
        descKey: "DH2E.FXMaster.BloodRain.Desc",
        icon: "fa-solid fa-droplet",
        effects: {
            "dh2e-blood-rain": {
                type: "rain",
                options: { density: 0.5, speed: 3, tint: { value: "#880000", apply: true } },
            },
        },
    },
];

export { PRESETS };
export type { FXMasterPreset, FXMasterEffect };
