<script lang="ts">
    import ArmourFacing from "./components/armour-facing.svelte";
    import CrewPanel from "./components/crew-panel.svelte";
    import MountedWeapons from "./components/mounted-weapons.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
    const si = $derived(sys.structuralIntegrity ?? { value: 0, max: 20 });
    const siPercent = $derived(si.max > 0 ? (si.value / si.max) * 100 : 0);
    const speed = $derived(sys.speed ?? { tactical: 0, cruising: 0, max: 0 });

    const motiveLabels: Record<string, string> = {
        wheeled: "Wheeled", tracked: "Tracked", hover: "Hover", walker: "Walker",
    };
    const sizeLabels: Record<string, string> = {
        hulking: "Hulking", enormous: "Enormous", massive: "Massive", immense: "Immense",
    };

    async function updateField(path: string, value: unknown) {
        await ctx.actor.update({ [path]: value });
    }
</script>

<div class="vehicle-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="actor-img" />
        <div class="header-info">
            <h1 class="actor-name">{ctx.name}</h1>
            <div class="header-tags">
                <span class="tag">{motiveLabels[sys.motiveSystem] ?? sys.motiveSystem}</span>
                <span class="tag">{sizeLabels[sys.size] ?? sys.size}</span>
            </div>
        </div>
    </header>

    <section class="sheet-body">
        <!-- Structural Integrity -->
        <div class="si-section">
            <div class="si-header">
                <span class="section-label">Structural Integrity</span>
                <span class="si-value">{si.value} / {si.max}</span>
            </div>
            <div class="si-bar">
                <div
                    class="si-fill"
                    class:critical={siPercent <= 25}
                    class:warning={siPercent > 25 && siPercent <= 50}
                    style="width: {siPercent}%"
                ></div>
            </div>
            {#if ctx.editable}
                <div class="si-inputs">
                    <label class="si-field">
                        <span class="field-label">Current</span>
                        <input type="number" value={si.value} min="0" max={si.max}
                            onchange={(e) => updateField("system.structuralIntegrity.value", Number((e.target as HTMLInputElement).value))} />
                    </label>
                    <label class="si-field">
                        <span class="field-label">Max</span>
                        <input type="number" value={si.max} min="1"
                            onchange={(e) => updateField("system.structuralIntegrity.max", Number((e.target as HTMLInputElement).value))} />
                    </label>
                </div>
            {/if}
        </div>

        <!-- Armour Facing -->
        <ArmourFacing armour={sys.armour ?? { front: 0, side: 0, rear: 0 }} editable={ctx.editable} actor={ctx.actor} />

        <!-- Stats Row -->
        <div class="stats-grid">
            <div class="stat-box">
                <span class="stat-label">Motive</span>
                {#if ctx.editable}
                    <select value={sys.motiveSystem ?? "wheeled"}
                        onchange={(e) => updateField("system.motiveSystem", (e.target as HTMLSelectElement).value)}>
                        <option value="wheeled">Wheeled</option>
                        <option value="tracked">Tracked</option>
                        <option value="hover">Hover</option>
                        <option value="walker">Walker</option>
                    </select>
                {:else}
                    <span class="stat-value">{motiveLabels[sys.motiveSystem] ?? "—"}</span>
                {/if}
            </div>
            <div class="stat-box">
                <span class="stat-label">Size</span>
                {#if ctx.editable}
                    <select value={sys.size ?? "hulking"}
                        onchange={(e) => updateField("system.size", (e.target as HTMLSelectElement).value)}>
                        <option value="hulking">Hulking</option>
                        <option value="enormous">Enormous</option>
                        <option value="massive">Massive</option>
                        <option value="immense">Immense</option>
                    </select>
                {:else}
                    <span class="stat-value">{sizeLabels[sys.size] ?? "—"}</span>
                {/if}
            </div>
            <div class="stat-box">
                <span class="stat-label">Handling</span>
                {#if ctx.editable}
                    <input class="stat-input" type="number" value={sys.handling ?? 0}
                        onchange={(e) => updateField("system.handling", Number((e.target as HTMLInputElement).value))} />
                {:else}
                    <span class="stat-value">{sys.handling > 0 ? "+" : ""}{sys.handling ?? 0}</span>
                {/if}
            </div>
        </div>

        <!-- Speed -->
        <div class="speed-row">
            <h3 class="section-title">Speed</h3>
            <div class="speed-grid">
                <div class="speed-box">
                    <span class="speed-label">Tactical</span>
                    {#if ctx.editable}
                        <input type="number" value={speed.tactical} min="0"
                            onchange={(e) => updateField("system.speed.tactical", Number((e.target as HTMLInputElement).value))} />
                    {:else}
                        <span class="speed-value">{speed.tactical}</span>
                    {/if}
                </div>
                <div class="speed-box">
                    <span class="speed-label">Cruising</span>
                    {#if ctx.editable}
                        <input type="number" value={speed.cruising} min="0"
                            onchange={(e) => updateField("system.speed.cruising", Number((e.target as HTMLInputElement).value))} />
                    {:else}
                        <span class="speed-value">{speed.cruising}</span>
                    {/if}
                </div>
                <div class="speed-box">
                    <span class="speed-label">Max</span>
                    {#if ctx.editable}
                        <input type="number" value={speed.max} min="0"
                            onchange={(e) => updateField("system.speed.max", Number((e.target as HTMLInputElement).value))} />
                    {:else}
                        <span class="speed-value">{speed.max}</span>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Mounted Weapons -->
        <MountedWeapons weapons={sys.mountedWeapons ?? []} items={ctx.items?.weapons ?? []} editable={ctx.editable} actor={ctx.actor} />

        <!-- Crew Panel -->
        <CrewPanel positions={sys.crewPositions ?? []} editable={ctx.editable} actor={ctx.actor} />

        <!-- Notes -->
        <div class="notes-section">
            <h3 class="section-title">Notes</h3>
            {#if ctx.editable}
                <textarea class="notes-area" value={sys.details?.notes ?? ""}
                    onchange={(e) => updateField("system.details.notes", (e.target as HTMLTextAreaElement).value)}></textarea>
            {:else if sys.details?.notes}
                <p class="notes-text">{sys.details.notes}</p>
            {/if}
        </div>
    </section>
</div>

<style lang="scss">
    .vehicle-sheet {
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
        width: 56px; height: 56px;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        border-radius: var(--dh2e-radius-sm, 3px);
        object-fit: cover;
    }
    .header-info { display: flex; flex-direction: column; gap: 2px; }
    .actor-name {
        margin: 0;
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-xl, 1.4rem);
        color: var(--dh2e-gold, #c8a84e);
    }
    .header-tags { display: flex; gap: var(--dh2e-space-xs, 0.25rem); }
    .tag {
        font-size: 0.6rem; padding: 1px 6px; border-radius: 2px;
        text-transform: uppercase; letter-spacing: 0.05em;
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);
        border: 1px solid var(--dh2e-border, #4a4a55);
    }
    .sheet-body {
        flex: 1; padding: var(--dh2e-space-md, 0.75rem);
        overflow-y: auto; display: flex; flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    /* SI Bar */
    .si-section { display: flex; flex-direction: column; gap: var(--dh2e-space-xs, 0.25rem); }
    .si-header { display: flex; justify-content: space-between; align-items: baseline; }
    .section-label {
        font-family: var(--dh2e-font-header, serif); font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e); text-transform: uppercase; letter-spacing: 0.1em;
    }
    .si-value { font-size: var(--dh2e-text-sm, 0.8rem); color: var(--dh2e-text-primary, #d0cfc8); font-weight: 700; }
    .si-bar {
        height: 12px; background: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-border, #4a4a55); border-radius: 2px; overflow: hidden;
    }
    .si-fill {
        height: 100%; background: #4a6a8a; transition: width 0.3s;
        &.warning { background: #b89a30; }
        &.critical { background: #a04040; }
    }
    .si-inputs { display: flex; gap: var(--dh2e-space-sm, 0.5rem); }
    .si-field { display: flex; flex-direction: column; gap: 2px; input { width: 4rem; } }

    /* Stats */
    .stats-grid { display: flex; gap: var(--dh2e-space-sm, 0.5rem); }
    .stat-box {
        flex: 1; display: flex; flex-direction: column; align-items: center;
        background: var(--dh2e-bg-mid, #2e2e35); border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px); padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
    }
    .stat-label { font-size: 0.6rem; color: var(--dh2e-text-secondary, #a0a0a8); text-transform: uppercase; }
    .stat-value { font-size: var(--dh2e-text-sm, 0.8rem); color: var(--dh2e-text-primary, #d0cfc8); font-weight: 700; }
    .stat-input { width: 3rem; text-align: center; }

    /* Speed */
    .speed-row { display: flex; flex-direction: column; gap: var(--dh2e-space-xs, 0.25rem); }
    .speed-grid { display: flex; gap: var(--dh2e-space-sm, 0.5rem); }
    .speed-box {
        flex: 1; display: flex; flex-direction: column; align-items: center;
        background: var(--dh2e-bg-mid, #2e2e35); border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px); padding: var(--dh2e-space-xs, 0.25rem);
    }
    .speed-label { font-size: 0.6rem; color: var(--dh2e-text-secondary, #a0a0a8); text-transform: uppercase; }
    .speed-value { font-size: var(--dh2e-text-sm, 0.8rem); color: var(--dh2e-text-primary, #d0cfc8); font-weight: 700; }

    .section-title {
        font-family: var(--dh2e-font-header, serif); font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e); text-transform: uppercase; letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e); margin: 0;
    }
    .field-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }

    .notes-section { display: flex; flex-direction: column; gap: var(--dh2e-space-xs, 0.25rem); }
    .notes-area {
        min-height: 60px; resize: vertical; font-size: var(--dh2e-text-sm, 0.8rem);
        background: var(--dh2e-bg-darkest, #111114); color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55); border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
    }
    .notes-text { font-size: var(--dh2e-text-sm, 0.8rem); color: var(--dh2e-text-primary, #d0cfc8); white-space: pre-wrap; }
</style>
