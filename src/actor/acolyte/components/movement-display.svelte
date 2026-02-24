<script lang="ts">
    let { movement }: {
        movement: { half: number; full: number; charge: number; run: number };
    } = $props();
</script>

<div class="movement-grid">
    <div class="move-cell">
        <span class="move-label">Half</span>
        <span class="move-value">{movement.half}</span>
    </div>
    <div class="move-cell">
        <span class="move-label">Full</span>
        <span class="move-value">{movement.full}</span>
    </div>
    <div class="move-cell">
        <span class="move-label">Charge</span>
        <span class="move-value">{movement.charge}</span>
    </div>
    <div class="move-cell">
        <span class="move-label">Run</span>
        <span class="move-value">{movement.run}</span>
    </div>
</div>

<style lang="scss">
    .movement-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .move-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
    }

    .move-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .move-value {
        font-size: var(--dh2e-text-md, 0.9rem);
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }
</style>
