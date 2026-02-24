<script lang="ts">
    let { objective, canManage, onOpen, onComplete, onFail, onReactivate, onDelete }: {
        objective: any;
        canManage: boolean;
        onOpen: () => void;
        onComplete: () => void;
        onFail: () => void;
        onReactivate: () => void;
        onDelete: () => void;
    } = $props();

    const sys = $derived(objective.system ?? {});
    const status = $derived(sys.status ?? "active");
    const isActive = $derived(status === "active");

    const statusIcon = $derived(
        status === "active" ? "fa-solid fa-circle-dot"
        : status === "completed" ? "fa-solid fa-circle-check"
        : "fa-solid fa-circle-xmark"
    );

    function excerpt(text: string, max = 80): string {
        if (!text || text.length <= max) return text || "";
        return text.slice(0, max) + "...";
    }

    function formatDate(ts: number): string {
        if (!ts) return "";
        return new Date(ts).toLocaleDateString("en-GB", {
            day: "numeric", month: "short",
        });
    }
</script>

<div class="objective-row status-{status}">
    <span class="status-icon {status}" title={status}>
        <i class={statusIcon}></i>
    </span>

    <div class="objective-info" role="button" tabindex="0" onclick={onOpen} onkeydown={(e) => { if (e.key === 'Enter') onOpen(); }}>
        <span class="objective-title">{objective.name ?? "Untitled"}</span>
        {#if sys.description}
            <span class="objective-excerpt">{excerpt(sys.description)}</span>
        {/if}
    </div>

    <div class="objective-meta">
        {#if sys.assignedBy}
            <span class="meta-tag assigned">{sys.assignedBy}</span>
        {/if}
        {#if sys.timestamp}
            <span class="meta-tag date">{formatDate(sys.timestamp)}</span>
        {/if}
    </div>

    {#if canManage}
        <div class="objective-actions">
            {#if isActive}
                <button class="action-btn complete" title="Complete" onclick={onComplete}>
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="action-btn fail" title="Fail" onclick={onFail}>
                    <i class="fa-solid fa-xmark"></i>
                </button>
            {:else}
                <button class="action-btn reactivate" title="Reactivate" onclick={onReactivate}>
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
            {/if}
            <button class="action-btn delete" title="Delete" onclick={onDelete}>
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    {/if}
</div>

<style lang="scss">
    .objective-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm);
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
        border-bottom: 1px solid var(--dh2e-border);
        transition: background var(--dh2e-transition-fast);

        &:hover { background: var(--dh2e-bg-mid); }

        &.status-completed { opacity: 0.7; }
        &.status-failed { opacity: 0.6; }
    }
    .status-icon {
        font-size: 0.8rem;
        flex-shrink: 0;
        &.active { color: var(--dh2e-success); }
        &.completed { color: var(--dh2e-info, #6a9abc); }
        &.failed { color: var(--dh2e-danger); }
    }
    .objective-info {
        flex: 1;
        min-width: 0;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
    .objective-title {
        font-family: var(--dh2e-font-header);
        font-size: 0.8rem;
        color: var(--dh2e-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .objective-excerpt {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .objective-meta {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
    }
    .meta-tag {
        font-size: 0.6rem;
        padding: 1px 5px;
        border-radius: 2px;
        background: var(--dh2e-bg-darkest);
        color: var(--dh2e-text-secondary);
    }
    .objective-actions {
        display: flex;
        gap: 2px;
        flex-shrink: 0;
    }
    .action-btn {
        background: none;
        border: 1px solid transparent;
        cursor: pointer;
        font-size: 0.65rem;
        padding: 2px 5px;
        border-radius: 3px;
        color: var(--dh2e-text-secondary);
        transition: color var(--dh2e-transition-fast), border-color var(--dh2e-transition-fast);

        &.complete:hover { color: var(--dh2e-success); border-color: var(--dh2e-success); }
        &.fail:hover { color: var(--dh2e-danger); border-color: var(--dh2e-danger); }
        &.reactivate:hover { color: var(--dh2e-info, #6a9abc); border-color: var(--dh2e-info, #6a9abc); }
        &.delete:hover { color: var(--dh2e-red-bright); border-color: var(--dh2e-red-bright); }
    }
</style>
