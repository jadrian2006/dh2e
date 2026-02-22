<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
    const locations = ["head", "rightArm", "leftArm", "body", "rightLeg", "leftLeg"] as const;
    const locationLabels: Record<string, string> = {
        head: "Head", rightArm: "Right Arm", leftArm: "Left Arm",
        body: "Body", rightLeg: "Right Leg", leftLeg: "Left Leg",
    };
</script>

<div class="item-sheet armour-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="item-img" />
        <div class="header-info">
            <h1 class="item-name">{ctx.name}</h1>
            <span class="item-type">Armour</span>
        </div>
    </header>

    <section class="sheet-body">
        <h3 class="section-title">Armour Points by Location</h3>
        <div class="ap-grid">
            {#each locations as loc}
                <label class="ap-field">
                    <span class="field-label">{locationLabels[loc]}</span>
                    <input type="number" value={sys.locations?.[loc] ?? 0} disabled={!ctx.editable} min="0" />
                </label>
            {/each}
        </div>

        <div class="form-row">
            <label class="field">
                <span class="field-label">Max Agility</span>
                <input type="number" value={sys.maxAgility ?? 0} disabled={!ctx.editable} min="0" />
            </label>
            <label class="field">
                <span class="field-label">Weight (kg)</span>
                <input type="number" value={sys.weight ?? 0} disabled={!ctx.editable} min="0" step="0.5" />
            </label>
        </div>

        <label class="field wide">
            <span class="field-label">Special Qualities</span>
            <input type="text" value={(sys.qualities ?? []).join(", ")} disabled={!ctx.editable} />
        </label>
    </section>
</div>

<style lang="scss">
    .armour-sheet {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .sheet-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-md);
        padding: var(--dh2e-space-md);
        background: var(--dh2e-bg-darkest);
        border-bottom: 2px solid var(--dh2e-gold-dark);
    }
    .item-img { width: 48px; height: 48px; border: 1px solid var(--dh2e-gold-muted); border-radius: var(--dh2e-radius-sm); }
    .item-name { font-family: var(--dh2e-font-header); color: var(--dh2e-gold); font-size: var(--dh2e-text-xl); }
    .item-type { font-size: var(--dh2e-text-sm); color: var(--dh2e-text-secondary); }
    .sheet-body { flex: 1; padding: var(--dh2e-space-md); overflow-y: auto; display: flex; flex-direction: column; gap: var(--dh2e-space-md); }
    .section-title { font-family: var(--dh2e-font-header); font-size: var(--dh2e-text-sm); color: var(--dh2e-gold); text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--dh2e-gold-muted); padding-bottom: var(--dh2e-space-xs); }
    .ap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--dh2e-space-sm); }
    .ap-field { display: flex; flex-direction: column; align-items: center; gap: var(--dh2e-space-xxs);
        input { width: 3rem; text-align: center; }
    }
    .field-label { font-size: var(--dh2e-text-xs); color: var(--dh2e-text-secondary); text-transform: uppercase; }
    .form-row { display: flex; gap: var(--dh2e-space-md); }
    .field { display: flex; flex-direction: column; gap: var(--dh2e-space-xxs); flex: 1;
        &.wide { width: 100%; }
    }
</style>
