import type { FocusPowerContext, FocusPowerResult, PsykerMode } from "./types.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";
import { CheckDH2e } from "@check/check.ts";
import { ModifierDH2e } from "@rules/modifier.ts";
import { rollPhenomena, rollPerils } from "./tables.ts";
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

        // PR multiplier: unfettered = x5, pushed = x10
        const prMultiplier = mode === "pushed" ? 10 : 5;
        const effectivePR = psyRating * prMultiplier;

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
        modifiers.push(new ModifierDH2e({
            label: `PR ${psyRating} (${mode === "pushed" ? "x10" : "x5"})`,
            value: effectivePR,
            source: "Psy Rating",
        }));

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
                result.phenomenaEntry = phResult.entry;

                // Check if it escalates to Perils
                if (phResult.entry?.escalate) {
                    const perilResult = await rollPerils();
                    result.perilsEntry = perilResult.entry;
                }

                await FocusPowerResolver.#postPhenomenaCard(result, actor);
            }
        }

        return result;
    }

    static async #postFocusPowerCard(result: FocusPowerResult, power: any): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/focus-power-card.hbs`;
        const templateData = {
            powerName: power.name,
            discipline: power.system?.discipline ?? "",
            success: result.checkResult.dos.success,
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
            description: power.system?.description ?? "",
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
                        success: result.checkResult.dos.success,
                        degrees: result.checkResult.dos.degrees,
                        mode: result.mode,
                        phenomenaTriggered: result.phenomenaTriggered,
                    },
                },
            },
        });
    }

    static async #postPhenomenaCard(result: FocusPowerResult, actor: any): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/chat/phenomena-card.hbs`;

        const isPerils = !!result.perilsEntry;
        const entry = isPerils ? result.perilsEntry : result.phenomenaEntry;

        const templateData = {
            isPerils,
            title: entry?.title ?? "Unknown",
            description: entry?.description ?? "",
            effect: entry?.effect ?? "",
            damage: isPerils ? result.perilsEntry?.damage ?? "" : "",
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
                    },
                },
            },
        });
    }
}

export { FocusPowerResolver };
