import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { WarbandDH2e } from "@actor/warband/document.ts";
import DialogRoot from "./requisition-request-dialog-root.svelte";

export interface RequisitionRequestPayload {
    itemData: object;
    itemName: string;
    craftsmanship: string;
    modifications: string;
    requestedBy: string;
    requestedFor: string;
    actorName: string;
    availability: string;
    rollResult: number;
    targetNumber: number;
    success: boolean;
    degrees: number;
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
        position: { width: 460, height: "auto" as const },
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

        return {
            ctx: {
                actor: this.#actor,
                influence,
                availOptions,
                craftOptions,
                compendiumItems,
                onRoll: (params: {
                    itemName: string;
                    availability: string;
                    craftsmanship: string;
                    modifications: string;
                    itemData: object | null;
                }) => this.#handleRoll(params),
                onSendToGM: (payload: RequisitionRequestPayload) => this.#sendToGM(payload),
                close: () => this.close(),
            },
        };
    }

    /** Build a searchable index of items from compendium packs */
    async #buildCompendiumIndex(): Promise<{ name: string; uuid: string; type: string; availability: string; img: string }[]> {
        const g = game as any;
        const items: { name: string; uuid: string; type: string; availability: string; img: string }[] = [];
        const validTypes = new Set(["weapon", "armour", "gear", "ammunition", "cybernetic"]);

        for (const pack of g.packs ?? []) {
            if (pack.documentName !== "Item") continue;
            try {
                const index = await pack.getIndex({ fields: ["system.availability", "img"] });
                for (const entry of index) {
                    if (!validTypes.has(entry.type)) continue;
                    items.push({
                        name: entry.name,
                        uuid: entry.uuid ?? `${pack.collection}.${entry._id}`,
                        type: entry.type,
                        availability: (entry as any).system?.availability ?? "common",
                        img: (entry as any).img ?? "",
                    });
                }
            } catch {
                // Skip packs that can't be indexed
            }
        }
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }

    /** Roll a requisition test and return the result */
    async #handleRoll(params: {
        itemName: string;
        availability: string;
        craftsmanship: string;
        modifications: string;
        itemData: object | null;
    }): Promise<{
        rollResult: number;
        targetNumber: number;
        success: boolean;
        degrees: number;
        influenceLost: boolean;
    } | null> {
        if (!this.#actor) return null;

        const actorSys = (this.#actor as any).system;
        const influence = actorSys?.influence ?? 25;

        const availConfig = CONFIG.DH2E?.availabilityTiers?.[params.availability] as
            | { modifier: number } | undefined;
        const availMod = availConfig?.modifier ?? 0;

        const craftConfig = CONFIG.DH2E?.craftsmanshipTiers?.[params.craftsmanship] as
            | { modifier: number } | undefined;
        const craftMod = craftConfig?.modifier ?? 0;

        const totalMod = availMod + craftMod;
        const targetNumber = Math.max(1, Math.min(100, influence + totalMod));

        // Roll d100
        const roll = new Roll("1d100");
        await roll.evaluate();
        const d100 = roll.total ?? 50;

        const success = d100 <= targetNumber;
        const targetTens = Math.floor(targetNumber / 10);
        const rollTens = Math.floor(d100 / 10);
        const degrees = success ? (targetTens - rollTens) + 1 : (rollTens - targetTens) + 1;

        // Check for Influence loss (3+ DoF on failure)
        const influenceLost = !success && degrees >= 3;
        if (influenceLost) {
            let loss = 1;
            // Highborn: Breeding Counts — reduce influence loss by 1 (to a minimum reduction of 1)
            if ((this.#actor as any).synthetics?.rollOptions?.has("self:homeworld:breeding-counts")) {
                loss = Math.max(1, loss - 1);
            }
            const newInfluence = Math.max(0, influence - loss);
            await (this.#actor as any).update({ "system.influence": newInfluence });
        }

        return { rollResult: d100, targetNumber, success, degrees, influenceLost };
    }

    /** Send the requisition request to the GM via socket */
    #sendToGM(payload: RequisitionRequestPayload): void {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "requisitionRequest",
            payload,
        });
        ui.notifications.info(
            game.i18n.format("DH2E.Requisition.SendRequest", { name: payload.itemName }),
        );
        this.close();
    }

    /** Open the dialog for a given actor and warband */
    static open(actor: Actor | null, warband?: WarbandDH2e | null): void {
        new RequisitionRequestDialog(actor, warband ?? null).render(true);
    }
}

export { RequisitionRequestDialog };
