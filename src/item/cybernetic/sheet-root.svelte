<script lang="ts">
    import RuleElementEditor from "@rules/rule-element/rule-element-editor.svelte";
    import { performMaintenance } from "./maintenance.ts";
    import type { MaintenanceState } from "./data.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
    const maintenanceState = $derived(
        (ctx.item?.maintenanceState ?? "normal") as MaintenanceState,
    );
    const showBanner = $derived(sys.installed === true);

    function getBannerColor(state: MaintenanceState): string {
        switch (state) {
            case "normal": return "#1a3020";
            case "minorMalfunction": return "#2e2a10";
            case "degraded": return "#2e2010";
            case "totalFailure": return "#3a1515";
            default: return "#1a3020";
        }
    }

    function getBannerBorder(state: MaintenanceState): string {
        switch (state) {
            case "normal": return "#4a6a4a";
            case "minorMalfunction": return "#8a8a3a";
            case "degraded": return "#8a6a3a";
            case "totalFailure": return "#8a3a3a";
            default: return "#4a6a4a";
        }
    }

    function getBannerTextColor(state: MaintenanceState): string {
        switch (state) {
            case "normal": return "#6c6";
            case "minorMalfunction": return "#cc6";
            case "degraded": return "#c86";
            case "totalFailure": return "#c44";
            default: return "#6c6";
        }
    }

    async function doMaintain() {
        const actor = ctx.item?.actor;
        if (!actor) return;
        await performMaintenance(actor, [ctx.item]);
    }

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

    {#if showBanner}
        <div
            class="maintenance-banner"
            style="background: {getBannerColor(maintenanceState)}; border-color: {getBannerBorder(maintenanceState)}; color: {getBannerTextColor(maintenanceState)}"
        >
            <span class="banner-label">
                {game.i18n.localize(`DH2E.Cybernetic.State.${maintenanceState}`)}
            </span>
            <button class="banner-maintain-btn" onclick={doMaintain}>
                <i class="fa-solid fa-wrench"></i>
                {game.i18n.localize("DH2E.Cybernetic.Maintenance.Button")}
            </button>
        </div>
    {/if}

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
                    onclick={() => ctx.item?.toggleInstalled?.() ?? updateField("system.installed", !sys.installed)}
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
            editable={ctx.editable && ctx.ruleEditingAllowed !== false}
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

    .maintenance-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        border-bottom: 1px solid;
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .banner-label {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .banner-maintain-btn {
        padding: 2px var(--dh2e-space-sm, 0.5rem);
        border: 1px solid currentColor;
        border-radius: var(--dh2e-radius-sm, 3px);
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.8;

        &:hover { opacity: 1; background: rgba(255,255,255,0.05); }

        i { margin-right: 0.25rem; }
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
