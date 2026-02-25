/**
 * Ruler movement overlay — color-codes Foundry V13 native ruler segments
 * based on DH2E movement rates (half/full/charge/run from Agility bonus).
 * Graceful no-op when disabled.
 */

import { getSetting } from "../../ui/settings/settings.ts";

/** Movement segment colors */
const COLORS = {
    half: "#22aa22",    // green
    full: "#ccbb00",    // yellow
    charge: "#dd8800",  // orange
    run: "#cc2222",     // red
    beyond: "#555555",  // dark grey
} as const;

class RulerOverlay {
    static #patched = false;

    /** Initialize the ruler overlay (call once during ready hook) */
    static init(): void {
        if (RulerOverlay.#patched) return;

        Hooks.on("canvasReady", () => {
            RulerOverlay.#patchRuler();
        });

        // Patch immediately if canvas is already ready
        if ((canvas as any)?.ready) {
            RulerOverlay.#patchRuler();
        }
    }

    /** Check if the overlay should be active */
    static get enabled(): boolean {
        try {
            return getSetting<boolean>("enableRulerOverlay");
        } catch {
            return false;
        }
    }

    /** Monkey-patch the Ruler prototype to add movement labels and colors */
    static #patchRuler(): void {
        if (RulerOverlay.#patched) return;

        const RulerClass = (CONFIG as any).Canvas?.rulerClass ?? (globalThis as any).Ruler;
        if (!RulerClass?.prototype) return;

        const original = RulerClass.prototype._getSegmentLabel;
        if (!original) return;

        RulerClass.prototype._getSegmentLabel = function (
            this: any,
            segment: any,
            totalDistance: number,
            ...rest: any[]
        ) {
            const baseLabel = original.call(this, segment, totalDistance, ...rest);

            if (!RulerOverlay.enabled) return baseLabel;

            // Get the token being measured from
            const token = this.token ?? this._getMovementToken?.();
            if (!token?.actor) return baseLabel;

            const movement = token.actor.system?.movement;
            if (!movement) return baseLabel;

            // Get movement rates (in metres)
            let half = movement.half ?? 0;
            let full = movement.full ?? 0;
            let charge = movement.charge ?? 0;
            let run = movement.run ?? 0;

            if (half === 0 && full === 0) return baseLabel;

            // Check for movement-reducing conditions
            const conditionSlugs = new Set<string>();
            for (const item of token.actor.items ?? []) {
                if (item.type === "condition") {
                    conditionSlugs.add((item.system as any)?.slug ?? "");
                }
            }
            const halved = conditionSlugs.has("overloaded") ||
                conditionSlugs.has("crippled") ||
                conditionSlugs.has("prone");
            if (halved) {
                half = Math.floor(half / 2);
                full = Math.floor(full / 2);
                charge = Math.floor(charge / 2);
                run = Math.floor(run / 2);
            }

            // Convert total distance to metres (Foundry uses the scene grid distance)
            const dist = totalDistance;

            // Determine movement category
            let color: string;
            let label: string;
            if (dist <= half) {
                color = COLORS.half;
                label = game.i18n.localize("DH2E.Ruler.HalfMove");
            } else if (dist <= full) {
                color = COLORS.full;
                label = game.i18n.localize("DH2E.Ruler.FullMove");
            } else if (dist <= charge) {
                color = COLORS.charge;
                label = game.i18n.localize("DH2E.Ruler.Charge");
            } else if (dist <= run) {
                color = COLORS.run;
                label = game.i18n.localize("DH2E.Ruler.Run");
            } else {
                color = COLORS.beyond;
                label = game.i18n.localize("DH2E.Ruler.OutOfRange");
            }

            // Color the segment
            if (segment.ray?.color !== undefined) {
                segment.ray.color = (Color as any).from?.(color) ?? parseInt(color.replace("#", ""), 16);
            }

            // Append movement label to the existing distance label
            if (baseLabel?.style) {
                baseLabel.style.fill = color;
            }
            if (baseLabel?.text !== undefined) {
                baseLabel.text = `${baseLabel.text}\n${label}`;
            }

            return baseLabel;
        };

        RulerOverlay.#patched = true;
        console.log("DH2E | Ruler movement overlay initialized.");
    }
}

export { RulerOverlay };
