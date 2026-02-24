import { ChatListenersDH2e } from "@chat/listeners.ts";
import { XPAwardDialog } from "../../ui/xp-award-dialog.ts";
import { RollRequestDialog } from "../../ui/roll-request-dialog.ts";
import { RollRequestPrompt } from "../../ui/roll-request-prompt.ts";
import { MigrationRunner } from "@migration/runner.ts";
import { CombatHUD } from "@combat/hud/combat-hud.ts";
import { CompendiumBrowser } from "../../ui/compendium-browser/browser.ts";

/** Hooks.once("ready") — final initialization, migrations */
export class Ready {
    static listen(): void {
        Hooks.once("ready", async () => {
            ChatListenersDH2e.listen();

            // Expose API on game.dh2e
            (game as any).dh2e.awardXP = () => XPAwardDialog.open();
            (game as any).dh2e.requestRoll = () => RollRequestDialog.open();
            (game as any).dh2e.compendiumBrowser = CompendiumBrowser;

            // Register socket handler
            Ready.#registerSocket();

            // Create a default landing scene if none exist (GM only)
            await Ready.#ensureLandingScene();

            // Run data migrations (GM only)
            await MigrationRunner.run();

            // Initialize combat HUD
            CombatHUD.init();
        });
    }

    /** Register system socket for GM roll requests */
    static #registerSocket(): void {
        const g = game as any;
        g.socket.on(`system.${SYSTEM_ID}`, (data: any) => {
            if (data.type === "requestRoll") {
                Ready.#handleRollRequest(data.payload);
            } else if (data.type === "rollDeclined") {
                Ready.#handleRollDeclined(data.payload);
            }
        });
    }

    /** Handle incoming roll request (player side) */
    static #handleRollRequest(payload: any): void {
        const g = game as any;
        const userId = g.user?.id;
        if (!userId || !payload.targetUserIds?.includes(userId)) return;

        RollRequestPrompt.show(payload);
    }

    /** Handle roll declined notification (GM side) */
    static #handleRollDeclined(payload: { userName: string }): void {
        const g = game as any;
        if (!g.user?.isGM) return;

        ui.notifications.info(
            game.i18n.format("DH2E.Request.Prompt.Declined", { name: payload.userName }),
        );
    }

    /** Create a DH2E-themed landing scene if one doesn't already exist */
    static async #ensureLandingScene(): Promise<void> {
        const g = game as any;
        if (!g.user?.isGM) return;

        // Check if we already created a DH2E landing scene (by flag)
        const existing = g.scenes?.find(
            (s: any) => s.flags?.[SYSTEM_ID]?.isLandingScene,
        );
        if (existing) {
            // Ensure background color is set (fix for scenes created before this was added)
            if ((existing as any).backgroundColor !== "#050508") {
                try {
                    await existing.update({
                        backgroundColor: "#050508",
                        background: { src: `systems/${SYSTEM_ID}/ui/pause-bg.svg` },
                    });
                } catch { /* ignore */ }
            }
            return;
        }

        try {
            const scene = await (Scene as any).create({
                name: "The Imperium Awaits",
                background: {
                    src: `systems/${SYSTEM_ID}/ui/pause-bg.svg`,
                },
                backgroundColor: "#050508",
                width: 1920,
                height: 1080,
                padding: 0,
                grid: { size: 100, type: 0 },
                tokenVision: false,
                fogExploration: false,
                navigation: true,
                flags: {
                    [SYSTEM_ID]: { isLandingScene: true },
                },
            });
            if (scene) await scene.activate();
        } catch (e) {
            console.warn("DH2E | Could not create landing scene:", e);
        }
    }
}
