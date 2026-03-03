import type { FocusPowerContext, FocusPowerResult, PsykerMode } from "./types.ts";
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
class FocusPowerResolver {
    static async resolve(context: FocusPowerContext): Promise<FocusPowerResult | null> {
        const actor = context.actor as any;
        const power = context.power as any;
        const charKey = (context.focusCharacteristic || "wp") as CharacteristicAbbrev;
        const psyRating = context.psyRating;

        // Default mode to unfettered if not set (dialog will let user choose)
        const mode: PsykerMode = context.mode ?? "unfettered";

        // Effective PR for power effects (damage, range, etc.)
        // Unfettered: PR as chosen. Pushed: PR + extras (phenomena always triggered).
        const effectivePR = psyRating;

        // Per RAW: +10 to Focus Power test for each PR level below your max you manifest at.
        // Currently casts at full PR, so the bonus is (maxPR - castingPR) * 10 = 0.
        // TODO: Add PR level selector when casting below max PR.
        const prBonus = 0;

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
        if (prBonus !== 0) {
            modifiers.push(new ModifierDH2e({
                label: game.i18n?.localize("DH2E.Psychic.PRBonus") ?? "Reduced PR",
                value: prBonus,
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

        // Check for Psychic Phenomena
        let phenomenaTriggered = false;
        if (mode === "pushed") {
            phenomenaTriggered = true;
        } else {
            // Unfettered: check for doubles (tens digit == units digit)
            const d100 = checkResult.roll;
            const tens = Math.floor(d100 / 10) % 10;
            const units = d100 % 10;
            if (tens === units) {
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

        // Roll phenomena if triggered
        if (phenomenaTriggered) {
            const automate = (game as any).settings?.get?.(SYSTEM_ID, "automatePhenomena") ?? true;
            if (automate) {
                const phResult = await rollPhenomena(mode === "pushed");
                let phenomenaRoll = phResult.roll;

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
        const DialogClass = (globalThis as any).Dialog;
        if (!DialogClass) return 0;

        const promptText = game.i18n?.format("DH2E.ConstantThreat.Prompt", {
            character: characterName,
            roll: String(rawRoll),
            wpBonus: String(wpBonus),
        }) ?? `${characterName} can adjust the Phenomena roll (${rawRoll}) by up to ±${wpBonus} (WP Bonus).`;

        return new Promise<number>((resolve) => {
            new DialogClass({
                title: game.i18n?.localize("DH2E.ConstantThreat.Title") ?? "The Constant Threat",
                content: `
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
                `,
                buttons: {
                    adjust: {
                        icon: '<i class="fas fa-sliders-h"></i>',
                        label: game.i18n?.localize("DH2E.ConstantThreat.Apply") ?? "Adjust Roll",
                        callback: (html: any) => {
                            const input = html.find ? html.find("[name=adjustment]") : html.querySelector("[name=adjustment]");
                            const val = parseInt(input?.val?.() ?? input?.value ?? "0", 10) || 0;
                            resolve(Math.max(-wpBonus, Math.min(wpBonus, val)));
                        },
                    },
                    skip: {
                        icon: '<i class="fas fa-forward"></i>',
                        label: game.i18n?.localize("DH2E.ConstantThreat.Skip") ?? "No Adjustment",
                        callback: () => resolve(0),
                    },
                },
                default: "skip",
                close: () => resolve(0),
            }).render(true);
        });
    }
}

export { FocusPowerResolver };
