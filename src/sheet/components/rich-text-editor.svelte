<script lang="ts">
    let {
        content = "",
        editable = false,
        onSave,
        document: doc,
        fieldName,
    }: {
        content?: string;
        editable?: boolean;
        onSave: (html: string) => void;
        document?: any;
        fieldName?: string;
    } = $props();

    let containerEl: HTMLDivElement | undefined = $state();
    let editor: ProseMirrorEditor | null = $state(null);

    /** Extract HTML from the current editor state */
    function extractHTML(): string {
        if (!editor) return content;
        try {
            const doc = editor.view?.state?.doc;
            if (doc && foundry.prosemirror?.dom?.serializeString) {
                return foundry.prosemirror.dom.serializeString(doc);
            }
        } catch { /* fallback below */ }
        // Fallback: grab innerHTML from ProseMirror content div
        const pmEl = containerEl?.querySelector(".ProseMirror");
        return pmEl?.innerHTML ?? content;
    }

    $effect(() => {
        if (!editable || !containerEl) return;

        let destroyed = false;
        let instance: ProseMirrorEditor | null = null;

        const schema = foundry.prosemirror?.defaultSchema;
        const plugins: Record<string, any> = {};
        if (schema && foundry.prosemirror?.ProseMirrorMenu?.build) {
            plugins.menu = foundry.prosemirror.ProseMirrorMenu.build(schema, {
                destroyOnSave: false,
            });
        }

        ProseMirrorEditor.create(containerEl, content, {
            document: doc,
            fieldName,
            plugins,
        }).then((ed) => {
            if (destroyed) {
                ed.destroy();
                return;
            }
            instance = ed;
            editor = ed;
        });

        return () => {
            destroyed = true;
            if (instance) {
                const html = extractHTML();
                onSave(html);
                instance.destroy();
                instance = null;
                editor = null;
            }
        };
    });
</script>

{#if editable}
    <div class="rich-text-editor" bind:this={containerEl}></div>
{:else}
    <div class="rich-text-readonly">{@html content}</div>
{/if}

<style lang="scss">
    .rich-text-editor {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 120px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        overflow: hidden;
    }

    /* ProseMirror toolbar overrides — one selector per :global() */
    :global(.rich-text-editor .editor-toolbar) {
        background: var(--dh2e-bg-darkest, #1a1a22);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        padding: 2px 4px;
        flex-shrink: 0;
    }

    :global(.rich-text-editor .editor-toolbar button) {
        color: var(--dh2e-text-secondary, #a0a0a8);
        background: none;
        border: 1px solid transparent;
        border-radius: 2px;
        padding: 2px 4px;
        cursor: pointer;
        font-size: 0.75rem;
    }

    :global(.rich-text-editor .editor-toolbar button:hover) {
        color: var(--dh2e-gold, #b49545);
        border-color: var(--dh2e-border, #4a4a55);
    }

    :global(.rich-text-editor .editor-toolbar button.active) {
        color: var(--dh2e-gold, #b49545);
        background: var(--dh2e-bg-mid, #2e2e35);
    }

    :global(.rich-text-editor .ProseMirror) {
        flex: 1;
        padding: var(--dh2e-space-sm, 0.5rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-sm, 0.8rem);
        line-height: 1.5;
        outline: none;
        overflow-y: auto;
        min-height: 80px;
    }

    :global(.rich-text-editor .ProseMirror:focus) {
        box-shadow: inset 0 0 4px var(--dh2e-gold-dark, #7a6228);
    }

    :global(.rich-text-editor .ProseMirror p) {
        margin: 0 0 0.4em;
    }

    :global(.rich-text-editor .ProseMirror h1) {
        font-size: 1.2rem;
        color: var(--dh2e-gold, #b49545);
        margin: 0.6em 0 0.3em;
    }

    :global(.rich-text-editor .ProseMirror h2) {
        font-size: 1rem;
        color: var(--dh2e-gold, #b49545);
        margin: 0.5em 0 0.25em;
    }

    :global(.rich-text-editor .ProseMirror h3) {
        font-size: 0.9rem;
        color: var(--dh2e-gold, #b49545);
        margin: 0.4em 0 0.2em;
    }

    :global(.rich-text-editor .ProseMirror ul) {
        padding-left: 1.2em;
        margin: 0.3em 0;
    }

    :global(.rich-text-editor .ProseMirror ol) {
        padding-left: 1.2em;
        margin: 0.3em 0;
    }

    .rich-text-readonly {
        flex: 1;
        min-height: 80px;
        padding: var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-sm, 0.8rem);
        line-height: 1.5;
        overflow-y: auto;
    }
</style>
