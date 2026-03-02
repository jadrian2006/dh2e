import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import SheetRoot from "./importer-sheet-root.svelte";

/** Content category descriptor for display */
interface ContentCategory {
    icon: string;
    label: string;
    count: number;
    field: string;
}

/**
 * V2 Adventure importer sheet, replacing Foundry's built-in V1 AdventureImporter.
 * Shows adventure overview, content manifest, and import controls.
 */
class AdventureImporterDH2e extends SvelteApplicationMixin(fa.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "adventure-importer"],
        position: { width: 560, height: "auto" as const },
        window: { resizable: true },
    });

    protected override root = SheetRoot;

    /** Compendium docs aren't "editable" in the ownership sense, but the importer needs interaction. */
    override get isEditable(): boolean {
        return (game as any).user?.isGM ?? false;
    }

    override get title(): string {
        return `${game.i18n?.localize("DH2E.Adventure.Import") ?? "Import"}: ${this.document.name}`;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        const adventure = this.document as any;

        const contents: ContentCategory[] = [];
        const fields: { field: string; icon: string; label: string; prop: string }[] = [
            { field: "scenes", icon: "fa-solid fa-map", label: "Scenes", prop: "scenes" },
            { field: "actors", icon: "fa-solid fa-users", label: "Actors", prop: "actors" },
            { field: "items", icon: "fa-solid fa-suitcase", label: "Items", prop: "items" },
            { field: "journal", icon: "fa-solid fa-book-open", label: "Journal Entries", prop: "journal" },
            { field: "tables", icon: "fa-solid fa-th-list", label: "Roll Tables", prop: "tables" },
            { field: "macros", icon: "fa-solid fa-terminal", label: "Macros", prop: "macros" },
            { field: "playlists", icon: "fa-solid fa-music", label: "Playlists", prop: "playlists" },
            { field: "combats", icon: "fa-solid fa-swords", label: "Combats", prop: "combats" },
            { field: "cards", icon: "fa-solid fa-cards", label: "Card Stacks", prop: "cards" },
            { field: "folders", icon: "fa-solid fa-folder", label: "Folders", prop: "folders" },
        ];

        // Compendium-loaded adventures may not hydrate EmbeddedCollections.
        // Fall back to _source arrays which always contain the raw data.
        const src = adventure._source ?? {};
        for (const f of fields) {
            const collection = adventure[f.prop];
            const count = collection?.size ?? collection?.length ?? src[f.prop]?.length ?? 0;
            if (count > 0) {
                contents.push({ icon: f.icon, label: f.label, count, field: f.field });
            }
        }

        return {
            ctx: {
                adventure,
                name: adventure.name ?? "",
                img: adventure.img ?? "",
                caption: adventure.caption ?? "",
                description: adventure.description ?? "",
                contents,
                isGM: (game as any).user?.isGM ?? false,
                performImport: (importFields: string[]) => this.#performImport(importFields),
            },
        };
    }

    async #performImport(importFields: string[]): Promise<{ created: number; updated: number }> {
        const adventure = this.document as any;
        try {
            const data = await adventure.prepareImport({ importFields });

            // Check if anything would be updated (overwritten)
            const updateCount = Object.values(data.toUpdate as Record<string, any[]>)
                .reduce((sum: number, arr: any[]) => sum + arr.length, 0);

            if (updateCount > 0) {
                const confirmed = await fa.api.DialogV2.confirm({
                    window: {
                        title: game.i18n?.localize("DH2E.Adventure.OverwriteTitle") ?? "Overwrite Existing?",
                    },
                    content: game.i18n?.format("DH2E.Adventure.OverwriteWarning", {
                        count: String(updateCount),
                    }) ?? `<p>${updateCount} existing document(s) will be updated. Continue?</p>`,
                    yes: { default: true },
                });
                if (!confirmed) return { created: 0, updated: 0 };
            }

            const result = await adventure.importContent(data);
            const created = Array.isArray(result.created) ? result.created.length : 0;
            const updated = Array.isArray(result.updated) ? result.updated.length : 0;

            ui.notifications.info(
                game.i18n?.format("DH2E.Adventure.ImportSuccess", {
                    name: adventure.name,
                    created: String(created),
                    updated: String(updated),
                }) ?? `Imported "${adventure.name}": ${created} created, ${updated} updated`,
            );

            this.close();
            return { created, updated };
        } catch (e) {
            console.error("DH2E | Adventure import failed:", e);
            ui.notifications.error(
                game.i18n?.localize("DH2E.Adventure.ImportFailed") ?? "Adventure import failed.",
            );
            return { created: 0, updated: 0 };
        }
    }
}

export { AdventureImporterDH2e };
