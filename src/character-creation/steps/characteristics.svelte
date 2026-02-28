<script lang="ts">
    import type { CharacteristicAbbrev } from "../../actor/types.ts";
    import type { HomeworldOption, DivinationResult } from "../types.ts";
    import { DIVINATION_EFFECTS } from "../wizard.ts";
    import { getSetting } from "../../ui/settings/settings.ts";
    import { onMount, onDestroy } from "svelte";

    type CharGenMethod = "rolled" | "rolled25" | "points";

    let {
        method,
        homeworld,
        divination = null,
        divinationChoices = {},
        characteristics = $bindable<Record<CharacteristicAbbrev, number>>(),
        woundsRoll = $bindable<number | null>(null),
        woundsRollCount = $bindable<number>(0),
        fateRoll = $bindable<number | null>(null),
        corruptionRoll = $bindable<number | null>(null),
        charRolled = $bindable<Record<string, boolean>>(),
        charRerollUsed = $bindable<boolean>(false),
        charRerolledFrom = $bindable<Record<string, number | undefined>>(),
        charRerollTarget = $bindable<CharacteristicAbbrev | null>(null),
        charRollDetails = $bindable<Record<string, { die1: number; die2: number; base: number } | null>>(),
        maxWoundsRerolls,
    }: {
        method: CharGenMethod;
        homeworld: HomeworldOption | null;
        divination: DivinationResult | null;
        divinationChoices: Record<number, string>;
        characteristics: Record<CharacteristicAbbrev, number>;
        woundsRoll: number | null;
        woundsRollCount: number;
        fateRoll: number | null;
        corruptionRoll: number | null;
        charRolled: Record<string, boolean>;
        charRerollUsed: boolean;
        charRerolledFrom: Record<string, number | undefined>;
        charRerollTarget: CharacteristicAbbrev | null;
        charRollDetails: Record<string, { die1: number; die2: number; base: number } | null>;
        maxWoundsRerolls: number;
    } = $props();

    const charOrder = ["ws", "bs", "s", "t", "ag", "int", "per", "wp", "fel"] as const;
    const charNames: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

    const isRolled = $derived(method === "rolled" || method === "rolled25");
    const isPoints = $derived(method === "points");
    const rollBase = $derived(method === "rolled25" ? 25 : 20);
    const rollCap = $derived(method === "rolled25" ? 45 : 99);
    const pointsCap = 40;
    const totalPoints = 60;

    // --- Rolled mode state (persisted in wizard-root via bindable props) ---

    /** Whether we're in "pick a characteristic to re-roll" mode (local, doesn't need persistence) */
    let pickingReroll = $state(false);

    // --- Point allocation state ---

    /** Per-characteristic allocated points (on top of starting value) */
    let allocated = $state<Record<CharacteristicAbbrev, number>>(
        Object.fromEntries(charOrder.map(k => [k, 0])) as Record<CharacteristicAbbrev, number>,
    );
    const pointsSpent = $derived(
        charOrder.reduce((sum, k) => sum + allocated[k], 0),
    );
    const pointsRemaining = $derived(totalPoints - pointsSpent);

    // --- Homeworld helpers ---

    function isPositive(key: CharacteristicAbbrev): boolean {
        return homeworld?.characteristicBonuses?.positive?.includes(key) ?? false;
    }
    function isNegative(key: CharacteristicAbbrev): boolean {
        return homeworld?.characteristicBonuses?.negative?.includes(key) ?? false;
    }

    /** Show instant tooltip via Foundry API */
    function showTagTooltip(event: MouseEvent, text: string) {
        const el = event.currentTarget as HTMLElement;
        if (typeof game !== "undefined" && (game as any).tooltip) {
            (game as any).tooltip.activate(el, { html: text, direction: "DOWN" });
        }
    }

    // --- Divination modifier helpers ---

    /** Compute the divination modifier for a given characteristic key */
    function divMod(key: CharacteristicAbbrev): number {
        if (!divination) return 0;
        const fx = DIVINATION_EFFECTS[divination.text];
        if (!fx) return 0;

        let total = 0;

        // Fixed characteristic modifiers
        if (fx.characteristics?.[key]) {
            total += fx.characteristics[key];
        }

        // Choice-based modifiers
        if (fx.choiceGroups) {
            for (let gi = 0; gi < fx.choiceGroups.length; gi++) {
                const group = fx.choiceGroups[gi];
                const selectedKey = divinationChoices[gi] ?? group.options[0].key;
                const opt = group.options.find(o => o.key === selectedKey) ?? group.options[0];
                if (opt.key === key) {
                    total += opt.delta;
                }
            }
        }

        return total;
    }

    /** Starting value for point allocation based on homeworld */
    function pointsStarting(key: CharacteristicAbbrev): number {
        let base = 25;
        if (isPositive(key)) base = 30;
        if (isNegative(key)) base = 20;
        return base;
    }

    // --- Rolling logic ---

    /** Compute the base modifier for a characteristic (rollBase +/- homeworld bonus) */
    function rollBaseFor(key: CharacteristicAbbrev): number {
        let base = rollBase;
        if (isPositive(key)) base += 5;
        if (isNegative(key)) base -= 5;
        return base;
    }

    function rollFormula(key: CharacteristicAbbrev): string {
        return `2d10+${rollBaseFor(key)}`;
    }

    async function rollOne(key: CharacteristicAbbrev): Promise<void> {
        const formula = rollFormula(key);
        const roll = new Roll(formula);
        await roll.evaluate();
        let value = roll.total!;
        if (method === "rolled25") value = Math.min(value, rollCap);
        characteristics[key] = value;
        charRolled[key] = true;
        charRolled = { ...charRolled }; // trigger reactivity

        // Store roll breakdown for tooltip
        const dice = (roll.dice?.[0]?.results ?? []).map((r: any) => r.result);
        const base = rollBaseFor(key);
        charRollDetails[key] = { die1: dice[0] ?? 0, die2: dice[1] ?? 0, base };
        charRollDetails = { ...charRollDetails };
    }

    async function rollAll(): Promise<void> {
        for (const key of charOrder) {
            if (!charRolled[key]) {
                await rollOne(key);
            }
        }
    }

    function startReroll(): void {
        pickingReroll = true;
    }

    async function executeReroll(key: CharacteristicAbbrev): Promise<void> {
        charRerolledFrom[key] = characteristics[key];
        charRerolledFrom = { ...charRerolledFrom }; // trigger reactivity
        const formula = rollFormula(key);
        const roll = new Roll(formula);
        await roll.evaluate();
        let value = roll.total!;
        if (method === "rolled25") value = Math.min(value, rollCap);
        characteristics[key] = value;
        charRerollUsed = true;
        charRerollTarget = key;
        pickingReroll = false;

        // Update roll breakdown for tooltip
        const dice = (roll.dice?.[0]?.results ?? []).map((r: any) => r.result);
        const base = rollBaseFor(key);
        charRollDetails[key] = { die1: dice[0] ?? 0, die2: dice[1] ?? 0, base };
        charRollDetails = { ...charRollDetails };
    }

    function cancelReroll(): void {
        pickingReroll = false;
    }

    const allRolled = $derived(charOrder.every(k => charRolled[k]));

    // --- Point allocation logic ---

    function addPoint(key: CharacteristicAbbrev): void {
        const current = pointsStarting(key) + allocated[key];
        if (current >= pointsCap || pointsRemaining <= 0) return;
        allocated[key]++;
        characteristics[key] = pointsStarting(key) + allocated[key];
    }

    function removePoint(key: CharacteristicAbbrev): void {
        if (allocated[key] <= 0) return;
        allocated[key]--;
        characteristics[key] = pointsStarting(key) + allocated[key];
    }

    // --- Sync characteristics for points mode on mount ---

    $effect(() => {
        if (isPoints) {
            for (const key of charOrder) {
                characteristics[key] = pointsStarting(key) + allocated[key];
            }
        }
    });

    // --- Total for summary ---
    const charTotal = $derived(
        charOrder.reduce((sum, k) => sum + (characteristics[k] ?? 0), 0),
    );

    // --- Fate (Emperor's Blessing) rolling ---

    const blessingTarget = $derived(homeworld?.fate?.blessing ?? 10);
    const fateThreshold = $derived(homeworld?.fate?.threshold ?? 2);
    const fateBlessed = $derived(fateRoll !== null && fateRoll >= blessingTarget);
    const totalFate = $derived(fateThreshold + (fateBlessed ? 1 : 0));
    let fateRolling = $state(false);

    async function rollFate() {
        if (fateRoll !== null) return; // no rerolls
        fateRolling = true;
        try {
            const roll = new Roll("1d10");
            await roll.evaluate();
            fateRoll = roll.total ?? 0;
        } finally {
            fateRolling = false;
        }
    }

    // --- Wounds rolling ---

    let woundsRolling = $state(false);
    const woundsFormula = $derived(homeworld?.woundsFormula ?? null);
    const canRerollWounds = $derived(woundsRollCount > 0 && woundsRollCount <= maxWoundsRerolls);

    async function rollWounds() {
        if (!woundsFormula) return;
        woundsRolling = true;
        try {
            const roll = new Roll(woundsFormula);
            await roll.evaluate();
            woundsRoll = roll.total ?? 0;
            woundsRollCount++;
        } finally {
            woundsRolling = false;
        }
    }

    // --- Starting Corruption rolling (Daemon World: 1d10+5) ---

    const hasCorruptionRoll = $derived(!!homeworld?.startingCorruption);
    let corruptionRolling = $state(false);

    async function rollCorruption() {
        if (corruptionRoll !== null || !homeworld?.startingCorruption) return;
        corruptionRolling = true;
        try {
            const roll = new Roll(homeworld.startingCorruption);
            await roll.evaluate();
            corruptionRoll = roll.total ?? 0;
        } finally {
            corruptionRolling = false;
        }
    }

    // Reset wounds, fate & corruption state only when homeworld actually changes (not on mount)
    let prevHomeworldName: string | null | undefined = homeworld?.name;
    $effect(() => {
        const currentName = homeworld?.name;
        if (prevHomeworldName !== undefined && currentName !== prevHomeworldName) {
            woundsRoll = null;
            woundsRollCount = 0;
            fateRoll = null;
            corruptionRoll = null;
        }
        prevHomeworldName = currentName;
    });

    // --- GM-Approved Reroll Threshold ---

    const rerollThreshold = getSetting<number>("charGenRerollThreshold") ?? 89;

    /** Sum of dice-only values (without base) across all characteristics */
    const diceOnlyTotal = $derived(() => {
        if (!allRolled) return 0;
        return charOrder.reduce((sum, k) => {
            const d = charRollDetails[k];
            if (!d) return sum;
            return sum + d.die1 + d.die2;
        }, 0);
    });

    const isBelowThreshold = $derived(
        isRolled && allRolled && rerollThreshold > 0 && diceOnlyTotal() < rerollThreshold,
    );

    /** Whether a GM reroll request has been sent and we're waiting */
    let rerollRequestPending = $state(false);
    /** Whether a GM-approved reroll has been granted */
    let gmRerollGranted = $state<"full" | "single" | null>(null);

    function requestGMReroll() {
        const g = game as any;
        if (g.user?.isGM) {
            // GM is also the player — auto-approve full reroll
            gmRerollGranted = "full";
            rerollRequestPending = false;
            return;
        }

        rerollRequestPending = true;

        // Build breakdown from roll details
        const breakdown: Record<string, { die1: number; die2: number; base: number }> = {};
        for (const k of charOrder) {
            const d = charRollDetails[k];
            if (d) breakdown[k] = { ...d };
        }

        g.socket.emit(`system.${SYSTEM_ID}`, {
            type: "chargenRerollRequest",
            payload: {
                requesterId: g.user?.id,
                requesterName: g.user?.name ?? "Unknown",
                actorName: "New Character",
                diceTotal: diceOnlyTotal(),
                threshold: rerollThreshold,
                breakdown,
            },
        });
    }

    async function executeGMReroll(mode: "full" | "single") {
        if (mode === "full") {
            // Reset ALL rolls and re-roll everything
            for (const k of charOrder) {
                charRolled[k] = false;
                charRollDetails[k] = null;
            }
            charRolled = { ...charRolled };
            charRollDetails = { ...charRollDetails };
            charRerollUsed = false;
            charRerolledFrom = Object.fromEntries(charOrder.map(k => [k, undefined])) as Record<string, number | undefined>;
            charRerollTarget = null;
            gmRerollGranted = null;
            // Roll all fresh
            await rollAll();
        } else if (mode === "single") {
            // Grant one more reroll (reset rerollUsed so player can pick one)
            charRerollUsed = false;
            gmRerollGranted = null;
        }
    }

    // Listen for GM response via custom events
    function onRerollResponse(e: Event) {
        const detail = (e as CustomEvent).detail;
        rerollRequestPending = false;
        if (detail.approved) {
            gmRerollGranted = detail.mode;
        }
    }

    onMount(() => {
        document.addEventListener("dh2e:chargenRerollResponse", onRerollResponse);
    });
    onDestroy(() => {
        document.removeEventListener("dh2e:chargenRerollResponse", onRerollResponse);
    });
</script>

<div class="step-content">
    <h3 class="step-title">Characteristics</h3>

    <!-- Fate & Wounds Section — two columns -->
    <div class="vitals-row">
        <!-- Fate / Emperor's Blessing -->
        <div class="vital-col">
            <h4 class="section-label">Emperor's Blessing</h4>
            <div class="vital-body">
                <span class="vital-value" class:blessed={fateBlessed}>{totalFate}</span>
                <span class="vital-sub">Fate Points</span>
                {#if fateRoll !== null}
                    <span class="vital-detail" class:blessed={fateBlessed}>
                        Rolled {fateRoll} (needed {blessingTarget}+)
                        {#if fateBlessed}— Blessed!{:else}— No blessing{/if}
                    </span>
                {:else}
                    <button class="btn roll-vital-btn" type="button"
                        onclick={rollFate} disabled={fateRolling}>
                        Roll d10
                    </button>
                    <span class="vital-hint">Roll {blessingTarget}+ for +1 Fate</span>
                {/if}
            </div>
        </div>

        <!-- Wounds -->
        <div class="vital-col">
            <h4 class="section-label">Starting Wounds</h4>
            <div class="vital-body">
                {#if woundsFormula}
                    {#if woundsRoll !== null}
                        <span class="vital-value">{woundsRoll}</span>
                        <span class="vital-sub">{woundsFormula}</span>
                    {:else}
                        <span class="vital-value dim">?</span>
                        <span class="vital-sub">{woundsFormula}</span>
                    {/if}
                    {#if woundsRoll === null}
                        <button class="btn roll-vital-btn" type="button"
                            onclick={rollWounds} disabled={woundsRolling}>
                            Roll Wounds
                        </button>
                    {:else if canRerollWounds}
                        <button class="btn roll-vital-btn reroll" type="button"
                            onclick={rollWounds} disabled={woundsRolling}>
                            Re-roll ({maxWoundsRerolls - woundsRollCount + 1} left)
                        </button>
                    {:else}
                        <span class="vital-detail">No re-rolls remaining</span>
                    {/if}
                {:else if homeworld}
                    <span class="vital-value">{homeworld.wounds ?? "—"}</span>
                    <span class="vital-sub">Fixed</span>
                {/if}
            </div>
        </div>

        <!-- Starting Corruption (Daemon World only) -->
        {#if hasCorruptionRoll}
            <div class="vital-col corruption">
                <h4 class="section-label">Starting Corruption</h4>
                <div class="vital-body">
                    {#if corruptionRoll !== null}
                        <span class="vital-value corruption-val">{corruptionRoll}</span>
                        <span class="vital-sub">{homeworld?.startingCorruption}</span>
                        <span class="vital-detail">Corruption Points</span>
                    {:else}
                        <span class="vital-value dim">?</span>
                        <span class="vital-sub">{homeworld?.startingCorruption}</span>
                        <button class="btn roll-vital-btn corruption-btn" type="button"
                            onclick={rollCorruption} disabled={corruptionRolling}>
                            Roll Corruption
                        </button>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    {#if isRolled}
        <p class="step-desc">
            Roll for each characteristic. You may re-roll one result (must keep the second roll).
            {#if method === "rolled25"}
                <span class="variant-note">Experienced variant: 2d10+25, cap 45.</span>
            {/if}
        </p>

        <div class="roll-controls">
            {#if !allRolled}
                <button class="btn roll-all-btn" type="button" onclick={rollAll}>Roll All</button>
            {/if}
            {#if allRolled && !charRerollUsed && !pickingReroll}
                <button class="btn reroll-btn" type="button" onclick={startReroll}>Re-roll</button>
            {/if}
            {#if pickingReroll}
                <span class="reroll-prompt">Pick a characteristic to re-roll</span>
                <button class="btn cancel-reroll-btn" type="button" onclick={cancelReroll}>Cancel</button>
            {/if}
            {#if charRerollUsed}
                <span class="reroll-used">Re-roll used</span>
            {/if}
        </div>

        <div class="char-grid">
            {#each charOrder as key}
                {@const hasRolled = charRolled[key]}
                {@const oldVal = charRerolledFrom[key]}
                {@const wasRerolled = charRerollTarget === key}
                {@const details = charRollDetails[key]}
                {@const dm = divMod(key)}
                <div
                    class="char-cell"
                    class:positive={isPositive(key)}
                    class:negative={isNegative(key)}
                    class:has-div-mod={dm !== 0}
                    class:picking={pickingReroll && hasRolled}
                >
                    <span class="char-label">{charNames[key]}</span>

                    <div class="tag-row">
                        {#if isPositive(key)}
                            <span class="hw-tag bonus" onmouseenter={(e) => showTagTooltip(e, `<b>${homeworld?.name ?? 'Homeworld'}</b>: +5 to ${charNames[key]}`)}>+</span>
                        {:else if isNegative(key)}
                            <span class="hw-tag penalty" onmouseenter={(e) => showTagTooltip(e, `<b>${homeworld?.name ?? 'Homeworld'}</b>: -5 to ${charNames[key]}`)}>-</span>
                        {/if}
                        {#if dm > 0}
                            <span class="div-tag bonus" onmouseenter={(e) => showTagTooltip(e, `<b>Divination</b>: &ldquo;${divination?.text ?? ''}&rdquo;<br/>+${dm} ${charNames[key]}`)}>+{dm}</span>
                        {:else if dm < 0}
                            <span class="div-tag penalty" onmouseenter={(e) => showTagTooltip(e, `<b>Divination</b>: &ldquo;${divination?.text ?? ''}&rdquo;<br/>${dm} ${charNames[key]}`)}>{ dm}</span>
                        {/if}
                        {#if !isPositive(key) && !isNegative(key) && dm === 0}
                            <span class="hw-tag spacer">&nbsp;</span>
                        {/if}
                    </div>

                    {#if hasRolled}
                        {@const hwModTip = isPositive(key) ? " + 5" : isNegative(key) ? " - 5" : ""}
                        {@const divModTip = dm !== 0 ? ` ${dm > 0 ? "+" : ""}${dm} div` : ""}
                        {@const effectiveVal = characteristics[key] + dm}
                        <span
                            class="char-value"
                            class:rerolled={wasRerolled}
                            title={details ? `${details.die1} + ${details.die2} + ${rollBase}${hwModTip}${divModTip}` : ""}
                        >
                            {#if oldVal !== undefined}
                                <span class="old-value">{oldVal}</span>
                            {/if}
                            {#if dm !== 0}
                                <span class="base-val">{characteristics[key]}</span>
                                <span class="effective-val">{effectiveVal}</span>
                            {:else}
                                {characteristics[key]}
                            {/if}
                        </span>
                        {#if details}
                            {@const hwMod = isPositive(key) ? 5 : isNegative(key) ? -5 : 0}
                            <span class="roll-breakdown">
                                {details.die1} + {details.die2} + {rollBase}{#if hwMod > 0}{" "}+ {hwMod}{:else if hwMod < 0}{" "}- {Math.abs(hwMod)}{/if}{#if dm > 0}{" "}+ {dm}{:else if dm < 0}{" "}- {Math.abs(dm)}{/if}
                            </span>
                        {/if}

                        {#if pickingReroll}
                            <button
                                class="btn pick-btn"
                                type="button"
                                onclick={() => executeReroll(key)}
                            >Re-roll</button>
                        {/if}
                    {:else}
                        <button
                            class="btn roll-one-btn"
                            type="button"
                            onclick={() => rollOne(key)}
                        >Roll</button>
                    {/if}
                </div>
            {/each}
        </div>

    {:else if isPoints}
        <p class="step-desc">
            Allocate {totalPoints} points across your characteristics. No stat may exceed {pointsCap}.
        </p>

        <div class="points-counter" class:depleted={pointsRemaining === 0}>
            <span class="points-label">Points Remaining</span>
            <span class="points-value">{pointsRemaining} / {totalPoints}</span>
        </div>

        <div class="char-grid">
            {#each charOrder as key}
                {@const start = pointsStarting(key)}
                {@const current = start + allocated[key]}
                {@const atCap = current >= pointsCap}
                {@const atFloor = allocated[key] <= 0}
                <div
                    class="char-cell points-cell"
                    class:positive={isPositive(key)}
                    class:negative={isNegative(key)}
                    class:at-cap={atCap}
                >
                    <span class="char-label">{charNames[key]}</span>

                    {#if isPositive(key)}
                        <span class="hw-tag bonus">+5</span>
                    {:else if isNegative(key)}
                        <span class="hw-tag penalty">-5</span>
                    {:else}
                        <span class="hw-tag spacer">&nbsp;</span>
                    {/if}

                    <div class="point-controls">
                        <button
                            class="btn point-btn minus"
                            type="button"
                            disabled={atFloor}
                            onclick={() => removePoint(key)}
                        >-</button>
                        <span class="char-value">{current}</span>
                        <button
                            class="btn point-btn plus"
                            type="button"
                            disabled={atCap || pointsRemaining <= 0}
                            onclick={() => addPoint(key)}
                        >+</button>
                    </div>

                    <span class="alloc-detail">
                        {start}{#if allocated[key] > 0} + {allocated[key]}{/if}
                    </span>
                </div>
            {/each}
        </div>
    {/if}

    <div class="char-total">
        <span class="total-label">Total</span>
        <span class="total-value">{charTotal}</span>
        {#if isRolled && allRolled}
            <span class="dice-total">(Dice: {diceOnlyTotal()})</span>
        {/if}
    </div>

    <!-- GM Reroll Threshold -->
    {#if isBelowThreshold && !gmRerollGranted}
        <div class="threshold-warning">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Dice total ({diceOnlyTotal()}) is below threshold ({rerollThreshold}). You may request a GM-approved reroll.</span>
            {#if rerollRequestPending}
                <span class="pending-label"><i class="fa-solid fa-spinner fa-spin"></i> Awaiting GM approval...</span>
            {:else}
                <button class="btn request-reroll-btn" type="button" onclick={requestGMReroll}>
                    Request GM Reroll
                </button>
            {/if}
        </div>
    {/if}

    {#if gmRerollGranted}
        <div class="reroll-granted">
            <i class="fa-solid fa-check-circle"></i>
            <span>GM approved a {gmRerollGranted} reroll!</span>
            <button class="btn apply-reroll-btn" type="button" onclick={() => executeGMReroll(gmRerollGranted!)}>
                Apply {gmRerollGranted === "full" ? "Full" : "Single"} Reroll
            </button>
        </div>
    {/if}
</div>

<style lang="scss">
    .step-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .step-title {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0;
    }

    .step-desc {
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin: 0;
    }

    .variant-note {
        color: var(--dh2e-gold-dark, #9c7a28);
        font-style: italic;
    }

    /* Roll controls bar */
    .roll-controls {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .roll-all-btn {
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border-color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
        &:hover { background: var(--dh2e-gold, #c8a84e); }
    }

    .reroll-btn {
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-gold, #c8a84e);
        border-color: var(--dh2e-gold-dark, #9c7a28);
        &:hover { background: var(--dh2e-gold-dark, #9c7a28); color: #111; }
    }

    .cancel-reroll-btn {
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .reroll-prompt {
        font-size: 0.75rem;
        color: var(--dh2e-gold, #c8a84e);
        font-style: italic;
    }

    .reroll-used {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    /* Characteristic grid */
    .char-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .char-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: var(--dh2e-space-xs, 0.25rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;

        &.positive { border-color: rgba(102, 204, 102, 0.4); }
        &.negative { border-color: rgba(204, 102, 102, 0.4); }
        &.picking {
            cursor: pointer;
            border-color: var(--dh2e-gold, #c8a84e);
            &:hover { background: #2a2820; }
        }
        &.at-cap { border-color: var(--dh2e-gold-dark, #9c7a28); }
    }

    .char-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 700;
    }

    .positive .char-label { color: #6c6; }
    .negative .char-label { color: #c66; }

    .tag-row {
        display: flex;
        align-items: center;
        gap: 3px;
        min-height: 0.85rem;
    }

    .hw-tag {
        font-size: 0.55rem;
        font-weight: 700;
        border-radius: 2px;
        padding: 0 3px;
        &.bonus { color: #6c6; background: rgba(102, 204, 102, 0.12); }
        &.penalty { color: #c66; background: rgba(204, 102, 102, 0.12); }
        &.spacer { visibility: hidden; }
    }

    .div-tag {
        font-size: 0.55rem;
        font-weight: 700;
        border-radius: 2px;
        padding: 0 3px;
        font-family: var(--dh2e-font-mono, monospace);
        &.bonus { color: var(--dh2e-gold, #c8a84e); background: rgba(200, 168, 78, 0.15); }
        &.penalty { color: #c89; background: rgba(200, 136, 150, 0.15); }
    }

    .has-div-mod { border-color: rgba(200, 168, 78, 0.35); }

    .base-val {
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-decoration: line-through;
        margin-right: 4px;
    }

    .effective-val {
        color: var(--dh2e-gold, #c8a84e);
    }

    .char-value {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);

        &.rerolled { color: var(--dh2e-gold, #c8a84e); }
    }

    .old-value {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-decoration: line-through;
        margin-right: 4px;
    }

    .roll-breakdown {
        font-size: 0.55rem;
        font-family: monospace;
        color: var(--dh2e-text-secondary, #a0a0a8);
        opacity: 0.7;
    }

    .roll-one-btn {
        font-size: 0.65rem;
        padding: 2px 8px;
        background: var(--dh2e-bg-darkest, #111114);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 2px;
        cursor: pointer;
        &:hover { border-color: var(--dh2e-gold-dark, #9c7a28); }
    }

    .pick-btn {
        font-size: 0.6rem;
        padding: 1px 6px;
        background: var(--dh2e-gold-dark, #9c7a28);
        color: #111;
        border: none;
        border-radius: 2px;
        cursor: pointer;
        &:hover { background: var(--dh2e-gold, #c8a84e); }
    }

    /* Points mode */
    .points-counter {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;

        &.depleted { border-color: var(--dh2e-gold-dark, #9c7a28); }
    }

    .points-label {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 700;
    }

    .points-value {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
    }

    .depleted .points-value { color: var(--dh2e-success, #4a8); }

    .point-controls {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .point-btn {
        width: 1.4rem;
        height: 1.4rem;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
        font-weight: 700;
        background: var(--dh2e-bg-darkest, #111114);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 2px;
        cursor: pointer;

        &:hover:not(:disabled) {
            border-color: var(--dh2e-gold-dark, #9c7a28);
        }
        &:disabled {
            opacity: 0.3;
            cursor: default;
        }
    }

    .alloc-detail {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    /* Summary total */
    .char-total {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding-top: var(--dh2e-space-xs, 0.25rem);
        border-top: 1px solid var(--dh2e-border, #4a4a55);
    }

    .total-label {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 700;
    }

    .total-value {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    /* Vitals row — fate + wounds side by side */
    .vitals-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding-bottom: var(--dh2e-space-sm, 0.5rem);
        margin-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }

    .vital-col {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
        min-height: 0;
    }

    .section-label {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0;
    }

    .vital-body {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        min-height: 5.5rem;
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-xs, 0.25rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 3px;
    }

    .vital-value {
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);

        &.blessed { color: var(--dh2e-gold, #c8a84e); }
        &.dim { opacity: 0.3; }
    }

    .vital-sub {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }

    .vital-detail {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        text-align: center;

        &.blessed { color: var(--dh2e-gold, #c8a84e); }
    }

    .vital-hint {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .roll-vital-btn {
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border-color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
        &:hover { background: var(--dh2e-gold, #c8a84e); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }

        &.corruption-btn {
            background: #6a2a3a;
            border-color: #9a4a5a;
            color: #e0d0d0;
            &:hover { background: #8a3a4a; }
        }
    }

    .corruption-val {
        color: #d04060 !important;
    }

    .dice-total {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .threshold-warning {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: rgba(204, 160, 50, 0.1);
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: 3px;
        font-size: 0.7rem;
        color: var(--dh2e-gold, #c8a84e);

        i { flex-shrink: 0; }
    }

    .pending-label {
        font-style: italic;
        color: var(--dh2e-text-secondary, #a0a0a8);
        i { margin-right: 4px; }
    }

    .request-reroll-btn {
        flex-shrink: 0;
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border-color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
        &:hover { background: var(--dh2e-gold, #c8a84e); }
    }

    .reroll-granted {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: rgba(68, 170, 136, 0.1);
        border: 1px solid var(--dh2e-success, #4a8);
        border-radius: 3px;
        font-size: 0.7rem;
        color: var(--dh2e-success, #4a8);

        i { flex-shrink: 0; }
    }

    .apply-reroll-btn {
        flex-shrink: 0;
        background: var(--dh2e-success, #4a8);
        color: #fff;
        border-color: var(--dh2e-success, #4a8);
        font-weight: 700;
        &:hover { background: #3a7; }
    }

    /* Common button base */
    .btn {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;
        font-weight: 600;
        font-size: 0.7rem;
    }
</style>
