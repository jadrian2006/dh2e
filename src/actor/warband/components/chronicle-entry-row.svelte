<script lang="ts">
    let { entry, isGM, onEdit, onDelete }: {
        entry: {
            id: string;
            formattedDate: string;
            title: string;
            body: string;
            author: string;
            category: string;
        };
        isGM: boolean;
        onEdit: () => void;
        onDelete: () => void;
    } = $props();

    const categoryIcons: Record<string, string> = {
        session: "fa-solid fa-book-open",
        event: "fa-solid fa-bolt",
        note: "fa-solid fa-note-sticky",
    };
</script>

<div class="chronicle-entry">
    <div class="entry-header">
        <span class="entry-category" title={entry.category}>
            <i class={categoryIcons[entry.category] ?? "fa-solid fa-circle"}></i>
        </span>
        <span class="entry-date">{entry.formattedDate}</span>
        <span class="entry-title">{entry.title}</span>
        {#if isGM}
            <span class="entry-actions">
                <button class="action-btn" onclick={onEdit} title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn danger" onclick={onDelete} title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </span>
        {/if}
    </div>
    {#if entry.body}
        <p class="entry-body">{entry.body}</p>
    {/if}
    <span class="entry-author">{entry.author}</span>
</div>

<style lang="scss">
    .chronicle-entry {
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        border-bottom: 1px solid var(--dh2e-border);
        transition: background 0.1s;
        &:hover { background: var(--dh2e-bg-mid); }
    }
    .entry-header {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .entry-category {
        font-size: 0.7rem;
        color: var(--dh2e-gold-dark);
        width: 20px;
        text-align: center;
    }
    .entry-date {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary);
        font-family: monospace;
        min-width: 90px;
    }
    .entry-title {
        font-size: 0.8rem;
        color: var(--dh2e-text-primary);
        font-weight: bold;
        flex: 1;
    }
    .entry-actions {
        display: flex;
        gap: 2px;
        opacity: 0;
        .chronicle-entry:hover & { opacity: 1; }
    }
    .action-btn {
        font-size: 0.6rem;
        padding: 2px 5px;
        border: 1px solid var(--dh2e-border);
        border-radius: 2px;
        background: var(--dh2e-bg-dark);
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        &:hover { color: var(--dh2e-gold); border-color: var(--dh2e-gold-dark); }
        &.danger:hover { color: #cc4444; border-color: #cc4444; }
    }
    .entry-body {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary);
        margin: 4px 0 2px 26px;
        line-height: 1.4;
    }
    .entry-author {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        margin-left: 26px;
    }
</style>
