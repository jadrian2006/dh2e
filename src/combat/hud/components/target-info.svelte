<script lang="ts">
    let {
        info,
    }: {
        info: {
            name: string;
            type: string;
            wounds?: { value: number; max: number };
            magnitude?: { value: number; max: number };
            si?: { value: number; max: number };
        } | null;
    } = $props();

    const barData = $derived(() => {
        if (!info) return null;
        if (info.type === "horde" && info.magnitude) {
            return { label: "Mag", value: info.magnitude.value, max: info.magnitude.max, color: "#6a8a4a" };
        }
        if (info.type === "vehicle" && info.si) {
            return { label: "SI", value: info.si.value, max: info.si.max, color: "#4a6a8a" };
        }
        if (info.wounds) {
            return { label: "W", value: info.wounds.value, max: info.wounds.max, color: "#8a4a4a" };
        }
        return null;
    });
</script>

<div class="target-info">
    {#if info}
        <span class="target-name">{info.name}</span>
        {#if barData()}
            {@const bar = barData()!}
            <div class="target-bar-container">
                <span class="bar-label">{bar.label}</span>
                <div class="target-bar">
                    <div
                        class="target-bar-fill"
                        style="width: {bar.max > 0 ? (bar.value / bar.max) * 100 : 0}%; background: {bar.color};"
                    ></div>
                </div>
                <span class="bar-value">{bar.value}/{bar.max}</span>
            </div>
        {/if}
    {/if}
</div>

<style lang="scss">
    .target-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 80px;
    }
    .target-name {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .target-bar-container {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .bar-label {
        font-size: 0.5rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-weight: 700;
    }
    .target-bar {
        flex: 1;
        height: 8px;
        background: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 1px;
        overflow: hidden;
    }
    .target-bar-fill {
        height: 100%;
        transition: width 0.3s;
    }
    .bar-value {
        font-size: 0.55rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 700;
        white-space: nowrap;
    }
</style>
