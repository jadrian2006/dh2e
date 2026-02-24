<script lang="ts">
    import FullView from "./components/full-view.svelte";
    import CompactView from "./components/compact-view.svelte";
    import ErrorBoundary from "../../ui/error-boundary.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    let compactMode = $state(ctx.compactMode ?? false);

    function toggleView() {
        compactMode = !compactMode;
        ctx.setCompactMode?.(compactMode);
    }
</script>

<div class="npc-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="profile-img" />
        <div class="header-info">
            {#if ctx.editable}
                <input
                    class="actor-name-input"
                    type="text"
                    value={ctx.name}
                    onchange={(e) => ctx.actor?.update({ name: (e.target as HTMLInputElement).value })}
                />
            {:else}
                <h1 class="actor-name">{ctx.name}</h1>
            {/if}
            <div class="header-meta">
                <span class="wounds-inline">W: {ctx.system?.wounds?.value ?? 0}/{ctx.system?.wounds?.max ?? 0}</span>
            </div>
        </div>
        <button class="view-toggle" onclick={toggleView} title={compactMode ? "Full View" : "Compact View"}>
            <i class={compactMode ? "fa-solid fa-expand" : "fa-solid fa-compress"}></i>
        </button>
    </header>

    <section class="sheet-body">
        <ErrorBoundary label={compactMode ? "NPC Compact View" : "NPC Full View"}>
            {#if compactMode}
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

    .profile-img {
        width: 48px;
        height: 48px;
        border-radius: var(--dh2e-radius-sm, 3px);
        object-fit: cover;
        border: 1px solid var(--dh2e-border, #4a4a55);
        flex-shrink: 0;
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
