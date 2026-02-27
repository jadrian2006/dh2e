<script lang="ts">
    import FullView from "./components/full-view.svelte";
    import CompactView from "./components/compact-view.svelte";
    import LootView from "./components/loot-view.svelte";
    import ErrorBoundary from "../../ui/error-boundary.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let compactMode = $state(ctx.compactMode ?? false);
    const lootMode = $derived(ctx.lootMode ?? false);

    function toggleView() {
        compactMode = !compactMode;
        ctx.setCompactMode?.(compactMode);
    }

    /** Commit wound value change */
    function onWoundsChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const max = ctx.system?.wounds?.max ?? 0;
        const val = Math.max(0, Math.min(max, parseInt(input.value) || 0));
        ctx.actor?.update({ "system.wounds.value": val });
    }
</script>

<div class="npc-sheet" class:loot-mode={lootMode}>
    <header class="sheet-header">
        <div class="profile-wrapper">
            <img src={ctx.img} alt={ctx.name} class="profile-img" />
            {#if lootMode}
                <i class="fa-solid fa-skull skull-badge"></i>
            {/if}
        </div>
        <div class="header-info">
            {#if ctx.editable && !lootMode}
                <input
                    class="actor-name-input"
                    type="text"
                    value={ctx.name}
                    onchange={(e) => ctx.actor?.update({ name: (e.target as HTMLInputElement).value })}
                />
            {:else}
                <h1 class="actor-name">{ctx.name}</h1>
            {/if}
            {#if !lootMode}
                <div class="header-meta">
                    {#if ctx.editable}
                        <span class="wounds-inline">W:
                            <input type="number" class="wound-edit"
                                value={ctx.system?.wounds?.value ?? 0}
                                onchange={onWoundsChange}
                                min="0" max={ctx.system?.wounds?.max ?? 0} />/{ctx.system?.wounds?.max ?? 0}
                        </span>
                    {:else}
                        <span class="wounds-inline">W: {ctx.system?.wounds?.value ?? 0}/{ctx.system?.wounds?.max ?? 0}</span>
                    {/if}
                </div>
            {/if}
        </div>
        {#if !lootMode}
            <button type="button" class="view-toggle" onclick={toggleView} title={compactMode ? "Full View" : "Compact View"}>
                <i class={compactMode ? "fa-solid fa-expand" : "fa-solid fa-compress"}></i>
            </button>
        {/if}
    </header>

    <section class="sheet-body">
        <ErrorBoundary label={lootMode ? "NPC Loot View" : compactMode ? "NPC Compact View" : "NPC Full View"}>
            {#if lootMode}
                <LootView {ctx} />
            {:else if compactMode}
                <CompactView {ctx} />
            {:else}
                <FullView {ctx} />
            {/if}
        </ErrorBoundary>
    </section>
</div>

<style lang="scss">
    .npc-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark);
    }

    .sheet-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-bottom: 1px solid var(--dh2e-gold-muted, #7a6a3e);
    }

    .profile-wrapper {
        position: relative;
        flex-shrink: 0;
    }

    .profile-img {
        width: 48px;
        height: 48px;
        border-radius: var(--dh2e-radius-sm, 3px);
        object-fit: cover;
        border: 1px solid var(--dh2e-border, #4a4a55);
    }

    .skull-badge {
        position: absolute;
        bottom: -2px;
        right: -2px;
        font-size: 0.7rem;
        color: var(--dh2e-danger, #c0392b);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-radius: 50%;
        padding: 2px;
    }

    .loot-mode .profile-img {
        opacity: 0.7;
        filter: grayscale(40%);
    }

    .header-info {
        flex: 1;
        min-width: 0;
    }

    .actor-name {
        margin: 0;
        font-size: 1.2rem;
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-text-primary, #d0cfc8);
        user-select: text;
        cursor: text;
    }

    .actor-name-input {
        width: 100%;
        font-size: 1.2rem;
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-text-primary, #d0cfc8);
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        outline: none;
        padding: 0;

        &:focus { border-color: var(--dh2e-gold, #b49545); }
    }

    .header-meta {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .wounds-inline {
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 2px;
    }

    .wound-edit {
        width: 2.2rem;
        background: var(--dh2e-bg-dark, #1a1a22);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        text-align: center;
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        padding: 1px 2px;
        outline: none;

        &:focus {
            border-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .view-toggle {
        width: 2rem;
        height: 2rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &:hover {
            background: var(--dh2e-bg-light, #3a3a45);
            color: var(--dh2e-gold, #b49545);
        }
    }

    .sheet-body {
        flex: 1;
        padding: var(--dh2e-space-sm, 0.5rem);
        overflow-y: auto;
    }
</style>
