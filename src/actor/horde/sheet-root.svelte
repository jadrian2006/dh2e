<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
    const chars = $derived(sys.characteristics ?? {});
    const magnitude = $derived(sys.magnitude ?? { value: 0, max: 30 });
    const magPercent = $derived(magnitude.max > 0 ? (magnitude.value / magnitude.max) * 100 : 0);
    const movement = $derived(sys.movement ?? { half: 0, full: 0, charge: 0, run: 0 });

    const charOrder = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"];
    const charLabels: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

    const weapons = $derived(ctx.items?.weapons ?? []);
    const traits = $derived(ctx.items?.traits ?? []);

    function editItem(item: any) { item.sheet?.render(true); }
    async function deleteItem(item: any) { await item.delete(); }

    async function updateField(path: string, value: unknown) {
        await ctx.actor.update({ [path]: value });
    }
</script>

<div class="horde-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="actor-img" />
        <div class="header-info">
            <h1 class="actor-name">{ctx.name}</h1>
            <span class="actor-type">Horde</span>
        </div>
    </header>

    <section class="sheet-body">
        <!-- Magnitude Bar -->
        <div class="magnitude-section">
            <div class="magnitude-header">
                <span class="section-label">Magnitude</span>
                <span class="magnitude-value">{magnitude.value} / {magnitude.max}</span>
            </div>
            <div class="magnitude-bar">
                <div
                    class="magnitude-fill"
                    class:critical={magPercent <= 25}
                    class:warning={magPercent > 25 && magPercent <= 50}
                    style="width: {magPercent}%"
                ></div>
            </div>
            {#if ctx.editable}
                <div class="magnitude-inputs">
                    <label class="mag-field">
                        <span class="field-label">Current</span>
                        <input
                            type="number"
                            value={magnitude.value}
                            min="0"
                            max={magnitude.max}
                            onchange={(e) => updateField("system.magnitude.value", Number((e.target as HTMLInputElement).value))}
                        />
                    </label>
                    <label class="mag-field">
                        <span class="field-label">Max</span>
                        <input
                            type="number"
                            value={magnitude.max}
                            min="1"
                            onchange={(e) => updateField("system.magnitude.max", Number((e.target as HTMLInputElement).value))}
                        />
                    </label>
                </div>
            {/if}
        </div>

        <!-- Characteristics -->
        <div class="char-grid">
            {#each charOrder as key}
                <div class="char-cell">
                    <span class="char-label">{charLabels[key]}</span>
                    <span class="char-value">{chars[key]?.value ?? 0}</span>
                    <span class="char-bonus">{chars[key]?.bonus ?? 0}</span>
                </div>
            {/each}
        </div>

        <!-- Armour + Movement row -->
        <div class="stat-row">
            <div class="stat-box">
                <span class="stat-label">Armour</span>
                {#if ctx.editable}
                    <input
                        class="stat-input"
                        type="number"
                        value={sys.armour ?? 0}
                        min="0"
                        onchange={(e) => updateField("system.armour", Number((e.target as HTMLInputElement).value))}
                    />
                {:else}
                    <span class="stat-value">{sys.armour ?? 0}</span>
                {/if}
            </div>
            <div class="stat-box">
                <span class="stat-label">Movement</span>
                <span class="stat-value">{movement.half}/{movement.full}/{movement.charge}/{movement.run}</span>
            </div>
        </div>

        <!-- Weapons -->
        <div class="list-section">
            <h3 class="section-title">Weapons</h3>
            {#each weapons as weapon}
                <div class="list-row">
                    <span class="list-name">{weapon.name}</span>
                    <span class="list-detail">{weapon.system?.damage?.formula ?? ""} {weapon.system?.damage?.type ?? ""}</span>
                    <button class="icon-btn" onclick={() => editItem(weapon)} title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="icon-btn del" onclick={() => deleteItem(weapon)} title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            {:else}
                <p class="empty-msg">No weapons. Drag weapons here.</p>
            {/each}
        </div>

        <!-- Traits -->
        <div class="list-section">
            <h3 class="section-title">Traits</h3>
            {#each traits as trait}
                <div class="list-row">
                    <span class="list-name">{trait.name}</span>
                    {#if trait.system?.hasRating}
                        <span class="list-detail">({trait.system.rating})</span>
                    {/if}
                    <button class="icon-btn" onclick={() => editItem(trait)} title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="icon-btn del" onclick={() => deleteItem(trait)} title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            {:else}
                <p class="empty-msg">No traits.</p>
            {/each}
        </div>

        <!-- Notes -->
        <div class="notes-section">
            <h3 class="section-title">Notes</h3>
            {#if ctx.editable}
                <textarea
                    class="notes-area"
                    value={sys.details?.notes ?? ""}
                    onchange={(e) => updateField("system.details.notes", (e.target as HTMLTextAreaElement).value)}
                ></textarea>
            {:else if sys.details?.notes}
                <p class="notes-text">{sys.details.notes}</p>
            {/if}
        </div>
    </section>
</div>

<style lang="scss">
    .horde-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dh2e-bg-dark, #1a1a1f);
    }

    .sheet-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-bg-darkest, #111114);
        border-bottom: 2px solid var(--dh2e-gold-dark, #9c7a28);
    }

    .actor-img {
        width: 56px;
        height: 56px;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        border-radius: var(--dh2e-radius-sm, 3px);
        object-fit: cover;
    }

    .header-info { display: flex; flex-direction: column; }
    .actor-name {
        margin: 0;
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-xl, 1.4rem);
        color: var(--dh2e-gold, #c8a84e);
    }
    .actor-type {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .sheet-body {
        flex: 1;
        padding: var(--dh2e-space-md, 0.75rem);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    /* Magnitude */
    .magnitude-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .magnitude-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }
    .section-label {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    .magnitude-value {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 700;
    }
    .magnitude-bar {
        height: 12px;
        background: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 2px;
        overflow: hidden;
    }
    .magnitude-fill {
        height: 100%;
        background: #6a8a4a;
        transition: width 0.3s;
        &.warning { background: #b89a30; }
        &.critical { background: #a04040; }
    }
    .magnitude-inputs {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
    }
    .mag-field {
        display: flex;
        flex-direction: column;
        gap: 2px;
        input { width: 4rem; }
    }

    /* Characteristics */
    .char-grid {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .char-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem);
    }
    .char-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }
    .char-value {
        font-size: var(--dh2e-text-md, 0.9rem);
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }
    .char-bonus {
        font-size: 0.6rem;
        color: var(--dh2e-gold-muted, #8a7a3e);
    }

    /* Stat Row */
    .stat-row {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
    }
    .stat-box {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
    }
    .stat-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }
    .stat-value {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 700;
    }
    .stat-input {
        width: 3rem;
        text-align: center;
    }

    /* Lists */
    .list-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .section-title {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        margin: 0;
    }
    .list-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
    }
    .list-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }
    .list-detail {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
    .icon-btn {
        width: 1.2rem; height: 1.2rem;
        border: none; background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer; font-size: 0.65rem;
        display: flex; align-items: center; justify-content: center;
        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
        &.del:hover { color: var(--dh2e-red-bright, #d44); }
    }
    .empty-msg {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-sm, 0.5rem);
    }

    /* Notes */
    .notes-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }
    .notes-area {
        min-height: 60px;
        resize: vertical;
        font-size: var(--dh2e-text-sm, 0.8rem);
        background: var(--dh2e-bg-darkest, #111114);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
    }
    .notes-text {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: pre-wrap;
    }

    .field-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }
</style>
