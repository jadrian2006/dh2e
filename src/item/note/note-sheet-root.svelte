<script lang="ts">
    import RichTextEditor from "@sheet/components/rich-text-editor.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});

    function formatDate(ts: number): string {
        if (!ts) return "";
        return new Date(ts).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    }

    async function saveContent(html: string) {
        if (!ctx.item || !ctx.editable) return;
        await ctx.item.update({ "system.content": html });
    }
</script>

<div class="note-sheet">
    <header class="note-header">
        <img
            class="note-icon"
            src={ctx.img}
            alt=""
            width="36"
            height="36"
        />
        <div class="note-title-block">
            {#if ctx.editable}
                <input
                    type="text"
                    class="note-title-input"
                    value={ctx.name}
                    placeholder="Note Title"
                    onchange={(e) => ctx.item?.update({ name: (e.target as HTMLInputElement).value })}
                />
            {:else}
                <h2 class="note-title">{ctx.name}</h2>
            {/if}
            {#if sys.timestamp}
                <span class="note-date">{formatDate(sys.timestamp)}</span>
            {/if}
        </div>
    </header>

    <div class="note-content">
        <RichTextEditor
            content={sys.content ?? ""}
            editable={ctx.editable}
            onSave={saveContent}
            document={ctx.item}
            fieldName="system.content"
        />
    </div>
</div>

<style lang="scss">
    .note-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark, #22222a);
    }

    .note-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        background: var(--dh2e-bg-darkest, #1a1a22);
    }

    .note-icon {
        flex-shrink: 0;
        border-radius: 3px;
        border: 1px solid var(--dh2e-border, #4a4a55);
    }

    .note-title-block {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .note-title-input {
        width: 100%;
        font-family: var(--dh2e-font-header, serif);
        font-size: 1.1rem;
        color: var(--dh2e-gold, #b49545);
        background: transparent;
        border: none;
        border-bottom: 1px dashed var(--dh2e-border, #4a4a55);
        padding: 2px 0;

        &:focus {
            outline: none;
            border-bottom-style: solid;
            border-color: var(--dh2e-gold, #b49545);
        }
    }

    .note-title {
        font-family: var(--dh2e-font-header, serif);
        font-size: 1.1rem;
        color: var(--dh2e-gold, #b49545);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .note-date {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        letter-spacing: 0.03em;
    }

    .note-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: var(--dh2e-space-sm, 0.5rem);
        overflow: hidden;
    }
</style>
