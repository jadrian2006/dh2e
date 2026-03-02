<script lang="ts">
    import { AttackResolver } from "../../../combat/attack.ts";
    import type { FireMode } from "../../../combat/types.ts";
    import type { WeaponDragData } from "../../../macros/types.ts";
    import { sendItemToChat } from "../../../chat/send-to-chat.ts";
    import { parseReloadCost, getCompatibleAmmo, getCompatibleMagazines } from "@combat/ammo.ts";
    import { consumeCombatAction } from "@combat/combat-state.ts";

    let { weapon, actor }: {
        weapon: any;
        actor: any;
    } = $props();

    function onDragStart(e: DragEvent) {
        const data: WeaponDragData = {
            type: "Weapon",
            weaponId: weapon.id ?? weapon._id ?? "",
            weaponName: weapon.name,
        };
        e.dataTransfer?.setData("text/plain", JSON.stringify(data));
    }

    const sys = $derived(weapon.system ?? {});
    const hasRanged = $derived(sys.class !== "melee");
    const hasSingle = $derived(sys.rof?.single ?? true);
    const hasSemi = $derived((sys.rof?.semi ?? 0) > 0);
    const hasFull = $derived((sys.rof?.full ?? 0) > 0);
    const magMax = $derived(sys.magazine?.max ?? 0);
    const magValue = $derived(sys.magazine?.value ?? 0);

    const showReload = $derived.by(() => {
        if (magMax === 0) return false;
        if (magValue >= magMax) return false;
        const loadType = sys.loadType ?? "magazine";
        if (loadType === "individual") {
            return getCompatibleAmmo(actor, weapon).length > 0;
        }
        return getCompatibleMagazines(actor, weapon).length > 0 || getCompatibleAmmo(actor, weapon).length > 0;
    });

    const reloadTooltip = $derived.by(() => {
        const cost = parseReloadCost(sys.reload ?? "");
        const actionLabel = cost.actionType === "half" ? "Half Action" : "Full Action";
        const countLabel = cost.count > 1 ? ` \u00d7 ${cost.count}` : "";
        return `Reload: ${actionLabel}${countLabel}`;
    });

    async function onReload() {
        const cost = parseReloadCost(sys.reload ?? "");
        const loadType = sys.loadType ?? "magazine";

        if (loadType === "individual") {
            const compatible = getCompatibleAmmo(actor, weapon);
            if (compatible.length === 0) {
                ui.notifications.warn(game.i18n?.localize("DH2E.Ammo.NoAmmo") ?? "No compatible ammunition in inventory.");
                return;
            }
            if (compatible.length > 1) {
                const { showAmmoPicker } = await import("@combat/ammo-picker.ts");
                await showAmmoPicker(actor, weapon, compatible);
            } else {
                const { reloadIndividual } = await import("@combat/ammo.ts");
                const result = await reloadIndividual(actor, weapon, compatible[0]);
                if (!result) return;
                ui.notifications.info(game.i18n?.format(result.partial ? "DH2E.Ammo.ReloadPartial" : "DH2E.Ammo.ReloadComplete", {
                    actor: actor.name,
                    weapon: weapon.name,
                    loaded: String(result.loaded),
                    needed: String((sys.magazine?.max ?? 0) - result.newMagValue + result.loaded),
                    ammo: result.ammoName,
                }) ?? `${actor.name} reloads ${weapon.name} (${result.loaded} rounds of ${result.ammoName})`);
            }
        } else {
            const magazines = getCompatibleMagazines(actor, weapon);
            const looseAmmo = getCompatibleAmmo(actor, weapon);
            if (magazines.length === 0 && looseAmmo.length === 0) {
                ui.notifications.warn(game.i18n?.localize("DH2E.Ammo.NoMagazines") ?? "No loaded magazines available.");
                return;
            }
            const { showAmmoPicker } = await import("@combat/ammo-picker.ts");
            await showAmmoPicker(actor, weapon, looseAmmo);
        }

        // Consume combat action after successful reload
        await consumeCombatAction(actor.id!, cost.actionType);

        // Warn about multi-turn reloads
        if (cost.count > 1) {
            ui.notifications.info(game.i18n?.format("DH2E.Reload.MultiTurn", {
                weapon: weapon.name,
                count: String(cost.count),
                remaining: String(cost.count - 1),
            }) ?? `${weapon.name} requires ${cost.count} turns to fully reload (${cost.count - 1} remaining).`);
        }
    }

    function attack(mode: FireMode) {
        AttackResolver.resolve({ actor, weapon, fireMode: mode });
    }

    function charge() {
        AttackResolver.resolve({ actor, weapon, fireMode: "single", isCharge: true });
    }

    function ammoColor(val: number, max: number): string {
        if (val <= 0) return "var(--dh2e-danger, #c0392b)";
        const pct = val / max;
        if (pct > 0.5) return "var(--dh2e-success, #27ae60)";
        if (pct > 0.25) return "var(--dh2e-warning, #d4a017)";
        return "var(--dh2e-danger, #c0392b)";
    }
</script>

<div class="weapon-row" draggable="true" ondragstart={onDragStart}>
    <div class="weapon-info">
        <span class="weapon-name">{weapon.name}</span>
        <span class="weapon-details">
            {sys.damage?.formula ?? "1d10"}{sys.damage?.type ? ` ${sys.damage.type[0].toUpperCase()}` : ""}
            {#if sys.penetration}| Pen {sys.penetration}{/if}
        </span>
        {#if magMax > 0}
            <div class="weapon-ammo">
                <div class="mag-pips" title="{magValue} / {magMax} rounds">
                    {#each Array(Math.min(magMax, 20)) as _, i}
                        <span class="pip" class:filled={i < magValue}></span>
                    {/each}
                    {#if magMax > 20}
                        <span class="pip-overflow">+{magMax - 20}</span>
                    {/if}
                </div>
                <span class="ammo-count" style="color: {ammoColor(magValue, magMax)}">
                    {magValue}/{magMax}
                </span>
            </div>
        {/if}
    </div>
    <button class="chat-btn" onclick={(e) => { e.stopPropagation(); sendItemToChat(weapon); }} title="Send to Chat">
        <i class="fa-solid fa-comment"></i>
    </button>
    {#if showReload}
        <button class="attack-btn reload" onclick={() => onReload()} title={reloadTooltip}>
            <i class="fa-solid fa-arrows-rotate"></i>
        </button>
    {/if}
    <div class="weapon-actions">
        {#if !hasRanged}
            <button class="attack-btn melee" onclick={() => attack("single")} title="Melee Attack">Melee</button>
            <button class="attack-btn charge" onclick={() => charge()} title="Charge (+20 WS, Full Action)">Charge</button>
        {:else}
            {#if hasSingle}
                <button class="attack-btn" onclick={() => attack("single")} title="Single Shot">S</button>
            {/if}
            {#if hasSemi}
                <button class="attack-btn" onclick={() => attack("semi")} title="Semi-Auto ({sys.rof?.semi})">SA/{sys.rof?.semi}</button>
            {/if}
            {#if hasFull}
                <button class="attack-btn" onclick={() => attack("full")} title="Full-Auto ({sys.rof?.full})">FA/{sys.rof?.full}</button>
            {/if}
        {/if}
    </div>
</div>

<style lang="scss">
    .weapon-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        &:last-child { border-bottom: none; }
    }

    .chat-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.65rem;
        width: 1rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.4;

        &:hover { color: var(--dh2e-gold, #c8a84e); opacity: 1; }
    }

    .weapon-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .weapon-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 600;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .weapon-details {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .weapon-ammo {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
    }

    .mag-pips {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .mag-pips .pip {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        background: transparent;

        &.filled {
            background: var(--dh2e-gold, #b49545);
        }
    }

    .pip-overflow {
        font-size: 0.45rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-left: 1px;
    }

    .ammo-count {
        font-size: 0.55rem;
        font-weight: 700;
        font-family: monospace;
    }

    .weapon-actions {
        display: flex;
        gap: var(--dh2e-space-xxs, 0.125rem);
        flex-shrink: 0;
    }

    .attack-btn {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--dh2e-transition-fast, 0.15s);

        &:hover {
            border-color: var(--dh2e-gold, #c8a84e);
            color: var(--dh2e-gold, #c8a84e);
        }

        &.melee {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);

            &:hover {
                background: var(--dh2e-gold, #c8a84e);
            }
        }

        &.charge {
            background: var(--dh2e-bg-mid, #2e2e35);
            color: var(--dh2e-charge-orange, #d4771e);
            border-color: var(--dh2e-charge-orange, #d4771e);

            &:hover {
                background: var(--dh2e-charge-orange, #d4771e);
                color: var(--dh2e-bg-darkest, #111114);
            }
        }

        &.reload {
            color: var(--dh2e-text-secondary, #a0a0a8);
            border-color: var(--dh2e-border, #4a4a55);

            &:hover {
                border-color: var(--dh2e-gold-muted, #8a7a3e);
                color: var(--dh2e-gold, #c8a84e);
            }
        }
    }
</style>
