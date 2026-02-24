<script lang="ts">
    let {
        conditions = [],
    }: {
        conditions: any[];
    } = $props();
</script>

<div class="condition-strip">
    {#each conditions as cond}
        <div class="cond-chip" title={cond.system?.description ?? cond.name}>
            <span class="cond-name">{cond.name}</span>
            {#if cond.system?.remainingRounds > 0}
                <span class="cond-rounds">{cond.system.remainingRounds}r</span>
            {/if}
        </div>
    {:else}
        <span class="no-conditions">No conditions</span>
    {/each}
</div>

<style lang="scss">
    .condition-strip { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; }
    .cond-chip {
        display: flex; align-items: center; gap: 3px;
        padding: 2px 6px;
        background: rgba(180, 60, 60, 0.3);
        border: 1px solid rgba(180, 60, 60, 0.5);
        border-radius: 2px;
        font-size: 0.6rem;
        color: #e88;
    }
    .cond-name { font-weight: 700; }
    .cond-rounds { font-size: 0.5rem; color: #c66; }
    .no-conditions { font-size: 0.55rem; color: var(--dh2e-text-secondary, #a0a0a8); font-style: italic; }
</style>
