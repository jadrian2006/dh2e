<script lang="ts">
    import type { CombatAction } from "./combat-actions.ts";

    let {
        action,
        available = true,
        favorite = false,
        onToggleFavorite,
        onClick,
    }: {
        action: CombatAction;
        available?: boolean;
        favorite?: boolean;
        onToggleFavorite?: () => void;
        onClick?: (e: MouseEvent) => void;
    } = $props();

    const label = $derived(game.i18n?.localize(action.labelKey) ?? action.label);
    const description = $derived(game.i18n?.localize(action.descriptionKey) ?? "");

    const costColorMap: Record<string, string> = {
        half: "var(--dh2e-gold, #c8a84e)",
        full: "var(--dh2e-red-bright, #d44)",
        free: "var(--dh2e-success, #5ab45a)",
        reaction: "#6699cc",
        varies: "#a0a0a8",
    };
    const costColor = $derived(costColorMap[action.actionCost] ?? "#a0a0a8");
    const costLabel = $derived(
        action.actionCost === "half" ? "Half" :
        action.actionCost === "full" ? "Full" :
        action.actionCost === "free" ? "Free" :
        action.actionCost === "reaction" ? "React" : "Varies"
    );

    function onDragStart(e: DragEvent) {
        const data = {
            type: "CombatAction",
            slug: action.slug,
            label: action.label,
        };
        e.dataTransfer?.setData("text/plain", JSON.stringify(data));
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="combat-action-row"
    class:dimmed={!available}
    class:rollable={available}
    draggable="true"
    ondragstart={onDragStart}
    onclick={onClick}
    onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(e as any); }}
    role="button"
    tabindex="0"
    title={description}
>
    {#if onToggleFavorite}
    <button class="fav-star" class:active={favorite} onclick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }} title="Toggle favorite">
        <i class="fa-{favorite ? 'solid' : 'regular'} fa-star"></i>
    </button>
    {/if}

    <i class="{action.icon} action-icon"></i>

    <span class="action-label">{label}</span>

    <span class="cost-badge" style="color: {costColor}; border-color: {costColor}">
        {costLabel}
    </span>
</div>

<style lang="scss">
    .combat-action-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        cursor: pointer;
        border-radius: var(--dh2e-radius-sm, 3px);
        transition: background var(--dh2e-transition-fast, 0.15s);

        &.dimmed {
            opacity: 0.3;
            cursor: default;
        }

        &.rollable:hover:not(.dimmed) {
            background: var(--dh2e-bg-mid, #2e2e35);
        }
    }

    .fav-star {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.65rem;
        width: 0.8rem;
        flex-shrink: 0;

        &.active {
            color: var(--dh2e-gold, #c8a84e);
        }
        &:hover {
            color: var(--dh2e-gold-bright, #e0c060);
        }
    }

    .action-icon {
        font-size: 0.7rem;
        width: 1rem;
        text-align: center;
        color: var(--dh2e-gold-muted, #8a7a3e);
        flex-shrink: 0;
    }

    .action-label {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .cost-badge {
        font-size: 0.6rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 1px 4px;
        border: 1px solid;
        border-radius: 2px;
        flex-shrink: 0;
    }
</style>
