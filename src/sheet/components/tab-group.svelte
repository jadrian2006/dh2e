<script lang="ts">
    let { tabs, activeTab = $bindable("summary"), children }: {
        tabs: { id: string; label: string; icon?: string }[];
        activeTab: string;
        children: any;
    } = $props();

    function selectTab(id: string) {
        activeTab = id;
    }
</script>

<nav class="tab-group">
    {#each tabs as tab}
        <button
            class="tab-btn"
            class:active={activeTab === tab.id}
            onclick={() => selectTab(tab.id)}
            title={tab.label}
        >
            {#if tab.icon}
                <i class={tab.icon}></i>
            {/if}
            <span class="tab-label">{tab.label}</span>
        </button>
    {/each}
</nav>
<div class="tab-content">
    {@render children()}
</div>

<style lang="scss">
    .tab-group {
        display: flex;
        gap: 0;
        border-bottom: 2px solid var(--dh2e-gold-dark);
        background: var(--dh2e-bg-darkest);
        padding: 0 var(--dh2e-space-sm);
    }
    .tab-btn {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs);
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--dh2e-text-secondary);
        font-family: var(--dh2e-font-header);
        font-size: var(--dh2e-text-sm);
        padding: var(--dh2e-space-sm) var(--dh2e-space-sm);
        cursor: pointer;
        margin-bottom: -2px;
        transition: all var(--dh2e-transition-fast);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        font-size: 0.72rem;

        i {
            font-size: 0.85em;
        }

        &:hover {
            color: var(--dh2e-text-primary);
        }
        &.active {
            color: var(--dh2e-gold);
            border-bottom-color: var(--dh2e-gold);
        }
    }
    .tab-content {
        flex: 1;
        overflow-y: auto;
        padding: var(--dh2e-space-md);
    }
</style>
