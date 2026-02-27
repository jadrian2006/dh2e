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

    let editorWrapperEl: HTMLDivElement | undefined = $state();
    let editorContentEl: HTMLDivElement | undefined = $state();
    let editor: foundry.applications.ux.ProseMirrorEditor | null = $state(null);
    let showToolbar = $state(false);

    /** Extract HTML from the current editor state */
    function extractHTML(): string {
        if (!editor) return content;
        try {
            const editorDoc = editor.view?.state?.doc;
            if (editorDoc && foundry.prosemirror?.dom?.serializeString) {
                return foundry.prosemirror.dom.serializeString(editorDoc);
            }
        } catch { /* fallback below */ }
        // Fallback: grab innerHTML from ProseMirror content div
        const pmEl = editorWrapperEl?.querySelector(".ProseMirror");
        return pmEl?.innerHTML ?? content;
    }

    $effect(() => {
        if (!editable || !editorContentEl) return;

        let destroyed = false;
        let instance: foundry.applications.ux.ProseMirrorEditor | null = null;

        // Mount on the inner .editor-content div — Foundry's menu plugin
        // will find the .editor ancestor and structure the toolbar there.
        foundry.applications.ux.ProseMirrorEditor.create(editorContentEl, content, {
            document: doc,
            fieldName,
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
    <div class="editor prosemirror rich-text-editor" class:toolbar-hidden={!showToolbar} bind:this={editorWrapperEl}>
        <button
            class="toolbar-toggle"
            title={showToolbar ? "Hide formatting" : "Show formatting"}
            onclick={() => showToolbar = !showToolbar}
        >
            <i class="fa-solid fa-pen-fancy"></i>
        </button>
        <div class="editor-content" bind:this={editorContentEl}></div>
    </div>
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
        position: relative;
    }

    .toolbar-toggle {
        position: absolute;
        top: 3px;
        right: 4px;
        z-index: 5;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.65rem;
        padding: 2px 4px;
        border-radius: 2px;
        color: var(--dh2e-text-secondary, #a0a0a8);
        opacity: 0.5;
        transition: opacity 0.15s, color 0.15s;

        &:hover {
            opacity: 1;
            color: var(--dh2e-gold, #b49545);
        }
    }

    /* Hide toolbar when toggled off */
    :global(.toolbar-hidden menu.editor-menu) {
        display: none !important;
    }

    /* Compact toolbar sizing */
    :global(.rich-text-editor menu.editor-menu) {
        padding: 3px 4px;
        gap: 2px;
        border-radius: 3px;
    }

    :global(.rich-text-editor menu.editor-menu button) {
        --menu-height: 22px;
        height: 22px;
        line-height: 22px;
        padding: 0 4px;
        font-size: 0.7rem;
    }

    :global(.rich-text-editor menu.editor-menu .pm-dropdown) {
        font-size: 0.7rem;
        gap: 2px;
    }

    :global(.rich-text-editor menu.editor-menu .pm-dropdown i.fa-chevron-down) {
        font-size: 0.5rem;
    }

    /* Grimdark theme overrides for ProseMirror content */
    :global(.rich-text-editor .editor-content) {
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-sm, 0.8rem);
        line-height: 1.5;
    }

    :global(.rich-text-editor .editor-content h1) {
        color: var(--dh2e-gold, #b49545);
    }

    :global(.rich-text-editor .editor-content h2) {
        color: var(--dh2e-gold, #b49545);
    }

    :global(.rich-text-editor .editor-content h3) {
        color: var(--dh2e-gold, #b49545);
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
