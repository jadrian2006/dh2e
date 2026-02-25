<script lang="ts">
    import type { SkillDragData } from "../../../macros/types.ts";
    import { sendItemToChat } from "../../../chat/send-to-chat.ts";

    let { skill, item, onRoll }: {
        skill: {
            name: string;
            displayName: string;
            linkedCharacteristic: string;
            advancement: number;
            advancementBonus: number;
            totalTarget: number;
            isTrained: boolean;
        };
        item?: any;
        onRoll: (e?: { shiftKey: boolean }) => void;
    } = $props();

    function onDragStart(e: DragEvent) {
        const data: SkillDragData = { type: "Skill", skillName: skill.name };
        e.dataTransfer?.setData("text/plain", JSON.stringify(data));
    }

    const charAbbrevMap: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

    const rankNames = ["Untrained", "Known", "Trained (+10)", "Experienced (+20)", "Veteran (+30)"];

    const maxPips = 4;

    function toggleFavorite() {
        if (!item) return;
        const current = item.getFlag?.("dh2e", "favorite");
        if (current) item.unsetFlag("dh2e", "favorite");
        else item.setFlag("dh2e", "favorite", true);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="skill-row" class:untrained={!skill.isTrained} draggable="true" ondragstart={onDragStart} onclick={(e) => onRoll({ shiftKey: e.shiftKey })} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") onRoll({ shiftKey: e.shiftKey }); }} title="Roll {skill.displayName}" role="button" tabindex="0">
    {#if item}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <button class="fav-star" onclick={(e) => { e.stopPropagation(); toggleFavorite(); }} title="Favorite">
            <i class={item.getFlag?.("dh2e", "favorite") ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
        </button>
    {/if}
    {#if item}
        <button class="chat-btn" onclick={(e) => { e.stopPropagation(); sendItemToChat(item); }} title="Send to Chat">
            <i class="fa-solid fa-comment"></i>
        </button>
    {/if}
    <span class="skill-name">{skill.displayName}</span>
    <span class="skill-char">{charAbbrevMap[skill.linkedCharacteristic] ?? skill.linkedCharacteristic}</span>
    <span class="skill-pips" title={rankNames[skill.advancement] ?? "Untrained"}>
        {#each Array(maxPips) as _, i}
            <span class="pip" class:filled={i < skill.advancement}></span>
        {/each}
    </span>
    <span class="skill-target">{skill.totalTarget}</span>
</div>

<style lang="scss">
    .skill-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        cursor: pointer;
        border-radius: var(--dh2e-radius-sm, 3px);
        transition: background var(--dh2e-transition-fast, 0.15s);

        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
        }

        &:nth-child(even) {
            background: rgba(255, 255, 255, 0.02);

            &:hover {
                background: var(--dh2e-bg-mid, #2e2e35);
            }
        }

        &.untrained {
            opacity: 0.6;
        }
    }

    .chat-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.6rem;
        width: 0.8rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.4;

        &:hover { color: var(--dh2e-gold, #c8a84e); opacity: 1; }
    }

    .fav-star {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.7rem;
        width: 1rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-gold-bright, #c8a84e); }
        :global(.fa-solid.fa-star) { color: var(--dh2e-gold, #b49545); }
    }

    .skill-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .skill-char {
        width: 2rem;
        text-align: center;
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 600;
    }

    .skill-pips {
        display: flex;
        gap: 2px;
        padding: 2px 4px;
    }

    .pip {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        background: transparent;

        &.filled {
            background: var(--dh2e-gold, #b49545);
        }
    }

    .skill-target {
        width: 2.5rem;
        text-align: right;
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold-bright, #c8a84e);
    }
</style>
