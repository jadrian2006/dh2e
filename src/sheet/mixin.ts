import * as svelte from "svelte";

/** Context returned by _prepareContext for Svelte sheets */
interface SvelteApplicationRenderContext {
    ctx: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Mixin that integrates Svelte 5 components into Foundry's ApplicationV2.
 *
 * Pattern: mount on first render, Object.assign($state) on re-renders, unmount on close.
 * Based on PF2e's approach (~58 lines).
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

        /** Reactive context object — plain object, reactivity comes from Svelte's mount props */
        protected $ctx: Record<string, unknown> = {};

        /** Mounted Svelte component instance */
        #mount: object = {};

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
            Object.assign(this.$ctx, result.ctx);
            if (options.isFirstRender) {
                this.#mount = svelte.mount(this.root, {
                    target: content,
                    props: { ...result, ctx: this.$ctx },
                });
            }
        }

        protected override _onClose(options: fa.ApplicationClosingOptions): void {
            super._onClose(options);
            svelte.unmount(this.#mount);
        }
    }

    return SvelteApplication;
}

type SvelteApplication = InstanceType<ReturnType<typeof SvelteApplicationMixin>>;

export { SvelteApplicationMixin, type SvelteApplicationRenderContext };
