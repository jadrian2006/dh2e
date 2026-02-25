<script lang="ts">
    import RuleElementEditor from "@rules/rule-element/rule-element-editor.svelte";

    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
</script>

<div class="item-sheet weapon-sheet">
    <header class="sheet-header">
        <img src={ctx.img} alt={ctx.name} class="item-img" />
        <div class="header-info">
            <h1 class="item-name">{ctx.name}</h1>
            <span class="item-type">Weapon</span>
        </div>
    </header>

    <section class="sheet-body">
        <div class="form-grid">
            <label class="field">
                <span class="field-label">Class</span>
                <select value={sys.class ?? "melee"} disabled={!ctx.editable}>
                    <option value="melee">Melee</option>
                    <option value="pistol">Pistol</option>
                    <option value="basic">Basic</option>
                    <option value="heavy">Heavy</option>
                    <option value="thrown">Thrown</option>
                </select>
            </label>
            <label class="field">
                <span class="field-label">Range (m)</span>
                <input type="number" value={sys.range ?? 0} disabled={!ctx.editable} min="0" />
            </label>
            <label class="field">
                <span class="field-label">Damage</span>
                <input type="text" value={sys.damage?.formula ?? "1d10"} disabled={!ctx.editable} />
            </label>
            <label class="field">
                <span class="field-label">Type</span>
                <select value={sys.damage?.type ?? "impact"} disabled={!ctx.editable}>
                    <option value="energy">Energy</option>
                    <option value="impact">Impact</option>
                    <option value="rending">Rending</option>
                    <option value="explosive">Explosive</option>
                </select>
            </label>
            <label class="field">
                <span class="field-label">Penetration</span>
                <input type="number" value={sys.penetration ?? 0} disabled={!ctx.editable} min="0" />
            </label>
            <label class="field">
                <span class="field-label">Clip</span>
                <input type="number" value={sys.clip?.max ?? 0} disabled={!ctx.editable} min="0" />
            </label>
        </div>

        <h3 class="section-title">Rate of Fire</h3>
        <div class="rof-grid">
            <label class="rof-toggle">
                <input type="checkbox" checked={sys.rof?.single ?? true} disabled={!ctx.editable} />
                Single
            </label>
            <label class="rof-field">
                <span class="field-label">Semi</span>
                <input type="number" value={sys.rof?.semi ?? 0} disabled={!ctx.editable} min="0" max="6" />
            </label>
            <label class="rof-field">
                <span class="field-label">Full</span>
                <input type="number" value={sys.rof?.full ?? 0} disabled={!ctx.editable} min="0" max="10" />
            </label>
        </div>

        <h3 class="section-title">Other</h3>
        <div class="form-grid">
            <label class="field">
                <span class="field-label">Weight (kg)</span>
                <input type="number" value={sys.weight ?? 0} disabled={!ctx.editable} min="0" step="0.5" />
            </label>
            <label class="field">
                <span class="field-label">Reload</span>
                <input type="text" value={sys.reload ?? ""} disabled={!ctx.editable} />
            </label>
        </div>

        <label class="field wide">
            <span class="field-label">Special Qualities</span>
            <input type="text" value={(sys.qualities ?? []).join(", ")} disabled={!ctx.editable} placeholder="Reliable, Tearing..." />
        </label>

        <RuleElementEditor
            rules={sys.rules ?? []}
            item={ctx.item}
            editable={ctx.editable && ctx.ruleEditingAllowed !== false}
        />
    </section>
</div>

<style lang="scss">
    .weapon-sheet {
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
    .item-img {
        width: 48px;
        height: 48px;
        border: 1px solid var(--dh2e-gold-muted);
        border-radius: var(--dh2e-radius-sm);
    }
    .item-name {
        font-family: var(--dh2e-font-header);
        color: var(--dh2e-gold);
        font-size: var(--dh2e-text-xl);
    }
    .item-type {
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-secondary);
    }
    .sheet-body {
        flex: 1;
        padding: var(--dh2e-space-md);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md);
    }
    .section-title {
        font-family: var(--dh2e-font-header);
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-gold);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs);
        border-bottom: 1px solid var(--dh2e-gold-muted);
    }
    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-sm);
    }
    .field {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs);

        &.wide {
            grid-column: 1 / -1;
        }
    }
    .field-label {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-text-secondary);
        text-transform: uppercase;
    }
    .rof-grid {
        display: flex;
        gap: var(--dh2e-space-md);
        align-items: center;
    }
    .rof-toggle {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs);
        font-size: var(--dh2e-text-sm);
    }
    .rof-field {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs);

        input {
            width: 3rem;
        }
    }
</style>
