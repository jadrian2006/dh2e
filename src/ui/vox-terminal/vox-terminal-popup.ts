import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { VoxTerminalPayload } from "./vox-compose-dialog.ts";
import { playSoundFile } from "../sounds.ts";
import VoxTerminalRoot from "./vox-terminal-root.svelte";

/**
 * Player-side CRT terminal popup for receiving vox transmissions.
 *
 * Displays a green-on-black CRT terminal with typewriter text animation.
 * Static ID ensures a second transmission replaces the first (no popup spam).
 */
class VoxTerminalPopup extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-vox-terminal",
        classes: ["dh2e", "vox-terminal"],
        position: { width: 560, height: 460 },
        window: { resizable: true, minimizable: false },
    });

    protected override root = VoxTerminalRoot;

    #payload: VoxTerminalPayload;

    constructor(payload: VoxTerminalPayload) {
        super({});
        this.#payload = payload;
    }

    override get title(): string {
        return game.i18n.localize("DH2E.Vox.TerminalTitle");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                sender: this.#payload.sender,
                message: this.#payload.message,
                speed: this.#payload.speed,
                onDismiss: () => this.close(),
            },
        };
    }

    override _onRender(): void {
        playSoundFile("systems/dh2e/sounds/vox-static.ogg", 0.4);
    }

    /** Show the CRT popup for an incoming transmission */
    static show(payload: VoxTerminalPayload): void {
        new VoxTerminalPopup(payload).render(true);
    }
}

export { VoxTerminalPopup };
