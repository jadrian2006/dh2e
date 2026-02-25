<script lang="ts">
    let { formattedDate, isGM, onAdvanceDay, onSetDate }: {
        formattedDate: string;
        isGM: boolean;
        onAdvanceDay: (days: number) => void;
        onSetDate: () => void;
    } = $props();
</script>

<div class="imperial-date-display">
    <div class="date-label">Imperial Date</div>
    <div class="date-value">{formattedDate}</div>
    {#if isGM}
        <div class="date-controls">
            <button class="date-btn" onclick={() => onAdvanceDay(1)} title="Advance 1 day">
                <i class="fa-solid fa-forward-step"></i> +1 Day
            </button>
            <button class="date-btn" onclick={() => onAdvanceDay(7)} title="Advance 7 days">
                <i class="fa-solid fa-forward"></i> +7 Days
            </button>
            <button class="date-btn" onclick={onSetDate} title="Set exact date">
                <i class="fa-solid fa-calendar-pen"></i> Set Date
            </button>
        </div>
    {/if}
</div>

<style lang="scss">
    .imperial-date-display {
        text-align: center;
        padding: var(--dh2e-space-md) var(--dh2e-space-lg);
        background: var(--dh2e-bg-darkest);
        border: 1px solid var(--dh2e-gold-dark);
        border-radius: 4px;
    }
    .date-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--dh2e-text-secondary);
        margin-bottom: 4px;
    }
    .date-value {
        font-family: var(--dh2e-font-header);
        font-size: 1.5rem;
        color: var(--dh2e-gold);
        letter-spacing: 0.05em;
    }
    .date-controls {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-top: var(--dh2e-space-sm);
    }
    .date-btn {
        font-size: 0.65rem;
        padding: 3px 8px;
        border: 1px solid var(--dh2e-border);
        border-radius: 3px;
        background: var(--dh2e-bg-mid);
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
            border-color: var(--dh2e-gold-dark);
            color: var(--dh2e-gold);
        }
        i { margin-right: 2px; }
    }
</style>
