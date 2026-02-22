<script lang="ts">
    import WeaponRow from "./weapon-row.svelte";
    import ArmourDisplay from "./armour-display.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const weapons = $derived(ctx.items?.weapons ?? []);
</script>

<div class="combat-tab">
    <section class="weapons-section">
        <h3 class="section-title">Weapons</h3>
        {#if weapons.length > 0}
            <div class="weapons-list">
                {#each weapons as weapon}
                    <WeaponRow {weapon} actor={ctx.actor} />
                {/each}
            </div>
        {:else}
            <p class="empty-msg">No weapons equipped. Drag weapons from the Items sidebar.</p>
        {/if}
    </section>

    <section class="armour-section">
        <h3 class="section-title">Armour</h3>
        <ArmourDisplay {ctx} />
    </section>
</div>

<style lang="scss">
    .combat-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-lg, 1rem);
    }

    .section-title {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-md, 0.9rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: var(--dh2e-space-sm, 0.5rem);
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
    }

    .weapons-list {
        display: flex;
        flex-direction: column;
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-md, 0.75rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }
</style>
