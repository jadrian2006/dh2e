<script lang="ts">
    import { AttackResolver } from "../../../combat/attack.ts";
    import type { FireMode } from "../../../combat/types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const chars = $derived(ctx.system?.characteristics ?? {});
    const charKeys = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"];

    const skills = $derived(ctx.items?.skills ?? []);
    const talents = $derived(ctx.items?.talents ?? []);
    const traits = $derived(ctx.items?.traits ?? []);
    const powers = $derived(ctx.items?.powers ?? []);
    const weapons = $derived(ctx.items?.weapons ?? []);
    const gear = $derived(ctx.items?.gear ?? []);
    const cybernetics = $derived(ctx.items?.cybernetics ?? []);

    function openSheet(item: any) {
        item.sheet?.render(true);
    }

    function deleteItem(item: any) {
        item.delete();
    }

    function skillLabel(s: any): string {
        const adv = s.system?.advancement ?? 0;
        return adv > 0 ? `${s.name} (+${adv * 10})` : s.name;
    }

    function traitLabel(t: any): string {
        if (t.system?.hasRating) return `${t.name} (${t.system.rating})`;
        return t.name;
    }

    function gearLabel(g: any): string {
        const qty = g.system?.quantity ?? 1;
        return qty > 1 ? `${g.name} (x${qty})` : g.name;
    }

    /** Show rich tooltip for an item's description */
    function showDescription(event: MouseEvent, item: any) {
        const desc = item.system?.description;
        if (!desc) return;
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            const html = `<div style="max-width:300px"><strong>${item.name}</strong><br/>${desc}</div>`;
            (game as any).tooltip.activate(el, { html, direction: "DOWN" });
        }
    }
</script>

<div class="npc-compact-view">
    <div class="compact-chars">
        {#each charKeys as key}
            <div class="compact-char">
                <span class="char-key">{key.toUpperCase()}</span>
                <span class="char-val">{chars[key]?.value ?? "—"}</span>
            </div>
        {/each}
    </div>

    <div class="compact-vitals">
        <span><strong>Wounds:</strong> {ctx.system?.wounds?.value ?? 0}/{ctx.system?.wounds?.max ?? 0}</span>
        <span><strong>AP:</strong> H:{ctx.system?.armour?.head ?? 0} B:{ctx.system?.armour?.body ?? 0} A:{ctx.system?.armour?.rightArm ?? 0}/{ctx.system?.armour?.leftArm ?? 0} L:{ctx.system?.armour?.rightLeg ?? 0}/{ctx.system?.armour?.leftLeg ?? 0}</span>
        <span><strong>Move:</strong> {ctx.system?.movement?.half ?? 0}/{ctx.system?.movement?.full ?? 0}/{ctx.system?.movement?.charge ?? 0}/{ctx.system?.movement?.run ?? 0}</span>
    </div>

    {#if (ctx.items?.conditions ?? []).length > 0}
        <div class="compact-conditions">
            {#each ctx.items.conditions as cond}
                <span class="condition-tag">{cond.name}{#if cond.system?.remainingRounds > 0} ({cond.system.remainingRounds}){/if}</span>
            {/each}
        </div>
    {/if}

    {#if skills.length > 0}
        <div class="compact-section">
            <span class="section-label">Skills</span>
            {#each skills as item}
                <div class="item-row">
                    <button class="item-link" onclick={() => openSheet(item)} onmouseenter={(e) => showDescription(e, item)}>{skillLabel(item)}</button>
                    {#if ctx.editable}
                        <button class="icon-btn" onclick={() => openSheet(item)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete" onclick={() => deleteItem(item)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if talents.length > 0}
        <div class="compact-section">
            <span class="section-label">Talents</span>
            {#each talents as item}
                <div class="item-row">
                    <button class="item-link" onclick={() => openSheet(item)} onmouseenter={(e) => showDescription(e, item)}>{item.name}</button>
                    {#if ctx.editable}
                        <button class="icon-btn" onclick={() => openSheet(item)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete" onclick={() => deleteItem(item)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if traits.length > 0}
        <div class="compact-section">
            <span class="section-label">Traits</span>
            {#each traits as item}
                <div class="item-row">
                    <button class="item-link" onclick={() => openSheet(item)} onmouseenter={(e) => showDescription(e, item)}>{traitLabel(item)}</button>
                    {#if ctx.editable}
                        <button class="icon-btn" onclick={() => openSheet(item)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete" onclick={() => deleteItem(item)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if powers.length > 0}
        <div class="compact-section">
            <span class="section-label">Powers</span>
            {#each powers as item}
                <div class="item-row">
                    <button class="item-link" onclick={() => openSheet(item)} onmouseenter={(e) => showDescription(e, item)}>{item.name}</button>
                    {#if item.system?.discipline}
                        <span class="item-detail">{item.system.discipline}</span>
                    {/if}
                    {#if ctx.editable}
                        <button class="icon-btn" onclick={() => openSheet(item)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete" onclick={() => deleteItem(item)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if weapons.length > 0}
        <div class="compact-section">
            <span class="section-label">Weapons</span>
            {#each weapons as weapon}
                {@const sys = weapon.system ?? {}}
                {@const isMelee = sys.class === "melee"}
                <div class="item-row">
                    <button class="item-link" onclick={() => openSheet(weapon)}>{weapon.name}</button>
                    <span class="item-detail">({sys.damage?.formula ?? ""}+{sys.damage?.bonus ?? 0} {sys.damage?.type ?? ""}, Pen {sys.penetration ?? 0})</span>
                    <button class="compact-attack-btn" onclick={() => AttackResolver.resolve({ actor: ctx.actor, weapon, fireMode: "single" })} title={isMelee ? "Melee Attack" : "Attack"}>
                        <i class="fa-solid fa-crosshairs"></i>
                    </button>
                    {#if ctx.editable}
                        <button class="icon-btn" onclick={() => openSheet(weapon)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete" onclick={() => deleteItem(weapon)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if gear.length > 0}
        <div class="compact-section">
            <span class="section-label">Gear</span>
            {#each gear as item}
                <div class="item-row">
                    <button class="item-link" onclick={() => openSheet(item)} onmouseenter={(e) => showDescription(e, item)}>{gearLabel(item)}</button>
                    {#if ctx.editable}
                        <button class="icon-btn" onclick={() => openSheet(item)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete" onclick={() => deleteItem(item)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if cybernetics.length > 0}
        <div class="compact-section">
            <span class="section-label">Cybernetics</span>
            {#each cybernetics as item}
                <div class="item-row">
                    <button class="item-link" onclick={() => openSheet(item)} onmouseenter={(e) => showDescription(e, item)}>{item.name}</button>
                    {#if ctx.editable}
                        <button class="icon-btn" onclick={() => openSheet(item)} title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete" onclick={() => deleteItem(item)} title="Delete"><i class="fa-solid fa-trash"></i></button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if ctx.system?.details?.notes}
        <div class="compact-section notes">
            <span class="section-label">Notes</span>
            <span class="notes-text">{ctx.system.details.notes}</span>
        </div>
    {/if}
</div>

<style lang="scss">
    .npc-compact-view {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
        user-select: text;
    }

    .compact-chars {
        display: flex;
        gap: 2px;
        justify-content: center;
        flex-wrap: wrap;
    }

    .compact-char {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 3rem;
        padding: var(--dh2e-space-xxs, 0.125rem);
        background: var(--dh2e-bg-light, #3a3a45);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .char-key {
        font-size: 0.55rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        text-transform: uppercase;
        font-weight: 700;
    }

    .char-val {
        font-size: var(--dh2e-text-md, 0.9rem);
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .compact-vitals {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-sm, 0.5rem);
        justify-content: center;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);

        strong {
            color: var(--dh2e-text-secondary, #a0a0a8);
            font-weight: 600;
        }
    }

    .compact-conditions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-xs, 0.25rem);
        justify-content: center;
    }

    .condition-tag {
        font-size: 0.65rem;
        padding: 1px 6px;
        background: var(--dh2e-red-dim, #4a2020);
        border-radius: 3px;
        color: var(--dh2e-red-bright, #d44);
    }

    .compact-section {
        font-size: var(--dh2e-text-sm, 0.8rem);
        line-height: 1.3;
    }

    .section-label {
        display: block;
        font-weight: 700;
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 1px;
    }

    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: 1px 0;

        &:hover {
            background: var(--dh2e-bg-light, #3a3a45);
            border-radius: var(--dh2e-radius-sm, 3px);
        }
    }

    .item-link {
        background: none;
        border: none;
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        padding: 0 2px;
        font-size: var(--dh2e-text-sm, 0.8rem);
        text-align: left;

        &:hover {
            color: var(--dh2e-gold, #c8a84e);
            text-decoration: underline;
        }
    }

    .item-detail {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.7rem;
        flex-shrink: 0;
    }

    .icon-btn {
        width: 1.2rem;
        height: 1.2rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.55rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        opacity: 0;
        border-radius: var(--dh2e-radius-sm, 3px);

        .item-row:hover & {
            opacity: 0.6;
        }

        &:hover {
            opacity: 1 !important;
            color: var(--dh2e-gold, #c8a84e);
            background: var(--dh2e-bg-mid, #2e2e35);
        }

        &.delete:hover {
            color: var(--dh2e-danger, #c0392b);
        }
    }

    .compact-attack-btn {
        width: 1.4rem;
        height: 1.4rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        font-size: 0.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &:hover {
            border-color: var(--dh2e-gold, #c8a84e);
            color: var(--dh2e-gold, #c8a84e);
        }
    }

    .notes {
        border-top: 1px solid var(--dh2e-border, #4a4a55);
        padding-top: var(--dh2e-space-sm, 0.5rem);
    }

    .notes-text {
        white-space: pre-wrap;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }
</style>
