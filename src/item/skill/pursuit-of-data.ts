/**
 * Pursuit of Data — Research Station homeworld bonus (Enemies Without).
 * When a character gains Rank 2 (Trained) in a Scholastic Lore skill,
 * the GM is prompted to grant a related Forbidden Lore at Rank 1 (Known).
 */

import { getAllIndexesOfType, findInAllPacks } from "@util/pack-discovery.ts";
import { recordTransaction } from "@advancement/xp-ledger.ts";
import { appendLog } from "@actor/log.ts";

class PursuitOfDataHandler {
    /**
     * Entry point: called when a Scholastic Lore skill reaches Rank 2
     * on an actor with the `self:homeworld:pursuit-of-data` roll option.
     */
    static async onScholasticLoreTrained(
        actor: Actor,
        triggerSkillName: string,
    ): Promise<void> {
        if (!(game as any).user?.isGM) return;

        // Load all Forbidden Lore specializations from packs
        const allSkills = await getAllIndexesOfType("skills");
        const forbiddenLores = allSkills.filter(s => s.name.startsWith("Forbidden Lore"));

        // Determine which Forbidden Lore specializations the actor already owns
        const ownedFL = new Set<string>();
        for (const item of actor.items) {
            if ((item as any).type === "skill" && item.name.startsWith("Forbidden Lore")) {
                ownedFL.add(item.name.toLowerCase());
            }
        }

        // Build dropdown options — unique specializations, marking owned as disabled
        const seen = new Set<string>();
        const options: { name: string; specialization: string; disabled: boolean }[] = [];
        for (const fl of forbiddenLores) {
            const lc = fl.name.toLowerCase();
            if (seen.has(lc)) continue;
            seen.add(lc);
            const spec = fl.system?.specialization ?? fl.name.replace(/^Forbidden Lore\s*\(?\s*/, "").replace(/\)\s*$/, "");
            options.push({
                name: fl.name,
                specialization: spec,
                disabled: ownedFL.has(lc),
            });
        }
        options.sort((a, b) => a.specialization.localeCompare(b.specialization));

        const optionsHtml = options.map(o =>
            `<option value="${o.name}" ${o.disabled ? "disabled" : ""}>${o.specialization}${o.disabled ? " ✓" : ""}</option>`,
        ).join("");

        const i18n = game.i18n;
        const prompt = i18n.format("DH2E.PursuitOfData.Prompt", {
            actor: actor.name,
            skill: triggerSkillName,
        });

        const result = await new Promise<string | null>((resolve) => {
            new fa.api.DialogV2({
                window: {
                    title: i18n.localize("DH2E.PursuitOfData.Title"),
                    icon: "fa-solid fa-book-skull",
                },
                content: `
                    <form class="dh2e pursuit-of-data-form" style="display:flex;flex-direction:column;gap:8px;padding:8px 0;">
                        <p>${prompt}</p>
                        <div class="form-group">
                            <label>${i18n.localize("DH2E.PursuitOfData.SelectLore")}</label>
                            <select name="forbiddenLore">${optionsHtml}</select>
                        </div>
                        <div class="form-group">
                            <label>${i18n.localize("DH2E.PursuitOfData.CustomLore")}</label>
                            <input type="text" name="customLore" placeholder="${i18n.localize("DH2E.PursuitOfData.CustomPlaceholder")}" />
                        </div>
                    </form>
                `,
                buttons: [
                    {
                        action: "grant",
                        label: i18n.localize("DH2E.PursuitOfData.Grant"),
                        icon: "fa-solid fa-check",
                        default: true,
                        callback: (_event: any, _button: any, dialog: any) => {
                            const form = dialog.element.querySelector("form");
                            if (!form) { resolve(null); return; }
                            const formData = new FormData(form);
                            const custom = (formData.get("customLore") as string)?.trim();
                            if (custom) {
                                resolve(`Forbidden Lore (${custom})`);
                            } else {
                                resolve(formData.get("forbiddenLore") as string);
                            }
                        },
                    },
                    {
                        action: "deny",
                        label: i18n.localize("DH2E.PursuitOfData.Deny"),
                        icon: "fa-solid fa-xmark",
                        callback: () => resolve(null),
                    },
                ],
                position: { width: 420 },
            }).render(true);
        });

        if (!result) return;
        await this.#grantForbiddenLore(actor, result, triggerSkillName);
    }

    /** Grant a Forbidden Lore skill at Rank 1 to the actor. */
    static async #grantForbiddenLore(
        actor: Actor,
        forbiddenLoreName: string,
        triggerSkillName: string,
    ): Promise<void> {
        // Check if already owned (race condition guard for multiple GMs)
        const existing = actor.items.find((i: Item) =>
            i.type === "skill" && i.name.toLowerCase() === forbiddenLoreName.toLowerCase(),
        );
        if (existing) {
            ui.notifications.warn(
                game.i18n.format("DH2E.PursuitOfData.AlreadyKnown", {
                    actor: actor.name,
                    skill: forbiddenLoreName,
                }),
            );
            return;
        }

        // Try to clone from compendium packs first
        const packDoc = await findInAllPacks("skills", forbiddenLoreName);
        let itemData: Record<string, unknown>;
        if (packDoc) {
            itemData = (packDoc as any).toObject();
            (itemData.system as Record<string, unknown>).advancement = 1;
        } else {
            // Custom Forbidden Lore — create from scratch
            const specMatch = forbiddenLoreName.match(/^Forbidden Lore\s*\((.+)\)$/);
            const specialization = specMatch ? specMatch[1] : forbiddenLoreName;
            itemData = {
                name: forbiddenLoreName,
                type: "skill",
                img: "systems/dh2e/icons/items/skill.svg",
                system: {
                    description: "",
                    linkedCharacteristic: "int",
                    advancement: 1,
                    isSpecialist: true,
                    specialization,
                    aptitude: "Knowledge",
                    uses: [],
                },
            };
        }

        await actor.createEmbeddedDocuments("Item", [itemData]);

        // Record 0-cost XP transaction and actor log
        const timestamp = Date.now();
        await recordTransaction(actor, {
            timestamp,
            category: "skill",
            label: `${forbiddenLoreName} (Pursuit of Data)`,
            cost: 0,
            matchCount: 0,
        });
        await appendLog(actor, {
            timestamp,
            type: "gm-grant",
            label: game.i18n.format("DH2E.GMGrant.LogEntry", { advance: forbiddenLoreName }),
            amount: 0,
            who: (game as any).user?.name,
        });

        // Notification
        ui.notifications.info(
            game.i18n.format("DH2E.PursuitOfData.Granted", {
                actor: actor.name,
                skill: forbiddenLoreName,
            }),
        );

        // Chat message
        const speaker = fd.ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor.name };
        await fd.ChatMessage.create({
            content: `<div class="dh2e chat-card system-note">${game.i18n.format("DH2E.PursuitOfData.ChatMessage", {
                actor: actor.name,
                skill: `<strong>${forbiddenLoreName}</strong>`,
                trigger: triggerSkillName,
            })}</div>`,
            speaker,
        });
    }
}

export { PursuitOfDataHandler };
