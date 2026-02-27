import { DIVINATION_EFFECTS } from "@character-creation/wizard.ts";
import type { DivinationSessionEffect } from "@character-creation/wizard.ts";

/** Human-readable descriptions for each session effect type */
const SESSION_DESCRIPTIONS: Record<string, { trigger: string; action: string }> = {
    "corruption-mod": {
        trigger: "gains or loses Corruption",
        action: "modify corruption",
    },
    "insanity-mod": {
        trigger: "gains or loses Insanity",
        action: "modify insanity",
    },
    "fatigue-mod": {
        trigger: "gains Fatigue",
        action: "reduce fatigue by 1",
    },
    "critical-immunity": {
        trigger: "suffers Critical Damage",
        action: "Roll d10; on a 10, ignore all Critical Effects of that wound",
    },
    "awareness-reroll": {
        trigger: "makes an Awareness test to avoid Surprise",
        action: "May re-roll the failed Awareness test",
    },
    "damage-reaction": {
        trigger: "takes damage for the first time",
        action: "Gain +20 to the next test before the end of next turn",
    },
    "fate-survival": {
        trigger: "burns a Fate Point to survive",
        action: "Roll d10; on a 10, Fate Threshold is not reduced",
    },
};

/**
 * Handles divination session effects — posts GM approval or reminder cards
 * when a divination-relevant event fires.
 */
class DivinationSessionHandler {
    /** Look up the session effect for an actor's divination matching a given trigger */
    static checkForEffect(
        actor: any,
        trigger: "corruption" | "insanity" | "fatigue" | "critical" | "awareness" | "damage" | "fate-burn",
    ): { effect: DivinationSessionEffect; divText: string } | null {
        const divText = actor.system?.details?.divination as string;
        if (!divText) return null;

        const fx = DIVINATION_EFFECTS[divText];
        if (!fx?.sessionEffect) return null;

        const effect = fx.sessionEffect;
        const typeMap: Record<string, string[]> = {
            corruption: ["corruption-mod"],
            insanity: ["insanity-mod"],
            fatigue: ["fatigue-mod"],
            critical: ["critical-immunity"],
            awareness: ["awareness-reroll"],
            damage: ["damage-reaction"],
            "fate-burn": ["fate-survival"],
        };

        const validTypes = typeMap[trigger] ?? [];
        if (!validTypes.includes(effect.type)) return null;

        return { effect, divText };
    }

    /** Check if a session effect has already been used this session */
    static isUsedThisSession(actor: any, effectType: string): boolean {
        const key = DivinationSessionHandler.#sessionKey();
        return actor.getFlag("dh2e", `divinationUsed.${key}.${effectType}`) === true;
    }

    /** Mark a session effect as used */
    static async markUsed(actor: any, effectType: string): Promise<void> {
        const key = DivinationSessionHandler.#sessionKey();
        await actor.setFlag("dh2e", `divinationUsed.${key}.${effectType}`, true);
    }

    /**
     * Post a GM-only approval chat card with an "Apply" button.
     * Used for corruption/insanity/fatigue modifiers.
     */
    static async postApprovalCard(
        actor: any,
        divText: string,
        effect: DivinationSessionEffect,
        context: { field: string; delta: number },
    ): Promise<void> {
        const desc = SESSION_DESCRIPTIONS[effect.type];
        const modifier = effect.modifier ?? 0;
        const modLabel = modifier > 0 ? `+${modifier}` : String(modifier);
        const action = modifier > 0 ? "increase" : "reduction";

        const content = `<div class="dh2e chat-card divination-card">
            <header class="card-header divination">
                <i class="fa-solid fa-sun"></i>
                <h3>Emperor's Divination</h3>
            </header>
            <div class="card-body">
                <p class="divination-quote"><em>"${divText}"</em></p>
                <p><strong>${actor.name}</strong> ${desc?.trigger ?? "triggers a session effect"}.</p>
                <p>First time each session: apply ${modLabel} ${context.field} ${action}.</p>
                <div class="card-actions">
                    <button class="apply-divination-btn" data-action="apply-divination"
                        data-actor-id="${actor.id}"
                        data-field="${context.field}"
                        data-modifier="${modifier}"
                        data-effect-type="${effect.type}">
                        <i class="fa-solid fa-check"></i> Apply ${action.charAt(0).toUpperCase() + action.slice(1)}
                    </button>
                </div>
            </div>
        </div>`;

        const g = game as any;
        await fd.ChatMessage.create({
            content,
            whisper: [g.user?.id].filter(Boolean),
            flags: {
                [SYSTEM_ID]: {
                    type: "divination-session",
                    actorId: actor.id,
                    effectType: effect.type,
                    field: context.field,
                    modifier,
                },
            },
        });
    }

    /**
     * Post an informational reminder card (no Apply button).
     * Used for complex effects like critical immunity, awareness reroll, etc.
     */
    static async postReminder(
        actor: any,
        divText: string,
        effect: DivinationSessionEffect,
    ): Promise<void> {
        const desc = SESSION_DESCRIPTIONS[effect.type];

        const content = `<div class="dh2e chat-card divination-card reminder">
            <header class="card-header divination">
                <i class="fa-solid fa-sun"></i>
                <h3>Emperor's Divination</h3>
            </header>
            <div class="card-body">
                <p class="divination-quote"><em>"${divText}"</em></p>
                <p><strong>${actor.name}</strong>: ${desc?.action ?? "has a session effect"}.</p>
            </div>
        </div>`;

        const g = game as any;
        await fd.ChatMessage.create({
            content,
            whisper: [g.user?.id].filter(Boolean),
            flags: {
                [SYSTEM_ID]: {
                    type: "divination-reminder",
                    actorId: actor.id,
                    effectType: effect.type,
                },
            },
        });
    }

    /**
     * Handle the "Apply" button click from a divination approval card.
     * Adjusts the actor's value and marks the effect as used.
     */
    static async handleApply(
        message: any,
        btn: HTMLButtonElement,
    ): Promise<void> {
        const g = game as any;
        if (!g.user?.isGM) return;

        const actorId = btn.dataset.actorId;
        const field = btn.dataset.field;
        const modifier = parseInt(btn.dataset.modifier ?? "0");
        const effectType = btn.dataset.effectType;

        if (!actorId || !field || !effectType) return;

        const actor = g.actors?.get(actorId);
        if (!actor) {
            ui.notifications?.warn("Could not find the actor.");
            return;
        }

        // Check if already used (in case of duplicate clicks)
        if (DivinationSessionHandler.isUsedThisSession(actor, effectType)) {
            ui.notifications?.info("This divination effect has already been used this session.");
            return;
        }

        // Apply the modifier
        const systemPath = `system.${field}`;
        const currentVal = fu.getProperty(actor, systemPath) as number ?? 0;
        const newVal = Math.max(0, currentVal + modifier);
        await actor.update({ [systemPath]: newVal });

        // Mark as used
        await DivinationSessionHandler.markUsed(actor, effectType);

        // Update the chat card to show "Applied" state
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Applied';
        btn.style.opacity = "0.5";

        // Also update message flags so it persists across re-renders
        await message.update({
            [`flags.${SYSTEM_ID}.applied`]: true,
        });
    }

    /**
     * Process a value change and check for applicable divination session effects.
     * Called from _onUpdate on the acolyte document.
     */
    static async onValueChanged(
        actor: any,
        field: "corruption" | "insanity" | "fatigue",
        oldVal: number,
        newVal: number,
    ): Promise<void> {
        const result = DivinationSessionHandler.checkForEffect(actor, field);
        if (!result) return;

        const { effect, divText } = result;

        // Skip if already used this session
        if (DivinationSessionHandler.isUsedThisSession(actor, effect.type)) return;

        if (effect.reminderOnly) {
            await DivinationSessionHandler.postReminder(actor, divText, effect);
            await DivinationSessionHandler.markUsed(actor, effect.type);
        } else {
            await DivinationSessionHandler.postApprovalCard(actor, divText, effect, {
                field,
                delta: newVal - oldVal,
            });
        }
    }

    /** Session key derived from warband date or real-world date */
    static #sessionKey(): string {
        const warband = (game as any).dh2e?.warband;
        const warbandDate = warband?.system?.chronicle?.currentDate;
        if (warbandDate) return String(warbandDate);
        // Fallback to real-world date string (resets daily)
        return new Date().toISOString().slice(0, 10);
    }
}

export { DivinationSessionHandler };
