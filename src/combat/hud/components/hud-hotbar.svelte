<script lang="ts">
    import { executeSlot, setHudSlot, type HudSlotEntry } from "../hud-slots.ts";
    import type { DH2eDragData } from "../../../macros/types.ts";

    let {
        slots,
        actor,
    }: {
        slots: (HudSlotEntry | null)[];
        actor: any;
    } = $props();

    const slotLabels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

    async function onSlotClick(index: number) {
        const entry = slots[index];
        if (!entry || !actor) return;
        await executeSlot(actor, entry);
    }

    function onSlotContextMenu(e: MouseEvent, index: number) {
        e.preventDefault();
        if (!actor) return;
        setHudSlot(actor, index, null);
    }

    function onSlotDrop(e: DragEvent, index: number) {
        e.preventDefault();
        if (!actor) return;

        let data: DH2eDragData;
        try {
            data = JSON.parse(e.dataTransfer?.getData("text/plain") ?? "");
        } catch { return; }

        let entry: HudSlotEntry | null = null;
        switch (data.type) {
            case "SkillUse":
                entry = {
                    type: "skillUse",
                    skillName: data.skillName,
                    useSlug: data.useSlug,
                    label: data.useLabel,
                    icon: "fa-solid fa-dice-d20",
                };
                break;
            case "Weapon":
                entry = {
                    type: "weapon",
                    weaponId: data.weaponId,
                    label: data.weaponName,
                    icon: "fa-solid fa-crosshairs",
                };
                break;
            case "Skill":
                entry = {
                    type: "skill",
                    skillName: data.skillName,
                    label: data.skillName,
                    icon: "fa-solid fa-dice-d20",
                };
                break;
        }

        if (entry) {
            setHudSlot(actor, index, entry);
        }
    }

    function onDragOver(e: DragEvent) {
        e.preventDefault();
    }
</script>

<div class="hud-hotbar">
    {#each slotLabels as label, i}
        {@const entry = slots[i] ?? null}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="hotbar-slot"
            class:empty={!entry}
            class:filled={!!entry}
            onclick={() => onSlotClick(i)}
            oncontextmenu={(e) => onSlotContextMenu(e, i)}
            ondrop={(e) => onSlotDrop(e, i)}
            ondragover={onDragOver}
            title={entry ? entry.label : (game.i18n?.localize?.("DH2E.HUD.SlotEmpty") ?? "Empty slot")}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") onSlotClick(i); }}
        >
            <span class="slot-key">{label}</span>
            {#if entry}
                <i class="{entry.icon} slot-icon"></i>
                <span class="slot-label">{entry.label}</span>
            {/if}
        </div>
    {/each}
</div>

<style lang="scss">
    .hud-hotbar {
        display: flex;
        gap: 2px;
    }

    .hotbar-slot {
        position: relative;
        width: 32px;
        height: 36px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        transition: all var(--dh2e-transition-fast, 0.15s);
        overflow: hidden;

        &.empty {
            background: var(--dh2e-bg-darkest, #111114);
            opacity: 0.5;
        }

        &.filled {
            background: var(--dh2e-bg-mid, #2e2e35);

            &:hover {
                border-color: var(--dh2e-gold, #c8a84e);
                background: var(--dh2e-gold-dark, #9c7a28);
            }
        }
    }

    .slot-key {
        position: absolute;
        top: 1px;
        right: 2px;
        font-size: 0.4rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-weight: 700;
        line-height: 1;
    }

    .slot-icon {
        font-size: 0.65rem;
        color: var(--dh2e-gold-muted, #8a7a3e);
    }

    .slot-label {
        font-size: 0.4rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 30px;
        text-align: center;
        line-height: 1;
    }
</style>
