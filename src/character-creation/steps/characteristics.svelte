<script lang="ts">
    import type { CharacteristicAbbrev } from "../../actor/types.ts";
    import type { HomeworldOption } from "../types.ts";
    import { getSetting } from "../../ui/settings/settings.ts";
    import { onMount, onDestroy } from "svelte";

    type CharGenMethod = "rolled" | "rolled25" | "points";

    let {
        method,
        homeworld,
        characteristics = $bindable<Record<CharacteristicAbbrev, number>>(),
        woundsRoll = $bindable<number | null>(null),
        charRolled = $bindable<Record<string, boolean>>(),
        charRerollUsed = $bindable<boolean>(false),
        charRerolledFrom = $bindable<Record<string, number | undefined>>(),
        charRerollTarget = $bindable<CharacteristicAbbrev | null>(null),
        charRollDetails = $bindable<Record<string, { die1: number; die2: number; base: number } | null>>(),
        maxWoundsRerolls,
    }: {
        method: CharGenMethod;
        homeworld: HomeworldOption | null;
        characteristics: Record<CharacteristicAbbrev, number>;
        woundsRoll: number | null;
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

    // --- Wounds rolling ---

    let woundsRolling = $state(false);
    let woundsRollCount = $state(0);
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

    // Reset wounds state when homeworld changes
    $effect(() => {
        const _ = homeworld?.name;
        woundsRoll = null;
        woundsRollCount = 0;
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

    <!-- Wounds Rolling Section -->
    {#if woundsFormula}
        <div class="wounds-section">
            <h4 class="section-label">Starting Wounds</h4>
            <div class="wounds-row">
                <span class="wounds-formula">{woundsFormula}</span>
                {#if woundsRoll !== null}
                    <span class="wounds-result">{woundsRoll}</span>
                {/if}
                {#if woundsRoll === null}
                    <button class="btn roll-wounds-btn" type="button"
                        onclick={rollWounds} disabled={woundsRolling}>
                        Roll Wounds
                    </button>
                {:else if canRerollWounds}
                    <button class="btn roll-wounds-btn reroll" type="button"
                        onclick={rollWounds} disabled={woundsRolling}>
                        Re-roll ({maxWoundsRerolls - woundsRollCount + 1} left)
                    </button>
                {:else}
                    <span class="rerolls-exhausted">No re-rolls remaining</span>
                {/if}
            </div>
        </div>
    {:else if homeworld}
        <div class="wounds-section">
            <h4 class="section-label">Starting Wounds</h4>
            <div class="wounds-row">
                <span class="wounds-flat">{homeworld.wounds ?? "—"}</span>
                <span class="wounds-note">Fixed value (no formula)</span>
            </div>
        </div>
    {/if}

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
                <div
                    class="char-cell"
                    class:positive={isPositive(key)}
                    class:negative={isNegative(key)}
                    class:picking={pickingReroll && hasRolled}
                >
                    <span class="char-label">{charNames[key]}</span>

                    {#if isPositive(key)}
                        <span class="hw-tag bonus">+</span>
                    {:else if isNegative(key)}
                        <span class="hw-tag penalty">-</span>
                    {/if}

                    {#if hasRolled}
                        <span
                            class="char-value"
                            class:rerolled={wasRerolled}
                            title={details ? `${details.die1} + ${details.die2} + ${details.base} = ${details.die1 + details.die2 + details.base}` : ""}
                        >
                            {#if oldVal !== undefined}
                                <span class="old-value">{oldVal}</span>
                            {/if}
                            {characteristics[key]}
                        </span>
                        {#if details}
                            <span class="roll-breakdown">{details.die1} + {details.die2} + {details.base}</span>
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

    .hw-tag {
        font-size: 0.55rem;
        font-weight: 700;
        border-radius: 2px;
        padding: 0 3px;
        &.bonus { color: #6c6; background: rgba(102, 204, 102, 0.12); }
        &.penalty { color: #c66; background: rgba(204, 102, 102, 0.12); }
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

    /* Wounds section */
    .wounds-section {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding-bottom: var(--dh2e-space-sm, 0.5rem);
        margin-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-border, #4a4a55);
    }

    .section-label {
        font-family: var(--dh2e-font-header, serif);
        color: var(--dh2e-gold, #c8a84e);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0;
    }

    .wounds-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .wounds-formula {
        font-size: 0.75rem;
        font-family: monospace;
        color: var(--dh2e-gold, #c8a84e);
    }

    .wounds-result {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--dh2e-success, #4a8);
        padding: 2px 8px;
        background: rgba(68, 170, 136, 0.15);
        border-radius: 3px;
    }

    .wounds-flat {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .wounds-note {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .roll-wounds-btn {
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border-color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
        &:hover { background: var(--dh2e-gold, #c8a84e); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .rerolls-exhausted {
        font-size: 0.7rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
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
