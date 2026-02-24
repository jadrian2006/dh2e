<script lang="ts">
    import RuleElementEditor from "@rules/rule-element/rule-element-editor.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});

    const locationOptions = [
        { value: "head", label: "Head" },
        { value: "rightArm", label: "Right Arm" },
        { value: "leftArm", label: "Left Arm" },
        { value: "body", label: "Body" },
        { value: "rightLeg", label: "Right Leg" },
        { value: "leftLeg", label: "Left Leg" },
        { value: "internal", label: "Internal" },
        { value: "eyes", label: "Eyes" },
        { value: "brain", label: "Brain" },
    ];

    async function updateField(path: string, value: unknown) {
        await ctx.item.update({ [path]: value });
    }
</script>

<div class="item-sheet cybernetic-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="item-img" />
        <div class="header-info">
            <h1 class="item-name">{ctx.name}</h1>
            <div class="header-tags">
                <span class="tag type-tag">{sys.type === "replacement" ? "Replacement" : "Enhancement"}</span>
                <span class="tag grade-tag grade-{sys.grade ?? 'common'}">{(sys.grade ?? "common").charAt(0).toUpperCase() + (sys.grade ?? "common").slice(1)}</span>
                {#if sys.installed}
                    <span class="tag installed-tag">Installed</span>
                {:else}
                    <span class="tag uninstalled-tag">Not Installed</span>
                {/if}
            </div>
        </div>
    </header>

    <section class="sheet-body">
        <div class="form-grid">
            <label class="field">
                <span class="field-label">Location</span>
                <select
                    value={sys.location ?? ""}
                    disabled={!ctx.editable}
                    onchange={(e) => updateField("system.location", (e.target as HTMLSelectElement).value)}
                >
                    <option value="">—</option>
                    {#each locationOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </label>
            <label class="field">
                <span class="field-label">Type</span>
                <select
                    value={sys.type ?? "replacement"}
                    disabled={!ctx.editable}
                    onchange={(e) => updateField("system.type", (e.target as HTMLSelectElement).value)}
                >
                    <option value="replacement">Replacement</option>
                    <option value="enhancement">Enhancement</option>
                </select>
            </label>
            <label class="field">
                <span class="field-label">Grade</span>
                <select
                    value={sys.grade ?? "common"}
                    disabled={!ctx.editable}
                    onchange={(e) => updateField("system.grade", (e.target as HTMLSelectElement).value)}
                >
                    <option value="poor">Poor</option>
                    <option value="common">Common</option>
                    <option value="good">Good</option>
                    <option value="best">Best</option>
                </select>
            </label>
            <label class="field">
                <span class="field-label">Weight (kg)</span>
                <input
                    type="number"
                    value={sys.weight ?? 0}
                    disabled={!ctx.editable}
                    min="0"
                    step="0.5"
                    onchange={(e) => updateField("system.weight", Number((e.target as HTMLInputElement).value))}
                />
            </label>
            <label class="field">
                <span class="field-label">Availability</span>
                <input
                    type="text"
                    value={sys.availability ?? "Scarce"}
                    disabled={!ctx.editable}
                    onchange={(e) => updateField("system.availability", (e.target as HTMLInputElement).value)}
                />
            </label>
            <label class="field toggle-field">
                <span class="field-label">Installed</span>
                <button
                    class="install-toggle"
                    class:installed={sys.installed}
                    disabled={!ctx.editable}
                    onclick={() => updateField("system.installed", !sys.installed)}
                >
                    {sys.installed ? "Installed" : "Not Installed"}
                </button>
            </label>
        </div>

        {#if sys.description}
            <div class="description">
                <h3 class="section-title">Description</h3>
                <div class="description-text">{sys.description}</div>
            </div>
        {/if}

        <RuleElementEditor
            rules={sys.rules ?? []}
            item={ctx.item}
            editable={ctx.editable}
        />
    </section>
</div>

<style lang="scss">
    .cybernetic-sheet {
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

    .item-img {
        width: 48px;
        height: 48px;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        border-radius: var(--dh2e-radius-sm, 3px);
        object-fit: cover;
    }

    .header-info {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .item-name {
        margin: 0;
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-xl, 1.4rem);
        color: var(--dh2e-gold, #c8a84e);
    }

    .header-tags {
        display: flex;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .tag {
        font-size: 0.6rem;
        padding: 1px 6px;
        border-radius: 2px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
    }

    .type-tag {
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);
        border: 1px solid var(--dh2e-border, #4a4a55);
    }

    .grade-tag {
        border: 1px solid var(--dh2e-border, #4a4a55);

        &.grade-poor { background: #3a2020; color: #c88; }
        &.grade-common { background: var(--dh2e-bg-mid, #2e2e35); color: var(--dh2e-text-secondary, #a0a0a8); }
        &.grade-good { background: #1a3020; color: #8c8; }
        &.grade-best { background: #302a10; color: var(--dh2e-gold, #c8a84e); }
    }

    .installed-tag {
        background: #1a3020;
        color: #6c6;
        border: 1px solid #4a6a4a;
    }

    .uninstalled-tag {
        background: #3a2020;
        color: #c66;
        border: 1px solid #6a4a4a;
    }

    .sheet-body {
        flex: 1;
        padding: var(--dh2e-space-md, 0.75rem);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .field-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .install-toggle {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);

        &.installed {
            background: #1a3020;
            color: #6c6;
            border-color: #4a6a4a;
        }

        &:hover:not(:disabled) {
            border-color: var(--dh2e-gold-muted, #8a7a3e);
        }
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

    .description {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .description-text {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        line-height: 1.5;
        white-space: pre-wrap;
    }
</style>
