import { ChatListenersDH2e } from "@chat/listeners.ts";
import { XPAwardDialog } from "../../ui/xp-award-dialog.ts";
import { RollRequestDialog } from "../../ui/roll-request-dialog.ts";
import { RollRequestPrompt } from "../../ui/roll-request-prompt.ts";
import { EliteApprovalPrompt } from "../../ui/elite-approval-prompt.ts";
import { AdvancementShop } from "../../advancement/shop.ts";
import { GMGrantDialog } from "../../ui/gm-grant-dialog.ts";
import { MigrationRunner } from "@migration/runner.ts";
import { CombatHUD } from "@combat/hud/combat-hud.ts";
import { CompendiumBrowser } from "../../ui/compendium-browser/browser.ts";
import { createFirstWarband } from "@actor/warband/helpers.ts";
import { RequisitionApprovalPrompt } from "../../requisition/requisition-approval-prompt.ts";
import { RequisitionRequestDialog } from "../../requisition/requisition-request-dialog.ts";
import { DSNIntegration } from "../../integrations/dice-so-nice/dsn-themes.ts";
import { RulerOverlay } from "../../integrations/ruler/ruler-overlay.ts";
import { DeadlineNotifier } from "../../integrations/imperial-calendar/deadline-notifier.ts";
import { CyberneticMaintenanceNotifier } from "../../integrations/imperial-calendar/maintenance-notifier.ts";
import { registerHotbarDrop } from "../../macros/hotbar-drop.ts";
import { rollSkillUse, rollWeapon, rollSkill, maintainCybernetics } from "../../macros/api.ts";
import { ActionsGrid } from "../../ui/actions-grid/actions-grid.ts";
import { VoxComposeDialog } from "../../ui/vox-terminal/vox-compose-dialog.ts";
import { VoxTerminalPopup } from "../../ui/vox-terminal/vox-terminal-popup.ts";
import { ensureHomebrewPack, getHomebrewPack, copyToHomebrew, createHomebrewItem } from "../../homebrew/homebrew-pack.ts";

/** Hooks.once("ready") — final initialization, migrations */
export class Ready {
    static listen(): void {
        Hooks.once("ready", async () => {
            ChatListenersDH2e.listen();

            // Expose API on game.dh2e
            (game as any).dh2e.awardXP = () => XPAwardDialog.open();
            (game as any).dh2e.requestRoll = () => RollRequestDialog.open();
            (game as any).dh2e.compendiumBrowser = CompendiumBrowser;
            (game as any).dh2e.grantAdvance = () => GMGrantDialog.open();
            (game as any).dh2e.assignObjective = () => {
                const warband = (game as any).dh2e?.warband;
                if (warband) {
                    import("@actor/warband/objective-assign-dialog.ts").then(m =>
                        m.ObjectiveAssignDialog.open(warband),
                    );
                }
            };
            (game as any).dh2e.requisition = () => {
                const g = game as any;
                const actor = g.user?.character ?? null;
                const warband = g.dh2e?.warband ?? null;
                RequisitionRequestDialog.open(actor, warband);
            };

            // Macro API
            (game as any).dh2e.rollSkillUse = rollSkillUse;
            (game as any).dh2e.rollWeapon = rollWeapon;
            (game as any).dh2e.rollSkill = rollSkill;
            (game as any).dh2e.maintainCybernetics = maintainCybernetics;

            (game as any).dh2e.actionsGrid = () => ActionsGrid.open();
            (game as any).dh2e.voxTerminal = () => VoxComposeDialog.open();
            (game as any).dh2e.copyToHomebrew = copyToHomebrew;
            (game as any).dh2e.homebrewPack = getHomebrewPack;
            (game as any).dh2e.createHomebrewItem = createHomebrewItem;
            (game as any).dh2e.quickSearch = () => {
                import("../../ui/quick-search/quick-search.ts").then(m => m.QuickSearch.toggle());
            };

            // Register hotbar drop handler for drag-to-macro
            registerHotbarDrop();

            // Register socket handler
            Ready.#registerSocket();

            // Create a default landing scene if none exist (GM only)
            await Ready.#ensureLandingScene();

            // Run data migrations (GM only)
            await MigrationRunner.run();

            // Create default warband (GM only)
            await createFirstWarband();

            // Ensure homebrew compendium pack exists (GM only)
            await ensureHomebrewPack();

            // Expose warband getter on game.dh2e
            Object.defineProperty((game as any).dh2e, "warband", {
                get() {
                    const g = game as any;
                    const id = g.settings?.get(SYSTEM_ID, "activeWarband") as string;
                    return id ? g.actors?.get(id) ?? null : null;
                },
                configurable: true,
            });

            // Populate cybernetic maintenance state cache (after warband is available)
            CyberneticMaintenanceNotifier.populateCache();

            // Check for ready requisitions on startup (GM only)
            Ready.#checkReadyRequisitions();

            // Periodically check for ready requisitions during play
            Hooks.on("updateWorldTime", () => Ready.#checkReadyRequisitions());

            // Block deletion of the active warband
            Hooks.on("preDeleteActor", (actor: any) => {
                const g = game as any;
                const activeId = g.settings?.get(SYSTEM_ID, "activeWarband") as string;
                if (actor.id === activeId) {
                    ui.notifications.error(
                        g.i18n?.localize("DH2E.Warband.CannotDelete")
                            ?? "The active warband cannot be deleted.",
                    );
                    return false;
                }
            });

            // Re-render warband sheet when a member or Inquisitor actor updates
            Hooks.on("updateActor", (actor: any) => {
                if (actor.type === "warband") return;
                const g = game as any;
                const warband = g.dh2e?.warband;
                if (!warband || !warband.sheet?.rendered) return;
                const isMember = warband.system?.resolvedMembers?.some(
                    (m: any) => m.id === actor.id,
                );
                const isInquisitor = warband.system?.resolvedInquisitor?.id === actor.id;
                if (isMember || isInquisitor) {
                    warband.sheet.render(true);
                }
            });

            // Hide warband actors from the Actors sidebar
            Hooks.on("renderActorDirectory", (_app: any, html: HTMLElement) => {
                const list = html.querySelector(".directory-list");
                if (!list) return;
                for (const entry of list.querySelectorAll<HTMLElement>(".directory-item.document")) {
                    const docId = entry.dataset.entryId ?? entry.dataset.documentId;
                    if (!docId) continue;
                    const actor = (game as any).actors?.get(docId);
                    if (actor?.type === "warband") {
                        entry.style.display = "none";
                    }
                }
            });

            // Module integrations
            Hooks.once("diceSoNiceReady", (dice3d: any) => DSNIntegration.registerThemes(dice3d));
            RulerOverlay.init();
            DeadlineNotifier.init();
            CyberneticMaintenanceNotifier.init();

            // Backfill installed cybernetics that lack maintenance dates (GM only)
            await Ready.#backfillCyberneticDates();

            // FX Master weather presets API + scene control
            (game as any).dh2e.weatherPresets = () => {
                import("../../integrations/fxmaster/fxmaster-menu.ts").then(m => m.FXMasterMenu.open());
            };

            // Inject "Send via Vox" button into JournalSheet header (GM only)
            Hooks.on("getJournalSheetHeaderButtons", (sheet: any, buttons: any[]) => {
                if (!(game as any).user?.isGM) return;
                buttons.unshift({
                    class: "dh2e-vox-journal",
                    icon: "fa-solid fa-tower-broadcast",
                    label: game.i18n.localize("DH2E.Vox.SendViaVox"),
                    onclick: () => {
                        // Detect the currently viewed page (try multiple V13 strategies)
                        const doc = sheet.document;
                        const pages = doc?.pages?.contents ?? [];
                        let pageUuid: string | null = null;

                        // Strategy 1: pageIndex (V12 pattern)
                        if (typeof sheet.pageIndex === "number" && pages[sheet.pageIndex]) {
                            pageUuid = pages[sheet.pageIndex].uuid;
                        }

                        // Strategy 2: V13 internal page id properties
                        if (!pageUuid) {
                            const pid = sheet._currentPageId ?? sheet.pageId ?? sheet._pageId;
                            if (pid) {
                                const p = doc?.pages?.get(pid);
                                if (p) pageUuid = p.uuid;
                            }
                        }

                        // Strategy 3: DOM — active page in sidebar
                        if (!pageUuid && sheet.element) {
                            try {
                                const active = sheet.element.querySelector(
                                    "[data-page-id].active, .page-node.active, .journal-entry-page.active"
                                );
                                const pid = active?.dataset?.pageId;
                                if (pid) {
                                    const p = doc?.pages?.get(pid);
                                    if (p) pageUuid = p.uuid;
                                }
                            } catch { /* DOM access failed, continue */ }
                        }

                        // Fallback: first text page (never send all pages)
                        if (!pageUuid && pages.length > 0) {
                            const textPage = pages.find((p: any) => p.type === "text") ?? pages[0];
                            pageUuid = textPage?.uuid ?? null;
                        }

                        const uuid = pageUuid ?? doc?.uuid;
                        if (uuid) VoxComposeDialog.openWithItem(uuid);
                    },
                });
            });

            // Loot API
            (game as any).dh2e.lootCorpse = (npc: any) => {
                import("../../loot/loot-corpse-dialog.ts").then(m => m.LootCorpseDialog.open(npc));
            };
            (game as any).dh2e.createLootFromNpc = (npc: any) => {
                import("../../loot/templates.ts").then(m => m.createLootFromNpc(npc));
            };
            (game as any).dh2e.createSupplyCache = (name?: string) => {
                import("../../loot/templates.ts").then(m => m.createSupplyCache(name));
            };

            // Token context menu for looting + searching
            Hooks.on("getActorDirectoryEntryContext", (_html: any, options: any[]) => {
                // "Loot Corpse" for defeated NPCs
                options.push({
                    name: game.i18n.localize("DH2E.Loot.LootCorpse"),
                    icon: '<i class="fa-solid fa-sack"></i>',
                    condition: (li: any) => {
                        const id = li.dataset?.entryId ?? li.dataset?.documentId;
                        const actor = (game as any).actors?.get(id);
                        return actor?.type === "npc" && actor.system?.defeated === true;
                    },
                    callback: (li: any) => {
                        const id = li.dataset?.entryId ?? li.dataset?.documentId;
                        const actor = (game as any).actors?.get(id);
                        if (actor) {
                            import("../../loot/loot-corpse-dialog.ts").then(m => m.LootCorpseDialog.open(actor));
                        }
                    },
                });

                // "Generate Loot from NPC" for defeated NPCs (GM only)
                options.push({
                    name: game.i18n.localize("DH2E.Loot.QuickLootFromNpc"),
                    icon: '<i class="fa-solid fa-boxes-stacked"></i>',
                    condition: (li: any) => {
                        if (!(game as any).user?.isGM) return false;
                        const id = li.dataset?.entryId ?? li.dataset?.documentId;
                        const actor = (game as any).actors?.get(id);
                        return actor?.type === "npc" && actor.system?.defeated === true;
                    },
                    callback: (li: any) => {
                        const id = li.dataset?.entryId ?? li.dataset?.documentId;
                        const actor = (game as any).actors?.get(id);
                        if (actor) {
                            import("../../loot/templates.ts").then(m => m.createLootFromNpc(actor));
                        }
                    },
                });

                // "Search" for loot actors
                options.push({
                    name: game.i18n.localize("DH2E.Loot.SearchContainer"),
                    icon: '<i class="fa-solid fa-magnifying-glass"></i>',
                    condition: (li: any) => {
                        const id = li.dataset?.entryId ?? li.dataset?.documentId;
                        const actor = (game as any).actors?.get(id);
                        return actor?.type === "loot";
                    },
                    callback: (li: any) => {
                        const g = game as any;
                        const id = li.dataset?.entryId ?? li.dataset?.documentId;
                        const lootActor = g.actors?.get(id);
                        const searcher = g.user?.character;
                        if (lootActor && searcher) {
                            import("../../loot/salvage-action.ts").then(m => m.performSalvage(searcher, lootActor));
                        } else if (!searcher) {
                            ui.notifications.warn("No character assigned to perform the search.");
                        }
                    },
                });
            });

            // Hide loot actors from sidebar (like warband)
            Hooks.on("renderActorDirectory", (_app: any, html: HTMLElement) => {
                const list = html.querySelector(".directory-list");
                if (!list) return;
                for (const entry of list.querySelectorAll<HTMLElement>(".directory-item.document")) {
                    const docId = entry.dataset.entryId ?? entry.dataset.documentId;
                    if (!docId) continue;
                    const actor = (game as any).actors?.get(docId);
                    if (actor?.type === "loot") {
                        entry.style.display = "none";
                    }
                }
            });

            // Compendium entry context menu — "Copy to Homebrew" (GM only)
            Hooks.on("getCompendiumEntryContext", (_html: any, options: any[]) => {
                if (!(game as any).user?.isGM) return;

                options.push({
                    name: game.i18n.localize("DH2E.Homebrew.CopyToHomebrew"),
                    icon: '<i class="fa-solid fa-copy"></i>',
                    condition: (li: any) => {
                        const packId = li.closest("[data-pack]")?.dataset?.pack;
                        return packId !== "world.dh2e-homebrew";
                    },
                    callback: async (li: any) => {
                        const uuid = li.dataset?.uuid ?? li.dataset?.documentId;
                        if (uuid) await copyToHomebrew(uuid);
                    },
                });
            });

            // Initialize combat HUD
            CombatHUD.init();
        });
    }

    /**
     * Backfill installed cybernetics that have null lastMaintenanceDate.
     * Sets them to the warband's current date so they don't immediately show "Total Failure".
     */
    static async #backfillCyberneticDates(): Promise<void> {
        const g = game as any;
        if (!g.user?.isGM) return;

        const warband = g.dh2e?.warband;
        const currentDate = warband?.system?.chronicle?.currentDate;
        if (!currentDate) return;

        for (const actor of g.actors ?? []) {
            if (actor.type !== "acolyte" && actor.type !== "npc") continue;

            for (const item of actor.items ?? []) {
                if (item.type !== "cybernetic") continue;
                if (!item.system?.installed) continue;
                if (item.system.lastMaintenanceDate != null) continue;

                try {
                    await item.update({ "system.lastMaintenanceDate": currentDate });
                } catch (e) {
                    console.warn(`DH2E | Failed to backfill maintenance date for "${item.name}" on "${actor.name}"`, e);
                }
            }
        }
    }

    /** Register system socket for GM roll requests and elite approval */
    static #registerSocket(): void {
        const g = game as any;
        g.socket.on(`system.${SYSTEM_ID}`, (data: any) => {
            if (data.type === "requestRoll") {
                Ready.#handleRollRequest(data.payload);
            } else if (data.type === "rollDeclined") {
                Ready.#handleRollDeclined(data.payload);
            } else if (data.type === "eliteApprovalRequest") {
                // GM receives player's request
                if (g.user?.isGM) {
                    EliteApprovalPrompt.show(data.payload);
                }
            } else if (data.type === "eliteApprovalGranted") {
                // Player receives GM's approval
                AdvancementShop.handleApprovalGranted(data.payload);
            } else if (data.type === "eliteApprovalDenied") {
                // Player receives GM's denial
                AdvancementShop.handleApprovalDenied(data.payload);
            } else if (data.type === "objectiveAssigned") {
                Ready.#handleObjectiveAssigned(data.payload);
            } else if (data.type === "requisitionRequest") {
                // GM receives player's requisition request
                if (g.user?.isGM) {
                    RequisitionApprovalPrompt.show(data.payload);
                }
            } else if (data.type === "requisitionApproved") {
                Ready.#handleRequisitionApproved(data.payload);
            } else if (data.type === "requisitionApprovedDelayed") {
                Ready.#handleRequisitionApprovedDelayed(data.payload);
            } else if (data.type === "requisitionDenied") {
                Ready.#handleRequisitionDenied(data.payload);
            } else if (data.type === "voxTerminal") {
                Ready.#handleVoxTerminal(data.payload);
            } else if (data.type === "gmGrantFlavor") {
                // Player receives GM grant flavor text popup
                Ready.#handleGMGrantFlavor(data.payload);
            }
        });
    }

    /** Handle incoming roll request (player side) */
    static #handleRollRequest(payload: any): void {
        const g = game as any;
        const userId = g.user?.id;
        if (!userId || !payload.targetUserIds?.includes(userId)) return;

        RollRequestPrompt.show(payload);
    }

    /** Handle GM grant flavor text popup (player side) */
    static #handleGMGrantFlavor(payload: {
        userId: string;
        advanceName: string;
        actorName: string;
        flavorText: string;
    }): void {
        const g = game as any;
        if (g.user?.id !== payload.userId) return;

        // Show a dialog with the GM's narrative flavor text
        new fa.api.DialogV2({
            window: {
                title: game.i18n.localize("DH2E.GMGrant.FlavorTitle"),
                icon: "fa-solid fa-scroll",
            },
            content: `
                <div style="text-align:center; padding: 0.75rem;">
                    <p style="font-size: 0.75rem; color: var(--dh2e-text-secondary, #a0a0a8); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem;">
                        <strong>${payload.advanceName}</strong> granted to <strong>${payload.actorName}</strong>
                    </p>
                    <p style="font-family: var(--dh2e-font-header, serif); font-size: 1rem; color: var(--dh2e-gold, #c8a84e); font-style: italic; line-height: 1.5; margin: 0;">
                        "${payload.flavorText}"
                    </p>
                </div>
            `,
            buttons: [{
                action: "ok",
                label: "The Emperor Protects",
                default: true,
            }],
            position: { width: 420 },
        }).render(true);
    }

    /** Handle objective assignment notification (player side) */
    static #handleObjectiveAssigned(payload: {
        userId: string;
        actorName: string;
        title: string;
    }): void {
        const g = game as any;
        if (g.user?.id !== payload.userId) return;
        ui.notifications.info(
            game.i18n.format("DH2E.Objective.Notification", {
                name: payload.actorName,
                title: payload.title,
            }),
        );
    }

    /** Handle incoming vox transmission — target filter, popup, and log storage */
    static async #handleVoxTerminal(payload: any): Promise<void> {
        const g = game as any;
        const userId = g.user?.id;

        // GM sent the message — they already saw it (or chose not to). Skip.
        if (g.user?.isGM) return;

        // Targeting check: if targetUserIds is set, only show to listed users
        if (payload.targetUserIds?.length > 0 && !payload.targetUserIds.includes(userId)) return;

        // Show the popup
        VoxTerminalPopup.show(payload);

        // Store in the player's assigned character's Vox log
        const actor = g.user?.character;
        if (actor) {
            const { storeVoxEntry } = await import("../../ui/vox-terminal/vox-log.ts");
            await storeVoxEntry(actor, payload);
        }
    }

    /** Handle roll declined notification (GM side) */
    static #handleRollDeclined(payload: { userName: string }): void {
        const g = game as any;
        if (!g.user?.isGM) return;

        ui.notifications.info(
            game.i18n.format("DH2E.Request.Prompt.Declined", { name: payload.userName }),
        );
    }

    /** Handle approved requisition (player side) — create item on actor */
    static async #handleRequisitionApproved(payload: {
        userId: string;
        itemData: object;
        itemName: string;
        actorUuid: string;
        craftsmanship: string;
        modifications: string;
    }): Promise<void> {
        const g = game as any;
        if (g.user?.id !== payload.userId) return;

        try {
            const actor = await fromUuid(payload.actorUuid) as any;
            if (actor && payload.itemData && Object.keys(payload.itemData).length > 0) {
                await actor.createEmbeddedDocuments("Item", [payload.itemData]);
            }
        } catch (e) {
            console.warn("DH2E | Failed to create requisitioned item:", e);
        }

        ui.notifications.info(
            game.i18n.format("DH2E.Requisition.Approved", { name: payload.itemName }),
        );
    }

    /** Handle delayed requisition approval (player side) — notification only */
    static #handleRequisitionApprovedDelayed(payload: {
        userId: string;
        itemName: string;
        time: string;
    }): void {
        const g = game as any;
        if (g.user?.id !== payload.userId) return;

        ui.notifications.info(
            game.i18n.format("DH2E.Requisition.ApprovedDelayed", {
                name: payload.itemName,
                time: payload.time,
            }),
        );
    }

    /** Handle denied requisition (player side) — notification */
    static #handleRequisitionDenied(payload: {
        userId: string;
        itemName: string;
    }): void {
        const g = game as any;
        if (g.user?.id !== payload.userId) return;

        ui.notifications.warn(
            game.i18n.format("DH2E.Requisition.Denied", { name: payload.itemName }),
        );
    }

    /** Check for pending requisitions that are ready for delivery (GM only) */
    static async #checkReadyRequisitions(): Promise<void> {
        const g = game as any;
        if (!g.user?.isGM) return;

        const warband = g.dh2e?.warband;
        if (!warband) return;

        const pending = warband.system?.pendingRequisitions ?? [];
        const now = Date.now();
        for (const req of pending) {
            if (req.status === "pending" && req.readyAt > 0 && now >= req.readyAt) {
                await warband.updatePendingRequisition(req.id, { status: "ready" });
                ui.notifications.info(
                    game.i18n.format("DH2E.Requisition.ItemReady", { name: req.itemName }),
                );
            }
        }
    }

    /** Create a DH2E-themed landing scene if one doesn't already exist */
    static async #ensureLandingScene(): Promise<void> {
        const g = game as any;
        if (!g.user?.isGM) return;

        // Check if we already created a DH2E landing scene (by flag)
        const existing = g.scenes?.find(
            (s: any) => s.flags?.[SYSTEM_ID]?.isLandingScene,
        );
        if (existing) {
            // Ensure background color is set (fix for scenes created before this was added)
            if ((existing as any).backgroundColor !== "#050508") {
                try {
                    await existing.update({
                        backgroundColor: "#050508",
                        background: { src: `systems/${SYSTEM_ID}/ui/pause-bg.svg` },
                    });
                } catch { /* ignore */ }
            }
            return;
        }

        try {
            const scene = await (Scene as any).create({
                name: "The Imperium Awaits",
                background: {
                    src: `systems/${SYSTEM_ID}/ui/pause-bg.svg`,
                },
                backgroundColor: "#050508",
                width: 1920,
                height: 1080,
                padding: 0,
                grid: { size: 100, type: 0 },
                tokenVision: false,
                fogExploration: false,
                navigation: true,
                flags: {
                    [SYSTEM_ID]: { isLandingScene: true },
                },
            });
            if (scene) await scene.activate();
        } catch (e) {
            console.warn("DH2E | Could not create landing scene:", e);
        }
    }
}
