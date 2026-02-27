<script lang="ts">
    let { objectives, editable, onAdd, onOpen, onComplete, onFail, onReactivate, onDelete }: {
        objectives: any[];
        editable: boolean;
        onAdd: () => void;
        onOpen: (obj: any) => void;
        onComplete: (obj: any) => void;
        onFail: (obj: any) => void;
        onReactivate: (obj: any) => void;
        onDelete: (obj: any) => void;
    } = $props();

    const statusIcon = (s: string) =>
        s === "active" ? "fa-solid fa-circle-dot"
        : s === "completed" ? "fa-solid fa-circle-check"
        : "fa-solid fa-circle-xmark";

    const statusClass = (s: string) =>
        s === "active" ? "active"
        : s === "completed" ? "completed"
        : "failed";

    /** Sort: active first (newest first), then completed/failed (newest first) */
    const statusOrder: Record<string, number> = { active: 0, completed: 1, failed: 1 };
    const sorted = $derived(
        [...objectives].sort((a, b) => {
            const sa = statusOrder[a.system?.status ?? "active"] ?? 0;
            const sb = statusOrder[b.system?.status ?? "active"] ?? 0;
            if (sa !== sb) return sa - sb;
            return (b.system?.timestamp ?? 0) - (a.system?.timestamp ?? 0);
        }),
    );
</script>

<div class="personal-objectives">
    <div class="objectives-header">
        <h3 class="section-title">
            <i class="fa-solid fa-scroll"></i>
            Personal Objectives
        </h3>
        {#if editable}
            <button class="add-btn" onclick={onAdd} title="Add Personal Objective">
                <i class="fa-solid fa-plus"></i>
            </button>
        {/if}
    </div>

    <div class="objectives-box">
    {#if sorted.length === 0}
        <p class="empty">No personal objectives.</p>
    {:else}
        <div class="objectives-list">
            {#each sorted as obj (obj.id)}
                {@const sys = obj.system ?? {}}
                {@const status = sys.status ?? "active"}
                <div class="objective-item status-{status}">
                    <span class="status-dot {statusClass(status)}">
                        <i class={statusIcon(status)}></i>
                    </span>
                    <span
                        class="obj-name"
                        role="button"
                        tabindex="0"
                        onclick={() => onOpen(obj)}
                        onkeydown={(e) => { if (e.key === 'Enter') onOpen(obj); }}
                    >
                        {obj.name ?? "Untitled"}
                    </span>

                    {#if editable}
                        <div class="obj-actions">
                            {#if status === "active"}
                                <button class="tiny-btn" title="Complete" onclick={() => onComplete(obj)}>
                                    <i class="fa-solid fa-check"></i>
                                </button>
                                <button class="tiny-btn" title="Fail" onclick={() => onFail(obj)}>
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            {:else}
                                <button class="tiny-btn" title="Reactivate" onclick={() => onReactivate(obj)}>
                                    <i class="fa-solid fa-rotate-left"></i>
                                </button>
                            {/if}
                            <button class="tiny-btn delete" title="Delete" onclick={() => onDelete(obj)}>
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
    </div>
</div>

<style lang="scss">
    .personal-objectives {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs);
    }
    .objectives-header {
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
    .objectives-box {
        max-height: 160px;
        overflow-y: auto;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-mid, #2e2e35);
        padding: 2px 4px;
    }
    .empty {
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        margin: 4px 0;
    }
    .objectives-list {
        display: flex;
        flex-direction: column;
    }
    .objective-item {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs);
        padding: 3px 0;
        border-bottom: 1px solid var(--dh2e-border);
        &:last-child { border-bottom: none; }

        &.status-completed { opacity: 0.6; }
        &.status-failed { opacity: 0.5; }
    }
    .status-dot {
        font-size: 0.65rem;
        flex-shrink: 0;
        &.active { color: var(--dh2e-success); }
        &.completed { color: var(--dh2e-info, #6a9abc); }
        &.failed { color: var(--dh2e-danger); }
    }
    .obj-name {
        flex: 1;
        font-size: 0.75rem;
        color: var(--dh2e-text-primary);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        &:hover { color: var(--dh2e-gold); }
    }
    .obj-actions {
        display: flex;
        gap: 2px;
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
