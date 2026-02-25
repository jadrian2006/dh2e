<script lang="ts">
    let {
        tokenImg,
        name,
        background,
        wounds,
        fate,
    }: {
        tokenImg: string;
        name: string;
        background?: string;
        wounds: { value: number; max: number };
        fate: { current: number; max: number };
    } = $props();

    const woundPct = $derived(wounds.max > 0 ? Math.max(0, Math.min(100, (wounds.value / wounds.max) * 100)) : 0);
    const woundColor = $derived(woundPct > 50 ? "#4a8a4a" : woundPct > 25 ? "#8a8a4a" : "#8a4a4a");
</script>

<div class="portrait-section">
    <img class="portrait-img" src={tokenImg} alt={name} />
    <div class="portrait-details">
        <span class="portrait-name">{name}</span>
        {#if background}
            <span class="portrait-bg">{background}</span>
        {/if}
        <div class="wound-row">
            <span class="wound-label">{game.i18n?.localize?.("DH2E.HUD.Wounds") ?? "W"}:</span>
            <div class="wound-bar">
                <div class="wound-fill" style="width: {woundPct}%; background: {woundColor};"></div>
            </div>
            <span class="wound-val">{wounds.value}/{wounds.max}</span>
        </div>
        <div class="fate-row">
            <span class="fate-label">{game.i18n?.localize?.("DH2E.HUD.Fate") ?? "F"}:</span>
            {#each Array(fate.max) as _, i}
                <span class="fate-dot" class:filled={i < fate.current}></span>
            {/each}
        </div>
    </div>
</div>

<style lang="scss">
    .portrait-section {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        align-items: center;
    }

    .portrait-img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid var(--dh2e-gold-dark, #9c7a28);
        object-fit: cover;
        flex-shrink: 0;
    }

    .portrait-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
    }

    .portrait-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .portrait-bg {
        font-size: var(--dh2e-text-xxs, 0.65rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .wound-row {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .wound-label {
        font-size: 0.55rem;
        font-weight: 700;
        color: var(--dh2e-text-secondary, #a0a0a8);
        width: 1rem;
    }

    .wound-bar {
        flex: 1;
        height: 6px;
        background: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 1px;
        overflow: hidden;
    }

    .wound-fill {
        height: 100%;
        transition: width 0.3s;
    }

    .wound-val {
        font-size: 0.55rem;
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
    }

    .fate-row {
        display: flex;
        align-items: center;
        gap: 3px;
    }

    .fate-label {
        font-size: 0.55rem;
        font-weight: 700;
        color: var(--dh2e-text-secondary, #a0a0a8);
        width: 1rem;
    }

    .fate-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        background: transparent;

        &.filled {
            background: var(--dh2e-gold, #b49545);
        }
    }
</style>
