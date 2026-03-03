import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import MentalRecoveryDialogRoot from "./mental-recovery-dialog-root.svelte";
import { getSetting } from "./settings/settings.ts";
import { recordTransaction } from "../advancement/xp-ledger.ts";
import { appendLog } from "../actor/log.ts";

interface RecoveryRequest {
    stat: "insanity" | "corruption";
    count: number;
    perPointCost: number;
    totalCost: number;
}

/**
 * Mental Recovery dialog — allows spending XP to remove insanity/corruption points.
 *
 * Insanity: always available (RAW 100xp per point, halved by Garden World).
 * Corruption: only when GM enables `corruptionRemovalEnabled` setting.
 */
class MentalRecoveryDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-mental-recovery-dialog",
        classes: ["dh2e", "dialog", "mental-recovery-dialog"],
        position: { width: 380, height: "auto" as const },
        window: { resizable: false, minimizable: false },
    });

    protected override root = MentalRecoveryDialogRoot;

    #actor: Actor;
    #resolve: ((result: boolean) => void) | null = null;

    constructor(actor: Actor) {
        super({});
        this.#actor = actor;
    }

    override get title(): string {
        return game.i18n.localize("DH2E.MentalRecovery.Title");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const sys = (this.#actor as any).system;
        const synthetics = (this.#actor as any).synthetics;
        const rollOptions: Set<string> = synthetics?.rollOptions ?? new Set();

        const hasSerenity = rollOptions.has("self:homeworld:serenity-of-the-green");
        const baseCostInsanity = getSetting<number>("insanityRemovalCost");
        const baseCostCorruption = getSetting<number>("corruptionRemovalCost");

        return {
            ctx: {
                actorName: this.#actor.name,
                insanity: sys?.insanity ?? 0,
                corruption: sys?.corruption ?? 0,
                xpAvailable: (sys?.xp?.total ?? 0) - (sys?.xp?.spent ?? 0),
                xpSpent: sys?.xp?.spent ?? 0,
                insanityCostPerPoint: hasSerenity ? Math.ceil(baseCostInsanity / 2) : baseCostInsanity,
                corruptionCostPerPoint: hasSerenity ? Math.ceil(baseCostCorruption / 2) : baseCostCorruption,
                hasSerenity,
                corruptionRemovalEnabled: getSetting<boolean>("corruptionRemovalEnabled"),
                onConfirm: (request: RecoveryRequest) => this.#confirm(request),
                onCancel: () => this.#cancel(),
            },
        };
    }

    async #confirm(request: RecoveryRequest): Promise<void> {
        const sys = (this.#actor as any).system;
        const xpAvailable = (sys?.xp?.total ?? 0) - (sys?.xp?.spent ?? 0);

        if (request.totalCost > xpAvailable) {
            ui.notifications.warn(game.i18n.localize("DH2E.MentalRecovery.InsufficientXP"));
            return;
        }

        const currentValue = sys?.[request.stat] ?? 0;
        if (request.count > currentValue) return;

        const newValue = currentValue - request.count;
        const newSpent = (sys?.xp?.spent ?? 0) + request.totalCost;

        const statLabel = request.stat === "insanity"
            ? game.i18n.localize("DH2E.Insanity")
            : game.i18n.localize("DH2E.Corruption");

        const label = game.i18n.format("DH2E.MentalRecovery.LogLabel", {
            stat: statLabel,
            count: String(request.count),
        });

        // Update actor
        await this.#actor.update({
            [`system.${request.stat}`]: newValue,
            "system.xp.spent": newSpent,
        });

        // Record XP transaction
        await recordTransaction(this.#actor, {
            timestamp: Date.now(),
            category: "characteristic" as const,
            label,
            cost: request.totalCost,
            matchCount: 0,
        });

        // Append to actor log
        await appendLog(this.#actor, {
            timestamp: Date.now(),
            type: "xp-spend",
            label,
            amount: -request.totalCost,
        });

        // Post chat message
        const content = game.i18n.format("DH2E.MentalRecovery.ChatMessage", {
            name: this.#actor.name ?? "Unknown",
            count: String(request.count),
            stat: statLabel.toLowerCase(),
            cost: String(request.totalCost),
        });

        await ChatMessage.create({
            content: `<div class="dh2e chat-card recovery-card"><p>${content}</p></div>`,
            speaker: ChatMessage.getSpeaker({ actor: this.#actor }),
        });

        this.#resolve?.(true);
        this.close();
    }

    #cancel(): void {
        this.#resolve?.(false);
        this.close();
    }

    protected override _onClose(): void {
        this.#resolve?.(false);
        this.#resolve = null;
    }

    /** Open the mental recovery dialog for an actor */
    static async execute(actor: Actor): Promise<boolean> {
        const dialog = new MentalRecoveryDialog(actor);
        return new Promise((resolve) => {
            dialog.#resolve = resolve;
            dialog.render(true);
        });
    }
}

export { MentalRecoveryDialog };
export type { RecoveryRequest };
