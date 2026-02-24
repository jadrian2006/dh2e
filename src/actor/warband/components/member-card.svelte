<script lang="ts">
    let { card, editable, onRemove, onOpen }: {
        card: any;
        editable: boolean;
        onRemove: () => void;
        onOpen: () => void;
    } = $props();

    const woundColor = $derived(
        card.wounds.pct > 50 ? "var(--dh2e-success)"
        : card.wounds.pct > 25 ? "var(--dh2e-warning)"
        : "var(--dh2e-danger)"
    );
</script>

<div class="member-card" role="button" tabindex="0" onclick={onOpen} onkeydown={(e) => { if (e.key === 'Enter') onOpen(); }}>
    <img class="member-portrait" src={card.img} alt={card.name} />
    <span class="member-name">{card.name}</span>
    {#if card.role}
        <span class="member-role">{card.role}</span>
    {/if}

    <!-- Wound bar -->
    <div class="wound-bar" title="{card.wounds.value}/{card.wounds.max} Wounds">
        <div class="wound-fill" style="width: {card.wounds.pct}%; background: {woundColor};"></div>
    </div>

    <!-- Fate pips -->
    <div class="fate-pips" title="{card.fate.value}/{card.fate.max} Fate">
        {#each Array(card.fate.max) as _, i}
            <span class="pip" class:filled={i < card.fate.value}></span>
        {/each}
    </div>

    {#if editable}
        <button
            class="remove-btn"
            title="Remove from warband"
            onclick={(e: MouseEvent) => { e.stopPropagation(); onRemove(); }}
        >
            <i class="fa-solid fa-xmark"></i>
        </button>
    {/if}
</div>

<style lang="scss">
    .member-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
        border: 1px solid var(--dh2e-border);
        border-radius: var(--dh2e-radius-md);
        background: var(--dh2e-bg-mid);
        cursor: pointer;
        min-width: 80px;
        position: relative;
        transition: border-color var(--dh2e-transition-fast);

        &:hover {
            border-color: var(--dh2e-gold);
        }
    }
    .member-portrait {
        width: 48px;
        height: 48px;
        border-radius: var(--dh2e-radius-sm);
        border: 1px solid var(--dh2e-gold-dark);
        object-fit: cover;
    }
    .member-name {
        font-family: var(--dh2e-font-header);
        font-size: 0.7rem;
        color: var(--dh2e-text-primary);
        text-align: center;
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .member-role {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
    .wound-bar {
        width: 100%;
        height: 4px;
        background: var(--dh2e-bg-darkest);
        border-radius: 2px;
        overflow: hidden;
    }
    .wound-fill {
        height: 100%;
        transition: width 0.3s ease;
    }
    .fate-pips {
        display: flex;
        gap: 2px;
    }
    .pip {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-dark);
        background: transparent;

        &.filled {
            background: var(--dh2e-gold);
        }
    }
    .remove-btn {
        position: absolute;
        top: 2px;
        right: 2px;
        background: none;
        border: none;
        color: var(--dh2e-text-secondary);
        cursor: pointer;
        font-size: 0.65rem;
        padding: 2px;
        line-height: 1;
        opacity: 0;
        transition: opacity var(--dh2e-transition-fast);

        .member-card:hover & {
            opacity: 1;
        }

        &:hover {
            color: var(--dh2e-red-bright);
        }
    }
</style>
