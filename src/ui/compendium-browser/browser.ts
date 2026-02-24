import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import BrowserRoot from "./browser-root.svelte";
import { buildCompendiumIndex, type CompendiumIndex } from "./index-builder.ts";

/**
 * Compendium Browser — searchable, filterable compendium viewer.
 *
 * Builds an index of all DH2E compendium packs on first open,
 * then provides text search and faceted filters (type, availability, etc.).
 * Results are draggable to actor sheets.
 */
class CompendiumBrowser extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-compendium-browser",
        classes: ["dh2e", "compendium-browser"],
        position: { width: 700, height: 640 },
        window: {
            title: "DH2E.Browser.Title",
            resizable: true,
            minimizable: true,
        },
    });

    protected override root = BrowserRoot;

    /** Cached compendium index */
    #index: CompendiumIndex | null = null;

    /** Loading state */
    #loading = false;

    /** Open as singleton */
    static async open(): Promise<void> {
        const existing = Object.values(ui.windows ?? {}).find(
            (w: any) => w.id === "dh2e-compendium-browser",
        );
        if (existing) {
            (existing as any).bringToFront();
            return;
        }
        const browser = new CompendiumBrowser();
        await browser.render(true);
    }

    protected override async _prepareContext(
        _options: fa.ApplicationRenderOptions,
    ): Promise<SvelteApplicationRenderContext> {
        // Build index on first render
        if (!this.#index && !this.#loading) {
            this.#loading = true;
            this.#index = await buildCompendiumIndex();
            this.#loading = false;
        }

        return {
            ctx: {
                index: this.#index,
                loading: this.#loading,
                rebuildIndex: async () => {
                    this.#index = null;
                    this.#loading = false;
                    await this.render(true);
                },
            },
        };
    }
}

export { CompendiumBrowser };
