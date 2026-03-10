<script lang="ts">
    import { focusPower } from "../../../macros/api.ts";

    let {
        powers,
        actor,
    }: {
        powers: any[];
        actor: any;
    } = $props();

    /** Derive Psy Rating from talent */
    const psyRating = $derived(() => {
        const talents = actor?.items?.filter((i: any) => i.type === "talent") ?? [];
        const pr = talents.find((t: any) => t.name === "Psy Rating");
        return pr?.system?.rating || (pr?.system?.tier ?? 0);
    });

    function onUsePower(power: any) {
        // Use the macro API — no mode/PR = shows FocusPowerDialog first
        focusPower(power.name);
    }

    function onDragStart(e: DragEvent, power: any) {
        e.dataTransfer?.setData("text/plain", JSON.stringify({
            type: "Power",
            powerName: power.name,
            mode: "unfettered",
            selectedPR: Math.max(1, psyRating()),
        }));
    }
</script>

<div class="power-tray">
    {#if psyRating() > 0}
        <div class="pr-badge">PR {psyRating()}</div>
    {/if}

    {#if powers.length === 0}
        <p class="tray-empty">No psychic powers</p>
    {:else}
        {#each powers as power}
            <button
                class="power-entry"
                onclick={() => onUsePower(power)}
                draggable="true"
                ondragstart={(e) => onDragStart(e, power)}
                title={power.system?.description ?? power.name}
            >
                <i class="fa-solid fa-hat-wizard entry-icon"></i>
                <span class="entry-name">{power.name}</span>
                {#if power.system?.discipline}
                    <span class="entry-disc">{power.system.discipline}</span>
                {/if}
            </button>
        {/each}
    {/if}
</div>

<style lang="scss">
    .power-tray {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .pr-badge {
        font-size: 0.6rem;
        font-weight: 700;
        color: var(--dh2e-gold-bright, #c8a84e);
        text-align: center;
        padding: 2px 0;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
        margin-bottom: 2px;
    }

    .power-entry {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: 3px 6px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: 0.7rem;
        text-align: left;
        width: 100%;
        transition: all var(--dh2e-transition-fast, 0.15s);

        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
            border-color: var(--dh2e-gold-muted, #8a7a3e);
        }
    }

    .entry-icon {
        font-size: 0.6rem;
        color: var(--dh2e-gold-muted, #8a7a3e);
        width: 0.8rem;
        text-align: center;
        flex-shrink: 0;
    }

    .entry-name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .entry-disc {
        font-size: 0.55rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        white-space: nowrap;
    }

    .tray-empty {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-sm, 0.5rem);
        margin: 0;
    }
</style>
