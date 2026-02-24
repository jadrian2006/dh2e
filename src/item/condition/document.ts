import { ItemDH2e } from "@item/base/document.ts";
import { DH2E_STATUS_EFFECTS } from "@scripts/config/status-effects.ts";

/** Condition item — status effects (stunned, bleeding, etc.) */
class ConditionDH2e extends ItemDH2e {
    /** Get the condition slug from system data */
    get slug(): string {
        return (this.system as any)?.slug ?? "";
    }

    /**
     * When a condition is created on an actor, sync the matching
     * status effect overlay to the actor's token(s).
     */
    override _onCreate(
        data: Record<string, unknown>,
        options: Record<string, unknown>,
        userId: string,
    ): void {
        super._onCreate(data, options, userId);
        if ((game as any).user?.id !== userId) return;
        void this.#syncTokenEffect(true);
    }

    /**
     * When a condition is deleted from an actor, remove the matching
     * status effect overlay from the actor's token(s).
     */
    override _onDelete(
        options: Record<string, unknown>,
        userId: string,
    ): void {
        super._onDelete(options, userId);
        if ((game as any).user?.id !== userId) return;
        void this.#syncTokenEffect(false);
    }

    /**
     * Toggle the matching status effect on the actor's active tokens.
     * Uses Foundry's built-in `token.toggleActiveEffect()`.
     */
    async #syncTokenEffect(active: boolean): Promise<void> {
        const actor = this.parent as Actor | null;
        if (!actor) return;

        const slug = this.slug;
        if (!slug) return;

        // Find the matching status effect definition
        const effectDef = DH2E_STATUS_EFFECTS.find((e) => e.id === slug);
        if (!effectDef) return;

        // Get all active tokens for this actor
        const tokens = (actor as any).getActiveTokens?.() ?? [];

        for (const token of tokens) {
            if (typeof token.toggleActiveEffect !== "function") continue;

            try {
                // toggleActiveEffect expects the effect icon path and active state
                await token.toggleActiveEffect(
                    { id: effectDef.id, icon: effectDef.icon, label: effectDef.label },
                    { active },
                );
            } catch (e) {
                console.warn(`DH2E | Failed to sync token effect "${slug}" for ${actor.name}`, e);
            }
        }
    }
}

export { ConditionDH2e };
