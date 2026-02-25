<script lang="ts">
    import type { SkillUse } from "../../../item/skill/data.ts";
    import type { SkillUseDragData } from "../../../macros/types.ts";

    let { use, isTrained, favorite, onToggleFavorite, onRoll, skillName }: {
        use: SkillUse;
        isTrained: boolean;
        favorite?: boolean;
        onToggleFavorite?: () => void;
        onRoll: (e?: { shiftKey: boolean }) => void;
        skillName?: string;
    } = $props();

    function onDragStart(e: DragEvent) {
        if (!skillName) return;
        const data: SkillUseDragData = {
            type: "SkillUse",
            skillName,
            useSlug: use.slug,
            useLabel: use.label,
        };
        e.dataTransfer?.setData("text/plain", JSON.stringify(data));
    }

    const charAbbrevMap: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };
</script>

{#if use.passive}
    <div class="use-row passive" class:untrained={!isTrained} title={use.description}>
        {#if onToggleFavorite}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <button class="fav-star" onclick={(e) => { e.stopPropagation(); onToggleFavorite(); }} title="Favorite">
                <i class={favorite ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
            </button>
        {/if}
        <span class="use-label">{use.label}</span>
        {#if use.characteristicOverride}
            <span class="use-char">{charAbbrevMap[use.characteristicOverride] ?? ""}</span>
        {:else}
            <span class="use-char"></span>
        {/if}
        {#if use.actionTime}
            <span class="use-time">{use.actionTime}</span>
        {/if}
        <span class="use-passive-badge">{game.i18n?.localize?.("DH2E.Skill.Passive") ?? "Passive"}</span>
    </div>
{:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="use-row rollable"
        class:untrained={!isTrained}
        draggable={!!skillName}
        ondragstart={onDragStart}
        onclick={(e) => onRoll({ shiftKey: e.shiftKey })}
        onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") onRoll({ shiftKey: e.shiftKey }); }}
        title={use.description}
        role="button"
        tabindex="0"
    >
        {#if onToggleFavorite}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <button class="fav-star" onclick={(e) => { e.stopPropagation(); onToggleFavorite(); }} title="Favorite">
                <i class={favorite ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
            </button>
        {:else}
            <i class="fas fa-dice-d20 use-icon"></i>
        {/if}
        <span class="use-label">{use.label}</span>
        {#if use.characteristicOverride}
            <span class="use-char">{charAbbrevMap[use.characteristicOverride] ?? ""}</span>
        {:else}
            <span class="use-char"></span>
        {/if}
        {#if use.actionTime}
            <span class="use-time">{use.actionTime}</span>
        {/if}
    </div>
{/if}

<style lang="scss">
    .use-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        padding-left: var(--dh2e-space-xl, 2rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        transition: background var(--dh2e-transition-fast, 0.15s);

        &.untrained {
            opacity: 0.6;
        }

        &.rollable {
            cursor: pointer;

            &:hover {
                background: var(--dh2e-bg-mid, #2e2e35);
            }
        }

        &.passive {
            cursor: default;
        }
    }

    .use-icon {
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.6rem;
        width: 0.8rem;
        flex-shrink: 0;
        text-align: center;
    }

    .fav-star {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.6rem;
        width: 0.8rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-gold-bright, #c8a84e); }
        :global(.fa-solid.fa-star) { color: var(--dh2e-gold, #b49545); }
    }

    .use-label {
        flex: 1;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .use-char {
        width: 2rem;
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 600;
        font-size: var(--dh2e-text-xxs, 0.65rem);
    }

    .use-time {
        width: 5rem;
        text-align: right;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xxs, 0.65rem);
        font-style: italic;
    }

    .use-passive-badge {
        padding: 1px 6px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xxs, 0.65rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
</style>
