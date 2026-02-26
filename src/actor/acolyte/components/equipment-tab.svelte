<script lang="ts">
    import { sendItemToChat } from "../../../chat/send-to-chat.ts";
    import { performMaintenance } from "../../../item/cybernetic/maintenance.ts";
    import { reloadWeapon, unloadWeapon, getCompatibleAmmo, getCompatibleMagazines, loadMagazine, unloadMagazine, totalLoaded } from "../../../combat/ammo.ts";
    import type { MaintenanceState } from "../../../item/cybernetic/data.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    type Category = "all" | "weapons" | "armour" | "gear" | "ammunition" | "cybernetics" | "treasure";
    let category: Category = $state("all");

    const allItems = $derived(() => {
        const items = ctx.items ?? {};
        switch (category) {
            case "weapons": return items.weapons ?? [];
            case "armour": return items.armour ?? [];
            case "gear": return items.gear ?? [];
            case "ammunition": return items.ammunition ?? [];
            case "cybernetics": return items.cybernetics ?? [];
            case "treasure": return items.treasure ?? [];
            default: return [
                ...(items.weapons ?? []),
                ...(items.armour ?? []),
                ...(items.gear ?? []),
                ...(items.ammunition ?? []),
                ...(items.cybernetics ?? []),
                ...(items.treasure ?? []),
            ];
        }
    });

    const totalWeight = $derived(() => {
        return allItems().reduce((sum: number, item: any) => {
            const sys = item.system ?? {};
            const weight = sys.weight ?? 0;
            const qty = sys.quantity ?? 1;
            return sum + weight * qty;
        }, 0);
    });

    const encumbrance = $derived(ctx.encumbrance ?? { current: 0, carry: 0, lift: 0, push: 0, overloaded: false, overencumbered: false });
    const encPct = $derived(encumbrance.carry > 0 ? Math.min(100, (encumbrance.current / encumbrance.carry) * 100) : 0);
    const encClass = $derived(encumbrance.overencumbered ? "over-encumbered" : encumbrance.overloaded ? "overloaded" : "normal");

    async function toggleEquipped(item: any) {
        const sys = item.system ?? {};
        await item.update({ "system.equipped": !sys.equipped });
    }

    async function toggleInstalled(item: any) {
        if (item.toggleInstalled) {
            await item.toggleInstalled();
        } else {
            const sys = item.system ?? {};
            await item.update({ "system.installed": !sys.installed });
        }
    }

    async function maintainCybernetic(item: any) {
        const actor = ctx.actor;
        if (!actor) return;
        await performMaintenance(actor, [item]);
    }

    function getMaintenanceIcon(state: MaintenanceState): string {
        switch (state) {
            case "normal": return "fa-solid fa-circle-check";
            case "minorMalfunction": return "fa-solid fa-triangle-exclamation";
            case "degraded": return "fa-solid fa-exclamation-circle";
            case "totalFailure": return "fa-solid fa-circle-xmark";
            default: return "fa-solid fa-circle-question";
        }
    }

    function getMaintenanceColor(state: MaintenanceState): string {
        switch (state) {
            case "normal": return "#6c6";
            case "minorMalfunction": return "#cc6";
            case "degraded": return "#c86";
            case "totalFailure": return "#c44";
            default: return "#888";
        }
    }

    async function deleteItem(item: any) {
        await item.delete();
    }

    function editItem(item: any) {
        item.sheet?.render(true);
    }

    /** Check if an item supports stacking (has a quantity field) */
    function isStackable(item: any): boolean {
        return (item.system?.quantity !== undefined) && (item.type === "gear" || item.type === "ammunition" || item.type === "treasure");
    }

    /** Split a stack: prompt for quantity, then create a new item with that amount */
    async function splitStack(item: any) {
        const qty = item.system?.quantity ?? 1;
        if (qty <= 1) return;

        const splitAmount = await new Promise<number | null>((resolve) => {
            const content = `<form><div class="form-group"><label>${game.i18n?.localize("DH2E.Item.Split.Prompt") ?? "How many to split off?"}</label><input type="number" name="amount" value="1" min="1" max="${qty - 1}" autofocus /></div></form>`;

            new fa.api.DialogV2({
                window: { title: game.i18n?.localize("DH2E.Item.Split.Title") ?? "Split Stack" },
                content,
                buttons: [
                    {
                        action: "split",
                        label: game.i18n?.localize("DH2E.Item.Split.Button") ?? "Split",
                        default: true,
                        callback: (_event: any, _button: any, dialog: HTMLElement) => {
                            const input = dialog.querySelector("input[name='amount']") as HTMLInputElement;
                            resolve(parseInt(input?.value ?? "0", 10));
                        },
                    },
                    {
                        action: "cancel",
                        label: game.i18n?.localize("Cancel") ?? "Cancel",
                        callback: () => resolve(null),
                    },
                ],
                position: { width: 300 },
            }).render(true);
        });

        if (!splitAmount || splitAmount <= 0 || splitAmount >= qty) return;

        const actor = ctx.actor;
        if (!actor) return;

        // Reduce original stack
        await item.update({ "system.quantity": qty - splitAmount });

        // Create new stack
        const newData = item.toObject();
        delete newData._id;
        newData.system.quantity = splitAmount;
        await actor.createEmbeddedDocuments("Item", [newData]);
    }

    /** Merge two items of the same name/type by summing their quantities */
    async function mergeStacks(item: any) {
        const actor = ctx.actor;
        if (!actor) return;

        // Find other items of same name and type
        const duplicates = actor.items.filter((i: any) =>
            i.id !== item.id && i.name === item.name && i.type === item.type && isStackable(i),
        );
        if (duplicates.length === 0) {
            ui.notifications?.info(`No other stacks of "${item.name}" to merge.`);
            return;
        }

        // Sum all quantities and delete duplicates
        let totalQty = item.system?.quantity ?? 1;
        const toDelete: string[] = [];
        for (const dup of duplicates) {
            totalQty += dup.system?.quantity ?? 1;
            toDelete.push(dup.id!);
        }

        await item.update({ "system.quantity": totalQty });
        if (toDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("Item", toDelete);
        }
    }

    /** Reload a weapon from inventory ammo */
    async function reloadItem(item: any) {
        const actor = ctx.actor;
        if (!actor) return;

        const sys = item.system ?? {};
        const loadType = sys.loadType ?? "magazine";

        // For magazine-type: show magazine picker if available
        if (loadType !== "individual") {
            const magazines = getCompatibleMagazines(actor, item);
            const looseAmmo = getCompatibleAmmo(actor, item);
            if (magazines.length > 0 || looseAmmo.length > 1) {
                const { showAmmoPicker } = await import("../../../combat/ammo-picker.ts");
                await showAmmoPicker(actor, item, looseAmmo);
                return;
            }
        }

        const result = await reloadWeapon(actor, item);
        if (result) {
            const msg = result.magazineSwap
                ? `Magazine swapped: ${result.ammoName} (${result.newMagValue}/${sys.magazine?.max ?? 0})`
                : result.partial
                    ? `Partial reload: ${result.loaded} rounds of ${result.ammoName} loaded (${result.newMagValue}/${sys.magazine?.max ?? 0})`
                    : `Reloaded with ${result.ammoName} (${result.newMagValue}/${sys.magazine?.max ?? 0})`;
            ui.notifications?.info(msg);
        } else {
            const compatible = getCompatibleAmmo(actor, item);
            const magazines = getCompatibleMagazines(actor, item);
            if (compatible.length === 0 && magazines.length === 0) {
                ui.notifications?.warn("No compatible ammunition in inventory.");
            } else {
                ui.notifications?.info("Weapon is already fully loaded.");
            }
        }
    }

    /** Unload a weapon's magazine/rounds back to inventory */
    async function unloadItem(item: any) {
        const actor = ctx.actor;
        if (!actor) return;
        const result = await unloadWeapon(actor, item);
        if (result) {
            ui.notifications?.info(`Unloaded ${result.unloaded} rounds of ${result.ammoName}.`);
        } else {
            ui.notifications?.info("Weapon is already empty.");
        }
    }

    /** Load loose ammo into a magazine */
    async function loadMag(item: any) {
        const actor = ctx.actor;
        if (!actor) return;

        // Use the magazine loading dialog for detailed control
        const { showMagazineLoader } = await import("../../../combat/ammo-loader.ts");
        await showMagazineLoader(actor, item);
    }

    /** Unload rounds from a magazine back to inventory */
    async function unloadMag(item: any) {
        const actor = ctx.actor;
        if (!actor) return;
        const result = await unloadMagazine(actor, item);
        if (result) {
            ui.notifications?.info(`Extracted ${result.unloaded} rounds of ${result.ammoName} from magazine.`);
        } else {
            ui.notifications?.info("Magazine is already empty.");
        }
    }

    function toggleFavorite(item: any) {
        const current = item.getFlag?.("dh2e", "favorite");
        if (current) item.unsetFlag("dh2e", "favorite");
        else item.setFlag("dh2e", "favorite", true);
    }

    function getItemIcon(type: string): string {
        switch (type) {
            case "weapon": return "fa-solid fa-crosshairs";
            case "armour": return "fa-solid fa-shield-halved";
            case "gear": return "fa-solid fa-box-open";
            case "talent": return "fa-solid fa-star";
            case "condition": return "fa-solid fa-bolt";
            case "power": return "fa-solid fa-hat-wizard";
            case "ammunition": return "fa-solid fa-burst";
            case "cybernetic": return "fa-solid fa-microchip";
            case "treasure": return "fa-solid fa-gem";
            default: return "fa-solid fa-circle";
        }
    }
</script>

<div class="equipment-tab">
    <div class="equipment-header">
        <div class="category-filter" role="tablist" aria-label="Equipment category filter">
            <button class="filter-btn" class:active={category === "all"} onclick={() => category = "all"} role="tab" aria-selected={category === "all"}>All</button>
            <button class="filter-btn" class:active={category === "weapons"} onclick={() => category = "weapons"} role="tab" aria-selected={category === "weapons"}>Weapons</button>
            <button class="filter-btn" class:active={category === "armour"} onclick={() => category = "armour"} role="tab" aria-selected={category === "armour"}>Armour</button>
            <button class="filter-btn" class:active={category === "gear"} onclick={() => category = "gear"} role="tab" aria-selected={category === "gear"}>Gear</button>
            <button class="filter-btn" class:active={category === "ammunition"} onclick={() => category = "ammunition"} role="tab" aria-selected={category === "ammunition"}>Ammo</button>
            <button class="filter-btn" class:active={category === "cybernetics"} onclick={() => category = "cybernetics"} role="tab" aria-selected={category === "cybernetics"}>Cybernetics</button>
            <button class="filter-btn" class:active={category === "treasure"} onclick={() => category = "treasure"} role="tab" aria-selected={category === "treasure"}>Treasure</button>
        </div>
        <span class="weight-total">Weight: {totalWeight().toFixed(1)} kg</span>
        <button class="requisition-btn" onclick={() => ctx.openRequisitionDialog?.()}>
            <i class="fa-solid fa-coins"></i> Requisition
        </button>
    </div>

    <div class="encumbrance-bar {encClass}">
        <div class="enc-fill" style="width: {encPct}%"></div>
        <span class="enc-label">
            {encumbrance.current.toFixed(1)} / {encumbrance.carry} kg
        </span>
        {#if encumbrance.overencumbered}
            <span class="enc-warning"><i class="fas fa-exclamation-triangle"></i> Cannot Move</span>
        {:else if encumbrance.overloaded}
            <span class="enc-warning"><i class="fas fa-weight-hanging"></i> Overloaded (-10 Ag, half movement)</span>
        {/if}
    </div>

    <div class="item-list">
        {#each allItems() as item}
            {@const cyberState = item.type === "cybernetic" ? (item.maintenanceState ?? "normal") as MaintenanceState : null}
            <div
                class="item-row"
                class:equipped={item.system?.equipped}
                class:cyber-failure={cyberState === "totalFailure"}
                draggable="true"
                ondragstart={(e) => {
                    e.dataTransfer?.setData("text/plain", JSON.stringify({
                        type: "Item",
                        uuid: item.uuid,
                    }));
                }}
            >
                <button class="fav-star" onclick={() => toggleFavorite(item)} title="Favorite">
                    <i class={item.getFlag?.("dh2e", "favorite") ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                </button>
                <button class="chat-btn" onclick={(e) => { e.stopPropagation(); sendItemToChat(item); }} title="Send to Chat">
                    <i class="fa-solid fa-comment"></i>
                </button>
                <i class="item-icon {getItemIcon(item.type)}"></i>
                <div class="item-info">
                    <span class="item-name">{item.name}</span>
                    <span class="item-type">{item.type}</span>
                    {#if item.type === "weapon" && (item.system?.magazine?.max ?? 0) > 0}
                        <div class="mag-row">
                            <div class="mag-pips" title="{item.system.magazine.value ?? 0} / {item.system.magazine.max} rounds">
                                {#each Array(Math.min(item.system.magazine.max, 20)) as _, i}
                                    <span class="pip" class:filled={i < (item.system.magazine.value ?? 0)}></span>
                                {/each}
                                {#if item.system.magazine.max > 20}
                                    <span class="pip-overflow">+{item.system.magazine.max - 20}</span>
                                {/if}
                            </div>
                            {#if (item.system.magazine.value ?? 0) < (item.system.magazine.max ?? 0)}
                                <button class="reload-btn" onclick={(e) => { e.stopPropagation(); reloadItem(item); }} title="Reload">
                                    <i class="fa-solid fa-rotate-right"></i>
                                </button>
                            {/if}
                            {#if (item.system.magazine.value ?? 0) > 0}
                                <button class="reload-btn unload" onclick={(e) => { e.stopPropagation(); unloadItem(item); }} title={item.system.loadType === "magazine" ? "Eject magazine" : "Unload rounds"}>
                                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                                </button>
                            {/if}
                        </div>
                    {/if}
                    {#if item.type === "ammunition" && (item.system?.capacity ?? 0) > 0}
                        {@const magRounds = item.system.loadedRounds ?? []}
                        {@const magLoaded = totalLoaded(magRounds)}
                        <div class="mag-row">
                            <span class="mag-count">{magLoaded}/{item.system.capacity}</span>
                            {#if magRounds.length > 0}
                                <span class="mag-type">{magRounds.map((r) => `${r.name} ×${r.count}`).join(", ")}</span>
                            {/if}
                            {#if magLoaded < (item.system.capacity ?? 0)}
                                <button class="reload-btn" onclick={(e) => { e.stopPropagation(); loadMag(item); }} title="Load magazine">
                                    <i class="fa-solid fa-rotate-right"></i>
                                </button>
                            {/if}
                            {#if magLoaded > 0}
                                <button class="reload-btn unload" onclick={(e) => { e.stopPropagation(); unloadMag(item); }} title="Unload magazine">
                                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                                </button>
                            {/if}
                        </div>
                    {/if}
                </div>
                {#if item.system?.quantity !== undefined}
                    <span class="item-qty">x{item.system.quantity ?? 1}</span>
                    {#if isStackable(item) && (item.system.quantity ?? 1) > 1}
                        <button class="stack-btn" onclick={(e) => { e.stopPropagation(); splitStack(item); }} title="Split Stack">
                            <i class="fa-solid fa-scissors"></i>
                        </button>
                    {/if}
                    {#if isStackable(item)}
                        <button class="stack-btn" onclick={(e) => { e.stopPropagation(); mergeStacks(item); }} title="Merge Stacks">
                            <i class="fa-solid fa-layer-group"></i>
                        </button>
                    {/if}
                {/if}
                {#if item.type === "weapon" || item.type === "armour"}
                    <button
                        class="equip-btn"
                        class:equipped={item.system?.equipped}
                        onclick={() => toggleEquipped(item)}
                        title={item.system?.equipped ? "Unequip" : "Equip"}
                    >
                        {item.system?.equipped ? "E" : "—"}
                    </button>
                {:else if item.type === "cybernetic"}
                    {#if item.system?.installed && cyberState}
                        <span
                            class="cyber-state-icon"
                            style="color: {getMaintenanceColor(cyberState)}"
                            title={game.i18n.localize(`DH2E.Cybernetic.State.${cyberState}`)}
                        >
                            <i class={getMaintenanceIcon(cyberState)}></i>
                        </span>
                        <button
                            class="maintain-btn"
                            onclick={(e) => { e.stopPropagation(); maintainCybernetic(item); }}
                            title={game.i18n.localize("DH2E.Cybernetic.Maintenance.Button")}
                        >
                            <i class="fa-solid fa-wrench"></i>
                        </button>
                    {/if}
                    <button
                        class="install-btn"
                        class:installed={item.system?.installed}
                        onclick={() => toggleInstalled(item)}
                        title={item.system?.installed ? "Uninstall" : "Install"}
                    >
                        <i class={item.system?.installed ? "fa-solid fa-plug-circle-check" : "fa-solid fa-plug-circle-xmark"}></i>
                    </button>
                {/if}
                <button class="edit-btn" onclick={() => editItem(item)} title="Edit">&#9998;</button>
                <button class="delete-btn" onclick={() => deleteItem(item)} title="Delete">&times;</button>
            </div>
        {:else}
            <p class="empty-msg">No items. Drag items from the Items sidebar to add them.</p>
        {/each}
    </div>
</div>

<style lang="scss">
    .equipment-tab {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .equipment-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .category-filter {
        display: flex;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .filter-btn {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        text-transform: uppercase;
        cursor: pointer;

        &.active {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .weight-total {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .requisition-btn {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-gold-muted, #7a6a3e);
        border: 1px solid var(--dh2e-gold, #b49545);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;

        &:hover { background: var(--dh2e-gold, #b49545); color: #1e1e22; }

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .item-list {
        display: flex;
        flex-direction: column;
    }

    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        &.equipped { border-left: 2px solid var(--dh2e-gold, #c8a84e); }
    }

    .fav-star {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.7rem;
        width: 1rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-gold-bright, #c8a84e); }
        :global(.fa-solid.fa-star) { color: var(--dh2e-gold, #b49545); }
    }

    .item-icon {
        width: 1.2rem;
        text-align: center;
        font-size: 0.75rem;
        color: var(--dh2e-gold-muted, #8a7a3e);
    }

    .item-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .item-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .item-type {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: capitalize;
    }

    .mag-pips {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .mag-pips .pip {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        background: transparent;

        &.filled {
            background: var(--dh2e-gold, #b49545);
        }
    }

    .pip-overflow {
        font-size: 0.5rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-left: 2px;
    }

    .reload-btn {
        width: 1rem;
        height: 1rem;
        border: none;
        background: transparent;
        color: var(--dh2e-gold-muted, #8a7a3e);
        cursor: pointer;
        font-size: 0.55rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.15s;

        .item-row:hover & { opacity: 0.6; }
        &:hover { opacity: 1 !important; color: var(--dh2e-gold, #c8a84e); }
        &.unload:hover { color: var(--dh2e-red-bright, #d44); }
    }

    .mag-row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 1px;
    }

    .mag-count {
        font-size: 0.6rem;
        font-weight: 700;
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-family: monospace;
    }

    .mag-type {
        font-size: 0.5rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        max-width: 8rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .item-qty {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .stack-btn {
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
        transition: opacity 0.15s;

        .item-row:hover & { opacity: 0.6; }
        &:hover { opacity: 1 !important; color: var(--dh2e-gold, #c8a84e); }
    }

    .equip-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.7rem;
        cursor: pointer;

        &.equipped {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
            font-weight: 700;
        }
    }

    .install-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.7rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &.installed {
            background: #1a3020;
            color: #6c6;
            border-color: #4a6a4a;
        }
    }

    .cyber-state-icon {
        font-size: 0.7rem;
        width: 1rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .maintain-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.65rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.15s;

        .item-row:hover & { opacity: 0.7; }
        &:hover { opacity: 1 !important; color: var(--dh2e-gold, #c8a84e); }
    }

    .cyber-failure {
        opacity: 0.5;
        border-left: 2px solid var(--dh2e-red-bright, #d44) !important;
    }

    .chat-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.65rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        opacity: 0.5;

        &:hover { opacity: 1; color: var(--dh2e-gold, #c8a84e); }
    }

    .edit-btn, .delete-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
    }

    .delete-btn:hover { color: var(--dh2e-red-bright, #d44); }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }

    .encumbrance-bar {
        position: relative;
        height: 1.4rem;
        background: var(--dh2e-bg-dark, #1a1a20);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        overflow: hidden;
        display: flex;
        align-items: center;

        &.overloaded {
            border-color: var(--dh2e-gold, #c8a84e);
        }

        &.over-encumbered {
            border-color: var(--dh2e-red-bright, #d44);
        }
    }

    .enc-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: var(--dh2e-gold-dark, #9c7a28);
        opacity: 0.4;
        transition: width 0.3s ease;

        .overloaded & {
            background: var(--dh2e-gold, #c8a84e);
            opacity: 0.5;
        }

        .over-encumbered & {
            background: var(--dh2e-red-bright, #d44);
            opacity: 0.5;
        }
    }

    .enc-label {
        position: relative;
        z-index: 1;
        padding: 0 var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .enc-warning {
        position: relative;
        z-index: 1;
        margin-left: auto;
        padding-right: var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        color: var(--dh2e-red-bright, #d44);

        i { margin-right: 0.2rem; }
    }
</style>
