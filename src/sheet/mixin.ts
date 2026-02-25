import * as svelte from "svelte";
import { getSetting } from "../ui/settings/settings.ts";

/** Context returned by _prepareContext for Svelte sheets */
interface SvelteApplicationRenderContext {
    ctx: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Mixin that integrates Svelte 5 components into Foundry's ApplicationV2.
 *
 * Pattern: unmount + remount on every render to guarantee fresh reactive state.
 * Svelte 5's mount() doesn't support external prop updates, so we remount
 * each time Foundry triggers a render (document changes, explicit render calls).
 */
function SvelteApplicationMixin<
    TBase extends AbstractConstructorOf<fa.api.ApplicationV2> & {
        DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration>;
    },
>(Base: TBase) {
    abstract class SvelteApplication extends Base {
        static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
            classes: ["dh2e"],
        };

        /** The root Svelte component class */
        protected abstract root: svelte.Component<any>;

        /** Mounted Svelte component instance */
        #mount: object | null = null;

        /** Popout browser window reference */
        #popoutWindow: Window | null = null;

        /** Svelte mount inside the popout window */
        #popoutMount: object | null = null;

        /** Guard against recursive close between popout ↔ canvas */
        #isClosing = false;

        protected abstract override _prepareContext(
            options: fa.ApplicationRenderOptions,
        ): Promise<SvelteApplicationRenderContext>;

        /** Inject popout button into the window header after each render */
        protected override _onRender(context: Record<string, unknown>, options: fa.ApplicationRenderOptions): void {
            super._onRender(context, options);
            this.#injectPopoutButton();
        }

        /**
         * Add a visible popout button to the left of all other header controls.
         * Only added to document sheets (actors/items), not dialogs or wizards.
         */
        #injectPopoutButton(): void {
            // Only add popout to document sheets, not dialogs/wizards
            if (!(this as any).document) return;

            const header = (this as any).element?.querySelector(".window-header");
            if (!header || header.querySelector(".dh2e-popout-btn")) return;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "header-control dh2e-popout-btn";
            btn.setAttribute("aria-label", game.i18n?.localize("DH2E.Sheet.PopOut") ?? "Pop Out");
            btn.setAttribute("data-tooltip", game.i18n?.localize("DH2E.Sheet.PopOut") ?? "Pop Out");
            btn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i>';
            btn.addEventListener("click", (e) => { e.stopPropagation(); this.#openPopout(); });

            // Insert before the first header control button (overflow toggle, etc.)
            const firstControl = header.querySelector("button[data-action]");
            if (firstControl) {
                firstControl.before(btn);
            } else {
                header.appendChild(btn);
            }
        }

        /** Open (or focus) a popout browser window with the sheet content */
        async #openPopout(): Promise<void> {
            // Focus existing popout if already open
            if (this.#popoutWindow && !this.#popoutWindow.closed) {
                this.#popoutWindow.focus();
                return;
            }

            const pos = (this as any).position ?? {};
            const popWidth = (pos.width ?? 720) + 18; // +18 for scrollbar gutter
            const popup = window.open(
                "", `dh2e-popout-${(this as any).id}`,
                `width=${popWidth},height=${pos.height ?? 800},resizable=yes`,
            );
            if (!popup) { ui.notifications?.warn("Pop-up blocked by browser"); return; }

            this.#popoutWindow = popup;
            popup.document.title = (this as any).title ?? "DH2E Sheet";

            // Copy ALL stylesheets from main window
            for (const link of document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
                const clone = popup.document.createElement("link");
                clone.rel = "stylesheet"; clone.href = link.href;
                popup.document.head.appendChild(clone);
            }
            for (const style of document.head.querySelectorAll<HTMLStyleElement>("style")) {
                const clone = popup.document.createElement("style");
                clone.textContent = style.textContent;
                popup.document.head.appendChild(clone);
            }

            // Body setup — clean slate, no Foundry frame classes
            popup.document.body.style.cssText = "margin:0;padding:0;overflow:hidden;background:var(--dh2e-bg-darker,#1a1a20);";

            // Themed title bar
            const titleBar = popup.document.createElement("header");
            titleBar.style.cssText = [
                "display:flex", "align-items:center", "height:2rem",
                "padding:0 0.75rem",
                "background:var(--dh2e-bg-darkest,#111114)",
                "border-bottom:2px solid var(--dh2e-gold-dark,#9c7a28)",
            ].join(";");
            const titleEl = popup.document.createElement("h1");
            titleEl.style.cssText = [
                "flex:1", "margin:0",
                "font-family:var(--dh2e-font-header,serif)",
                "color:var(--dh2e-gold,#c8a84e)",
                "font-size:0.85rem", "text-transform:uppercase",
                "letter-spacing:0.05em",
                "overflow:hidden", "text-overflow:ellipsis", "white-space:nowrap",
            ].join(";");
            titleEl.textContent = (this as any).title ?? "DH2E Sheet";
            titleBar.appendChild(titleEl);
            popup.document.body.appendChild(titleBar);

            // Content container — only `dh2e` class for CSS variable inheritance
            const contentDiv = popup.document.createElement("div");
            contentDiv.className = "dh2e popout-content";
            contentDiv.style.cssText = "height:calc(100vh - 2rem);overflow-y:auto;";
            popup.document.body.appendChild(contentDiv);

            // Apply sheet scale
            const scale = getSetting<number>("sheetScale");
            if (scale !== 100) popup.document.documentElement.style.zoom = String(scale / 100);

            // Mount Svelte
            const ctx = await (this as any)._prepareContext({} as any);
            this.#popoutMount = svelte.mount(this.root, {
                target: contentDiv,
                props: { ...ctx, ctx: { ...ctx.ctx } },
            });

            // Hide the canvas sheet (keep alive for document-change sync)
            if ((this as any).element) {
                ((this as any).element as HTMLElement).style.display = "none";
            }

            // When popout is closed → close the canvas sheet entirely
            popup.addEventListener("beforeunload", () => {
                if (this.#popoutMount) { svelte.unmount(this.#popoutMount); this.#popoutMount = null; }
                this.#popoutWindow = null;
                if (!this.#isClosing) this.close();
            });
        }

        protected override async _renderHTML(
            context: SvelteApplicationRenderContext,
        ): Promise<SvelteApplicationRenderContext> {
            return context;
        }

        protected override _replaceHTML(
            result: SvelteApplicationRenderContext,
            content: HTMLElement,
            options: fa.ApplicationRenderOptions,
        ): void {
            // Unmount previous Svelte tree if this is a re-render
            if (!options.isFirstRender && this.#mount) {
                svelte.unmount(this.#mount);
                content.replaceChildren();
            }

            // Ensure popout windows have the correct styles
            this.#ensurePopoutStyles(content);

            // Mount fresh Svelte tree with current data
            this.#mount = svelte.mount(this.root, {
                target: content,
                props: { ...result, ctx: { ...result.ctx } },
            });

            // Apply sheet scale to the application element
            const scale = getSetting<number>("sheetScale");
            if (this.element) {
                (this.element as HTMLElement).style.zoom = scale !== 100 ? String(scale / 100) : "";
            }

            // Re-render popout window if open
            if (this.#popoutWindow && !this.#popoutWindow.closed && this.#popoutMount) {
                svelte.unmount(this.#popoutMount);
                const popContent = this.#popoutWindow.document.querySelector<HTMLElement>(".popout-content");
                if (popContent) {
                    popContent.replaceChildren();
                    this.#popoutMount = svelte.mount(this.root, {
                        target: popContent,
                        props: { ...result, ctx: { ...result.ctx } },
                    });
                }
            }
        }

        /**
         * When a sheet is popped out to a new window, that window won't have
         * the system's CSS variables or styles. Copy all <link> and <style>
         * elements from the main document's <head> into the popout's <head>.
         */
        #ensurePopoutStyles(content: HTMLElement): void {
            const ownerDoc = content.ownerDocument;
            if (!ownerDoc || ownerDoc === document) return; // Not a popout

            const popoutHead = ownerDoc.head;
            if (!popoutHead) return;

            // Skip if we already injected styles
            if (popoutHead.querySelector("[data-dh2e-popout]")) return;

            // Copy <link rel="stylesheet"> elements
            for (const link of document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
                const clone = ownerDoc.createElement("link");
                clone.rel = "stylesheet";
                clone.href = link.href;
                clone.setAttribute("data-dh2e-popout", "true");
                popoutHead.appendChild(clone);
            }

            // Copy <style> elements
            for (const style of document.head.querySelectorAll<HTMLStyleElement>("style")) {
                const clone = ownerDoc.createElement("style");
                clone.textContent = style.textContent;
                clone.setAttribute("data-dh2e-popout", "true");
                popoutHead.appendChild(clone);
            }
        }

        protected override _onClose(options: fa.ApplicationClosingOptions): void {
            this.#isClosing = true;

            // Close popout window if it's still open
            if (this.#popoutWindow && !this.#popoutWindow.closed) {
                const popup = this.#popoutWindow;
                this.#popoutWindow = null; // Clear first to prevent recursive close
                popup.close();
            }
            this.#popoutWindow = null;
            if (this.#popoutMount) { svelte.unmount(this.#popoutMount); this.#popoutMount = null; }

            super._onClose(options);
            if (this.#mount) {
                svelte.unmount(this.#mount);
                this.#mount = null;
            }

            this.#isClosing = false;
        }
    }

    return SvelteApplication;
}

type SvelteApplication = InstanceType<ReturnType<typeof SvelteApplicationMixin>>;

export { SvelteApplicationMixin, type SvelteApplicationRenderContext };
