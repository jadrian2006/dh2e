<script lang="ts">
    import RuleElementEditor from "@rules/rule-element/rule-element-editor.svelte";
    import { WEAPON_GROUPS } from "./data.ts";
    import { MOD_SLOTS } from "@item/modification/data.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();
    const sys = $derived(ctx.system ?? {});
    const isRanged = $derived((sys.magazine?.max ?? 0) > 0);

    /** Effective qualities from weapon document (includes ammo + actor overrides) */
    const effectiveQuals: string[] = $derived(ctx.item?.effectiveQualities ?? sys.qualities ?? []);
    const effectiveQualsDiffer = $derived.by(() => {
        const raw = sys.qualities ?? [];
        if (raw.length !== effectiveQuals.length) return true;
        return effectiveQuals.some((q: string, i: number) => q !== raw[i]);
    });

    // --- Modifications ---
    interface ResolvedMod {
        uuid: string;
        name: string;
        slot: string;
        img: string;
    }

    let resolvedMods: ResolvedMod[] = $state([]);
    let modsLoading = $state(false);

    /** Resolve modification UUIDs to display data */
    async function loadMods() {
        const uuids: string[] = sys.modifications ?? [];
        if (uuids.length === 0) { resolvedMods = []; return; }
        modsLoading = true;
        const results: ResolvedMod[] = [];
        for (const uuid of uuids) {
            try {
                const doc = await fromUuid(uuid) as any;
                if (doc) {
                    results.push({
                        uuid,
                        name: doc.name ?? "Unknown",
                        slot: doc.system?.slot ?? "general",
                        img: doc.img ?? "",
                    });
                }
            } catch {
                results.push({ uuid, name: "Unknown", slot: "general", img: "" });
            }
        }
        resolvedMods = results;
        modsLoading = false;
    }

    // Load mods on mount
    $effect(() => {
        const _uuids = sys.modifications;
        loadMods();
    });

    /** Occupied slots (excluding "general" which allows multiples) */
    const occupiedSlots = $derived(new Set(resolvedMods.filter(m => m.slot !== "general").map(m => m.slot)));

    /** Handle drop of a modification item onto this weapon */
    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        if (!ctx.editable) return;
        const data = event.dataTransfer?.getData("text/plain");
        if (!data) return;
        try {
            const parsed = JSON.parse(data);
            if (parsed.type !== "Item") return;
            const uuid = parsed.uuid;
            if (!uuid) return;
            const doc = await fromUuid(uuid) as any;
            if (!doc || doc.type !== "modification") {
                ui.notifications?.warn(game.i18n?.localize("DH2E.Modification.CannotAttach") ?? "Only modifications can be attached.");
                return;
            }
            if (doc.system?.modType !== "weapon") {
                ui.notifications?.warn(game.i18n?.localize("DH2E.Modification.CannotAttach") ?? "This modification is not for weapons.");
                return;
            }
            // Check slot conflict
            const slot = doc.system?.slot ?? "general";
            if (slot !== "general" && occupiedSlots.has(slot)) {
                const slotLabel = game.i18n?.localize(`DH2E.ModSlot.${slot}`) ?? slot;
                ui.notifications?.warn(
                    game.i18n?.format("DH2E.Modification.SlotConflict", { slot: slotLabel }) ?? `Slot "${slotLabel}" is already occupied.`
                );
                return;
            }
            // Check duplicate
            const existing: string[] = sys.modifications ?? [];
            if (existing.includes(uuid)) return;
            // Attach
            await ctx.item?.update({ "system.modifications": [...existing, uuid] });
        } catch { /* ignore invalid drops */ }
    }

    /** Remove a modification by UUID */
    async function removeMod(uuid: string) {
        if (!ctx.editable) return;
        const existing: string[] = sys.modifications ?? [];
        await ctx.item?.update({ "system.modifications": existing.filter((u: string) => u !== uuid) });
    }

    function getSlotLabel(slot: string): string {
        return game.i18n?.localize(`DH2E.ModSlot.${slot}`) ?? slot;
    }
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
                <span class="field-label">Magazine</span>
                <input type="number" value={sys.magazine?.max ?? 0} disabled={!ctx.editable} min="0" />
            </label>
            <label class="field">
                <span class="field-label">Weapon Group</span>
                <select value={sys.weaponGroup ?? ""} disabled={!ctx.editable}>
                    <option value="">— None —</option>
                    {#each WEAPON_GROUPS as group}
                        <option value={group}>{group.charAt(0).toUpperCase() + group.slice(1)}</option>
                    {/each}
                </select>
            </label>
            {#if isRanged}
            <label class="field">
                <span class="field-label">Load Type</span>
                <select value={sys.loadType ?? ""} disabled={!ctx.editable}>
                    <option value="">— None —</option>
                    <option value="magazine">Magazine Swap</option>
                    <option value="individual">Individual Loading</option>
                </select>
            </label>
            {/if}
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
            {#if effectiveQualsDiffer}
                <span class="effective-quals">Effective: {effectiveQuals.join(", ")}</span>
            {/if}
        </label>

        <!-- Modifications -->
        <h3 class="section-title">{game.i18n?.localize("DH2E.Modification.Title") ?? "Modifications"}</h3>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="modifications-section"
            ondragover={(e) => e.preventDefault()}
            ondrop={handleDrop}
        >
            {#if resolvedMods.length > 0}
                <div class="mod-list">
                    {#each resolvedMods as mod (mod.uuid)}
                        <div class="mod-pill">
                            <span class="mod-slot-tag">{getSlotLabel(mod.slot)}</span>
                            <span class="mod-name">{mod.name}</span>
                            {#if ctx.editable}
                                <button class="mod-remove" onclick={() => removeMod(mod.uuid)} title="Remove">&times;</button>
                            {/if}
                        </div>
                    {/each}
                </div>
            {:else if modsLoading}
                <p class="mod-empty"><i class="fa-solid fa-spinner fa-spin"></i></p>
            {:else}
                <p class="mod-empty">{game.i18n?.localize("DH2E.Modification.DropHint") ?? "Drag modifications here"}</p>
            {/if}
        </div>

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
    .effective-quals {
        font-size: var(--dh2e-text-xs);
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-style: italic;
        margin-top: var(--dh2e-space-xxs, 2px);
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

    .modifications-section {
        border: 1px dashed var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
        min-height: 2rem;
        background: var(--dh2e-bg-darkest, #111114);
    }

    .mod-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .mod-pill {
        display: inline-flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: 2px 6px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .mod-slot-tag {
        font-size: 0.55rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0 3px;
        border-radius: 2px;
        background: rgba(200, 168, 78, 0.15);
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
    }

    .mod-name {
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .mod-remove {
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0 2px;
        line-height: 1;

        &:hover { color: #d66; }
    }

    .mod-empty {
        margin: 0;
        text-align: center;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }
</style>
