<script lang="ts">
    let {
        actions = { half: false, full: false, free: false, reaction: false },
        combatant,
        round = 0,
    }: {
        actions: Record<string, boolean>;
        combatant: any;
        round: number;
    } = $props();

    const actionTypes = [
        { key: "half", label: "H", title: "Half Action" },
        { key: "full", label: "F", title: "Full Action" },
        { key: "free", label: "Fr", title: "Free Action" },
        { key: "reaction", label: "Re", title: "Reaction" },
    ];

    async function toggleAction(key: string) {
        if (!combatant?.useAction) return;
        if (!actions[key]) {
            await combatant.useAction(key);
        }
    }
</script>

<div class="action-bar">
    <span class="round-label">R{round}</span>
    {#each actionTypes as at}
        <button
            class="action-btn"
            class:used={actions[at.key]}
            class:available={!actions[at.key]}
            disabled={actions[at.key]}
            onclick={() => toggleAction(at.key)}
            title={at.title}
        >
            {at.label}
        </button>
    {/each}
</div>

<style lang="scss">
    .action-bar { display: flex; align-items: center; gap: var(--dh2e-space-xs, 0.25rem); }
    .round-label {
        font-size: 0.6rem; color: var(--dh2e-gold-muted, #8a7a3e);
        font-weight: 700; margin-right: var(--dh2e-space-xs, 0.25rem);
    }
    .action-btn {
        width: 2rem; height: 2rem;
        border: 2px solid var(--dh2e-border, #4a4a55); border-radius: 4px;
        font-weight: 700; font-size: 0.7rem; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;

        &.available {
            background: var(--dh2e-bg-mid, #2e2e35);
            color: var(--dh2e-gold, #c8a84e);
            border-color: var(--dh2e-gold-dark, #9c7a28);
        }
        &.used {
            background: var(--dh2e-bg-darkest, #111114);
            color: var(--dh2e-text-secondary, #555);
            border-color: var(--dh2e-bg-mid, #2e2e35);
            opacity: 0.5;
        }
    }
</style>
