import * as svelte from "svelte";

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

        protected abstract override _prepareContext(
            options: fa.ApplicationRenderOptions,
        ): Promise<SvelteApplicationRenderContext>;

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

            // Mount fresh Svelte tree with current data
            this.#mount = svelte.mount(this.root, {
                target: content,
                props: { ...result, ctx: { ...result.ctx } },
            });
        }

        protected override _onClose(options: fa.ApplicationClosingOptions): void {
            super._onClose(options);
            if (this.#mount) {
                svelte.unmount(this.#mount);
                this.#mount = null;
            }
        }
    }

    return SvelteApplication;
}

type SvelteApplication = InstanceType<ReturnType<typeof SvelteApplicationMixin>>;

export { SvelteApplicationMixin, type SvelteApplicationRenderContext };
