<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        children,
        label = "component",
    }: {
        children: Snippet;
        label?: string;
    } = $props();

    let error: Error | null = $state(null);

    function handleError(e: unknown) {
        error = e instanceof Error ? e : new Error(String(e));
        console.error(`DH2E | Error in ${label}:`, e);
    }

    function retry() {
        error = null;
    }
</script>

{#if error}
    <div class="error-fallback" role="alert">
        <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <p class="error-title">Something went wrong in {label}</p>
        <p class="error-msg">{error.message}</p>
        <button class="error-retry" onclick={retry}>
            <i class="fas fa-rotate-right"></i> Retry
        </button>
    </div>
{:else}
    <svelte:boundary onerror={handleError}>
        {@render children()}
    </svelte:boundary>
{/if}

<style lang="scss">
    .error-fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-lg, 1rem);
        text-align: center;
        min-height: 80px;
    }

    .error-icon {
        font-size: 1.5rem;
        color: var(--dh2e-red-bright, #d44);
    }

    .error-title {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 700;
        margin: 0;
    }

    .error-msg {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-family: "Fira Code", "Consolas", monospace;
        margin: 0;
        max-width: 400px;
        word-break: break-word;
    }

    .error-retry {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;

        &:hover {
            border-color: var(--dh2e-gold, #c8a84e);
            color: var(--dh2e-text-primary, #d0cfc8);
        }
    }
</style>
