import { getSetting } from "./settings/settings.ts";

/**
 * Sound effect utilities for DH2E.
 *
 * All sounds check the `enableSounds` setting before playing.
 * Uses Foundry's built-in AudioHelper for playback.
 */

/** Event-to-audio mapping */
const SOUND_MAP: Record<string, string> = {
    "dice-roll": "sounds/dice.wav",
    "attack-hit": "sounds/notify.wav",
    "attack-miss": "sounds/drums.wav",
    "critical-hit": "sounds/warning.wav",
    "fate-spend": "sounds/lock.wav",
    "damage-dealt": "sounds/notify.wav",
};

/** Check if sounds are enabled */
function soundsEnabled(): boolean {
    try {
        return getSetting<boolean>("enableSounds");
    } catch {
        return true;
    }
}

/**
 * Play a sound effect for a game event.
 *
 * @param event - The event key (e.g. "dice-roll", "critical-hit")
 * @param volume - Volume level 0-1 (default 0.5)
 */
export async function playSound(event: string, volume = 0.5): Promise<void> {
    if (!soundsEnabled()) return;

    const src = SOUND_MAP[event];
    if (!src) return;

    try {
        await (AudioHelper as any).play({ src, volume, loop: false }, false);
    } catch (e) {
        console.debug(`DH2E | Could not play sound for "${event}":`, e);
    }
}

/**
 * Play a custom sound file.
 *
 * @param src - Path to the audio file
 * @param volume - Volume level 0-1 (default 0.5)
 */
export async function playSoundFile(src: string, volume = 0.5): Promise<void> {
    if (!soundsEnabled()) return;

    try {
        await (AudioHelper as any).play({ src, volume, loop: false }, false);
    } catch (e) {
        console.debug("DH2E | Could not play sound:", e);
    }
}
