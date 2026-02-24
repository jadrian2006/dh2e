import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { RollRequestPayload } from "./roll-request-dialog.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import { CheckDH2e } from "@check/check.ts";
import { ModifierDH2e } from "@rules/modifier.ts";
import RollRequestPromptRoot from "./roll-request-prompt-root.svelte";

/**
 * Player-side prompt when the GM requests a roll via socket.
 */
class RollRequestPrompt extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-roll-request-prompt",
        classes: ["dh2e", "dialog", "roll-request-prompt"],
        position: { width: 360, height: "auto" as const },
        window: { resizable: false, minimizable: false },
    });

    protected override root = RollRequestPromptRoot;

    #payload: RollRequestPayload;

    constructor(payload: RollRequestPayload) {
        super({});
        this.#payload = payload;
    }

    override get title(): string {
        return game.i18n.localize("DH2E.Request.Prompt.Title");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                payload: this.#payload,
                onRoll: () => this.#doRoll(),
                onDecline: () => this.#decline(),
            },
        };
    }

    async #doRoll(): Promise<void> {
        const g = game as any;
        const actor = g.user?.character;
        if (!actor) {
            ui.notifications.warn("No character assigned.");
            this.close();
            return;
        }

        const modifiers: ModifierDH2e[] = [];
        if (this.#payload.modifier) {
            modifiers.push(
                new ModifierDH2e({
                    label: "GM Modifier",
                    value: this.#payload.modifier,
                    source: "gm-request",
                }),
            );
        }

        const characteristic = this.#payload.characteristic as CharacteristicAbbrev | undefined;
        const baseTarget = characteristic
            ? ((actor as any).system?.characteristics?.[characteristic]?.value ?? 30)
            : 30;

        await CheckDH2e.roll({
            actor,
            characteristic,
            baseTarget,
            label: this.#payload.testLabel,
            domain: characteristic ? `check:${characteristic}` : "check:general",
            modifiers,
            dosThreshold: this.#payload.dosThreshold,
        });

        this.close();
    }

    #decline(): void {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "rollDeclined",
            payload: { userName: g.user?.name ?? "Unknown" },
        });
        this.close();
    }

    /** Show the prompt to the current player */
    static show(payload: RollRequestPayload): void {
        new RollRequestPrompt(payload).render(true);
    }
}

export { RollRequestPrompt };
