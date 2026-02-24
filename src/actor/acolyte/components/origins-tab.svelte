<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    const details = $derived(ctx.system?.details ?? {});

    // Origin items (embedded on actor)
    const originItems = $derived({
        homeworld: ctx.items?.homeworlds?.[0] ?? null,
        background: ctx.items?.backgrounds?.[0] ?? null,
        role: ctx.items?.roles?.[0] ?? null,
    });

    function openItem(item: any) {
        item?.sheet?.render(true);
    }

    async function saveField(field: string, value: string) {
        const actor = ctx.actor;
        if (!actor || !ctx.editable) return;
        await actor.update({ [`system.details.${field}`]: value });
    }
</script>

<div class="origins-tab">
    <!-- Origin Cards -->
    <section class="origin-cards">
        <!-- Homeworld -->
        <button
            class="origin-card"
            class:has-item={!!originItems.homeworld}
            type="button"
            onclick={() => openItem(originItems.homeworld)}
        >
            <div class="origin-type">Homeworld</div>
            <div class="origin-name">{originItems.homeworld?.name ?? details.homeworld ?? "—"}</div>
            {#if originItems.homeworld}
                {@const sys = (originItems.homeworld as any).system ?? {}}
                <div class="origin-traits">
                    {#if sys.characteristicBonuses}
                        <span class="trait bonus">+5 {(sys.characteristicBonuses.positive ?? []).map((k: string) => k.toUpperCase()).join(", ")}</span>
                        <span class="trait penalty">-5 {(sys.characteristicBonuses.negative ?? []).map((k: string) => k.toUpperCase()).join(", ")}</span>
                    {/if}
                    {#if sys.aptitude}
                        <span class="trait">{sys.aptitude}</span>
                    {/if}
                </div>
                {#if sys.bonus}
                    <div class="origin-bonus">{sys.bonus}</div>
                {/if}
            {:else if details.homeworld}
                <div class="origin-hint">No embedded item</div>
            {/if}
        </button>

        <!-- Background -->
        <button
            class="origin-card"
            class:has-item={!!originItems.background}
            type="button"
            onclick={() => openItem(originItems.background)}
        >
            <div class="origin-type">Background</div>
            <div class="origin-name">{originItems.background?.name ?? details.background ?? "—"}</div>
            {#if originItems.background}
                {@const sys = (originItems.background as any).system ?? {}}
                <div class="origin-traits">
                    {#if sys.aptitude}
                        <span class="trait">{sys.aptitude}</span>
                    {/if}
                </div>
                {#if sys.bonus}
                    <div class="origin-bonus">{sys.bonus}</div>
                {/if}
            {:else if details.background}
                <div class="origin-hint">No embedded item</div>
            {/if}
        </button>

        <!-- Role -->
        <button
            class="origin-card"
            class:has-item={!!originItems.role}
            type="button"
            onclick={() => openItem(originItems.role)}
        >
            <div class="origin-type">Role</div>
            <div class="origin-name">{originItems.role?.name ?? details.role ?? "—"}</div>
            {#if originItems.role}
                {@const sys = (originItems.role as any).system ?? {}}
                <div class="origin-traits">
                    {#each (sys.aptitudes ?? []) as apt}
                        <span class="trait">{apt}</span>
                    {/each}
                </div>
                {#if sys.bonus}
                    <div class="origin-bonus">{sys.bonus}</div>
                {/if}
            {:else if details.role}
                <div class="origin-hint">No embedded item</div>
            {/if}
        </button>
    </section>

    <!-- Divination -->
    {#if details.divination}
        <div class="divination-block">
            <span class="divination-label">Divination</span>
            <span class="divination-text">{details.divination}</span>
        </div>
    {/if}

    <!-- Fluff Fields -->
    <section class="fluff-section">
        <h3 class="section-title">Character Details</h3>

        <div class="fluff-row">
            <label class="fluff-field small">
                <span class="fluff-label">Age</span>
                {#if ctx.editable}
                    <input type="text" value={details.age ?? ""}
                        onblur={(e) => saveField("age", e.currentTarget.value)} />
                {:else}
                    <span class="fluff-value">{details.age || "—"}</span>
                {/if}
            </label>
            <label class="fluff-field small">
                <span class="fluff-label">Sex</span>
                {#if ctx.editable}
                    <input type="text" value={details.sex ?? ""}
                        onblur={(e) => saveField("sex", e.currentTarget.value)} />
                {:else}
                    <span class="fluff-value">{details.sex || "—"}</span>
                {/if}
            </label>
            <label class="fluff-field small">
                <span class="fluff-label">Height</span>
                {#if ctx.editable}
                    <input type="text" value={details.height ?? ""}
                        onblur={(e) => saveField("height", e.currentTarget.value)} />
                {:else}
                    <span class="fluff-value">{details.height || "—"}</span>
                {/if}
            </label>
            <label class="fluff-field small">
                <span class="fluff-label">Weight</span>
                {#if ctx.editable}
                    <input type="text" value={details.weight ?? ""}
                        onblur={(e) => saveField("weight", e.currentTarget.value)} />
                {:else}
                    <span class="fluff-value">{details.weight || "—"}</span>
                {/if}
            </label>
        </div>

        <label class="fluff-field wide">
            <span class="fluff-label">Appearance</span>
            {#if ctx.editable}
                <textarea rows="3"
                    onblur={(e) => saveField("appearance", e.currentTarget.value)}
                >{details.appearance ?? ""}</textarea>
            {:else}
                <div class="fluff-value">{details.appearance || "—"}</div>
            {/if}
        </label>

        <label class="fluff-field wide">
            <span class="fluff-label">Biography</span>
            {#if ctx.editable}
                <textarea rows="5"
                    onblur={(e) => saveField("biography", e.currentTarget.value)}
                >{details.biography ?? ""}</textarea>
            {:else}
                <div class="fluff-value">{details.biography || "—"}</div>
            {/if}
        </label>
    </section>
</div>

<style lang="scss">
    .origins-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    /* Origin cards */
    .origin-cards {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .origin-card {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        height: auto !important;
        min-height: auto !important;
        gap: var(--dh2e-space-xxs, 0.125rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: default;
        text-align: left;
        color: inherit;
        font: inherit;

        &.has-item {
            cursor: pointer;
            &:hover {
                border-color: var(--dh2e-gold-dark, #9c7a28);
            }
        }
    }

    .origin-type {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .origin-name {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
    }

    .origin-traits {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
    }

    .trait {
        font-size: 0.6rem;
        padding: 1px 4px;
        border-radius: 2px;
        background: rgba(200, 168, 78, 0.1);
        color: var(--dh2e-text-secondary, #a0a0a8);

        &.bonus { color: #6c6; background: rgba(102, 204, 102, 0.1); }
        &.penalty { color: #c66; background: rgba(204, 102, 102, 0.1); }
    }

    .origin-bonus {
        font-size: 0.6rem;
        font-style: italic;
        color: var(--dh2e-gold-dark, #9c7a28);
    }

    .origin-hint {
        font-size: 0.6rem;
        font-style: italic;
        color: var(--dh2e-text-secondary, #a0a0a8);
        opacity: 0.6;
    }

    /* Divination */
    .divination-block {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        align-items: baseline;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .divination-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 600;
        white-space: nowrap;
    }

    .divination-text {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-style: italic;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    /* Fluff fields */
    .section-title {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        margin: 0 0 var(--dh2e-space-sm, 0.5rem);
    }

    .fluff-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .fluff-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .fluff-field {
        display: flex;
        flex-direction: column;
        gap: 2px;

        &.wide {
            width: 100%;
        }
    }

    .fluff-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .fluff-value {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .fluff-field input,
    .fluff-field textarea {
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-family: inherit;
        resize: vertical;

        &:focus {
            border-color: var(--dh2e-gold, #c8a84e);
            outline: none;
            box-shadow: 0 0 4px var(--dh2e-gold-dark, #7a6228);
        }
    }
</style>
