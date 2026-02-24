<script lang="ts">
    import { AttackResolver } from "../../../combat/attack.ts";
    import type { FireMode } from "../../../combat/types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const chars = $derived(ctx.system?.characteristics ?? {});
    const charKeys = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"];

    const skillNames = $derived(
        (ctx.items?.skills ?? []).map((s: any) => {
            const adv = s.system?.advancement ?? 0;
            const suffix = adv > 0 ? ` (+${adv * 10})` : "";
            return `${s.name}${suffix}`;
        }).join(", ") || "None",
    );

    const talentNames = $derived(
        (ctx.items?.talents ?? []).map((t: any) => t.name).join(", ") || "None",
    );

    const traitNames = $derived(
        (ctx.items?.traits ?? []).map((t: any) => {
            if (t.system?.hasRating) return `${t.name} (${t.system.rating})`;
            return t.name;
        }).join(", ") || "None",
    );

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

    <div class="compact-section">
        <span class="section-label">Skills:</span>
        <span class="section-text">{skillNames}</span>
    </div>

    <div class="compact-section">
        <span class="section-label">Talents:</span>
        <span class="section-text">{talentNames}</span>
    </div>

    <div class="compact-section">
        <span class="section-label">Traits:</span>
        <span class="section-text">{traitNames}</span>
    </div>

    <div class="compact-section">
        <span class="section-label">Weapons:</span>
        {#each ctx.items?.weapons ?? [] as weapon}
            {@const sys = weapon.system ?? {}}
            {@const isMelee = sys.class === "melee"}
            <div class="compact-weapon">
                <span class="section-text">{weapon.name} ({sys.damage?.formula ?? ""}+{sys.damage?.bonus ?? 0} {sys.damage?.type ?? ""}, Pen {sys.penetration ?? 0})</span>
                <button class="compact-attack-btn" onclick={() => AttackResolver.resolve({ actor: ctx.actor, weapon, fireMode: "single" })} title={isMelee ? "Melee Attack" : "Attack"}>
                    <i class="fa-solid fa-crosshairs"></i>
                </button>
            </div>
        {:else}
            <span class="section-text">None</span>
        {/each}
    </div>

    {#if ctx.system?.details?.notes}
        <div class="compact-section notes">
            <span class="section-label">Notes:</span>
            <span class="section-text">{ctx.system.details.notes}</span>
        </div>
    {/if}
</div>

<style lang="scss">
    .npc-compact-view {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
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
        font-weight: 700;
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-size: 0.7rem;
        text-transform: uppercase;
    }

    .section-text {
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .compact-weapon {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
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

        .section-text {
            white-space: pre-wrap;
            color: var(--dh2e-text-secondary, #a0a0a8);
            font-style: italic;
        }
    }
</style>
