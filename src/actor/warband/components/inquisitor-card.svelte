<script lang="ts">
    let { inquisitor, editable, onRemove, onOpen }: {
        inquisitor: any;
        editable: boolean;
        onRemove: () => void;
        onOpen: () => void;
    } = $props();

    const influence = $derived(inquisitor?.system?.influence ?? 0);
    const wounds = $derived(inquisitor?.system?.wounds ?? { value: 0, max: 0 });
    const woundPct = $derived(wounds.max > 0 ? (wounds.value / wounds.max) * 100 : 0);
    const woundColor = $derived(
        woundPct > 50 ? "var(--dh2e-success)"
        : woundPct > 25 ? "var(--dh2e-warning)"
        : "var(--dh2e-danger)"
    );
</script>

<div class="inquisitor-card" role="button" tabindex="0" onclick={onOpen} onkeydown={(e) => { if (e.key === 'Enter') onOpen(); }}>
    <img class="inquisitor-portrait" src={inquisitor?.img ?? ""} alt={inquisitor?.name ?? "Inquisitor"} />

    <div class="inquisitor-info">
        <span class="inquisitor-title">Inquisitor</span>
        <span class="inquisitor-name">{inquisitor?.name ?? "Unknown"}</span>

        <div class="inquisitor-stats">
            <span class="stat influence" title="Influence">
                <i class="fa-solid fa-scale-balanced"></i>
                {influence}
            </span>
            <span class="stat wounds" title="{wounds.value}/{wounds.max} Wounds">
                <i class="fa-solid fa-heart"></i>
                {wounds.value}/{wounds.max}
            </span>
        </div>

        <!-- Wound bar -->
        <div class="wound-bar">
            <div class="wound-fill" style="width: {woundPct}%; background: {woundColor};"></div>
        </div>
    </div>

    {#if editable}
        <button
            class="remove-btn"
            title="Remove Inquisitor"
            onclick={(e: MouseEvent) => { e.stopPropagation(); onRemove(); }}
        >
            <i class="fa-solid fa-xmark"></i>
        </button>
    {/if}
</div>

<style lang="scss">
    .inquisitor-card {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-md);
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        border: 2px solid var(--dh2e-gold);
        border-radius: var(--dh2e-radius-md);
        background: linear-gradient(135deg, var(--dh2e-bg-mid) 0%, var(--dh2e-bg-darkest) 100%);
        cursor: pointer;
        position: relative;
        transition: border-color var(--dh2e-transition-fast);

        &:hover {
            border-color: var(--dh2e-gold-bright, #e8c85e);
        }
    }
    .inquisitor-portrait {
        width: 80px;
        height: 80px;
        border-radius: var(--dh2e-radius-sm);
        border: 2px solid var(--dh2e-gold);
        object-fit: cover;
        flex-shrink: 0;
    }
    .inquisitor-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
    }
    .inquisitor-title {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--dh2e-gold);
        font-variant: small-caps;
    }
    .inquisitor-name {
        font-family: var(--dh2e-font-header);
        font-size: 1rem;
        color: var(--dh2e-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .inquisitor-stats {
        display: flex;
        gap: var(--dh2e-space-md);
        margin-top: 2px;
    }
    .stat {
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary);
        display: flex;
        align-items: center;
        gap: 4px;

        i { font-size: 0.65rem; }

        &.influence {
            color: var(--dh2e-gold);
            font-weight: 700;
        }
    }
    .wound-bar {
        width: 100%;
        height: 4px;
        background: var(--dh2e-bg-darkest);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 4px;
    }
    .wound-fill {
        height: 100%;
        transition: width 0.3s ease;
    }
    .remove-btn {
        position: absolute;
        top: 4px;
        right: 6px;
        background: none;
        border: none;
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        font-size: 0.7rem;
        padding: 2px 4px;
        line-height: 1;
        opacity: 0;
        transition: opacity var(--dh2e-transition-fast);

        .inquisitor-card:hover & { opacity: 1; }
        &:hover { color: var(--dh2e-red-bright); }
    }
</style>
