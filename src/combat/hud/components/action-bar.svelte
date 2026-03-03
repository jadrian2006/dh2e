<script lang="ts">
    let {
        actions = { half: false, full: false, free: false, reactionsUsed: 0 },
        combatant,
        round = 0,
    }: {
        actions: Record<string, any>;
        combatant: any;
        round: number;
    } = $props();

    const maxReactions = $derived(combatant?.maxReactions ?? 1);
    const reactionsUsed = $derived(actions.reactionsUsed ?? 0);
    const reactionsRemaining = $derived(Math.max(0, maxReactions - reactionsUsed));

    const actionTypes = [
        { key: "half", label: "H", title: "Half Action" },
        { key: "full", label: "F", title: "Full Action" },
        { key: "free", label: "Fr", title: "Free Action" },
    ];

    function isReactionFullyUsed(): boolean {
        return reactionsUsed >= maxReactions;
    }

    function isReactionPartial(): boolean {
        return reactionsUsed > 0 && reactionsUsed < maxReactions;
    }

    /** Reaction label: "Re" for 1 max, "Re 1/2" format for Step Aside */
    const reactionLabel = $derived(
        maxReactions > 1 ? `Re ${reactionsRemaining}/${maxReactions}` : "Re",
    );

    async function toggleAction(key: string) {
        if (!combatant?.useAction) return;
        if (key === "reaction") {
            if (!isReactionFullyUsed()) {
                await combatant.useAction("reaction");
            }
            return;
        }
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
    <!-- Reaction button with count support -->
    <button
        class="action-btn"
        class:used={isReactionFullyUsed()}
        class:partial={isReactionPartial()}
        class:available={!isReactionFullyUsed() && !isReactionPartial()}
        disabled={isReactionFullyUsed()}
        onclick={() => toggleAction("reaction")}
        title="Reaction ({reactionsRemaining}/{maxReactions})"
    >
        {reactionLabel}
    </button>
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
        &.partial {
            background: var(--dh2e-bg-mid, #2e2e35);
            color: var(--dh2e-gold-muted, #8a7a3e);
            border-color: var(--dh2e-gold-muted, #8a7a3e);
            opacity: 0.75;
        }
    }
</style>
