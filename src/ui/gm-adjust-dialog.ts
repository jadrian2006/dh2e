import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import GMAdjustDialogRoot from "./gm-adjust-dialog-root.svelte";

const FIELD_LABELS: Record<string, string> = {
    corruption: "Corruption",
    insanity: "Insanity",
    influence: "Influence",
    "fate.value": "Fate Points",
};

/**
 * GM dialog for adjusting Corruption, Insanity, Influence, or Fate Points
 * on one or more acolyte actors. Triggers divination session effects
 * through the normal `actor.update()` → `_onUpdate` path.
 */
class GMAdjustDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-gm-adjust-dialog",
        classes: ["dh2e", "dialog", "gm-adjust-dialog"],
        position: { width: 400, height: 440 },
        window: { resizable: true, minimizable: false },
    });

    protected override root = GMAdjustDialogRoot;

    override get title(): string {
        return game.i18n?.localize("DH2E.Adjust.Title") ?? "Adjust Character";
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const g = game as any;

        // Collect all acolyte actors
        const actors = (g.actors ?? [])
            .filter((a: any) => a.type === "acolyte")
            .map((a: any) => ({ id: a.id, name: a.name }));

        // Determine which actors have tokens currently selected on canvas
        const selectedTokenActorIds = new Set<string>();
        const controlled = canvas?.tokens?.controlled ?? [];
        for (const t of controlled) {
            if (t.actor?.type === "acolyte" && t.actor.id) {
                selectedTokenActorIds.add(t.actor.id);
            }
        }

        return {
            ctx: {
                actors,
                selectedTokenActorIds,
                onApply: (field: string, amount: number, actorIds: string[]) =>
                    this.#apply(field, amount, actorIds),
                onCancel: () => this.close(),
            },
        };
    }

    async #apply(field: string, amount: number, actorIds: string[]): Promise<void> {
        const g = game as any;
        const fieldLabel = FIELD_LABELS[field] ?? field;
        const affected: string[] = [];

        for (const id of actorIds) {
            const actor = g.actors?.get(id) as any;
            if (!actor) continue;

            const systemPath = `system.${field}`;
            const currentVal = fu.getProperty(actor, systemPath) as number ?? 0;
            const newVal = Math.max(0, currentVal + amount);

            await actor.update({ [systemPath]: newVal });
            affected.push(actor.name);
        }

        // Post summary chat card
        if (affected.length > 0) {
            const sign = amount > 0 ? "+" : "";
            const names = affected.join(", ");
            await fd.ChatMessage.create({
                content: `<div class="dh2e chat-card system-note"><em>${fieldLabel} ${sign}${amount} applied to: ${names}.</em></div>`,
                whisper: [(g.user as any).id],
            });
        }

        this.close();
    }

    /** Open the adjust dialog (GM only) */
    static open(): void {
        const g = game as any;
        if (!g.user?.isGM) {
            ui.notifications.error(game.i18n?.localize("DH2E.Adjust.GMOnly") ?? "Only the GM can use this dialog.");
            return;
        }
        new GMAdjustDialog().render(true);
    }
}

export { GMAdjustDialog };
