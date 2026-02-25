<script lang="ts">
    import { AttackResolver } from "../../../combat/attack.ts";
    import type { FireMode } from "../../../combat/types.ts";
    import type { WeaponDragData } from "../../../macros/types.ts";
    import { sendItemToChat } from "../../../chat/send-to-chat.ts";

    let { weapon, actor }: {
        weapon: any;
        actor: any;
    } = $props();

    function onDragStart(e: DragEvent) {
        const data: WeaponDragData = {
            type: "Weapon",
            weaponId: weapon.id ?? weapon._id ?? "",
            weaponName: weapon.name,
        };
        e.dataTransfer?.setData("text/plain", JSON.stringify(data));
    }

    const sys = $derived(weapon.system ?? {});
    const hasRanged = $derived(sys.class !== "melee");
    const hasSingle = $derived(sys.rof?.single ?? true);
    const hasSemi = $derived((sys.rof?.semi ?? 0) > 0);
    const hasFull = $derived((sys.rof?.full ?? 0) > 0);

    function attack(mode: FireMode) {
        AttackResolver.resolve({ actor, weapon, fireMode: mode });
    }
</script>

<div class="weapon-row" draggable="true" ondragstart={onDragStart}>
    <div class="weapon-info">
        <span class="weapon-name">{weapon.name}</span>
        <span class="weapon-details">
            {sys.damage?.formula ?? "1d10"}{sys.damage?.type ? ` ${sys.damage.type[0].toUpperCase()}` : ""}
            {#if sys.penetration}| Pen {sys.penetration}{/if}
        </span>
    </div>
    <button class="chat-btn" onclick={(e) => { e.stopPropagation(); sendItemToChat(weapon); }} title="Send to Chat">
        <i class="fa-solid fa-comment"></i>
    </button>
    <div class="weapon-actions">
        {#if !hasRanged}
            <button class="attack-btn melee" onclick={() => attack("single")} title="Melee Attack">Melee</button>
        {:else}
            {#if hasSingle}
                <button class="attack-btn" onclick={() => attack("single")} title="Single Shot">S</button>
            {/if}
            {#if hasSemi}
                <button class="attack-btn" onclick={() => attack("semi")} title="Semi-Auto ({sys.rof?.semi})">SA/{sys.rof?.semi}</button>
            {/if}
            {#if hasFull}
                <button class="attack-btn" onclick={() => attack("full")} title="Full-Auto ({sys.rof?.full})">FA/{sys.rof?.full}</button>
            {/if}
        {/if}
    </div>
</div>

<style lang="scss">
    .weapon-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        &:last-child { border-bottom: none; }
    }

    .chat-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.65rem;
        width: 1rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.4;

        &:hover { color: var(--dh2e-gold, #c8a84e); opacity: 1; }
    }

    .weapon-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .weapon-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 600;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .weapon-details {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .weapon-actions {
        display: flex;
        gap: var(--dh2e-space-xxs, 0.125rem);
        flex-shrink: 0;
    }

    .attack-btn {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--dh2e-transition-fast, 0.15s);

        &:hover {
            border-color: var(--dh2e-gold, #c8a84e);
            color: var(--dh2e-gold, #c8a84e);
        }

        &.melee {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);

            &:hover {
                background: var(--dh2e-gold, #c8a84e);
            }
        }
    }
</style>
