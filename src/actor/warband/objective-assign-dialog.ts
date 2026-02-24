import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import type { WarbandDH2e } from "./document.ts";
import DialogRoot from "./objective-assign-dialog-root.svelte";

/** Dialog for assigning objectives to the warband or individual members */
class ObjectiveAssignDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "objective-assign-dialog",
        classes: ["dh2e", "dialog", "objective-assign"],
        position: { width: 480, height: 420 },
        window: {
            title: "DH2E.Objective.Assign",
            resizable: true,
        },
    });

    protected override root = DialogRoot;

    #warband: WarbandDH2e;

    constructor(warband: WarbandDH2e, options?: Partial<fa.ApplicationConfiguration>) {
        super(options ?? {});
        this.#warband = warband;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const warband = this.#warband;
        const members = warband.members;

        // Build target options: warband + individual members
        const targets = [
            { id: "warband", label: "Warband" },
            ...members.map(m => ({ id: m.uuid, label: m.name ?? "Unknown" })),
        ];

        // Load compendium objectives
        const compendiumObjectives = await this.#loadCompendiumObjectives();

        return {
            ctx: {
                targets,
                compendiumObjectives,
                submit: (data: AssignData) => this.#submit(data),
                close: () => this.close(),
            },
        };
    }

    async #loadCompendiumObjectives(): Promise<{ uuid: string; name: string; img: string }[]> {
        const results: { uuid: string; name: string; img: string }[] = [];
        const g = game as any;
        for (const pack of g.packs ?? []) {
            if (pack.documentName !== "Item") continue;
            const index = await pack.getIndex();
            for (const entry of index) {
                if ((entry as any).type === "objective") {
                    results.push({
                        uuid: `Compendium.${pack.collection}.${entry._id}`,
                        name: (entry as any).name ?? "Objective",
                        img: (entry as any).img ?? "",
                    });
                }
            }
        }
        return results;
    }

    async #submit(data: AssignData): Promise<void> {
        const warband = this.#warband;
        const g = game as any;
        const assignedBy = g.user?.name ?? "Unknown";
        const timestamp = Date.now();

        let itemData: Record<string, unknown>;

        if (data.mode === "compendium" && data.compendiumUuid) {
            const source = await fromUuid(data.compendiumUuid);
            if (!source) return;
            itemData = (source as any).toObject();
            // Override timestamps
            (itemData as any).system.assignedBy = assignedBy;
            (itemData as any).system.timestamp = timestamp;
        } else {
            itemData = {
                name: data.title || "New Objective",
                type: "objective",
                img: `systems/${SYSTEM_ID}/icons/default-icons/objective.svg`,
                system: {
                    description: data.description ?? "",
                    status: "active",
                    assignedBy,
                    timestamp,
                    completedTimestamp: 0,
                    scope: data.target === "warband" ? "warband" : "personal",
                    format: "parchment",
                },
            };
        }

        if (data.target === "warband") {
            // Set scope to warband
            (itemData as any).system.scope = "warband";
            await warband.createEmbeddedDocuments("Item", [itemData]);
        } else {
            // Personal objective — add to specific member actor
            (itemData as any).system.scope = "personal";
            const member = warband.members.find(m => m.uuid === data.target);
            if (member) {
                await member.createEmbeddedDocuments("Item", [itemData]);

                // Notify the player via socket
                const ownerUser = ObjectiveAssignDialog.#findOwnerUser(member);
                if (ownerUser && ownerUser.id !== g.user?.id) {
                    g.socket.emit(`system.${SYSTEM_ID}`, {
                        type: "objectiveAssigned",
                        payload: {
                            userId: ownerUser.id,
                            actorName: member.name,
                            title: (itemData as any).name ?? "Objective",
                        },
                    });
                }
            }
        }

        this.close();
    }

    /** Find the player user who owns a given actor */
    static #findOwnerUser(actor: any): any | null {
        const g = game as any;
        for (const user of g.users ?? []) {
            if (user.isGM) continue;
            if (actor.testUserPermission(user, "OWNER")) return user;
        }
        return null;
    }

    /** Static convenience opener */
    static open(warband: WarbandDH2e): void {
        new ObjectiveAssignDialog(warband).render(true);
    }
}

interface AssignData {
    mode: "create" | "compendium";
    target: string; // "warband" or member UUID
    title?: string;
    description?: string;
    compendiumUuid?: string;
}

export { ObjectiveAssignDialog };
