<script lang="ts">
    let { notes, editable, onAdd, onOpen, onDelete }: {
        notes: any[];
        editable: boolean;
        onAdd: () => void;
        onOpen: (note: any) => void;
        onDelete: (note: any) => void;
    } = $props();

    const sorted = $derived(
        [...notes].sort((a, b) => (b.system?.timestamp ?? 0) - (a.system?.timestamp ?? 0)),
    );

    function formatDate(ts: number): string {
        if (!ts) return "";
        return new Date(ts).toLocaleDateString("en-GB", {
            day: "numeric", month: "short",
        });
    }
</script>

<div class="personal-notes">
    <div class="notes-header">
        <h3 class="section-title">
            <i class="fa-solid fa-file-lines"></i>
            Personal Notes
        </h3>
        {#if editable}
            <button class="add-btn" onclick={onAdd} title="Add Personal Note">
                <i class="fa-solid fa-plus"></i>
            </button>
        {/if}
    </div>

    {#if sorted.length === 0}
        <p class="empty">No personal notes.</p>
    {:else}
        <div class="notes-list">
            {#each sorted as note (note.id)}
                <div class="note-item">
                    <img class="note-icon" src={note.img} alt="" width="20" height="20" />
                    <span
                        class="note-name"
                        role="button"
                        tabindex="0"
                        onclick={() => onOpen(note)}
                        onkeydown={(e) => { if (e.key === 'Enter') onOpen(note); }}
                    >
                        {note.name ?? "Untitled"}
                    </span>
                    <span class="note-date">{formatDate(note.system?.timestamp)}</span>
                    {#if editable}
                        <button class="tiny-btn delete" title="Delete" onclick={() => onDelete(note)}>
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .personal-notes {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs);
    }
    .notes-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .section-title {
        font-family: var(--dh2e-font-header);
        font-size: 0.8rem;
        color: var(--dh2e-gold);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
        i { margin-right: 4px; font-size: 0.7rem; }
    }
    .add-btn {
        background: none;
        border: 1px solid var(--dh2e-gold-dark);
        border-radius: 3px;
        color: var(--dh2e-gold);
        cursor: pointer;
        padding: 2px 6px;
        font-size: 0.65rem;
        transition: all 0.15s;
        &:hover { background: var(--dh2e-gold-dark); color: var(--dh2e-bg-darkest); }
    }
    .empty {
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        margin: 0;
    }
    .notes-list {
        display: flex;
        flex-direction: column;
    }
    .note-item {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs);
        padding: 3px 0;
        border-bottom: 1px solid var(--dh2e-border);
    }
    .note-icon {
        flex-shrink: 0;
        border-radius: 2px;
        border: 1px solid var(--dh2e-border);
    }
    .note-name {
        flex: 1;
        font-size: 0.75rem;
        color: var(--dh2e-text-primary);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        &:hover { color: var(--dh2e-gold); }
    }
    .note-date {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary);
        flex-shrink: 0;
    }
    .tiny-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.6rem;
        padding: 2px 3px;
        color: var(--dh2e-text-secondary);
        transition: color 0.15s;
        &:hover { color: var(--dh2e-gold); }
        &.delete:hover { color: var(--dh2e-red-bright); }
    }
</style>
