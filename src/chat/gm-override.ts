import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import OverrideDialogRoot from "./override-dialog-root.svelte";

/** Available override actions per message type */
interface OverrideAction {
    id: string;
    label: string;
    icon: string;
    /** Whether this action needs a numeric input prompt */
    needsInput?: boolean;
    /** i18n key for the input prompt label */
    inputLabel?: string;
}

const OVERRIDE_ACTIONS: Record<string, OverrideAction[]> = {
    check: [
        { id: "adjust-dos", label: "DH2E.GMOverride.AdjustDoS", icon: "fa-solid fa-plus-minus", needsInput: true, inputLabel: "DH2E.GMOverride.PromptDoS" },
        { id: "force-reroll", label: "DH2E.GMOverride.ForceReroll", icon: "fa-solid fa-dice" },
    ],
    attack: [
        { id: "adjust-dos", label: "DH2E.GMOverride.AdjustDoS", icon: "fa-solid fa-plus-minus", needsInput: true, inputLabel: "DH2E.GMOverride.PromptDoS" },
        { id: "force-reroll", label: "DH2E.GMOverride.ForceReroll", icon: "fa-solid fa-dice" },
    ],
    damage: [
        { id: "undo-wounds", label: "DH2E.GMOverride.UndoWounds", icon: "fa-solid fa-heart" },
        { id: "change-damage", label: "DH2E.GMOverride.ChangeDamage", icon: "fa-solid fa-pen", needsInput: true, inputLabel: "DH2E.GMOverride.PromptDamage" },
    ],
    critical: [
        { id: "change-severity", label: "DH2E.GMOverride.ChangeSeverity", icon: "fa-solid fa-pen", needsInput: true, inputLabel: "DH2E.GMOverride.PromptSeverity" },
        { id: "remove-injury", label: "DH2E.GMOverride.RemoveInjury", icon: "fa-solid fa-trash" },
    ],
    "focus-power": [
        { id: "adjust-dos", label: "DH2E.GMOverride.AdjustDoS", icon: "fa-solid fa-plus-minus", needsInput: true, inputLabel: "DH2E.GMOverride.PromptDoS" },
        { id: "dismiss-phenomena", label: "DH2E.GMOverride.DismissPhenomena", icon: "fa-solid fa-ban" },
    ],
    phenomena: [
        { id: "dismiss", label: "DH2E.GMOverride.Dismiss", icon: "fa-solid fa-ban" },
        { id: "reroll-phenomena", label: "DH2E.GMOverride.Reroll", icon: "fa-solid fa-dice" },
    ],
    corruption: [
        { id: "undo-malignancy", label: "DH2E.GMOverride.UndoMalignancy", icon: "fa-solid fa-trash" },
    ],
    requisition: [
        { id: "force-success", label: "DH2E.GMOverride.ForceSuccess", icon: "fa-solid fa-check" },
        { id: "force-failure", label: "DH2E.GMOverride.ForceFailure", icon: "fa-solid fa-times" },
    ],
};

/**
 * Post a GM audit note to chat.
 * These are whispered to the GM so players don't see metagame data.
 */
async function postAuditNote(text: string): Promise<void> {
    await fd.ChatMessage.create({
        content: `<div class="dh2e chat-card gm-audit"><em>${text}</em></div>`,
        whisper: [(game as any).user?.id],
        speaker: { alias: "GM Override" },
    });
}

/**
 * Handles GM override actions on chat messages.
 * Context-sensitive based on message flags type.
 */
class GMOverrideHandler {
    static async showOverrideDialog(message: StoredDocument<ChatMessage>): Promise<void> {
        if (!(game as any).user?.isGM) {
            ui.notifications?.warn("Only the GM can use overrides.");
            return;
        }

        const flags = (message as any).flags?.[SYSTEM_ID] as Record<string, unknown> | undefined;
        if (!flags?.type) {
            ui.notifications?.warn("No override data on this message.");
            return;
        }

        const msgType = flags.type as string;
        const actions = OVERRIDE_ACTIONS[msgType];
        if (!actions || actions.length === 0) {
            ui.notifications?.info("No overrides available for this message type.");
            return;
        }

        const dialog = new GMOverrideDialog({
            message,
            msgType,
            actions,
            flags,
        });
        dialog.render(true);
    }
}

/** Small dialog showing override options for a message */
class GMOverrideDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-gm-override-dialog",
        classes: ["dh2e", "dialog", "gm-override-dialog"],
        position: { width: 340, height: "auto" as const },
        window: {
            resizable: false,
            minimizable: false,
        },
    });

    protected override root = OverrideDialogRoot;

    #message: StoredDocument<ChatMessage>;
    #msgType: string;
    #actions: OverrideAction[];
    #flags: Record<string, unknown>;

    constructor(options: {
        message: StoredDocument<ChatMessage>;
        msgType: string;
        actions: OverrideAction[];
        flags: Record<string, unknown>;
    }) {
        super({});
        this.#message = options.message;
        this.#msgType = options.msgType;
        this.#actions = options.actions;
        this.#flags = options.flags;
    }

    override get title(): string {
        return game.i18n?.localize("DH2E.GMOverride.Title") ?? "GM Override";
    }

    /** Extract current value for a given action from the message flags */
    #getCurrentValue(actionId: string): number | undefined {
        const result = this.#flags.result as Record<string, unknown> | undefined;
        if (!result) return undefined;

        switch (actionId) {
            case "adjust-dos": {
                const dos = result.dos as number | undefined;
                const dof = result.dof as number | undefined;
                // Positive = DoS, negative = DoF
                if (dos !== undefined && dos > 0) return dos;
                if (dof !== undefined && dof > 0) return -dof;
                return 0;
            }
            case "change-damage":
                return (result.totalDamage as number) ?? (result.woundsDealt as number) ?? 0;
            case "change-severity":
                return (result.severity as number) ?? 1;
            default:
                return undefined;
        }
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                msgType: this.#msgType,
                actions: this.#actions.map((a) => ({
                    ...a,
                    label: game.i18n?.localize(a.label) ?? a.label,
                    inputLabel: a.inputLabel ? (game.i18n?.localize(a.inputLabel) ?? a.inputLabel) : undefined,
                    currentValue: a.needsInput ? this.#getCurrentValue(a.id) : undefined,
                })),
                onAction: (actionId: string, inputValue?: number) => this.#executeAction(actionId, inputValue),
                onCancel: () => this.close(),
            },
        };
    }

    async #executeAction(actionId: string, inputValue?: number): Promise<void> {
        const result = this.#flags.result as Record<string, unknown> | undefined;
        const message = this.#message;

        switch (actionId) {
            case "adjust-dos": {
                if (inputValue === undefined) break;
                const oldDos = (result?.dos as number) ?? 0;
                const oldDof = (result?.dof as number) ?? 0;
                const oldDisplay = oldDos > 0 ? `${oldDos} DoS` : `${oldDof} DoF`;

                // inputValue: positive = DoS, negative = DoF
                const newDos = inputValue >= 0 ? inputValue : 0;
                const newDof = inputValue < 0 ? Math.abs(inputValue) : 0;
                const newSuccess = newDos > 0 || (newDos === 0 && newDof === 0);
                const newDisplay = newDos > 0 ? `${newDos} DoS` : `${newDof} DoF`;

                await (message as any).update({
                    [`flags.${SYSTEM_ID}.result.dos`]: newDos,
                    [`flags.${SYSTEM_ID}.result.dof`]: newDof,
                    [`flags.${SYSTEM_ID}.result.success`]: newSuccess,
                    [`flags.${SYSTEM_ID}.gmOverride`]: true,
                });

                await postAuditNote(
                    game.i18n?.format("DH2E.GMOverride.AuditDoS", { old: oldDisplay, new: newDisplay })
                    ?? `GM adjusted degrees from ${oldDisplay} to ${newDisplay}.`,
                );
                ui.notifications?.info(`Degrees adjusted to ${newDisplay}.`);
                break;
            }

            case "force-reroll": {
                // Re-roll d100 with same target number, post new card
                const target = (result?.target as number) ?? 50;
                const roll = new foundry.dice.Roll("1d100");
                await roll.evaluate();
                const newRoll = roll.total ?? 50;
                const newDos = Math.max(0, Math.floor(target / 10) - Math.floor(newRoll / 10));
                const newDof = Math.max(0, Math.floor(newRoll / 10) - Math.floor(target / 10));
                const success = newRoll <= target;

                // Get speaker from original message
                const speaker = (message as any).speaker ?? { alias: "Unknown" };
                const label = (result?.label as string) ?? (result?.skillName as string) ?? "Test";

                await fd.ChatMessage.create({
                    content: `<div class="dh2e chat-card check-card gm-reroll">
                        <header class="card-header">
                            <h3>${label} <span class="gm-tag">[GM Reroll]</span></h3>
                        </header>
                        <div class="card-body">
                            <div class="roll-result ${success ? "success" : "failure"}">
                                <span class="roll-value">${newRoll}</span>
                                <span class="roll-target">vs ${target}</span>
                            </div>
                            <div class="dos-display">
                                ${success ? `${newDos + 1} DoS` : `${newDof + 1} DoF`}
                            </div>
                        </div>
                    </div>`,
                    speaker,
                    flags: {
                        [SYSTEM_ID]: {
                            type: this.#msgType,
                            gmOverride: true,
                            result: {
                                ...result,
                                roll: newRoll,
                                dos: success ? newDos + 1 : 0,
                                dof: success ? 0 : newDof + 1,
                                success,
                            },
                        },
                    },
                });

                await postAuditNote(`GM forced reroll on "${label}": ${newRoll} vs ${target}.`);
                ui.notifications?.info(`Rerolled: ${newRoll} vs ${target}.`);
                break;
            }

            case "change-damage": {
                if (inputValue === undefined || inputValue < 0) break;
                const oldDamage = (result?.totalDamage as number) ?? (result?.woundsDealt as number) ?? 0;

                await (message as any).update({
                    [`flags.${SYSTEM_ID}.result.totalDamage`]: inputValue,
                    [`flags.${SYSTEM_ID}.result.woundsDealt`]: inputValue,
                    [`flags.${SYSTEM_ID}.gmOverride`]: true,
                });

                await postAuditNote(
                    game.i18n?.format("DH2E.GMOverride.AuditDamage", { old: String(oldDamage), new: String(inputValue) })
                    ?? `GM adjusted damage from ${oldDamage} to ${inputValue}.`,
                );
                ui.notifications?.info(`Damage adjusted to ${inputValue}.`);
                break;
            }

            case "change-severity": {
                if (inputValue === undefined || inputValue < 1) break;
                const oldSeverity = (result?.severity as number) ?? 1;

                await (message as any).update({
                    [`flags.${SYSTEM_ID}.result.severity`]: inputValue,
                    [`flags.${SYSTEM_ID}.gmOverride`]: true,
                });

                // Update the critical injury item on the actor if present
                const speakerId = (message as any).speaker?.actor;
                if (speakerId) {
                    const actor = (game as any).actors?.get(speakerId) as Actor | undefined;
                    if (actor) {
                        const criticals = actor.items.filter((i: Item) => i.type === "critical-injury");
                        if (criticals.length > 0) {
                            const latest = criticals[criticals.length - 1];
                            await latest.update({ "system.severity": inputValue });
                        }
                    }
                }

                await postAuditNote(
                    game.i18n?.format("DH2E.GMOverride.AuditSeverity", { old: String(oldSeverity), new: String(inputValue) })
                    ?? `GM adjusted critical severity from ${oldSeverity} to ${inputValue}.`,
                );
                ui.notifications?.info(`Critical severity adjusted to ${inputValue}.`);
                break;
            }

            case "dismiss":
            case "dismiss-phenomena":
                await (message as any).update({
                    [`flags.${SYSTEM_ID}.dismissed`]: true,
                    [`flags.${SYSTEM_ID}.gmOverride`]: true,
                });
                await postAuditNote("GM dismissed phenomena effect.");
                ui.notifications?.info(
                    game.i18n?.localize("DH2E.GMOverride.Dismissed") ?? "Effect dismissed by GM.",
                );
                break;

            case "undo-wounds": {
                // Delegate to ChatApplyHandler.revertDamage
                const { ChatApplyHandler } = await import("./apply-handler.ts");
                await ChatApplyHandler.revertDamage(message);
                break;
            }

            case "undo-malignancy": {
                const speakerId = (message as any).speaker?.actor;
                if (speakerId) {
                    const actor = (game as any).actors?.get(speakerId) as Actor | undefined;
                    if (actor) {
                        const malignancies = actor.items.filter((i: Item) => i.type === "malignancy");
                        if (malignancies.length > 0) {
                            const latest = malignancies[malignancies.length - 1];
                            await actor.deleteEmbeddedDocuments("Item", [latest.id!]);
                            await postAuditNote(`GM removed malignancy "${latest.name}" from ${actor.name}.`);
                            ui.notifications?.info(`Removed malignancy "${latest.name}" from ${actor.name}.`);
                        }
                    }
                }
                break;
            }

            case "force-success":
            case "force-failure": {
                const newSuccess = actionId === "force-success";
                const oldSuccess = (result?.success as boolean) ?? false;
                if (oldSuccess === newSuccess) {
                    ui.notifications?.info(`Result is already ${newSuccess ? "a success" : "a failure"}.`);
                    break;
                }

                await (message as any).update({
                    [`flags.${SYSTEM_ID}.result.success`]: newSuccess,
                    [`flags.${SYSTEM_ID}.gmOverride`]: true,
                });

                const verb = newSuccess ? "forced success" : "forced failure";
                await postAuditNote(`GM ${verb} on requisition test.`);
                ui.notifications?.info(`Requisition ${verb}.`);
                break;
            }

            case "remove-injury": {
                const speakerId = (message as any).speaker?.actor;
                if (speakerId) {
                    const actor = (game as any).actors?.get(speakerId) as Actor | undefined;
                    if (actor) {
                        const criticals = actor.items.filter((i: Item) => i.type === "critical-injury");
                        if (criticals.length > 0) {
                            const latest = criticals[criticals.length - 1];
                            await actor.deleteEmbeddedDocuments("Item", [latest.id!]);
                            await postAuditNote(`GM removed critical injury "${latest.name}" from ${actor.name}.`);
                            ui.notifications?.info(`Removed critical injury "${latest.name}" from ${actor.name}.`);
                        }
                    }
                }
                break;
            }

            case "reroll-phenomena": {
                // Re-roll on phenomena table (d100)
                const roll = new foundry.dice.Roll("1d100");
                await roll.evaluate();
                const phenomenaRoll = roll.total ?? 50;
                const speaker = (message as any).speaker ?? { alias: "Unknown" };

                await fd.ChatMessage.create({
                    content: `<div class="dh2e chat-card phenomena-card gm-reroll">
                        <header class="card-header">
                            <h3>Psychic Phenomena <span class="gm-tag">[GM Reroll]</span></h3>
                        </header>
                        <div class="card-body">
                            <div class="phenomena-roll">${phenomenaRoll}</div>
                            <p class="phenomena-note">Consult the Psychic Phenomena table (p.196).</p>
                        </div>
                    </div>`,
                    speaker,
                    flags: {
                        [SYSTEM_ID]: {
                            type: "phenomena",
                            gmOverride: true,
                            result: { roll: phenomenaRoll },
                        },
                    },
                });

                await postAuditNote(`GM rerolled phenomena: new roll ${phenomenaRoll}.`);
                ui.notifications?.info(`Phenomena rerolled: ${phenomenaRoll}.`);
                break;
            }

            default:
                console.warn(`DH2E | Unknown override action: ${actionId}`);
        }

        this.close();
    }
}

export { GMOverrideHandler, GMOverrideDialog };
