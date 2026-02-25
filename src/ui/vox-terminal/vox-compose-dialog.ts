import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import VoxComposeRoot from "./vox-compose-root.svelte";
import { VoxTerminalPopup } from "./vox-terminal-popup.ts";

interface VoxTerminalPayload {
    sender: string;
    message: string;
    speed: number;
    timestamp: number;
}

interface VoxItemEntry {
    uuid: string;
    name: string;
    img: string;
    type: string;
}

interface VoxItemGroup {
    label: string;
    items: VoxItemEntry[];
}

/**
 * GM-only compose dialog for sending vox transmissions to all players.
 *
 * Usage: `VoxComposeDialog.open()` or `game.dh2e.voxTerminal()`
 */
class VoxComposeDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-vox-compose",
        classes: ["dh2e", "dialog", "vox-compose-dialog"],
        position: { width: 440, height: "auto" as const },
        window: { resizable: false, minimizable: false },
    });

    protected override root = VoxComposeRoot;

    #initialSender: string;
    #initialMessage: string;

    constructor(options?: { initialSender?: string; initialMessage?: string }) {
        super({});
        this.#initialSender = options?.initialSender ?? "";
        this.#initialMessage = options?.initialMessage ?? "";
    }

    override get title(): string {
        return game.i18n.localize("DH2E.Vox.ComposeTitle");
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        const groups = await this.#loadItemGroups();
        return {
            ctx: {
                onSend: (payload: VoxTerminalPayload) => this.#send(payload),
                groups,
                initialSender: this.#initialSender,
                initialMessage: this.#initialMessage,
                loadItem: async (uuid: string) => {
                    const doc = await fromUuid(uuid);
                    if (!doc) return null;
                    const sys = (doc as any).system ?? {};
                    return {
                        sender: sys.assignedBy ?? "",
                        message: sys.description ?? "",
                        name: (doc as any).name ?? "",
                    };
                },
            },
        };
    }

    async #loadItemGroups(): Promise<VoxItemGroup[]> {
        const groups: VoxItemGroup[] = [];
        const g = game as any;
        for (const pack of g.packs ?? []) {
            if (pack.documentName !== "Item") continue;
            const index = await pack.getIndex({ fields: ["system.description"] });
            const items: VoxItemEntry[] = [];
            for (const entry of index) {
                const e = entry as any;
                if (e.system?.description) {
                    items.push({
                        uuid: `Compendium.${pack.collection}.${e._id}`,
                        name: e.name ?? "Item",
                        img: e.img ?? "",
                        type: e.type ?? "unknown",
                    });
                }
            }
            if (items.length > 0) {
                items.sort((a, b) => a.name.localeCompare(b.name));
                groups.push({ label: pack.metadata.label ?? pack.collection, items });
            }
        }
        const worldItems: VoxItemEntry[] = [];
        for (const item of g.items ?? []) {
            if ((item as any).system?.description) {
                worldItems.push({
                    uuid: (item as any).uuid,
                    name: (item as any).name ?? "Item",
                    img: (item as any).img ?? "",
                    type: (item as any).type ?? "unknown",
                });
            }
        }
        if (worldItems.length > 0) {
            worldItems.sort((a, b) => a.name.localeCompare(b.name));
            groups.push({ label: game.i18n.localize("DH2E.Vox.WorldItems"), items: worldItems });
        }
        return groups;
    }

    async #send(payload: VoxTerminalPayload): Promise<void> {
        const g = game as any;
        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "voxTerminal",
            payload,
        });
        // Socket emit doesn't echo to sender, so show locally
        VoxTerminalPopup.show(payload);
        ui.notifications.info(game.i18n.localize("DH2E.Vox.Sent"));
        this.close();
    }

    /** Open the compose dialog. GM-only guard. */
    static open(): void {
        const g = game as any;
        if (!g.user?.isGM) {
            ui.notifications.warn(game.i18n.localize("DH2E.Vox.GMOnly"));
            return;
        }
        new VoxComposeDialog({}).render(true);
    }

    /** Open the compose dialog pre-populated from an item's data. GM-only. */
    static async openWithItem(uuid: string): Promise<void> {
        if (!(game as any).user?.isGM) {
            ui.notifications.warn(game.i18n.localize("DH2E.Vox.GMOnly"));
            return;
        }
        const doc = await fromUuid(uuid);
        if (!doc) return;
        const sys = (doc as any).system ?? {};
        new VoxComposeDialog({
            initialSender: sys.assignedBy ?? "",
            initialMessage: sys.description ?? "",
        }).render(true);
    }
}

export { VoxComposeDialog };
export type { VoxTerminalPayload };
