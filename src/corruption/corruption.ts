import { CheckDH2e } from "@check/check.ts";
import { rollMalignancy } from "./malignancy-table.ts";
import { rollMutation } from "./mutation-table.ts";
import type { DH2eSynthetics } from "@rules/synthetics.ts";

/**
 * Handles corruption threshold checks.
 *
 * Thresholds at 10, 20, 30, ... 100.
 * When a threshold is crossed: WP test. Failure → roll on malignancy table.
 * At 100 corruption: character is irrevocably lost.
 *
 * Twisted Flesh (Mutant): on failed WP test, the character may choose to
 * roll on the Mutations table instead of the Malignancies table.
 * The character can also choose to automatically fail the WP test.
 */
class CorruptionHandler {
    /** Called when corruption value changes. Checks if a threshold was crossed. */
    static async onCorruptionChanged(actor: Actor, oldVal: number, newVal: number): Promise<void> {
        if (newVal <= oldVal) return; // Only trigger on increases

        // Check for threshold crossings
        const oldThreshold = Math.floor(oldVal / 10);
        const newThreshold = Math.floor(newVal / 10);

        if (newThreshold <= oldThreshold) return;

        // Character lost at 100
        if (newVal >= 100) {
            await CorruptionHandler.#postCorruptionCard(actor, newVal, null, true);
            ui.notifications?.error(
                `${actor.name} has reached 100 Corruption and is irrevocably lost to darkness!`,
            );
            return;
        }

        const synthetics = (actor as any).synthetics as DH2eSynthetics | undefined;
        const hasTwistedFlesh = synthetics?.rollOptions?.has("self:background:twisted-flesh") ?? false;

        // Twisted Flesh: offer choice to auto-fail the WP test
        let autoFail = false;
        if (hasTwistedFlesh) {
            autoFail = await CorruptionHandler.#promptAutoFail(actor);
        }

        let malignancyName: string | null = null;
        let isMutation = false;

        if (autoFail) {
            // Auto-failed — go straight to mutation
            const entry = await rollMutation(actor);
            malignancyName = entry ? `Mutation: ${entry.title}` : null;
            isMutation = true;
        } else {
            // WP test for threshold crossing
            const sys = (actor as any).system;
            const wpValue = sys?.characteristics?.wp?.value ?? 25;

            const checkResult = await CheckDH2e.roll({
                actor,
                characteristic: "wp",
                baseTarget: wpValue,
                label: `${game.i18n?.localize("DH2E.Corruption.ThresholdTest") ?? "Corruption Threshold Test"} (${newThreshold * 10})`,
                domain: "corruption",
                skipDialog: true,
            });

            if (!checkResult) return;

            // Failed WP test → roll on malignancy (or mutation for Twisted Flesh)
            if (!checkResult.dos.success) {
                if (hasTwistedFlesh) {
                    // Offer mutation instead of malignancy
                    const chooseMutation = await CorruptionHandler.#promptMutationChoice(actor);
                    if (chooseMutation) {
                        const entry = await rollMutation(actor);
                        malignancyName = entry ? `Mutation: ${entry.title}` : null;
                        isMutation = true;
                    } else {
                        const entry = await rollMalignancy(actor);
                        malignancyName = entry?.title ?? null;
                    }
                } else {
                    const entry = await rollMalignancy(actor);
                    malignancyName = entry?.title ?? null;
                }
            }
        }

        await CorruptionHandler.#postCorruptionCard(actor, newVal, malignancyName, false, isMutation);
    }

    /** Prompt Twisted Flesh character: auto-fail the WP test? */
    static async #promptAutoFail(actor: Actor): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const d = new (fd.DialogV2 ?? fd.Dialog as any)({
                window: {
                    title: game.i18n?.localize("DH2E.TwistedFlesh.Title") ?? "Twisted Flesh",
                },
                content: `<p>${game.i18n?.format("DH2E.TwistedFlesh.AutoFailPrompt", {
                    actor: actor.name ?? "",
                }) ?? `${actor.name} has Twisted Flesh. Automatically fail the Corruption resistance test and roll on the Mutations table?`}</p>`,
                buttons: [{
                    action: "fail",
                    label: game.i18n?.localize("DH2E.TwistedFlesh.AutoFail") ?? "Auto-Fail (Roll Mutation)",
                    callback: () => resolve(true),
                }, {
                    action: "resist",
                    label: game.i18n?.localize("DH2E.TwistedFlesh.Resist") ?? "Roll WP Test",
                    callback: () => resolve(false),
                }],
                close: () => resolve(false),
            });
            d.render({ force: true });
        });
    }

    /** Prompt Twisted Flesh character: take mutation instead of malignancy? */
    static async #promptMutationChoice(actor: Actor): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const d = new (fd.DialogV2 ?? fd.Dialog as any)({
                window: {
                    title: game.i18n?.localize("DH2E.TwistedFlesh.Title") ?? "Twisted Flesh",
                },
                content: `<p>${game.i18n?.format("DH2E.TwistedFlesh.MutationPrompt", {
                    actor: actor.name ?? "",
                }) ?? `${actor.name} failed the Corruption test. Roll on the Mutations table instead of Malignancies?`}</p>`,
                buttons: [{
                    action: "mutation",
                    label: game.i18n?.localize("DH2E.TwistedFlesh.Mutation") ?? "Mutation",
                    callback: () => resolve(true),
                }, {
                    action: "malignancy",
                    label: game.i18n?.localize("DH2E.TwistedFlesh.Malignancy") ?? "Malignancy",
                    callback: () => resolve(false),
                }],
                close: () => resolve(false),
            });
            d.render({ force: true });
        });
    }

    static async #postCorruptionCard(
        actor: Actor,
        corruption: number,
        malignancyName: string | null,
        lost: boolean,
        isMutation = false,
    ): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/corruption-card.hbs`;
        const templateData = {
            actorName: actor.name,
            corruption,
            threshold: Math.floor(corruption / 10) * 10,
            malignancyName,
            hasMalignancy: !!malignancyName,
            isMutation,
            lost,
        };

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);
        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };

        await fd.ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "corruption",
                    result: { corruption, malignancyName, lost, isMutation },
                },
            },
        });
    }
}

export { CorruptionHandler };
