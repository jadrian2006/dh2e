<script lang="ts">
    let {
        armour = { front: 0, side: 0, rear: 0 },
        editable = false,
        actor,
    }: {
        armour: { front: number; side: number; rear: number };
        editable: boolean;
        actor: any;
    } = $props();

    async function updateAP(facing: string, value: number) {
        await actor.update({ [`system.armour.${facing}`]: value });
    }
</script>

<div class="armour-facing">
    <h3 class="section-title">Armour</h3>
    <div class="facing-diagram">
        <div class="facing-cell front">
            <span class="facing-label">Front</span>
            {#if editable}
                <input type="number" class="ap-input" value={armour.front} min="0"
                    onchange={(e) => updateAP("front", Number((e.target as HTMLInputElement).value))} />
            {:else}
                <span class="ap-value">{armour.front}</span>
            {/if}
        </div>
        <div class="facing-cell side">
            <span class="facing-label">Side</span>
            {#if editable}
                <input type="number" class="ap-input" value={armour.side} min="0"
                    onchange={(e) => updateAP("side", Number((e.target as HTMLInputElement).value))} />
            {:else}
                <span class="ap-value">{armour.side}</span>
            {/if}
        </div>
        <div class="facing-cell rear">
            <span class="facing-label">Rear</span>
            {#if editable}
                <input type="number" class="ap-input" value={armour.rear} min="0"
                    onchange={(e) => updateAP("rear", Number((e.target as HTMLInputElement).value))} />
            {:else}
                <span class="ap-value">{armour.rear}</span>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .armour-facing {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .section-title {
        font-family: var(--dh2e-font-header, serif); font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e); text-transform: uppercase; letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e); margin: 0;
    }
    .facing-diagram {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        justify-content: center;
    }
    .facing-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        min-width: 80px;

        &.front { border-top: 3px solid var(--dh2e-gold, #c8a84e); }
        &.side { border-left: 3px solid #6a8a4a; border-right: 3px solid #6a8a4a; }
        &.rear { border-bottom: 3px solid #a04040; }
    }
    .facing-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }
    .ap-value {
        font-size: var(--dh2e-text-lg, 1.1rem);
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }
    .ap-input {
        width: 3rem;
        text-align: center;
        font-size: var(--dh2e-text-md, 0.9rem);
        font-weight: 700;
    }
</style>
