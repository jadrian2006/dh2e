<script lang="ts">
    let { deadlines, isGM, onSetDeadline, onRemoveDeadline }: {
        deadlines: {
            objectiveId: string;
            objectiveName: string;
            formattedDeadline: string;
            daysRemaining: number;
            overdue: boolean;
        }[];
        isGM: boolean;
        onSetDeadline: () => void;
        onRemoveDeadline: (objectiveId: string) => void;
    } = $props();

    function urgencyClass(days: number, overdue: boolean): string {
        if (overdue) return "overdue";
        if (days === 0) return "today";
        if (days <= 3) return "urgent";
        return "normal";
    }
</script>

<div class="deadline-tracker">
    <div class="deadline-header">
        <h3 class="deadline-title">
            <i class="fa-solid fa-hourglass-half"></i> Objective Deadlines
        </h3>
        {#if isGM}
            <button class="add-deadline-btn" onclick={onSetDeadline}>
                <i class="fa-solid fa-plus"></i> Set Deadline
            </button>
        {/if}
    </div>

    {#if deadlines.length === 0}
        <p class="empty-state">No deadlines set.</p>
    {:else}
        <div class="deadline-list">
            {#each deadlines as dl (dl.objectiveId)}
                <div class="deadline-row {urgencyClass(dl.daysRemaining, dl.overdue)}">
                    <div class="deadline-info">
                        <span class="deadline-name">{dl.objectiveName}</span>
                        <span class="deadline-date">{dl.formattedDeadline}</span>
                    </div>
                    <div class="deadline-countdown">
                        {#if dl.overdue}
                            <span class="countdown overdue">OVERDUE</span>
                        {:else if dl.daysRemaining === 0}
                            <span class="countdown today">TODAY</span>
                        {:else}
                            <span class="countdown">{dl.daysRemaining} days</span>
                        {/if}
                        {#if isGM}
                            <button
                                class="remove-btn"
                                onclick={() => onRemoveDeadline(dl.objectiveId)}
                                title="Remove deadline"
                            >
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .deadline-tracker {
        border-top: 1px solid var(--dh2e-border);
        padding-top: var(--dh2e-space-sm);
    }
    .deadline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 var(--dh2e-space-md) var(--dh2e-space-sm);
    }
    .deadline-title {
        font-size: 0.8rem;
        color: var(--dh2e-gold);
        margin: 0;
        i { margin-right: 4px; }
    }
    .add-deadline-btn {
        font-size: 0.65rem;
        padding: 3px 8px;
        border: 1px solid var(--dh2e-gold-dark);
        border-radius: 3px;
        background: var(--dh2e-bg-mid);
        color: var(--dh2e-gold);
        cursor: pointer;
        &:hover { background: var(--dh2e-gold-dark); color: var(--dh2e-bg-darkest); }
        i { margin-right: 3px; }
    }
    .deadline-list {
        display: flex;
        flex-direction: column;
    }
    .deadline-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--dh2e-space-xs) var(--dh2e-space-md);
        border-left: 3px solid transparent;

        &.normal { border-left-color: var(--dh2e-text-secondary); }
        &.urgent { border-left-color: #cc8800; background: rgba(204, 136, 0, 0.05); }
        &.today { border-left-color: #cc4400; background: rgba(204, 68, 0, 0.08); }
        &.overdue { border-left-color: #cc0000; background: rgba(204, 0, 0, 0.1); }
    }
    .deadline-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .deadline-name {
        font-size: 0.75rem;
        color: var(--dh2e-text-primary);
        font-weight: bold;
    }
    .deadline-date {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary);
        font-family: monospace;
    }
    .deadline-countdown {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .countdown {
        font-size: 0.7rem;
        font-weight: bold;
        color: var(--dh2e-text-secondary);

        &.urgent { color: #cc8800; }
        &.today { color: #cc4400; }
        &.overdue { color: #cc0000; }
    }
    .remove-btn {
        font-size: 0.6rem;
        padding: 2px 4px;
        border: 1px solid var(--dh2e-border);
        border-radius: 2px;
        background: transparent;
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        opacity: 0;
        .deadline-row:hover & { opacity: 1; }
        &:hover { color: #cc4444; border-color: #cc4444; }
    }
    .empty-state {
        text-align: center;
        color: var(--dh2e-text-secondary);
        font-style: italic;
        font-size: 0.75rem;
        padding: var(--dh2e-space-md);
    }
</style>
