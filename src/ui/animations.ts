import { getSetting } from "./settings/settings.ts";

/**
 * UI animation utilities for DH2E.
 *
 * All animations check the `enableAnimations` setting before running.
 * Animations degrade gracefully — if disabled, they resolve immediately.
 */

/** Check if animations are enabled */
function animationsEnabled(): boolean {
    try {
        return getSetting<boolean>("enableAnimations");
    } catch {
        return true;
    }
}

/** Flash an element with a damage indicator color */
export function damageFlash(element: HTMLElement | null, color = "rgba(200, 40, 40, 0.4)"): void {
    if (!element || !animationsEnabled()) return;
    element.style.transition = "background-color 0.15s";
    element.style.backgroundColor = color;
    setTimeout(() => {
        element.style.backgroundColor = "";
        setTimeout(() => { element.style.transition = ""; }, 200);
    }, 200);
}

/** Shake an element (e.g. for critical hits) */
export function criticalShake(element: HTMLElement | null, intensity = 4, duration = 400): void {
    if (!element || !animationsEnabled()) return;
    element.classList.add("dh2e-shake");
    element.style.setProperty("--shake-intensity", `${intensity}px`);
    setTimeout(() => {
        element.classList.remove("dh2e-shake");
        element.style.removeProperty("--shake-intensity");
    }, duration);
}

/** Dice roll animation — brief spin on the chat card */
export function diceRollAnim(element: HTMLElement | null): void {
    if (!element || !animationsEnabled()) return;
    element.classList.add("dh2e-dice-roll");
    element.addEventListener("animationend", () => {
        element.classList.remove("dh2e-dice-roll");
    }, { once: true });
}

/** Slide-in animation for elements entering the viewport */
export function slideIn(element: HTMLElement | null, direction: "up" | "down" | "left" | "right" = "up"): void {
    if (!element || !animationsEnabled()) return;
    element.classList.add(`dh2e-slide-in-${direction}`);
    element.addEventListener("animationend", () => {
        element.classList.remove(`dh2e-slide-in-${direction}`);
    }, { once: true });
}

/** Pulse glow on an element (e.g. fate point use) */
export function pulseGlow(element: HTMLElement | null, color = "var(--dh2e-gold, #c8a84e)"): void {
    if (!element || !animationsEnabled()) return;
    element.style.setProperty("--glow-color", color);
    element.classList.add("dh2e-pulse-glow");
    element.addEventListener("animationend", () => {
        element.classList.remove("dh2e-pulse-glow");
        element.style.removeProperty("--glow-color");
    }, { once: true });
}
