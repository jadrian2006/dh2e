import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { WarbandDH2e } from "@actor/warband/document.ts";
import DialogRoot from "./requisition-request-dialog-root.svelte";

export interface RequisitionRequestItem {
    itemData: object;
    itemName: string;
    craftsmanship: string;
    availability: string;
    /** Per-item target number (Influence + availMod + craftMod + background bonuses) */
    targetNumber: number;
    /** Whether this item passed the requisition roll */
    success: boolean;
    /** Degrees of success or failure for this item */
    degrees: number;
    /** Whether this item's failure cost 1 Influence (3+ DoF, individual mode only) */
    influenceLost: boolean;
    /** Per-item roll result (same as batch roll in bulk mode, separate in individual mode) */
    rollResult: number;
    /** Modifications attached to this item in the requisition */
    modifications: { uuid: string; name: string; availability: string; modifier: number }[];
}

export interface RequisitionRequestPayload {
    items: RequisitionRequestItem[];
    /** Free-text notes */
    notes: string;
    requestedBy: string;
    requestedFor: string;
    actorName: string;
    /** The raw d100 roll (bulk mode: single roll; individual mode: 0, check per-item) */
    rollResult: number;
    /** Roll mode used: "bulk" or "individual" */
    rollMode: "bulk" | "individual";
    /** Total Influence lost across all items */
    influenceLost: boolean;
    userId: string;
}

/**
 * Player-facing dialog for requesting items via the Requisition economy.
 * Supports compendium search or custom item entry.
 */
class RequisitionRequestDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-requisition-request",
        classes: ["dh2e", "dialog", "requisition-request-dialog"],
        position: { width: 460, height: 620 },
        window: { resizable: true, minimizable: false },
    });

    protected override root = DialogRoot;

    #actor: Actor | null;
    #warband: WarbandDH2e | null;

    constructor(actor: Actor | null, warband: WarbandDH2e | null) {
        super({});
        this.#actor = actor;
        this.#warband = warband;
    }

    override get title(): string {
        return game.i18n?.localize("DH2E.Requisition.RequestTitle") ?? "Requisition Request";
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        // Build availability options from config
        const availTiers = CONFIG.DH2E?.availabilityTiers ?? {};
        const availOptions = Object.entries(availTiers).map(([key, val]: [string, any]) => ({
            key,
            label: game.i18n?.localize(val.label) ?? key,
            modifier: val.modifier ?? 0,
        }));

        // Build craftsmanship options from config
        const craftTiers = CONFIG.DH2E?.craftsmanshipTiers ?? {};
        const craftOptions = Object.entries(craftTiers).map(([key, val]: [string, any]) => ({
            key,
            label: game.i18n?.localize(val.label) ?? key,
            modifier: val.modifier ?? 0,
        }));

        // Build compendium item index
        const compendiumItems = await this.#buildCompendiumIndex();

        const actorSys = (this.#actor as any)?.system;
        const influence = actorSys?.influence ?? 25;

        const rollMode = ((game as any).settings?.get(SYSTEM_ID, "requisitionRollMode") as string ?? "bulk") as "bulk" | "individual";

        return {
            ctx: {
                actor: this.#actor,
                influence,
                availOptions,
                craftOptions,
                compendiumItems,
                rollMode,
                onRoll: (params: {
                    items: { name: string; uuid?: string; type?: string; availability: string; craftsmanship: string; img?: string; modifications?: { uuid: string; name: string; availability: string; modifier: number }[] }[];
                    notes: string;
                }) => this.#handleRoll(params),
                onSendToGM: (payload: RequisitionRequestPayload) => this.#sendToGM(payload),
                close: () => this.close(),
            },
        };
    }

    /** Normalize a display-name availability (e.g. "Very Rare") to a config key (e.g. "veryRare") */
    static #normalizeAvailability(raw: string): string {
        if (!raw) return "common";
        // Already a valid config key?
        if (CONFIG.DH2E?.availabilityTiers?.[raw]) return raw;
        // Lowercase + strip spaces for comparison: "Very Rare" → "veryrare" matches "veryRare"
        const norm = raw.toLowerCase().replace(/[\s-]+/g, '');
        for (const key of Object.keys(CONFIG.DH2E?.availabilityTiers ?? {})) {
            if (key.toLowerCase() === norm) return key;
        }
        return "common";
    }

    /** Build a searchable index of items from compendium packs */
    async #buildCompendiumIndex(): Promise<{ name: string; uuid: string; type: string; availability: string; modType?: string; img: string }[]> {
        const g = game as any;
        const items: { name: string; uuid: string; type: string; availability: string; modType?: string; img: string }[] = [];
        const validTypes = new Set(["weapon", "armour", "gear", "ammunition", "cybernetic", "modification"]);

        for (const pack of g.packs ?? []) {
            if (pack.documentName !== "Item") continue;
            try {
                const index = await pack.getIndex({ fields: ["system.availability", "system.modType", "img"] });
                for (const entry of index) {
                    if (!validTypes.has(entry.type)) continue;
                    const sys = (entry as any).system ?? {};
                    items.push({
                        name: entry.name,
                        uuid: entry.uuid ?? `${pack.collection}.${entry._id}`,
                        type: entry.type,
                        availability: RequisitionRequestDialog.#normalizeAvailability(sys.availability ?? "common"),
                        modType: sys.modType,
                        img: (entry as any).img ?? "",
                    });
                }
            } catch {
                // Skip packs that can't be indexed
            }
        }
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }

    /** Compute per-item target number */
    #computeItemTN(item: { availability: string; craftsmanship: string; type?: string }, influence: number): { tn: number; mechanicusBonus: boolean } {
        const actorSynthetics = (this.#actor as any)?.synthetics;
        const hasMasterOfPaperwork = actorSynthetics?.rollOptions?.has("self:background:master-of-paperwork") ?? false;

        // Replace the Weak Flesh: check synthetics first, fall back to background name
        const hasReplaceWeakFlesh = actorSynthetics?.rollOptions?.has("self:background:replace-the-weak-flesh")
            ?? actorSynthetics?.rollOptions?.has("self:background:adeptus-mechanicus")
            ?? false;
        const backgroundName = (this.#actor as any)?.system?.details?.background ?? "";
        const isMechanicus = !hasReplaceWeakFlesh && /mechanicus/i.test(backgroundName);
        const mechanicusBonus = (hasReplaceWeakFlesh || isMechanicus) && item.type === "cybernetic";

        const availConfig = CONFIG.DH2E?.availabilityTiers?.[item.availability] as
            | { modifier: number } | undefined;
        const craftConfig = CONFIG.DH2E?.craftsmanshipTiers?.[item.craftsmanship] as
            | { modifier: number } | undefined;
        let mod = (availConfig?.modifier ?? 0) + (craftConfig?.modifier ?? 0);
        if (hasMasterOfPaperwork) mod += 10;
        if (mechanicusBonus) mod += 20;
        return { tn: influence + mod, mechanicusBonus };
    }

    /** Compute degrees of success/failure */
    static #computeDegrees(d100: number, tn: number): { success: boolean; degrees: number } {
        const success = d100 <= tn;
        const tnTens = Math.floor(tn / 10);
        const rollTens = Math.floor(d100 / 10);
        const degrees = success ? (tnTens - rollTens) + 1 : (rollTens - tnTens) + 1;
        return { success, degrees };
    }

    /** Roll a requisition test — bulk mode: one d100, per-item TNs */
    async #handleRoll(params: {
        items: { name: string; uuid?: string; type?: string; availability: string; craftsmanship: string; img?: string; modifications?: { uuid: string; name: string; availability: string; modifier: number }[] }[];
        notes: string;
    }): Promise<{
        rollResult: number;
        rollMode: "bulk" | "individual";
        perItem: { targetNumber: number; success: boolean; degrees: number; influenceLost: boolean; rollResult: number }[];
        influenceLost: boolean;
    } | null> {
        if (!this.#actor || params.items.length === 0) return null;

        const actorSys = (this.#actor as any).system;
        let influence = actorSys?.influence ?? 25;

        // Check for AttributeOverride on requisition domain
        const synthetics = (this.#actor as any).synthetics;
        if (synthetics) {
            const override = synthetics.attributeOverrides?.find((o: any) => o.domain === "requisition");
            if (override) {
                const overrideValue = actorSys?.characteristics?.[override.characteristic]?.value ?? 0;
                influence = Math.max(influence, overrideValue);
            }
        }

        const rollMode = ((game as any).settings?.get(SYSTEM_ID, "requisitionRollMode") as string ?? "bulk") as "bulk" | "individual";

        if (rollMode === "individual") {
            return this.#handleIndividualRolls(params, influence);
        }

        // --- Bulk mode: one d100 roll, compared to each item's TN ---
        const roll = new Roll("1d100");
        await roll.evaluate();
        const d100 = roll.total ?? 50;

        const perItem: { targetNumber: number; success: boolean; degrees: number; influenceLost: boolean; rollResult: number }[] = [];
        let anyInfluenceLost = false;

        for (const item of params.items) {
            // Sum modification availability modifiers into item TN
            const modMod = (item.modifications ?? []).reduce((sum, m) => sum + (m.modifier ?? 0), 0);
            const tn = this.#computeItemTN(item, influence).tn + modMod;
            const { success, degrees } = RequisitionRequestDialog.#computeDegrees(d100, tn);
            const itemInfluenceLost = !success && degrees >= 3;
            if (itemInfluenceLost) anyInfluenceLost = true;
            perItem.push({ targetNumber: tn, success, degrees, influenceLost: itemInfluenceLost, rollResult: d100 });
        }

        // Bulk mode: worst failure determines Influence loss (lose 1 if any item has 3+ DoF)
        if (anyInfluenceLost) {
            const newInfluence = Math.max(0, influence - 1);
            await (this.#actor as any).update({ "system.influence": newInfluence });
        }

        return { rollResult: d100, rollMode: "bulk", perItem, influenceLost: anyInfluenceLost };
    }

    /** Individual roll mode: separate d100 per item */
    async #handleIndividualRolls(params: {
        items: { name: string; uuid?: string; type?: string; availability: string; craftsmanship: string; img?: string; modifications?: { uuid: string; name: string; availability: string; modifier: number }[] }[];
        notes: string;
    }, influence: number): Promise<{
        rollResult: number;
        rollMode: "bulk" | "individual";
        perItem: { targetNumber: number; success: boolean; degrees: number; influenceLost: boolean; rollResult: number }[];
        influenceLost: boolean;
    }> {
        const perItem: { targetNumber: number; success: boolean; degrees: number; influenceLost: boolean; rollResult: number }[] = [];
        let totalInfluenceLoss = 0;

        for (const item of params.items) {
            const modMod = (item.modifications ?? []).reduce((sum, m) => sum + (m.modifier ?? 0), 0);
            const tn = this.#computeItemTN(item, influence).tn + modMod;
            const roll = new Roll("1d100");
            await roll.evaluate();
            const d100 = roll.total ?? 50;
            const { success, degrees } = RequisitionRequestDialog.#computeDegrees(d100, tn);
            const itemInfluenceLost = !success && degrees >= 3;
            if (itemInfluenceLost) totalInfluenceLoss++;
            perItem.push({ targetNumber: tn, success, degrees, influenceLost: itemInfluenceLost, rollResult: d100 });
        }

        if (totalInfluenceLoss > 0) {
            const newInfluence = Math.max(0, influence - totalInfluenceLoss);
            await (this.#actor as any).update({ "system.influence": newInfluence });
        }

        return { rollResult: 0, rollMode: "individual", perItem, influenceLost: totalInfluenceLoss > 0 };
    }

    /** Send the requisition request to the GM via socket */
    #sendToGM(payload: RequisitionRequestPayload): void {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "requisitionRequest",
            payload,
        });
        const names = payload.items.map(i => i.itemName).join(", ");
        ui.notifications.info(
            game.i18n.format("DH2E.Requisition.SendRequest", { name: names }),
        );
        this.close();
    }

    /** Open the dialog for a given actor and warband */
    static open(actor: Actor | null, warband?: WarbandDH2e | null): void {
        new RequisitionRequestDialog(actor, warband ?? null).render(true);
    }
}

export { RequisitionRequestDialog };
