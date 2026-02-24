<script lang="ts">
    import type { CreationData, DivinationResult } from "../types.ts";

    let { data, selected = $bindable<DivinationResult | null>(null), maxRerolls = 1 }: {
        data: CreationData;
        selected: DivinationResult | null;
        maxRerolls?: number;
    } = $props();

    const divinations = $derived(data?.divinations ?? []);
    const hasData = $derived(divinations.length > 0);

    let rollValue = $state<number | null>(null);
    let rolled = $state(false);
    let rollCount = $state(0);
    const canReroll = $derived(rollCount > 0 && rollCount <= maxRerolls);
    const rerollsRemaining = $derived(Math.max(0, maxRerolls - rollCount + 1));

    function rollTarot() {
        const roll = Math.floor(Math.random() * 100) + 1;
        rollValue = roll;
        rolled = true;
        rollCount++;

        const result = divinations.find(
            (d: DivinationResult) => roll >= d.roll[0] && roll <= d.roll[1],
        );
        if (result) {
            selected = result;
        }
    }
</script>

<div class="step-content">
    <h3 class="step-title">Divination</h3>
    <p class="step-desc">
        The Emperor's Tarot reveals your fate. Roll to determine your
        character's divination — a permanent blessing or burden.
    </p>

    {#if hasData}
        <div class="tarot-section">
            {#if !rolled}
                <button class="roll-btn" type="button" onclick={rollTarot}>
                    Roll the Emperor's Tarot
                </button>
            {:else if canReroll}
                <button class="roll-btn reroll" type="button" onclick={rollTarot}>
                    Re-roll the Emperor's Tarot ({rerollsRemaining - 1} remaining)
                </button>
            {:else if maxRerolls === 0}
                <p class="no-rerolls">The Emperor's will is absolute.</p>
            {:else}
                <p class="no-rerolls">No re-rolls remaining.</p>
            {/if}

            {#if rolled && selected}
                <div class="tarot-result">
                    <span class="roll-number">{rollValue}</span>
                    <blockquote class="divination-text">"{selected.text}"</blockquote>
                    <p class="divination-effect">{selected.effect}</p>
                </div>
            {/if}
        </div>

        <details class="divination-table">
            <summary>View full divination table</summary>
            <div class="table-content">
                {#each divinations as div}
                    {@const isActive = selected?.text === div.text}
                    <div class="table-row" class:active={isActive}>
                        <span class="table-roll">{div.roll[0]}–{div.roll[1]}</span>
                        <span class="table-text">"{div.text}"</span>
                        <span class="table-effect">{div.effect}</span>
                    </div>
                {/each}
            </div>
        </details>
    {:else}
        <div class="manual-input">
            <p class="hint">Enter divination text manually, or install the dh2e-data module for the divination table.</p>
            <label class="input-field">
                <span class="field-label">Divination Text</span>
                <input
                    type="text"
                    value={selected?.text ?? ""}
                    onchange={(e) => {
                        selected = {
                            roll: [0, 0] as [number, number],
                            text: (e.target as HTMLInputElement).value,
                            effect: "",
                        };
                    }}
                    placeholder="e.g., Trust in your fear"
                />
            </label>
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

    .tarot-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .roll-btn {
        padding: 0.4rem 1.2rem;
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border: 2px solid var(--dh2e-gold, #c8a84e);
        border-radius: 3px;
        font-family: var(--dh2e-font-header, serif);
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;

        &:hover { background: var(--dh2e-gold, #c8a84e); }
    }

    .tarot-result {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        padding: 0.5rem 0.75rem;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-gold-dark, #9c7a28);
        border-radius: 3px;
        width: 100%;
        box-sizing: border-box;
    }

    .roll-number {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--dh2e-gold, #c8a84e);
        font-family: var(--dh2e-font-header, serif);
        line-height: 1;
    }

    .divination-text {
        font-style: italic;
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: 0.85rem;
        text-align: center;
        margin: 0;
        padding: 0 0.5rem;
        border-left: 3px solid var(--dh2e-gold-dark, #9c7a28);
    }

    .divination-effect {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--dh2e-gold, #c8a84e);
        text-align: center;
        margin: 0;
    }

    .no-rerolls {
        font-style: italic;
        font-size: 0.8rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-align: center;
        margin: 0;
    }

    .reroll {
        opacity: 0.85;
    }

    .divination-table {
        margin-top: 0.25rem;

        summary {
            font-size: 0.65rem;
            color: var(--dh2e-text-secondary, #a0a0a8);
            cursor: pointer;
            text-align: center;

            &:hover { color: var(--dh2e-gold, #c8a84e); }
        }
    }

    .table-content {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin-top: 0.3rem;
    }

    .table-row {
        display: grid;
        grid-template-columns: 2.5rem 1fr 1fr;
        gap: 0.3rem;
        padding: 0.15rem 0.25rem;
        font-size: 0.65rem;
        background: var(--dh2e-bg-mid, #2e2e35);

        &:nth-child(even) { background: rgba(46, 46, 53, 0.6); }
        &.active {
            background: rgba(200, 168, 78, 0.15);
            border-left: 2px solid var(--dh2e-gold, #c8a84e);
        }
    }

    .table-roll {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-weight: 600;
    }

    .table-text {
        color: var(--dh2e-text-primary, #d0cfc8);
        font-style: italic;
    }

    .table-effect {
        color: var(--dh2e-text-secondary, #a0a0a8);
    }

    .hint {
        font-style: italic;
        font-size: 0.75rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
    }
    .input-field {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }
    .field-label {
        font-size: 0.65rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
    }
</style>
