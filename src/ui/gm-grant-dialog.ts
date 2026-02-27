/**
 * GM-only dialog to force-grant elite advances, talents, or skills to any player at 0 XP cost.
 * Supports an optional flavor text popup sent to the receiving player.
 *
 * Usage: game.dh2e.grantAdvance() or macro button.
 */

import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import { executeElitePurchase, grantTalent, grantSkill, type EliteAdvanceDef } from "@advancement/elite-purchase.ts";
import { appendLog } from "@actor/log.ts";
import type { AcolyteDH2e } from "@actor/acolyte/document.ts";
import GMGrantDialogRoot from "./gm-grant-dialog-root.svelte";

export type GrantType = "elite" | "talent" | "skill";

export interface GrantableItem {
    id: string;
    name: string;
    sublabel: string;
}

class GMGrantDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-gm-grant-dialog",
        classes: ["dh2e", "dialog", "gm-grant-dialog"],
        position: { width: 480, height: 560 },
        window: { resizable: true, minimizable: true },
    });

    protected override root = GMGrantDialogRoot;

    /** Cached elite advance definitions */
    static #eliteAdvanceData: EliteAdvanceDef[] = [];
    static #eliteDataLoaded = false;

    static async #loadEliteAdvances(): Promise<void> {
        if (GMGrantDialog.#eliteDataLoaded) return;
        // Use the canonical definitions from AdvancementShop
        const { AdvancementShop } = await import("@advancement/shop.ts");
        GMGrantDialog.#eliteAdvanceData = AdvancementShop.ELITE_ADVANCES;
        GMGrantDialog.#eliteDataLoaded = true;
    }

    override get title(): string {
        return game.i18n.localize("DH2E.GMGrant.Title");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        await GMGrantDialog.#loadEliteAdvances();

        // Get all acolyte actors
        const g = game as any;
        const actors: { id: string; name: string }[] = [];
        for (const actor of g.actors ?? []) {
            if (actor.type === "acolyte") {
                actors.push({ id: actor.id, name: actor.name });
            }
        }
        actors.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return {
            ctx: {
                actors,
                getItems: (actorId: string, type: GrantType) =>
                    this.#getGrantableItems(actorId, type),
                doGrant: (actorId: string, type: GrantType, itemId: string, flavorText: string) =>
                    this.#doGrant(actorId, type, itemId, flavorText),
            },
        };
    }

    /** Build the list of grantable items for a given actor + type */
    async #getGrantableItems(actorId: string, type: GrantType): Promise<GrantableItem[]> {
        const g = game as any;
        const actor = g.actors?.get(actorId) as AcolyteDH2e | undefined;
        if (!actor) return [];

        if (type === "elite") {
            const owned: string[] = (actor.system as any).eliteAdvances ?? [];
            return GMGrantDialog.#eliteAdvanceData
                .filter((a) => !owned.includes(a.id))
                .map((a) => ({ id: a.id, name: a.name, sublabel: `${a.cost} XP` }));
        }

        if (type === "talent") {
            const ownedNames = new Set<string>();
            for (const item of actor.items) {
                if (item.type === "talent") ownedNames.add(item.name.toLowerCase());
            }
            const { getPacksOfType } = await import("@util/pack-discovery.ts");
            const items: GrantableItem[] = [];
            for (const packId of getPacksOfType("talents")) {
                const pack = g.packs?.get(packId);
                if (!pack) continue;
                for (const entry of pack.index) {
                    const meta = entry as any;
                    if (ownedNames.has(meta.name.toLowerCase())) continue;
                    const tier = meta.system?.tier ?? 1;
                    items.push({ id: meta.name, name: meta.name, sublabel: `Tier ${tier}` });
                }
            }
            items.sort((a, b) => a.name.localeCompare(b.name));
            return items;
        }

        if (type === "skill") {
            const { getPacksOfType: getSkillPacks } = await import("@util/pack-discovery.ts");
            const items: GrantableItem[] = [];
            for (const packId of getSkillPacks("skills")) {
                const pack = g.packs?.get(packId);
                if (!pack) continue;
                for (const entry of pack.index) {
                    const meta = entry as any;
                    const sys = meta.system ?? {};
                    const spec: string = sys.specialization ?? "";
                    const name = spec ? `${meta.name} (${spec})` : meta.name;

                    // Check current advancement on actor
                    const existing = actor.items.find((i: Item) => {
                        if (i.type !== "skill") return false;
                        const iSys = i.system as any;
                        const iSpec = iSys.specialization ?? "";
                        if (spec) return i.name.toLowerCase() === meta.name.toLowerCase() && iSpec.toLowerCase() === spec.toLowerCase();
                        return i.name.toLowerCase() === meta.name.toLowerCase() && !iSpec;
                    });
                    const advancement: number = existing ? ((existing.system as any).advancement ?? 0) : 0;
                    if (advancement >= 4) continue;

                    const rankNames = ["Known", "Trained (+10)", "Experienced (+20)", "Veteran (+30)"];
                    const sublabel = existing ? `→ ${rankNames[advancement]}` : "→ Known";
                    items.push({ id: name, name, sublabel });
                }
            }
            items.sort((a, b) => a.name.localeCompare(b.name));
            return items;
        }

        return [];
    }

    /** Execute the grant */
    async #doGrant(actorId: string, type: GrantType, itemId: string, flavorText: string): Promise<void> {
        const g = game as any;
        if (!g.user?.isGM) {
            ui.notifications.error(game.i18n.localize("DH2E.GMGrant.GMOnly"));
            return;
        }

        const actor = g.actors?.get(actorId) as AcolyteDH2e | undefined;
        if (!actor) return;

        const gmName = g.user?.name ?? "GM";

        if (type === "elite") {
            const advDef = GMGrantDialog.#eliteAdvanceData.find((a) => a.id === itemId);
            if (!advDef) return;
            await executeElitePurchase(actor, advDef, 0, gmName);
        } else if (type === "talent") {
            await grantTalent(actor, itemId, gmName);
        } else if (type === "skill") {
            await grantSkill(actor, itemId, gmName);
        }

        // Post chat message
        const advanceName = type === "elite"
            ? (GMGrantDialog.#eliteAdvanceData.find((a) => a.id === itemId)?.name ?? itemId)
            : itemId;
        const speaker = fd.ChatMessage.getSpeaker?.() ?? { alias: gmName };
        let content = `<div class="dh2e chat-card system-note">${game.i18n.format("DH2E.GMGrant.ChatMessage", { gm: gmName, advance: advanceName, actor: actor.name })}`;
        if (flavorText.trim()) {
            content += `<p style="font-style: italic; color: var(--dh2e-gold, #c8a84e); margin-top: 0.25rem;">"${flavorText.trim()}"</p>`;
        }
        content += `</div>`;
        await fd.ChatMessage.create({ content, speaker });

        // Send flavor text popup to the owning player
        if (flavorText.trim()) {
            // Find the user who owns this actor
            const ownerUser = g.users?.find((u: any) =>
                !u.isGM && actor.testUserPermission(u, "OWNER"),
            );
            if (ownerUser?.active) {
                g.socket.emit(`system.${SYSTEM_ID}`, {
                    type: "gmGrantFlavor",
                    payload: {
                        userId: ownerUser.id,
                        advanceName,
                        actorName: actor.name,
                        flavorText: flavorText.trim(),
                    },
                });
            }
        }

        ui.notifications.info(
            game.i18n.format("DH2E.GMGrant.Success", { advance: advanceName, actor: actor.name }),
        );

        // Re-render to update available items
        this.render();
    }

    /** Factory: open the GM Grant Dialog */
    static open(): void {
        const g = game as any;
        if (!g.user?.isGM) {
            ui.notifications.error(game.i18n.localize("DH2E.GMGrant.GMOnly"));
            return;
        }
        new GMGrantDialog().render(true);
    }
}

export { GMGrantDialog };
