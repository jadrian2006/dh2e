/**
 * Quick Search — command-palette overlay for fast compendium lookups.
 *
 * Ctrl+Space opens a floating search bar over all Foundry UI.
 * Results stream as you type, Enter/click opens the item sheet,
 * Escape or backdrop click dismisses.
 *
 * Shares the same cached compendium index as the browser.
 */

import { mount, unmount } from "svelte";
import QuickSearchRoot from "./quick-search-root.svelte";
import { buildCompendiumIndex } from "../compendium-browser/index-builder.ts";

export class QuickSearch {
    static #mount: ReturnType<typeof mount> | null = null;
    static #container: HTMLElement | null = null;

    static async toggle(): Promise<void> {
        if (this.#mount) {
            this.close();
        } else {
            await this.open();
        }
    }

    static async open(): Promise<void> {
        if (this.#mount) return;

        const index = await buildCompendiumIndex();
        const isGM = (game as any).user?.isGM ?? false;

        const container = document.createElement("div");
        container.id = "dh2e-quick-search";
        container.classList.add("dh2e");
        document.body.appendChild(container);
        this.#container = container;

        this.#mount = mount(QuickSearchRoot, {
            target: container,
            props: {
                index,
                isGM,
                onClose: () => this.close(),
            },
        });
    }

    static close(): void {
        if (this.#mount) {
            unmount(this.#mount);
            this.#mount = null;
        }
        if (this.#container) {
            this.#container.remove();
            this.#container = null;
        }
    }
}
