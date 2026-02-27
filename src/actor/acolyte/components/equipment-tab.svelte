<script lang="ts">
    import { sendItemToChat } from "../../../chat/send-to-chat.ts";
    import { performMaintenance } from "../../../item/cybernetic/maintenance.ts";
    import { reloadWeapon, unloadWeapon, getCompatibleAmmo, getCompatibleMagazines, loadMagazine, unloadMagazine, totalLoaded } from "../../../combat/ammo.ts";
    import type { MaintenanceState } from "../../../item/cybernetic/data.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    type Category = "all" | "weapons" | "armour" | "gear" | "ammunition" | "cybernetics" | "treasure";

    // Use sheet-persisted category to survive re-renders
    let category: Category = $state((ctx.equipmentCategory ?? "all") as Category);

    function setCategory(cat: Category) {
        category = cat;
        ctx.setEquipmentCategory?.(cat);
    }

    // Category definitions for grouped display
    const CATEGORIES: { key: Category; label: string; icon: string; itemKey: string }[] = [
        { key: "weapons", label: "Weapons", icon: "fa-solid fa-crosshairs", itemKey: "weapons" },
        { key: "armour", label: "Armour", icon: "fa-solid fa-shield-halved", itemKey: "armour" },
        { key: "gear", label: "Gear", icon: "fa-solid fa-box-open", itemKey: "gear" },
        { key: "ammunition", label: "Ammo", icon: "fa-solid fa-burst", itemKey: "ammunition" },
        { key: "cybernetics", label: "Cybernetics", icon: "fa-solid fa-microchip", itemKey: "cybernetics" },
        { key: "treasure", label: "Treasure", icon: "fa-solid fa-gem", itemKey: "treasure" },
    ];

    // Collapsed state for each category group (in "All" view)
    let collapsed: Record<string, boolean> = $state({});

    function toggleCollapse(key: string) {
        collapsed[key] = !collapsed[key];
    }

    function getItemsForCategory(cat: Category): any[] {
        const items = ctx.items ?? {};
        return items[cat === "ammunition" ? "ammunition" : cat] ?? [];
    }

    const totalWeight = $derived(() => {
        const items = ctx.items ?? {};
        let sum = 0;
        for (const cat of CATEGORIES) {
            const list = items[cat.itemKey] ?? [];
            for (const item of list) {
                const sys = item.system ?? {};
                const w = sys.weight ?? 0;
                const q = sys.quantity ?? 1;
                sum += w * q;
            }
        }
        return sum;
    });

    const encumbrance = $derived(ctx.encumbrance ?? { current: 0, carry: 0, lift: 0, push: 0, overloaded: false, overencumbered: false });
    const encPct = $derived(encumbrance.carry > 0 ? Math.min(100, (encumbrance.current / encumbrance.carry) * 100) : 0);
    const encClass = $derived(encumbrance.overencumbered ? "over-encumbered" : encumbrance.overloaded ? "overloaded" : "normal");

    // ---- Item actions ----

    async function toggleEquipped(item: any) {
        await item.update({ "system.equipped": !(item.system?.equipped) });
    }

    async function toggleInstalled(item: any) {
        if (item.toggleInstalled) {
            await item.toggleInstalled();
        } else {
            await item.update({ "system.installed": !(item.system?.installed) });
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

    async function deleteItem(item: any) { await item.delete(); }
    function editItem(item: any) { item.sheet?.render(true); }

    function isStackable(item: any): boolean {
        return (item.system?.quantity !== undefined) && (item.type === "gear" || item.type === "ammunition" || item.type === "treasure");
    }

    async function splitStack(item: any) {
        const qty = item.system?.quantity ?? 1;
        if (qty <= 1) return;
        const splitAmount = await new Promise<number | null>((resolve) => {
            const content = `<form><div class="form-group"><label>${game.i18n?.localize("DH2E.Item.Split.Prompt") ?? "How many to split off?"}</label><input type="number" name="amount" value="1" min="1" max="${qty - 1}" autofocus /></div></form>`;
            new fa.api.DialogV2({
                window: { title: game.i18n?.localize("DH2E.Item.Split.Title") ?? "Split Stack" },
                content,
                buttons: [
                    { action: "split", label: game.i18n?.localize("DH2E.Item.Split.Button") ?? "Split", default: true,
                      callback: (_event: any, _button: any, dialog: HTMLElement) => {
                        const input = dialog.querySelector("input[name='amount']") as HTMLInputElement;
                        resolve(parseInt(input?.value ?? "0", 10));
                    }},
                    { action: "cancel", label: game.i18n?.localize("Cancel") ?? "Cancel", callback: () => resolve(null) },
                ],
                position: { width: 300 },
            }).render(true);
        });
        if (!splitAmount || splitAmount <= 0 || splitAmount >= qty) return;
        const actor = ctx.actor;
        if (!actor) return;
        await item.update({ "system.quantity": qty - splitAmount });
        const newData = item.toObject();
        delete newData._id;
        newData.system.quantity = splitAmount;
        await actor.createEmbeddedDocuments("Item", [newData]);
    }

    async function mergeStacks(item: any) {
        const actor = ctx.actor;
        if (!actor) return;
        const duplicates = actor.items.filter((i: any) =>
            i.id !== item.id && i.name === item.name && i.type === item.type && isStackable(i),
        );
        if (duplicates.length === 0) {
            ui.notifications?.info(`No other stacks of "${item.name}" to merge.`);
            return;
        }
        let totalQty = item.system?.quantity ?? 1;
        const toDelete: string[] = [];
        for (const dup of duplicates) {
            totalQty += dup.system?.quantity ?? 1;
            toDelete.push(dup.id!);
        }
        await item.update({ "system.quantity": totalQty });
        if (toDelete.length > 0) await actor.deleteEmbeddedDocuments("Item", toDelete);
    }

    async function reloadItem(item: any) {
        const actor = ctx.actor;
        if (!actor) return;
        const sys = item.system ?? {};
        const loadType = sys.loadType ?? "magazine";
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
                    ? `Partial reload: ${result.loaded} rounds of ${result.ammoName} (${result.newMagValue}/${sys.magazine?.max ?? 0})`
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

    async function unloadItem(item: any) {
        const actor = ctx.actor;
        if (!actor) return;
        const result = await unloadWeapon(actor, item);
        if (result) ui.notifications?.info(`Unloaded ${result.unloaded} rounds of ${result.ammoName}.`);
        else ui.notifications?.info("Weapon is already empty.");
    }

    async function loadMag(item: any) {
        const actor = ctx.actor;
        if (!actor) return;
        const { showMagazineLoader } = await import("../../../combat/ammo-loader.ts");
        await showMagazineLoader(actor, item);
    }

    async function unloadMag(item: any) {
        const actor = ctx.actor;
        if (!actor) return;
        const result = await unloadMagazine(actor, item);
        if (result) ui.notifications?.info(`Extracted ${result.unloaded} rounds of ${result.ammoName} from magazine.`);
        else ui.notifications?.info("Magazine is already empty.");
    }

    function toggleFavorite(item: any) {
        const current = item.getFlag?.("dh2e", "favorite");
        if (current) item.unsetFlag("dh2e", "favorite");
        else item.setFlag("dh2e", "favorite", true);
    }

    function itemWeight(item: any): number {
        const sys = item.system ?? {};
        return (sys.weight ?? 0) * (sys.quantity ?? 1);
    }

    function getItemIcon(type: string): string {
        switch (type) {
            case "weapon": return "fa-solid fa-crosshairs";
            case "armour": return "fa-solid fa-shield-halved";
            case "gear": return "fa-solid fa-box-open";
            case "ammunition": return "fa-solid fa-burst";
            case "cybernetic": return "fa-solid fa-microchip";
            case "treasure": return "fa-solid fa-gem";
            default: return "fa-solid fa-circle";
        }
    }
</script>

<div class="equipment-tab">
    <!-- Header: filter tabs + weight + requisition -->
    <div class="equipment-header">
        <div class="category-filter" role="tablist">
            <button class="filter-btn" class:active={category === "all"} onclick={() => setCategory("all")} role="tab">All</button>
            {#each CATEGORIES as cat}
                <button class="filter-btn" class:active={category === cat.key} onclick={() => setCategory(cat.key)} role="tab">{cat.label}</button>
            {/each}
        </div>
        <span class="weight-total">Weight: {totalWeight().toFixed(1)} kg</span>
        <button class="requisition-btn" onclick={() => ctx.openRequisitionDialog?.()}>
            <i class="fa-solid fa-coins"></i> Requisition
        </button>
    </div>

    <!-- Encumbrance bar -->
    <div class="encumbrance-bar {encClass}">
        <div class="enc-fill" style="width: {encPct}%"></div>
        <span class="enc-label">{encumbrance.current.toFixed(1)} / {encumbrance.carry} kg</span>
        {#if encumbrance.overencumbered}
            <span class="enc-warning"><i class="fas fa-exclamation-triangle"></i> Cannot Move</span>
        {:else if encumbrance.overloaded}
            <span class="enc-warning"><i class="fas fa-weight-hanging"></i> Overloaded</span>
        {/if}
    </div>

    <!-- Column headers -->
    <div class="col-header">
        <span class="col-fav"></span>
        <span class="col-name">Item</span>
        <span class="col-weight">Wt</span>
        <span class="col-qty">Qty</span>
        <span class="col-actions">Actions</span>
    </div>

    <!-- Item list -->
    <div class="item-list">
        {#if category === "all"}
            <!-- Grouped view with collapsible sections -->
            {#each CATEGORIES as cat}
                {@const items = getItemsForCategory(cat.key)}
                {#if items.length > 0}
                    <button class="group-header" onclick={() => toggleCollapse(cat.key)}>
                        <i class="fa-solid {collapsed[cat.key] ? 'fa-caret-right' : 'fa-caret-down'} caret"></i>
                        <i class="{cat.icon} group-icon"></i>
                        <span class="group-label">{cat.label}</span>
                        <span class="group-count">{items.length}</span>
                    </button>
                    {#if !collapsed[cat.key]}
                        {#each items as item}
                            {@const cyberState = item.type === "cybernetic" ? (item.maintenanceState ?? "normal") as MaintenanceState : null}
                            <div
                                class="item-row"
                                class:equipped={item.system?.equipped}
                                class:cyber-failure={cyberState === "totalFailure"}
                                draggable="true"
                                ondragstart={(e) => { e.dataTransfer?.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid })); }}
                            >
                                <button class="fav-star" onclick={() => toggleFavorite(item)} title="Favorite">
                                    <i class={item.getFlag?.("dh2e", "favorite") ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                                </button>
                                <div class="col-name-cell">
                                    <span class="item-name">{item.name}</span>
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
                                                <button class="inline-btn" onclick={(e) => { e.stopPropagation(); reloadItem(item); }} title="Reload">
                                                    <i class="fa-solid fa-rotate-right"></i>
                                                </button>
                                            {/if}
                                            {#if (item.system.magazine.value ?? 0) > 0}
                                                <button class="inline-btn unload" onclick={(e) => { e.stopPropagation(); unloadItem(item); }} title={item.system.loadType === "magazine" ? "Eject magazine" : "Unload"}>
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
                                                <span class="mag-type">{magRounds.map((r: any) => `${r.name} x${r.count}`).join(", ")}</span>
                                            {/if}
                                            {#if magLoaded < (item.system.capacity ?? 0)}
                                                <button class="inline-btn" onclick={(e) => { e.stopPropagation(); loadMag(item); }} title="Load magazine">
                                                    <i class="fa-solid fa-rotate-right"></i>
                                                </button>
                                            {/if}
                                            {#if magLoaded > 0}
                                                <button class="inline-btn unload" onclick={(e) => { e.stopPropagation(); unloadMag(item); }} title="Unload magazine">
                                                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                                                </button>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                                <span class="col-weight-cell" title="{item.system?.weight ?? 0} kg each">
                                    {#if itemWeight(item) > 0}{itemWeight(item).toFixed(1)}{:else}&mdash;{/if}
                                </span>
                                <span class="col-qty-cell">
                                    {#if item.system?.quantity !== undefined && (item.system.quantity ?? 1) > 1}
                                        x{item.system.quantity}
                                    {:else}
                                        &mdash;
                                    {/if}
                                </span>
                                <div class="col-actions-cell">
                                    <button class="act-btn" onclick={(e) => { e.stopPropagation(); sendItemToChat(item); }} title="Send to Chat">
                                        <i class="fa-solid fa-comment"></i>
                                    </button>
                                    {#if isStackable(item) && (item.system?.quantity ?? 1) > 1}
                                        <button class="act-btn" onclick={(e) => { e.stopPropagation(); splitStack(item); }} title="Split Stack">
                                            <i class="fa-solid fa-scissors"></i>
                                        </button>
                                    {/if}
                                    {#if isStackable(item)}
                                        <button class="act-btn" onclick={(e) => { e.stopPropagation(); mergeStacks(item); }} title="Merge Stacks">
                                            <i class="fa-solid fa-layer-group"></i>
                                        </button>
                                    {/if}
                                    {#if item.type === "weapon" || item.type === "armour"}
                                        <button
                                            class="equip-btn"
                                            class:equipped={item.system?.equipped}
                                            onclick={() => toggleEquipped(item)}
                                            title={item.system?.equipped ? "Unequip" : "Equip"}
                                        >
                                            {item.system?.equipped ? "E" : "\u2014"}
                                        </button>
                                    {:else if item.type === "cybernetic"}
                                        {#if item.system?.installed && cyberState}
                                            <span class="cyber-state-icon" style="color: {getMaintenanceColor(cyberState)}" title={game.i18n.localize(`DH2E.Cybernetic.State.${cyberState}`)}>
                                                <i class={getMaintenanceIcon(cyberState)}></i>
                                            </span>
                                            <button class="act-btn" onclick={(e) => { e.stopPropagation(); maintainCybernetic(item); }} title="Maintenance">
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
                                    <button class="act-btn" onclick={() => editItem(item)} title="Edit">&#9998;</button>
                                    <button class="act-btn delete" onclick={() => deleteItem(item)} title="Delete">&times;</button>
                                </div>
                            </div>
                        {/each}
                    {/if}
                {/if}
            {/each}
        {:else}
            <!-- Filtered single-category view -->
            {@const items = getItemsForCategory(category)}
            {#each items as item}
                {@const cyberState = item.type === "cybernetic" ? (item.maintenanceState ?? "normal") as MaintenanceState : null}
                <div
                    class="item-row"
                    class:equipped={item.system?.equipped}
                    class:cyber-failure={cyberState === "totalFailure"}
                    draggable="true"
                    ondragstart={(e) => { e.dataTransfer?.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid })); }}
                >
                    <button class="fav-star" onclick={() => toggleFavorite(item)} title="Favorite">
                        <i class={item.getFlag?.("dh2e", "favorite") ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                    </button>
                    <div class="col-name-cell">
                        <span class="item-name">{item.name}</span>
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
                                    <button class="inline-btn" onclick={(e) => { e.stopPropagation(); reloadItem(item); }} title="Reload">
                                        <i class="fa-solid fa-rotate-right"></i>
                                    </button>
                                {/if}
                                {#if (item.system.magazine.value ?? 0) > 0}
                                    <button class="inline-btn unload" onclick={(e) => { e.stopPropagation(); unloadItem(item); }} title={item.system.loadType === "magazine" ? "Eject magazine" : "Unload"}>
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
                                    <span class="mag-type">{magRounds.map((r: any) => `${r.name} x${r.count}`).join(", ")}</span>
                                {/if}
                                {#if magLoaded < (item.system.capacity ?? 0)}
                                    <button class="inline-btn" onclick={(e) => { e.stopPropagation(); loadMag(item); }} title="Load magazine">
                                        <i class="fa-solid fa-rotate-right"></i>
                                    </button>
                                {/if}
                                {#if magLoaded > 0}
                                    <button class="inline-btn unload" onclick={(e) => { e.stopPropagation(); unloadMag(item); }} title="Unload magazine">
                                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                                    </button>
                                {/if}
                            </div>
                        {/if}
                    </div>
                    <span class="col-weight-cell" title="{item.system?.weight ?? 0} kg each">
                        {#if itemWeight(item) > 0}{itemWeight(item).toFixed(1)}{:else}&mdash;{/if}
                    </span>
                    <span class="col-qty-cell">
                        {#if item.system?.quantity !== undefined && (item.system.quantity ?? 1) > 1}
                            x{item.system.quantity}
                        {:else}
                            &mdash;
                        {/if}
                    </span>
                    <div class="col-actions-cell">
                        <button class="act-btn" onclick={(e) => { e.stopPropagation(); sendItemToChat(item); }} title="Send to Chat">
                            <i class="fa-solid fa-comment"></i>
                        </button>
                        {#if isStackable(item) && (item.system?.quantity ?? 1) > 1}
                            <button class="act-btn" onclick={(e) => { e.stopPropagation(); splitStack(item); }} title="Split Stack">
                                <i class="fa-solid fa-scissors"></i>
                            </button>
                        {/if}
                        {#if isStackable(item)}
                            <button class="act-btn" onclick={(e) => { e.stopPropagation(); mergeStacks(item); }} title="Merge Stacks">
                                <i class="fa-solid fa-layer-group"></i>
                            </button>
                        {/if}
                        {#if item.type === "weapon" || item.type === "armour"}
                            <button
                                class="equip-btn"
                                class:equipped={item.system?.equipped}
                                onclick={() => toggleEquipped(item)}
                                title={item.system?.equipped ? "Unequip" : "Equip"}
                            >
                                {item.system?.equipped ? "E" : "\u2014"}
                            </button>
                        {:else if item.type === "cybernetic"}
                            {#if item.system?.installed && cyberState}
                                <span class="cyber-state-icon" style="color: {getMaintenanceColor(cyberState)}" title={game.i18n.localize(`DH2E.Cybernetic.State.${cyberState}`)}>
                                    <i class={getMaintenanceIcon(cyberState)}></i>
                                </span>
                                <button class="act-btn" onclick={(e) => { e.stopPropagation(); maintainCybernetic(item); }} title="Maintenance">
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
                        <button class="act-btn" onclick={() => editItem(item)} title="Edit">&#9998;</button>
                        <button class="act-btn delete" onclick={() => deleteItem(item)} title="Delete">&times;</button>
                    </div>
                </div>
            {:else}
                <p class="empty-msg">No items in this category.</p>
            {/each}
        {/if}
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
        flex-wrap: wrap;
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

    /* Encumbrance bar */
    .encumbrance-bar {
        position: relative;
        height: 1.4rem;
        background: var(--dh2e-bg-dark, #1a1a20);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        overflow: hidden;
        display: flex;
        align-items: center;

        &.overloaded { border-color: var(--dh2e-gold, #c8a84e); }
        &.over-encumbered { border-color: var(--dh2e-red-bright, #d44); }
    }

    .enc-fill {
        position: absolute;
        top: 0; left: 0; height: 100%;
        background: var(--dh2e-gold-dark, #9c7a28);
        opacity: 0.4;
        transition: width 0.3s ease;
        .overloaded & { background: var(--dh2e-gold, #c8a84e); opacity: 0.5; }
        .over-encumbered & { background: var(--dh2e-red-bright, #d44); opacity: 0.5; }
    }

    .enc-label {
        position: relative; z-index: 1;
        padding: 0 var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .enc-warning {
        position: relative; z-index: 1;
        margin-left: auto;
        padding-right: var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        color: var(--dh2e-red-bright, #d44);
        i { margin-right: 0.2rem; }
    }

    /* Column header */
    .col-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: 2px var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid var(--dh2e-gold-dark, #9c7a28);
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dh2e-text-secondary, #a0a0a8);

        .col-fav { width: 1rem; flex-shrink: 0; }
        .col-name { flex: 1; min-width: 0; }
        .col-weight { width: 3rem; text-align: right; flex-shrink: 0; }
        .col-qty { width: 2.5rem; text-align: center; flex-shrink: 0; }
        .col-actions { width: 7rem; text-align: right; flex-shrink: 0; }
    }

    /* Item list */
    .item-list {
        display: flex;
        flex-direction: column;
    }

    /* Collapsible group header */
    .group-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        cursor: pointer;
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        width: 100%;
        text-align: left;

        &:hover { background: rgba(200, 168, 78, 0.08); }

        .caret {
            width: 0.8rem;
            text-align: center;
            font-size: 0.65rem;
            color: var(--dh2e-gold-muted, #8a7a3e);
        }

        .group-icon {
            font-size: 0.65rem;
            color: var(--dh2e-gold-muted, #8a7a3e);
        }

        .group-label { flex: 1; }

        .group-count {
            font-size: 0.6rem;
            color: var(--dh2e-text-secondary, #a0a0a8);
            font-weight: 400;
        }
    }

    /* Item row — columnar */
    .item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);

        &:hover { background: rgba(255, 255, 255, 0.03); }
        &.equipped { border-left: 2px solid var(--dh2e-gold, #c8a84e); }
        &.cyber-failure { opacity: 0.5; border-left: 2px solid var(--dh2e-red-bright, #d44) !important; }
    }

    .fav-star {
        background: none; border: none; padding: 0;
        cursor: pointer;
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-size: 0.65rem;
        width: 1rem;
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;

        &:hover { color: var(--dh2e-gold-bright, #c8a84e); }
        :global(.fa-solid.fa-star) { color: var(--dh2e-gold, #b49545); }
    }

    .col-name-cell {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .item-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .col-weight-cell {
        width: 3rem;
        text-align: right;
        flex-shrink: 0;
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-family: monospace;
    }

    .col-qty-cell {
        width: 2.5rem;
        text-align: center;
        flex-shrink: 0;
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .col-actions-cell {
        width: 7rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 2px;
    }

    /* Inline action buttons */
    .act-btn {
        width: 1.3rem; height: 1.3rem;
        border: none; background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.6rem;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.12s;

        .item-row:hover & { opacity: 0.5; }
        &:hover { opacity: 1 !important; color: var(--dh2e-gold, #c8a84e); }
        &.delete:hover { color: var(--dh2e-red-bright, #d44); }
    }

    .equip-btn {
        width: 1.3rem; height: 1.3rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 2px;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.6rem;
        cursor: pointer;
        flex-shrink: 0;

        &.equipped {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
            font-weight: 700;
        }
    }

    .install-btn {
        width: 1.3rem; height: 1.3rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 2px;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: 0.6rem;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;

        &.installed {
            background: #1a3020;
            color: #6c6;
            border-color: #4a6a4a;
        }
    }

    .cyber-state-icon {
        font-size: 0.6rem;
        width: 0.8rem;
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
    }

    /* Mag pips in name cell */
    .mag-row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 1px;
    }

    .mag-pips {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .mag-pips .pip {
        display: inline-block;
        width: 5px; height: 5px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        background: transparent;

        &.filled { background: var(--dh2e-gold, #b49545); }
    }

    .pip-overflow {
        font-size: 0.45rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-left: 1px;
    }

    .mag-count {
        font-size: 0.55rem;
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

    .inline-btn {
        width: 0.9rem; height: 0.9rem;
        border: none; background: transparent;
        color: var(--dh2e-gold-muted, #8a7a3e);
        cursor: pointer;
        font-size: 0.5rem;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.12s;

        .item-row:hover & { opacity: 0.6; }
        &:hover { opacity: 1 !important; color: var(--dh2e-gold, #c8a84e); }
        &.unload:hover { color: var(--dh2e-red-bright, #d44); }
    }

    .empty-msg {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg, 1rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
    }
</style>
