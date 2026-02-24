<script lang="ts">
    let {
        actor,
        actions = { half: false, full: false, free: false, reaction: false },
        combatant,
    }: {
        actor: any;
        actions: Record<string, boolean>;
        combatant: any;
    } = $props();

    const quickButtons = [
        { label: "Aim", icon: "fa-solid fa-bullseye", actionType: "half" },
        { label: "Charge", icon: "fa-solid fa-person-running", actionType: "full" },
        { label: "Run", icon: "fa-solid fa-bolt-lightning", actionType: "full" },
        { label: "All Out", icon: "fa-solid fa-burst", actionType: "full" },
        { label: "Dodge", icon: "fa-solid fa-shield", actionType: "reaction" },
        { label: "Parry", icon: "fa-solid fa-swords", actionType: "reaction" },
        { label: "Overwatch", icon: "fa-solid fa-eye", actionType: "half" },
    ];

    function isDisabled(actionType: string): boolean {
        if (actionType === "half") return actions.half || actions.full;
        if (actionType === "full") return actions.full || actions.half;
        if (actionType === "reaction") return actions.reaction;
        return false;
    }

    async function doQuickAction(btn: typeof quickButtons[0]) {
        if (!combatant?.useAction) return;
        await combatant.useAction(btn.actionType);
        ui.notifications.info(`${actor?.name ?? "?"} uses ${btn.label}.`);
    }
</script>

<div class="quick-actions">
    {#each quickButtons as btn}
        <button
            class="quick-btn"
            class:disabled={isDisabled(btn.actionType)}
            disabled={isDisabled(btn.actionType)}
            onclick={() => doQuickAction(btn)}
            title={btn.label}
        >
            <i class={btn.icon}></i>
            <span class="qa-label">{btn.label}</span>
        </button>
    {/each}
</div>

<style lang="scss">
    .quick-actions { display: flex; flex-wrap: wrap; gap: 3px; }
    .quick-btn {
        display: flex; flex-direction: column; align-items: center; gap: 1px;
        padding: 3px 6px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer; font-size: 0.55rem;

        i { font-size: 0.7rem; color: var(--dh2e-gold-muted, #8a7a3e); }

        &:hover:not(:disabled) {
            border-color: var(--dh2e-gold, #c8a84e);
            i { color: var(--dh2e-gold, #c8a84e); }
        }

        &.disabled, &:disabled {
            opacity: 0.3;
            cursor: default;
        }
    }
    .qa-label { white-space: nowrap; }
</style>
