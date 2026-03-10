import type { FocusPowerContext, FocusPowerResult, PsykerMode, PhenomenaEntry } from "./types.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import { CheckDH2e } from "@check/check.ts";
import { ModifierDH2e } from "@rules/modifier.ts";
import { rollPhenomena, rollPerils, lookupPhenomenaByRoll } from "./tables.ts";
import { ChatCardDH2e } from "@chat/cards.ts";
import { VFXResolver } from "../vfx/resolver.ts";

/**
 * Resolves the full Focus Power flow:
 * 1. Calculate target from characteristic + PR multiplier
 * 2. Show dialog for mode selection
 * 3. Roll via CheckDH2e
 * 4. Detect and roll on Phenomena/Perils tables
 * 5. Post chat cards
 */
/** Map full characteristic names to abbreviations for defensive lookup */
const CHAR_NAME_TO_ABBREV: Record<string, CharacteristicAbbrev> = {
    willpower: "wp", perception: "per", agility: "ag", toughness: "t",
    strength: "s", intelligence: "int", fellowship: "fel",
    "weapon skill": "ws", "ballistic skill": "bs",
    psyniscience: "per", // Psyniscience is Per-based
};

class FocusPowerResolver {
    static async resolve(context: FocusPowerContext): Promise<FocusPowerResult | null> {
        const actor = context.actor as any;
        const power = context.power as any;
        const rawKey = context.focusCharacteristic || "wp";
        const charKey = (CHAR_NAME_TO_ABBREV[rawKey.toLowerCase()] ?? rawKey) as CharacteristicAbbrev;
        const psyRating = context.psyRating;

        // Default mode to unfettered if not set (dialog will let user choose)
        const mode: PsykerMode = context.mode ?? "unfettered";

        // Effective PR for power effects (damage, range, etc.)
        // Unfettered: chosen PR (1 to base). Pushed: base PR to base PR + 2.
        const maxPushedPR = psyRating + 2;
        const selectedPR = mode === "pushed"
            ? Math.max(psyRating, Math.min(context.selectedPR ?? psyRating, maxPushedPR))
            : Math.max(1, Math.min(context.selectedPR ?? psyRating, psyRating));
        const effectivePR = selectedPR;

        // Unfettered: +10 bonus per PR level below max
        // Pushed: -10 penalty per PR level above base (CRB p.194)
        const prModifier = (psyRating - selectedPR) * 10;

        // Base target = characteristic value
        const charData = actor.system?.characteristics?.[charKey];
        const baseTarget = charData?.value ?? 25;

        // Build modifiers
        const modifiers: ModifierDH2e[] = [];
        if (context.focusModifier !== 0) {
            modifiers.push(new ModifierDH2e({
                label: game.i18n?.localize("DH2E.Power.FocusModifier") ?? "Focus Modifier",
                value: context.focusModifier,
                source: power.name ?? "Power",
            }));
        }
        if (prModifier !== 0) {
            const label = prModifier > 0
                ? (game.i18n?.localize("DH2E.Psychic.PRBonus") ?? "Reduced PR")
                : (game.i18n?.localize("DH2E.Psychic.PushPenalty") ?? "Push Penalty");
            modifiers.push(new ModifierDH2e({
                label,
                value: prModifier,
                source: "Psy Rating",
            }));
        }

        // Build roll options
        const rollOptions = new Set<string>();
        rollOptions.add("power");
        rollOptions.add(`power:mode:${mode}`);
        if (power.system?.discipline) {
            rollOptions.add(`power:discipline:${power.system.discipline.toLowerCase().replace(/\s+/g, "-")}`);
        }
        const slug = power.name?.toLowerCase().replace(/\s+/g, "-") ?? "unknown";
        rollOptions.add(`power:${slug}`);

        // Roll the focus power test
        const checkResult = await CheckDH2e.roll({
            actor: context.actor,
            characteristic: charKey,
            baseTarget,
            label: `${game.i18n?.localize("DH2E.Psychic.FocusPower") ?? "Focus Power"}: ${power.name}`,
            domain: `power:${slug}`,
            modifiers,
            rollOptions,
            skipDialog: context.skipDialog,
        });

        if (!checkResult) return null;

        // Check for Psychic Phenomena / Perils of the Warp (CRB p.196)
        let phenomenaTriggered = false;
        let perilsDirect = false;

        // Check for doubles (tens digit == units digit)
        const d100 = checkResult.roll;
        const tens = Math.floor(d100 / 10) % 10;
        const units = d100 % 10;
        const isDoubles = tens === units;

        if (mode === "pushed") {
            if (isDoubles) {
                // Push + doubles → Perils of the Warp directly (skip Phenomena)
                perilsDirect = true;
                phenomenaTriggered = true;
            } else {
                // Push + no doubles → Psychic Phenomena (+25)
                phenomenaTriggered = true;
            }
        } else {
            // Unfettered: doubles → Psychic Phenomena
            if (isDoubles) {
                phenomenaTriggered = true;
            }
        }

        const result: FocusPowerResult = {
            checkResult,
            mode,
            psyRating,
            effectivePR,
            phenomenaTriggered,
        };

        // Post focus power card
        await FocusPowerResolver.#postFocusPowerCard(result, power);

        // Play VFX if available and successful
        if (VFXResolver.available && checkResult.dos.success) {
            const casterToken = actor.token ?? actor.getActiveTokens?.()?.[0];
            if (casterToken) {
                const g = game as any;
                const targetActor = g.user?.targets?.first()?.actor;
                const targetToken = targetActor?.token ?? targetActor?.getActiveTokens?.()?.[0];
                VFXResolver.psychicPower({
                    casterToken,
                    targetToken,
                    power,
                    discipline: power.system?.discipline ?? "",
                    powerName: power.name ?? "",
                });
            }
        }

        // Roll phenomena/perils if triggered
        if (phenomenaTriggered) {
            const automate = (game as any).settings?.get?.(SYSTEM_ID, "automatePhenomena") ?? true;
            if (automate) {
                try {
                    if (perilsDirect) {
                        // Push + doubles: Perils of the Warp directly (skip Phenomena)
                        const perilResult = await rollPerils();
                        result.perilsEntry = perilResult.entry;
                        await FocusPowerResolver.#postPhenomenaCard(result, actor, perilResult.roll);
                    } else {
                        let phResult = await rollPhenomena(mode === "pushed");
                        let phenomenaRoll = phResult.roll;

                        // Favoured by the Warp (CRB p.128): roll twice, choose result
                        // Only applies if NOT escalating to Perils
                        const hasFavoured = actor.items?.some(
                            (i: Item) => i.type === "talent" && i.name === "Favoured by the Warp",
                        );
                        if (hasFavoured && !phResult.entry?.escalate) {
                            const secondResult = await rollPhenomena(mode === "pushed");
                            // Only offer choice if both are non-Perils
                            if (!secondResult.entry?.escalate) {
                                const chosen = await FocusPowerResolver.#promptFavouredByTheWarp(
                                    phResult.roll, phResult.entry,
                                    secondResult.roll, secondResult.entry,
                                );
                                if (chosen === 2) {
                                    phResult = secondResult;
                                    phenomenaRoll = secondResult.roll;
                                }
                            }
                            // If second roll escalates to Perils, keep the first (non-Perils) roll
                        }

                        // The Constant Threat: Telepathica character can adjust the roll by ±WP bonus
                        const ctChar = FocusPowerResolver.#findConstantThreatAlly(actor);
                        if (ctChar) {
                            const wpBonus = ctChar.system?.characteristics?.wp?.bonus ?? 0;
                            if (wpBonus > 0) {
                                const adjustment = await FocusPowerResolver.#promptConstantThreatAdjustment(
                                    ctChar.name ?? "Unknown",
                                    wpBonus,
                                    phenomenaRoll,
                                );
                                if (adjustment !== 0) {
                                    const oldRoll = phenomenaRoll;
                                    phenomenaRoll = Math.max(1, Math.min(100, phenomenaRoll + adjustment));
                                    phResult.entry = await lookupPhenomenaByRoll(phenomenaRoll);
                                    phResult.roll = phenomenaRoll;

                                    // Post system note
                                    const speaker = fd.ChatMessage.getSpeaker?.({ actor: ctChar }) ?? { alias: ctChar.name };
                                    await fd.ChatMessage.create({
                                        content: `<div class="dh2e chat-card system-note"><em>${game.i18n?.format("DH2E.ConstantThreat.Adjusted", {
                                            character: ctChar.name!,
                                            oldRoll: String(oldRoll),
                                            adjustment: (adjustment > 0 ? "+" : "") + String(adjustment),
                                            newRoll: String(phenomenaRoll),
                                        }) ?? `The Constant Threat: ${ctChar.name} adjusted phenomena roll from ${oldRoll} to ${phenomenaRoll} (${adjustment > 0 ? "+" : ""}${adjustment}).`}</em></div>`,
                                        speaker,
                                    });
                                }
                            }
                        }

                        result.phenomenaEntry = phResult.entry;

                        // Check if it escalates to Perils
                        if (phResult.entry?.escalate) {
                            const perilResult = await rollPerils();
                            result.perilsEntry = perilResult.entry;
                        }

                        await FocusPowerResolver.#postPhenomenaCard(result, actor, phenomenaRoll);
                    }
                } catch (err) {
                    console.error("DH2E | Error rolling psychic phenomena/perils:", err);
                    ui.notifications?.error("Failed to roll Psychic Phenomena — check console for details.");
                }
            } else {
                // Even if automation is off, notify
                const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
                if (perilsDirect) {
                    await fd.ChatMessage.create({
                        content: `<div class="dh2e chat-card system-note"><em><i class="fas fa-skull"></i> ${game.i18n?.localize("DH2E.Psychic.PerilsTriggered") ?? "Perils of the Warp!"} Doubles rolled while Pushing — roll manually on the Perils of the Warp table.</em></div>`,
                        speaker,
                    });
                } else {
                    await fd.ChatMessage.create({
                        content: `<div class="dh2e chat-card system-note"><em><i class="fas fa-bolt"></i> ${game.i18n?.localize("DH2E.Psychic.PhenomenaTriggered") ?? "Psychic Phenomena triggered!"} Roll manually on the Psychic Phenomena table.</em></div>`,
                        speaker,
                    });
                }
            }
        }

        return result;
    }

    static async #postFocusPowerCard(result: FocusPowerResult, power: any): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/focus-power-card.hbs`;
        const sys = power.system ?? {};
        const isSuccess = result.checkResult.dos.success;

        // Combat integration: determine if attack/healing buttons should appear
        const hasAttack = !!sys.attack?.formula && isSuccess;
        const hasHealing = !!sys.healing && isSuccess;
        const opposedCharacteristic = sys.opposedCharacteristic ?? "";

        // Characteristic label map for opposed display
        const opposedLabels: Record<string, string> = {
            t: game.i18n?.localize("DH2E.Characteristic.Toughness") ?? "Toughness",
            wp: game.i18n?.localize("DH2E.Characteristic.Willpower") ?? "Willpower",
            s: game.i18n?.localize("DH2E.Characteristic.Strength") ?? "Strength",
            ag: game.i18n?.localize("DH2E.Characteristic.Agility") ?? "Agility",
        };

        const templateData = {
            powerName: power.name,
            discipline: sys.discipline ?? "",
            success: isSuccess,
            degrees: result.checkResult.dos.degrees,
            roll: result.checkResult.roll,
            target: result.checkResult.target,
            mode: result.mode,
            modeLabel: result.mode === "pushed"
                ? (game.i18n?.localize("DH2E.Psychic.Pushed") ?? "Pushed")
                : (game.i18n?.localize("DH2E.Psychic.Unfettered") ?? "Unfettered"),
            psyRating: result.psyRating,
            effectivePR: result.effectivePR,
            phenomenaTriggered: result.phenomenaTriggered,
            description: sys.description ?? "",
            hasAttack,
            hasHealing,
            opposedCharacteristic,
            opposedLabel: opposedLabels[opposedCharacteristic] ?? opposedCharacteristic.toUpperCase(),
            damageType: sys.attack?.damageType ?? "",
            ignoreTB: sys.attack?.ignoreTB ?? false,
            ignoreAP: sys.attack?.ignoreAP ?? false,
        };

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);
        const speaker = fd.ChatMessage.getSpeaker?.({
            actor: result.checkResult.context.actor,
        }) ?? { alias: result.checkResult.context.actor.name };

        await fd.ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "focus-power",
                    result: {
                        powerName: power.name,
                        success: isSuccess,
                        degrees: result.checkResult.dos.degrees,
                        mode: result.mode,
                        phenomenaTriggered: result.phenomenaTriggered,
                    },
                    actorId: result.checkResult.context.actor.id,
                    powerId: power.id,
                    psyRating: result.psyRating,
                    effectivePR: result.effectivePR,
                    focusRoll: result.checkResult.roll,
                    psykerMode: result.mode,
                },
            },
        });
    }

    static async #postPhenomenaCard(result: FocusPowerResult, actor: any, phenomenaRoll?: number): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/phenomena-card.hbs`;

        const isPerils = !!result.perilsEntry;
        const entry = isPerils ? result.perilsEntry : result.phenomenaEntry;

        const templateData = {
            isPerils,
            title: entry?.title ?? "Unknown",
            description: entry?.description ?? "",
            effect: entry?.effect ?? "",
            damage: isPerils ? result.perilsEntry?.damage ?? "" : "",
            phenomenaRoll: phenomenaRoll ?? 0,
            isGM: (game as any).user?.isGM ?? false,
        };

        const content = await fa.handlebars.renderTemplate(templatePath, templateData);
        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };

        await fd.ChatMessage.create({
            content,
            speaker,
            flags: {
                [SYSTEM_ID]: {
                    type: "phenomena",
                    result: {
                        isPerils,
                        title: entry?.title,
                        effect: entry?.effect,
                        roll: phenomenaRoll,
                    },
                },
            },
        });
    }
    /**
     * Find a character with The Constant Threat ability within 10m of the psyker.
     * Returns the psyker themselves if they have it, or the nearest ally with highest WP bonus.
     */
    static #findConstantThreatAlly(psykerActor: any): any | null {
        // Check if the psyker themselves has the ability
        if (psykerActor.synthetics?.rollOptions?.has("self:background:constant-threat")) {
            return psykerActor;
        }

        const scene = (game as any).scenes?.active;
        if (!scene) return null;

        // Find psyker's token on the scene
        const psykerTokenDoc = scene.tokens?.find((t: any) => t.actorId === psykerActor.id);
        if (!psykerTokenDoc) return null;

        const gridSize = scene.grid?.size ?? 1;
        const gridDistance = scene.grid?.distance ?? 1;
        const radiusPixels = (10 / gridDistance) * gridSize;

        const px = psykerTokenDoc.x + (psykerTokenDoc.width * gridSize) / 2;
        const py = psykerTokenDoc.y + (psykerTokenDoc.height * gridSize) / 2;

        let bestCandidate: any = null;
        let bestWpBonus = 0;

        for (const token of scene.tokens ?? []) {
            if (token.id === psykerTokenDoc.id) continue;
            const tokenActor = token.actor;
            if (!tokenActor?.synthetics?.rollOptions?.has("self:background:constant-threat")) continue;

            const ox = token.x + (token.width * gridSize) / 2;
            const oy = token.y + (token.height * gridSize) / 2;
            const dist = Math.hypot(ox - px, oy - py);

            if (dist <= radiusPixels) {
                const wpBonus = tokenActor.system?.characteristics?.wp?.bonus ?? 0;
                if (wpBonus > bestWpBonus) {
                    bestCandidate = tokenActor;
                    bestWpBonus = wpBonus;
                }
            }
        }

        return bestCandidate;
    }

    /** Show a dialog for the Constant Threat adjustment. Returns the adjustment value (0 = no change). */
    static async #promptConstantThreatAdjustment(
        characterName: string,
        wpBonus: number,
        rawRoll: number,
    ): Promise<number> {
        const promptText = game.i18n?.format("DH2E.ConstantThreat.Prompt", {
            character: characterName,
            roll: String(rawRoll),
            wpBonus: String(wpBonus),
        }) ?? `${characterName} can adjust the Phenomena roll (${rawRoll}) by up to ±${wpBonus} (WP Bonus).`;

        const content = `
            <form class="dh2e constant-threat-form">
                <p>${promptText}</p>
                <div class="form-group">
                    <label>${game.i18n?.localize("DH2E.ConstantThreat.Adjustment") ?? "Adjustment"}</label>
                    <div style="display:flex;align-items:center;gap:8px">
                        <input type="range" name="adjustment" value="0" min="${-wpBonus}" max="${wpBonus}" step="1"
                            style="flex:1" oninput="this.nextElementSibling.textContent=this.value>0?'+'+this.value:this.value" />
                        <span style="min-width:32px;text-align:center;font-weight:bold">0</span>
                    </div>
                    <p class="notes" style="margin-top:4px">${game.i18n?.format("DH2E.ConstantThreat.Range", {
                        min: String(Math.max(1, rawRoll - wpBonus)),
                        max: String(Math.min(100, rawRoll + wpBonus)),
                    }) ?? `Result range: ${Math.max(1, rawRoll - wpBonus)}–${Math.min(100, rawRoll + wpBonus)}`}</p>
                </div>
            </form>
        `;

        return new Promise<number>((resolve) => {
            const dialog = new fa.api.DialogV2({
                window: { title: game.i18n?.localize("DH2E.ConstantThreat.Title") ?? "The Constant Threat" },
                content,
                buttons: [{
                    action: "adjust",
                    icon: "fas fa-sliders-h",
                    label: game.i18n?.localize("DH2E.ConstantThreat.Apply") ?? "Adjust Roll",
                    callback: (_event: Event, _button: HTMLElement, dialog: any) => {
                        const input = dialog.element.querySelector<HTMLInputElement>("[name=adjustment]");
                        const val = parseInt(input?.value ?? "0", 10) || 0;
                        resolve(Math.max(-wpBonus, Math.min(wpBonus, val)));
                    },
                }, {
                    action: "skip",
                    icon: "fas fa-forward",
                    label: game.i18n?.localize("DH2E.ConstantThreat.Skip") ?? "No Adjustment",
                    callback: () => resolve(0),
                }],
                close: () => resolve(0),
            });
            dialog.render({ force: true });
        });
    }

    /**
     * Favoured by the Warp (CRB p.128): show both Phenomena rolls and let the player choose.
     * Returns 1 (first roll) or 2 (second roll).
     */
    static async #promptFavouredByTheWarp(
        roll1: number,
        entry1: PhenomenaEntry | undefined,
        roll2: number,
        entry2: PhenomenaEntry | undefined,
    ): Promise<1 | 2> {
        const title1 = entry1?.title ?? "Unknown";
        const title2 = entry2?.title ?? "Unknown";
        const effect1 = entry1?.effect ?? entry1?.description ?? "";
        const effect2 = entry2?.effect ?? entry2?.description ?? "";

        const content = `
            <div class="dh2e favoured-warp-form" style="padding:0.5rem;">
                <p style="margin:0 0 0.75rem;font-size:0.85rem;">
                    <i class="fas fa-dice"></i>
                    <strong>${game.i18n?.localize("DH2E.FavouredByTheWarp.Prompt") ?? "Favoured by the Warp — choose which Phenomena result to keep:"}</strong>
                </p>
                <div style="display:flex;flex-direction:column;gap:0.5rem;">
                    <div style="background:rgba(200,168,78,0.1);border:1px solid rgba(200,168,78,0.3);border-radius:4px;padding:0.4rem 0.6rem;">
                        <div style="font-weight:700;font-size:0.85rem;">Roll ${roll1}: ${title1}</div>
                        <div style="font-size:0.75rem;color:#a0a0a8;margin-top:2px;">${effect1}</div>
                    </div>
                    <div style="background:rgba(140,50,180,0.1);border:1px solid rgba(140,50,180,0.3);border-radius:4px;padding:0.4rem 0.6rem;">
                        <div style="font-weight:700;font-size:0.85rem;">Roll ${roll2}: ${title2}</div>
                        <div style="font-size:0.75rem;color:#a0a0a8;margin-top:2px;">${effect2}</div>
                    </div>
                </div>
            </div>
        `;

        return new Promise<1 | 2>((resolve) => {
            const dialog = new fa.api.DialogV2({
                window: {
                    title: game.i18n?.localize("DH2E.FavouredByTheWarp.Title") ?? "Favoured by the Warp",
                    icon: "fa-solid fa-dice",
                },
                content,
                buttons: [{
                    action: "first",
                    icon: "fas fa-dice-one",
                    label: `${game.i18n?.localize("DH2E.FavouredByTheWarp.Keep") ?? "Keep"} #1: ${title1}`,
                    callback: () => resolve(1),
                }, {
                    action: "second",
                    icon: "fas fa-dice-two",
                    label: `${game.i18n?.localize("DH2E.FavouredByTheWarp.Keep") ?? "Keep"} #2: ${title2}`,
                    callback: () => resolve(2),
                }],
                close: () => resolve(1),
                position: { width: 450 },
            });
            dialog.render({ force: true });
        });
    }
}

export { FocusPowerResolver };
