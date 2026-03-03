<script lang="ts">
    import type { RequisitionRequestPayload, RequisitionRequestItem } from "./requisition-request-dialog.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    // --- Cart state ---
    interface CartModification {
        uuid: string;
        name: string;
        availability: string;
        modifier: number;
        slot: string;
    }

    interface CartItem {
        id: string;
        name: string;
        uuid?: string;
        type?: string;
        availability: string;
        craftsmanship: string;
        img?: string;
        /** True when sourced from compendium — availability is locked */
        fromCompendium: boolean;
        /** Attached modifications for this cart item */
        modifications: CartModification[];
    }

    let cartItems: CartItem[] = $state([]);

    // --- Staging area for next item to add ---
    let mode: "compendium" | "custom" = $state("compendium");
    let searchQuery = $state("");
    let selectedItem: { name: string; uuid: string; type: string; availability: string; img: string } | null = $state(null);
    let customItemName = $state("");
    let availability = $state("common");
    let craftsmanship = $state("common");

    // --- Search filter pills ---
    interface SearchFilter {
        type: 'availability' | 'itemType';
        key: string;
        label: string;
    }
    let searchFilters: SearchFilter[] = $state([]);

    // --- Staging modifications (picked before Add to Cart) ---
    let stagingMods: CartModification[] = $state([]);
    let stagingModPickerOpen = $state(false);
    let stagingModSearch = $state("");

    // --- Shared fields ---
    let notes = $state("");

    // --- Roll state ---
    let rollResult: {
        rollResult: number;
        rollMode: "bulk" | "individual";
        perItem: { targetNumber: number; success: boolean; degrees: number; influenceLost: boolean; rollResult: number }[];
        influenceLost: boolean;
    } | null = $state(null);
    let rolling = $state(false);

    // --- Derived: filtered compendium items (pill filters + text search) ---
    const filteredItems = $derived.by(() => {
        let items = ctx.compendiumItems ?? [];
        // Apply pill filters
        for (const filter of searchFilters) {
            if (filter.type === 'availability') {
                items = items.filter((i: any) => i.availability === filter.key);
            } else if (filter.type === 'itemType') {
                items = items.filter((i: any) => i.type === filter.key);
            }
        }
        // Apply text search on name
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            items = items.filter((i: any) => i.name.toLowerCase().includes(q));
        }
        return items.slice(0, 50);
    });

    // --- Derived: staging item name ---
    const stagingName = $derived(mode === "compendium" ? (selectedItem?.name ?? "") : customItemName);
    const canAdd = $derived(stagingName.length > 0);

    // --- Derived: per-item penalty helper ---
    function getItemMod(item: CartItem): number {
        const availConfig = (ctx.availOptions ?? []).find((t: any) => t.key === item.availability);
        const craftConfig = (ctx.craftOptions ?? []).find((t: any) => t.key === item.craftsmanship);
        const modsMod = (item.modifications ?? []).reduce((sum, m) => sum + (m.modifier ?? 0), 0);
        return (availConfig?.modifier ?? 0) + (craftConfig?.modifier ?? 0) + modsMod;
    }

    function getAvailLabel(key: string): string {
        const label = (ctx.availOptions ?? []).find((t: any) => t.key === key)?.label ?? key;
        // Strip modifier suffix like " (+0)" or " (-30)" for cleaner display
        return label.replace(/\s*\([+-]?\d+\)\s*$/, '').trim();
    }

    function getCraftLabel(key: string): string {
        return (ctx.craftOptions ?? []).find((t: any) => t.key === key)?.label ?? key;
    }

    // --- Modification picker state ---
    /** Which cart item ID has the mod picker open */
    let modPickerForItem: string | null = $state(null);
    let modSearchQuery = $state("");

    /** Known weapon upgrade names (fallback when modification type not indexed) */
    const KNOWN_WEAPON_UPGRADES = new Set([
        "extended magazine", "red-dot laser sight", "silencer", "telescopic sight",
        "fire selector", "mono upgrade", "melee attachment",
    ]);

    /** Filtered modification items for a parent item, with fallbacks */
    function getFilteredModsFor(parentType: string | undefined, query: string): any[] {
        const items = ctx.compendiumItems ?? [];
        const isWeapon = parentType !== "armour";

        // 1st: modification items filtered by modType
        let mods = items.filter((i: any) =>
            i.type === "modification" && (isWeapon ? i.modType === "weapon" : i.modType === "armour")
        );
        // 2nd fallback: all modification items (modType may not be indexed)
        if (mods.length === 0) mods = items.filter((i: any) => i.type === "modification");
        // 3rd fallback: gear items matching known upgrade names (type not loaded yet)
        if (mods.length === 0) {
            mods = items.filter((i: any) =>
                i.type === "gear" && KNOWN_WEAPON_UPGRADES.has(i.name.toLowerCase())
            );
        }

        if (!query.trim()) return mods.slice(0, 30);
        const q = query.toLowerCase();
        return mods.filter((m: any) => m.name.toLowerCase().includes(q)).slice(0, 30);
    }

    /** Filtered modifications for cart item picker */
    const filteredMods = $derived.by(() => {
        const cartItem = cartItems.find(i => i.id === modPickerForItem);
        return getFilteredModsFor(cartItem?.type, modSearchQuery);
    });

    function toggleModPicker(cartItemId: string) {
        modPickerForItem = modPickerForItem === cartItemId ? null : cartItemId;
        modSearchQuery = "";
        stagingModPickerOpen = false;
    }

    function addModToCartItem(cartItemId: string, mod: any) {
        const cartItem = cartItems.find(i => i.id === cartItemId);
        if (!cartItem) return;
        // Check duplicate
        if (cartItem.modifications.some(m => m.uuid === mod.uuid)) return;
        // Resolve availability modifier
        const availConfig = (ctx.availOptions ?? []).find((t: any) => t.key === (mod.availability ?? "common"));
        const modifier = availConfig?.modifier ?? 0;
        cartItem.modifications = [...cartItem.modifications, {
            uuid: mod.uuid,
            name: mod.name,
            availability: mod.availability ?? "common",
            modifier,
            slot: "",  // Will be resolved from compendium if needed
        }];
        cartItems = [...cartItems]; // trigger reactivity
        rollResult = null;
    }

    function removeModFromCartItem(cartItemId: string, modUuid: string) {
        const cartItem = cartItems.find(i => i.id === cartItemId);
        if (!cartItem) return;
        cartItem.modifications = cartItem.modifications.filter(m => m.uuid !== modUuid);
        cartItems = [...cartItems];
        rollResult = null;
    }

    /** Check if a cart item can have modifications (weapon/armour only) */
    function canHaveMods(item: CartItem): boolean {
        return item.type === "weapon" || item.type === "armour";
    }

    /** Return a CSS color class for availability tier badges */
    function getAvailColorClass(key: string): string {
        const k = (key ?? "common").toLowerCase();
        if (k === "ubiquitous" || k === "abundant" || k === "plentiful" || k === "common") return "avail-green";
        if (k === "average" || k === "scarce") return "avail-yellow";
        if (k === "rare" || k === "veryRare" || k === "extremelyRare") return "avail-red";
        if (k === "nearUnique" || k === "unique") return "avail-purple";
        return "avail-green";
    }

    // --- Filter pill detection ---
    const filterLookup = $derived.by(() => {
        const map = new Map<string, SearchFilter>();
        for (const opt of (ctx.availOptions ?? [])) {
            const plain = (opt.label ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
            map.set(opt.key.toLowerCase(), { type: 'availability', key: opt.key, label: plain.charAt(0).toUpperCase() + plain.slice(1) });
            if (plain && plain !== opt.key.toLowerCase()) map.set(plain, { type: 'availability', key: opt.key, label: plain.charAt(0).toUpperCase() + plain.slice(1) });
        }
        for (const [k, label] of [['weapon', 'Weapon'], ['armour', 'Armour'], ['gear', 'Gear'], ['ammunition', 'Ammunition'], ['cybernetic', 'Cybernetic'], ['modification', 'Modification']] as [string, string][]) {
            map.set(k, { type: 'itemType', key: k, label });
        }
        map.set('armor', { type: 'itemType', key: 'armour', label: 'Armour' });
        map.set('ammo', { type: 'itemType', key: 'ammunition', label: 'Ammunition' });
        map.set('mod', { type: 'itemType', key: 'modification', label: 'Modification' });
        map.set('weapons', { type: 'itemType', key: 'weapon', label: 'Weapon' });
        return map;
    });

    function handleSearchKeydown(e: KeyboardEvent) {
        if (e.key === 'Backspace' && searchQuery === '' && searchFilters.length > 0) {
            searchFilters = searchFilters.slice(0, -1);
            return;
        }
        if (e.key !== ' ' && e.key !== 'Enter') return;
        const term = searchQuery.trim().toLowerCase();
        if (!term) return;
        const match = filterLookup.get(term);
        if (match) {
            e.preventDefault();
            if (!searchFilters.some(f => f.type === match.type && f.key === match.key)) {
                searchFilters = [...searchFilters, match];
            }
            searchQuery = '';
        }
    }

    function removeFilter(filter: SearchFilter) {
        searchFilters = searchFilters.filter(f => !(f.type === filter.type && f.key === filter.key));
    }

    function getFilterPillClass(filter: SearchFilter): string {
        return filter.type === 'availability' ? getAvailColorClass(filter.key) : 'pill-type';
    }

    // --- Staging modification picker ---
    const stagingCanHaveMods = $derived(
        mode === "compendium" && selectedItem != null && (selectedItem.type === "weapon" || selectedItem.type === "armour")
    );

    const stagingFilteredMods = $derived.by(() => {
        return getFilteredModsFor(selectedItem?.type, stagingModSearch);
    });

    function toggleStagingModPicker() {
        stagingModPickerOpen = !stagingModPickerOpen;
        stagingModSearch = "";
        if (stagingModPickerOpen) modPickerForItem = null;
    }

    function addStagingMod(mod: any) {
        if (stagingMods.some(m => m.uuid === mod.uuid)) return;
        const availConfig = (ctx.availOptions ?? []).find((t: any) => t.key === (mod.availability ?? "common"));
        const modifier = availConfig?.modifier ?? 0;
        stagingMods = [...stagingMods, { uuid: mod.uuid, name: mod.name, availability: mod.availability ?? "common", modifier, slot: "" }];
    }

    function removeStagingMod(uuid: string) {
        stagingMods = stagingMods.filter(m => m.uuid !== uuid);
    }

    // --- Derived: per-item TN preview ---
    const influence = $derived(ctx.influence ?? 25);

    // Detect Mechanicus background for cybernetic bonus indicator
    const actorSynthetics = $derived((ctx.actor as any)?.synthetics);
    const hasMechanicusBackground = $derived.by(() => {
        const synth = actorSynthetics;
        if (synth?.rollOptions?.has("self:background:replace-the-weak-flesh")) return true;
        if (synth?.rollOptions?.has("self:background:adeptus-mechanicus")) return true;
        const bgName = (ctx.actor as any)?.system?.details?.background ?? "";
        return /mechanicus/i.test(bgName);
    });

    /** Check if a cart item gets the Mechanicus cybernetic bonus */
    function hasMechanicusBonus(item: CartItem): boolean {
        return hasMechanicusBackground && item.type === "cybernetic";
    }

    /** Get the computed target number preview for a cart item */
    function getItemTN(item: CartItem): number {
        let tn = influence + getItemMod(item);
        // Master of Paperwork bonus is already in the server-side computeItemTN,
        // but for client-side preview we add Mechanicus bonus here
        if (hasMechanicusBonus(item)) tn += 20;
        return tn;
    }

    // --- Derived: can roll / can send ---
    const canRoll = $derived(cartItems.length > 0 && !rolling && rollResult === null);
    const canSend = $derived(rollResult !== null);

    // --- Actions ---
    function selectCompendiumItem(item: any) {
        selectedItem = item;
    }

    function addToCart() {
        if (!canAdd) return;
        const isCompendium = mode === "compendium" && !!selectedItem;
        const item: CartItem = {
            id: fu.randomID(),
            name: stagingName,
            uuid: selectedItem?.uuid,
            type: selectedItem?.type,
            availability: isCompendium ? (selectedItem!.availability ?? "common") : availability,
            craftsmanship,
            img: selectedItem?.img,
            fromCompendium: isCompendium,
            modifications: [...stagingMods],
        };
        cartItems = [...cartItems, item];

        // Reset staging
        selectedItem = null;
        customItemName = "";
        searchQuery = "";
        availability = "common";
        craftsmanship = "common";
        stagingMods = [];
        stagingModPickerOpen = false;
        rollResult = null;
    }

    function removeFromCart(id: string) {
        cartItems = cartItems.filter(i => i.id !== id);
        rollResult = null;
    }

    async function doRoll() {
        if (!canRoll) return;
        rolling = true;
        rollResult = null;
        modPickerForItem = null;
        try {
            const result = await ctx.onRoll?.({
                items: cartItems.map(i => ({
                    name: i.name,
                    uuid: i.uuid,
                    type: i.type,
                    availability: i.availability,
                    craftsmanship: i.craftsmanship,
                    img: i.img,
                    modifications: i.modifications,
                })),
                notes,
            });
            if (result) rollResult = result;
        } finally {
            rolling = false;
        }
    }

    async function sendToGM() {
        if (!rollResult || !ctx.actor) return;

        // Resolve full item data for each cart item
        const items: RequisitionRequestItem[] = [];
        for (let idx = 0; idx < cartItems.length; idx++) {
            const ci = cartItems[idx];
            const pi = rollResult.perItem[idx];
            let itemData: object = {};
            if (ci.uuid) {
                try {
                    const doc = await fromUuid(ci.uuid);
                    if (doc) itemData = (doc as any).toObject();
                } catch { /* use empty */ }
            }
            items.push({
                itemData,
                itemName: ci.name,
                craftsmanship: ci.craftsmanship,
                availability: ci.availability,
                targetNumber: pi?.targetNumber ?? 0,
                success: pi?.success ?? false,
                degrees: pi?.degrees ?? 0,
                influenceLost: pi?.influenceLost ?? false,
                rollResult: pi?.rollResult ?? 0,
                modifications: ci.modifications.map(m => ({
                    uuid: m.uuid,
                    name: m.name,
                    availability: m.availability,
                    modifier: m.modifier,
                })),
            });
        }

        const g = game as any;
        const payload: RequisitionRequestPayload = {
            items,
            notes,
            requestedBy: g.user?.name ?? "Unknown",
            requestedFor: ctx.actor?.uuid ?? "",
            actorName: ctx.actor?.name ?? "Unknown",
            rollResult: rollResult.rollResult,
            rollMode: rollResult.rollMode,
            influenceLost: rollResult.influenceLost,
            userId: g.user?.id ?? "",
        };

        ctx.onSendToGM?.(payload);
    }

    function formatMod(val: number): string {
        return val >= 0 ? `+${val}` : `${val}`;
    }
</script>

<div class="requisition-request">
    <!-- Mode toggle -->
    <div class="mode-toggle">
        <button class="mode-btn" class:active={mode === "compendium"} onclick={() => mode = "compendium"}>
            <i class="fa-solid fa-book"></i> From Compendium
        </button>
        <button class="mode-btn" class:active={mode === "custom"} onclick={() => mode = "custom"}>
            <i class="fa-solid fa-pen"></i> Custom
        </button>
    </div>

    <!-- Item selection (staging area) -->
    {#if mode === "compendium"}
        <div class="item-search">
            <div class="search-bar">
                {#each searchFilters as filter}
                    <span class="search-pill {getFilterPillClass(filter)}">
                        {filter.label}
                        <button class="pill-remove" onclick={() => removeFilter(filter)}>&times;</button>
                    </span>
                {/each}
                <input
                    type="text"
                    placeholder={searchFilters.length > 0 ? "Add filter or search name..." : (game.i18n?.localize("DH2E.Requisition.SearchCompendium") ?? "Search items...")}
                    bind:value={searchQuery}
                    onkeydown={handleSearchKeydown}
                />
            </div>
            {#if selectedItem}
                <div class="selected-item">
                    <i class="fa-solid fa-check"></i>
                    <span>{selectedItem.name}</span>
                    <button class="clear-btn" onclick={() => { selectedItem = null; stagingMods = []; stagingModPickerOpen = false; }}>&times;</button>
                </div>
            {/if}
            <div class="item-results">
                {#each filteredItems as item (item.uuid)}
                    <button
                        class="result-row"
                        class:selected={selectedItem?.uuid === item.uuid}
                        onclick={() => selectCompendiumItem(item)}
                    >
                        <span class="result-name">{item.name}</span>
                        <span class="avail-badge {getAvailColorClass(item.availability)}">{getAvailLabel(item.availability)}</span>
                        <span class="result-type">{item.type}</span>
                    </button>
                {:else}
                    <p class="no-results">No items found.</p>
                {/each}
            </div>
        </div>
    {:else}
        <div class="custom-item">
            <label for="custom-name">{game.i18n?.localize("DH2E.Requisition.ItemName") ?? "Item Name"}</label>
            <input id="custom-name" type="text" bind:value={customItemName} />
        </div>
    {/if}

    <!-- Per-item options (staging) -->
    <div class="options-section">
        {#if mode === "compendium" && selectedItem}
            <!-- Compendium items: availability is read-only from indexed data -->
            <div class="field-row">
                <label>{game.i18n?.localize("DH2E.Requisition.Availability") ?? "Availability"}</label>
                <span class="avail-badge-inline {getAvailColorClass(selectedItem.availability)}">{getAvailLabel(selectedItem.availability)}</span>
            </div>
        {:else if mode === "custom"}
            <!-- Custom items: availability is editable -->
            <div class="field-row">
                <label for="avail-select">{game.i18n?.localize("DH2E.Requisition.Availability") ?? "Availability"}</label>
                <select id="avail-select" bind:value={availability}>
                    {#each ctx.availOptions ?? [] as tier}
                        <option value={tier.key}>{tier.label}</option>
                    {/each}
                </select>
            </div>
        {/if}

        <div class="field-row">
            <label for="craft-select">{game.i18n?.localize("DH2E.Requisition.Craftsmanship") ?? "Craftsmanship"}</label>
            <select id="craft-select" bind:value={craftsmanship}>
                {#each ctx.craftOptions ?? [] as tier}
                    <option value={tier.key}>{tier.label} ({formatMod(tier.modifier)})</option>
                {/each}
            </select>
        </div>

        <!-- Staging modifications (weapon/armour only) -->
        {#if stagingCanHaveMods}
            <div class="staging-mods">
                <div class="staging-mods-header">
                    <span class="staging-mods-label">
                        <i class="fa-solid fa-wrench fa-xs"></i> Modifications for {selectedItem?.name ?? "item"}
                    </span>
                    <button class="staging-mod-add" onclick={toggleStagingModPicker}>
                        <i class="fa-solid fa-{stagingModPickerOpen ? 'minus' : 'plus'} fa-xs"></i> {stagingModPickerOpen ? 'Close' : 'Add'}
                    </button>
                </div>
                {#if stagingMods.length > 0}
                    <div class="staging-mod-list">
                        {#each stagingMods as mod (mod.uuid)}
                            <span class="staging-mod-pill">
                                <span class="avail-badge {getAvailColorClass(mod.availability)}">{getAvailLabel(mod.availability)}</span>
                                {mod.name}
                                <button class="pill-remove" onclick={() => removeStagingMod(mod.uuid)}>&times;</button>
                            </span>
                        {/each}
                    </div>
                {/if}
                {#if stagingModPickerOpen}
                    <div class="mod-picker staging">
                        <input
                            type="text"
                            placeholder="Search modifications..."
                            bind:value={stagingModSearch}
                        />
                        <div class="mod-picker-list">
                            {#each stagingFilteredMods as mod (mod.uuid)}
                                <button class="mod-picker-row" onclick={() => addStagingMod(mod)}>
                                    <span class="mod-picker-name">{mod.name}</span>
                                    <span class="avail-badge {getAvailColorClass(mod.availability)}">{getAvailLabel(mod.availability)}</span>
                                </button>
                            {:else}
                                <p class="no-results">No modifications found.</p>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Add to Cart button -->
    <button class="btn-add-cart" onclick={addToCart} disabled={!canAdd}>
        <i class="fa-solid fa-cart-plus"></i>
        {game.i18n?.localize("DH2E.Requisition.AddToCart") ?? "Add to Cart"}
    </button>

    <!-- Cart list -->
    {#if cartItems.length > 0}
        <div class="cart-section">
            <h4 class="cart-header">
                <i class="fa-solid fa-cart-shopping"></i>
                {game.i18n?.localize("DH2E.Requisition.Cart") ?? "Cart"} ({cartItems.length})
            </h4>
            <div class="cart-list">
                {#each cartItems as item (item.id)}
                    <div class="cart-item-block">
                        <div class="cart-row">
                            <span class="cart-item-name">{item.name}</span>
                            <span class="avail-badge {getAvailColorClass(item.availability)}">{getAvailLabel(item.availability)}</span>
                            <span class="craft-badge craft-{item.craftsmanship}">{getCraftLabel(item.craftsmanship)}</span>
                            <span class="cart-item-mod">{formatMod(getItemMod(item))}</span>
                            {#if canHaveMods(item)}
                                <button class="cart-mod-btn" onclick={() => toggleModPicker(item.id)} title="Add Modification">
                                    <i class="fa-solid fa-wrench fa-xs"></i>
                                </button>
                            {/if}
                            <button class="cart-remove" onclick={() => removeFromCart(item.id)}>&times;</button>
                        </div>
                        <!-- Attached modifications sub-rows -->
                        {#if item.modifications.length > 0}
                            {#each item.modifications as mod (mod.uuid)}
                                <div class="cart-mod-row">
                                    <span class="cart-mod-indent">+</span>
                                    <span class="cart-mod-name">{mod.name}</span>
                                    <span class="avail-badge {getAvailColorClass(mod.availability)}">{getAvailLabel(mod.availability)}</span>
                                    <button class="cart-remove" onclick={() => removeModFromCartItem(item.id, mod.uuid)}>&times;</button>
                                </div>
                            {/each}
                        {/if}
                        <!-- Mod picker dropdown -->
                        {#if modPickerForItem === item.id}
                            <div class="mod-picker">
                                <input
                                    type="text"
                                    placeholder="Search modifications..."
                                    bind:value={modSearchQuery}
                                />
                                <div class="mod-picker-list">
                                    {#each filteredMods as mod (mod.uuid)}
                                        <button class="mod-picker-row" onclick={() => addModToCartItem(item.id, mod)}>
                                            <span class="mod-picker-name">{mod.name}</span>
                                            <span class="avail-badge {getAvailColorClass(mod.availability)}">{getAvailLabel(mod.availability)}</span>
                                        </button>
                                    {:else}
                                        <p class="no-results">No modifications found.</p>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Notes (batch-level) -->
    {#if cartItems.length > 0}
        <div class="options-section">
            <div class="field-row">
                <label for="req-notes">{game.i18n?.localize("DH2E.Requisition.Notes") ?? "Notes"}</label>
                <textarea
                    id="req-notes"
                    bind:value={notes}
                    placeholder={game.i18n?.localize("DH2E.Requisition.NotesHint") ?? "Free-text notes for the GM..."}
                    rows="2"
                ></textarea>
            </div>
        </div>
    {/if}

    <!-- Per-item Target Numbers -->
    {#if cartItems.length > 0 && !rollResult}
        <div class="cost-breakdown">
            <h4>{game.i18n?.localize("DH2E.Requisition.CostBreakdown") ?? "Cost Breakdown"}</h4>
            <div class="cost-row">
                <span>{game.i18n?.localize("DH2E.Requisition.CharacterInfluence") ?? "Character Influence"}</span>
                <span class="cost-value">{influence}</span>
            </div>
            <div class="tn-table">
                {#each cartItems as item (item.id)}
                    {@const availConfig = (ctx.availOptions ?? []).find((t: any) => t.key === item.availability)}
                    {@const craftConfig = (ctx.craftOptions ?? []).find((t: any) => t.key === item.craftsmanship)}
                    <div class="tn-row">
                        <span class="tn-name">{item.name}</span>
                        <span class="avail-badge {getAvailColorClass(item.availability)}">{getAvailLabel(item.availability)}</span>
                        <span class="tn-detail">{formatMod(availConfig?.modifier ?? 0)}</span>
                        <span class="tn-value">TN: {getItemTN(item)}</span>
                        {#if hasMechanicusBonus(item)}
                            <span class="mechanicus-badge" title={game.i18n?.localize("DH2E.ReplaceTheWeakFlesh.Badge") ?? "+20 Replace the Weak Flesh"}>
                                <i class="fa-solid fa-gear"></i> +20
                            </span>
                        {/if}
                    </div>
                    {#if craftConfig && craftConfig.modifier !== 0}
                        <div class="tn-sub-row">
                            <span class="tn-sub-indent"></span>
                            <span class="tn-sub-label">{getCraftLabel(item.craftsmanship)}</span>
                            <span class="tn-sub-mod">{formatMod(craftConfig.modifier)}</span>
                        </div>
                    {/if}
                    {#each item.modifications as mod (mod.uuid)}
                        <div class="tn-sub-row">
                            <span class="tn-sub-indent">+</span>
                            <span class="tn-sub-label">{mod.name}</span>
                            <span class="avail-badge sm {getAvailColorClass(mod.availability)}">{getAvailLabel(mod.availability)}</span>
                            <span class="tn-sub-mod">{formatMod(mod.modifier)}</span>
                        </div>
                    {/each}
                {/each}
            </div>
        </div>
    {/if}

    <!-- Roll result (per-item) -->
    {#if rollResult}
        <div class="roll-results">
            {#if rollResult.rollMode === "bulk"}
                <div class="bulk-roll-header">
                    <span class="roll-label">{game.i18n?.localize("DH2E.Requisition.RawRoll") ?? "Roll"}</span>
                    <span class="roll-d100">{rollResult.rollResult}</span>
                </div>
            {/if}
            <div class="per-item-results">
                {#each rollResult.perItem as pi, i}
                    <div class="per-item-row" class:success={pi.success} class:failure={!pi.success}>
                        <span class="per-item-name">{cartItems[i]?.name ?? "?"}</span>
                        <span class="avail-badge {getAvailColorClass(cartItems[i]?.availability ?? 'common')}">{getAvailLabel(cartItems[i]?.availability ?? 'common')}</span>
                        <span class="per-item-tn">TN: {pi.targetNumber}</span>
                        {#if rollResult.rollMode === "individual"}
                            <span class="per-item-roll">{pi.rollResult}</span>
                        {/if}
                        <span class="per-item-result">
                            {pi.success ? "+" : "-"}{pi.degrees} {pi.success ? "DoS" : "DoF"}
                        </span>
                        {#if pi.influenceLost}
                            <i class="fa-solid fa-arrow-down per-item-inf-loss" title="Influence Lost"></i>
                        {/if}
                    </div>
                    {#if (cartItems[i]?.modifications ?? []).length > 0}
                        {#each cartItems[i].modifications as mod (mod.uuid)}
                            <div class="per-item-mod-row">
                                <span class="per-item-mod-indent">+</span>
                                <span class="per-item-mod-name">{mod.name}</span>
                                <span class="avail-badge sm {getAvailColorClass(mod.availability)}">{getAvailLabel(mod.availability)}</span>
                                <span class="per-item-mod-mod">{formatMod(mod.modifier)}</span>
                            </div>
                        {/each}
                    {/if}
                {/each}
            </div>
            {#if rollResult.influenceLost}
                <p class="influence-lost">
                    <i class="fa-solid fa-arrow-down"></i>
                    {game.i18n?.localize("DH2E.Requisition.InfluenceLost") ?? "Lost 1 Influence (3+ DoF)"}
                </p>
            {/if}
        </div>
    {/if}

    <!-- Action buttons -->
    <div class="dialog-buttons">
        {#if !rollResult}
            <button class="btn-roll" onclick={doRoll} disabled={!canRoll}>
                <i class="fa-solid fa-dice-d20"></i>
                {game.i18n?.localize("DH2E.Requisition.Roll") ?? "Roll Requisition"}
            </button>
        {:else}
            <button class="btn-send" onclick={sendToGM} disabled={!canSend}>
                <i class="fa-solid fa-paper-plane"></i>
                {game.i18n?.localize("DH2E.Requisition.SendRequest") ?? "Send to GM"}
            </button>
        {/if}
        <button class="btn-cancel" onclick={() => ctx.close?.()}>Cancel</button>
    </div>
</div>

<style lang="scss">
    .requisition-request {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
        height: 100%;
        min-height: 0;
    }

    .mode-toggle {
        display: flex;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .mode-btn {
        flex: 1;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-sm, 0.8rem);
        cursor: pointer;

        &.active {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
        }

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .item-search {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
        flex: 1;
        min-height: 0;
    }

    .selected-item {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: rgba(200, 168, 78, 0.15);
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);

        i { color: var(--dh2e-gold, #c8a84e); }
    }

    .clear-btn {
        margin-left: auto;
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 1rem;
        padding: 0 0.25rem;
        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
    }

    .item-results {
        flex: 1;
        min-height: 4rem;
        overflow-y: auto;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-darkest, #111114);
    }

    .result-row {
        display: grid;
        grid-template-columns: 1fr auto 3.5rem;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        width: 100%;
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
        text-align: left;

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        &.selected { background: rgba(200, 168, 78, 0.15); }
    }

    .result-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .result-type {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: capitalize;
        text-align: right;
    }

    .no-results {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        margin: 0;
    }

    .custom-item {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);

        label {
            font-size: var(--dh2e-text-sm, 0.8rem);
            color: var(--dh2e-text-secondary, #a0a0a8);
        }

        input {
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        }
    }

    .options-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .field-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);

        label {
            flex: 0 0 auto;
            font-size: var(--dh2e-text-sm, 0.8rem);
            color: var(--dh2e-text-secondary, #a0a0a8);
            min-width: 7rem;
        }

        select, input, textarea {
            flex: 1;
            background: var(--dh2e-bg-mid, #2e2e35);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        }

        textarea {
            resize: vertical;
            font-family: inherit;
            font-size: var(--dh2e-text-sm, 0.8rem);
        }
    }

    .btn-add-cart {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px dashed var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-gold, #c8a84e);
        font-size: var(--dh2e-text-sm, 0.8rem);
        cursor: pointer;
        font-weight: 600;

        &:hover { background: rgba(200, 168, 78, 0.15); }
        &:disabled { opacity: 0.4; cursor: not-allowed; }

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .cart-section {
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-darkest, #111114);
    }

    .cart-header {
        margin: 0;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);

        i { margin-right: 4px; }
    }

    .cart-list {
        max-height: 10rem;
        overflow-y: auto;
    }

    .cart-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:last-child { border-bottom: none; }
    }

    .cart-item-name {
        flex: 1;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .avail-badge {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: 600;
        white-space: nowrap;
        text-align: center;
        min-width: 5.5rem;

        &.avail-green { background: #1a3020; color: #6c6; }
        &.avail-yellow { background: #3a3020; color: #cc6; }
        &.avail-red { background: #3a2020; color: #d66; }
        &.avail-purple { background: #2a2040; color: #a68ed0; }
    }

    .avail-badge-inline {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: 2px 8px;
        border-radius: 2px;
        font-weight: 600;

        &.avail-green { background: #1a3020; color: #6c6; }
        &.avail-yellow { background: #3a3020; color: #cc6; }
        &.avail-red { background: #3a2020; color: #d66; }
        &.avail-purple { background: #2a2040; color: #a68ed0; }
    }

    .craft-badge {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 1px 6px;
        border-radius: 2px;
        font-weight: 700;

        &.craft-poor { background: #4a3020; color: #c88050; }
        &.craft-common { background: #303040; color: #a0a0b0; }
        &.craft-good { background: #203040; color: #60a0c0; }
        &.craft-best { background: #3a3020; color: var(--dh2e-gold, #c8a84e); }
    }

    .cart-item-mod {
        font-size: 0.7rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
        min-width: 2rem;
        text-align: right;
    }

    .cart-item-block {
        &:not(:last-child) {
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
    }

    .cart-mod-btn {
        background: none;
        border: none;
        color: var(--dh2e-gold-muted, #7a6a3e);
        cursor: pointer;
        font-size: 0.7rem;
        padding: 0 3px;

        &:hover { color: var(--dh2e-gold, #c8a84e); }
    }

    .cart-mod-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: 1px var(--dh2e-space-sm, 0.5rem) 1px calc(var(--dh2e-space-sm, 0.5rem) + 1rem);
        font-size: 0.7rem;
    }

    .cart-mod-indent {
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
    }

    .cart-mod-name {
        flex: 1;
        color: var(--dh2e-text-secondary, #a0a0a8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .mod-picker {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border-top: 1px solid var(--dh2e-border, #4a4a55);

        input {
            width: 100%;
            background: var(--dh2e-bg-darkest, #111114);
            border: 1px solid var(--dh2e-border, #4a4a55);
            border-radius: var(--dh2e-radius-sm, 3px);
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
            font-size: var(--dh2e-text-sm, 0.8rem);
            margin-bottom: var(--dh2e-space-xxs, 0.125rem);
        }
    }

    .mod-picker-list {
        max-height: 6rem;
        overflow-y: auto;
    }

    .mod-picker-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 1px var(--dh2e-space-xs, 0.25rem);
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-size: 0.7rem;
        text-align: left;

        &:hover { background: rgba(200, 168, 78, 0.1); }
    }

    .mod-picker-name {
        flex: 1;
    }

    .cart-remove {
        background: none;
        border: none;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0 2px;
        line-height: 1;

        &:hover { color: #d66; }
    }

    .cost-breakdown {
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: rgba(200, 168, 78, 0.05);

        h4 {
            margin: 0 0 var(--dh2e-space-xs, 0.25rem);
            font-family: var(--dh2e-font-header, serif);
            font-size: var(--dh2e-text-sm, 0.8rem);
            color: var(--dh2e-gold, #c8a84e);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
    }

    .cost-row {
        display: flex;
        justify-content: space-between;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding: 1px 0;
        margin-bottom: var(--dh2e-space-xs, 0.25rem);
    }

    .cost-value {
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 600;
    }

    .tn-table {
        display: flex;
        flex-direction: column;
        gap: 1px;
        border-top: 1px solid var(--dh2e-gold-dark, #9c7a28);
        padding-top: var(--dh2e-space-xs, 0.25rem);
    }

    .tn-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        padding: 1px 0;
    }

    .tn-name {
        flex: 1;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tn-detail {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        min-width: 2rem;
        text-align: right;
    }

    .tn-value {
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        min-width: 3rem;
        text-align: right;
    }

    .mechanicus-badge {
        font-size: 0.65rem;
        font-weight: 700;
        color: var(--dh2e-success, #4caf50);
        background: rgba(76, 175, 80, 0.1);
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-radius: 3px;
        padding: 0 4px;
        margin-left: 4px;
        white-space: nowrap;
        i { margin-right: 2px; }
    }

    .tn-sub-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: 0.7rem;
        padding: 0 0 0 1rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .tn-sub-indent {
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
        width: 0.5rem;
    }

    .tn-sub-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tn-sub-mod {
        font-weight: 600;
        min-width: 2rem;
        text-align: right;
    }

    .avail-badge.sm {
        font-size: 0.5rem;
        min-width: auto;
        padding: 0 3px;
    }

    .roll-results {
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-darkest, #111114);
        padding: var(--dh2e-space-sm, 0.5rem);
    }

    .bulk-roll-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        margin-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-dark, #9c7a28);
    }

    .roll-label {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }

    .roll-d100 {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
    }

    .per-item-results {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .per-item-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        padding: 2px var(--dh2e-space-xs, 0.25rem);
        border-radius: 2px;

        &.success { background: rgba(80, 180, 80, 0.1); }
        &.failure { background: rgba(200, 60, 60, 0.1); }
    }

    .per-item-name {
        flex: 1;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .per-item-tn {
        font-size: 0.7rem;
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
        min-width: 2.5rem;
        text-align: right;
    }

    .per-item-roll {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        min-width: 1.5rem;
        text-align: center;
    }

    .per-item-result {
        font-weight: 700;
        font-size: 0.7rem;
        min-width: 3rem;
        text-align: right;

        .success & { color: #6c6; }
        .failure & { color: #d66; }
    }

    .per-item-inf-loss {
        color: #d66;
        font-size: 0.6rem;
    }

    .per-item-mod-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        font-size: 0.7rem;
        padding: 0 var(--dh2e-space-xs, 0.25rem) 0 1.5rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .per-item-mod-indent {
        color: var(--dh2e-gold-muted, #7a6a3e);
        font-weight: 600;
        width: 0.5rem;
    }

    .per-item-mod-name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .per-item-mod-mod {
        font-weight: 600;
        min-width: 2rem;
        text-align: right;
    }

    .influence-lost {
        margin: var(--dh2e-space-xs, 0.25rem) 0 0;
        font-size: 0.75rem;
        color: #d66;
        text-align: center;

        i { margin-right: 3px; }
    }

    .search-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: 2px var(--dh2e-space-xs, 0.25rem);

        input {
            flex: 1;
            min-width: 6rem;
            background: transparent;
            border: none;
            color: var(--dh2e-text-primary, #d0cfc8);
            padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
            outline: none;
            font-size: var(--dh2e-text-sm, 0.8rem);
        }
    }

    .search-pill {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 1px 6px;
        border-radius: 2px;
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        white-space: nowrap;

        &.avail-green { background: #1a3020; color: #6c6; }
        &.avail-yellow { background: #3a3020; color: #cc6; }
        &.avail-red { background: #3a2020; color: #d66; }
        &.avail-purple { background: #2a2040; color: #a68ed0; }
        &.pill-type { background: #203040; color: #60a0c0; }
    }

    .pill-remove {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 0.7rem;
        padding: 0 1px;
        line-height: 1;
        opacity: 0.6;
        &:hover { opacity: 1; }
    }

    .staging-mods {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
        border: 1px dashed var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-darkest, #111114);
    }

    .staging-mods-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .staging-mods-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        i { margin-right: 3px; }
    }

    .staging-mod-add {
        background: none;
        border: 1px solid var(--dh2e-gold-muted, #7a6a3e);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-gold, #c8a84e);
        cursor: pointer;
        font-size: 0.65rem;
        padding: 1px 6px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        &:hover { background: rgba(200, 168, 78, 0.15); }
        i { margin-right: 2px; }
    }

    .staging-mod-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .staging-mod-pill {
        display: inline-flex;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
        padding: 1px 6px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 2px;
        font-size: 0.7rem;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .mod-picker.staging {
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-mid, #2e2e35);
    }

    .dialog-buttons {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .btn-roll, .btn-send {
        flex: 1;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-gold-muted, #7a6a3e);
        border: 1px solid var(--dh2e-gold, #b49545);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-weight: 700;

        &:hover { background: var(--dh2e-gold, #b49545); color: #1e1e22; }
        &:disabled { opacity: 0.5; cursor: not-allowed; }

        i { margin-right: var(--dh2e-space-xs, 0.25rem); }
    }

    .btn-send {
        background: rgba(80, 180, 80, 0.3);
        border-color: rgba(80, 180, 80, 0.6);

        &:hover { background: rgba(80, 180, 80, 0.5); color: var(--dh2e-text-primary, #d0cfc8); }
    }

    .btn-cancel {
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: transparent;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;

        &:hover { background: var(--dh2e-bg-light, #3a3a45); }
    }
</style>
