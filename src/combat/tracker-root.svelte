<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    interface CombatantEntry {
        id: string;
        name: string;
        img: string;
        initiative: number | null;
        isActive: boolean;
        actionsUsed: { half: boolean; full: boolean; free: boolean; reaction: boolean };
        wounds: { value: number; max: number };
        conditions: { name: string; slug: string; remaining: number }[];
        hasAction: (type: string) => boolean;
        useAction: (type: string) => void;
    }

    const combatants: CombatantEntry[] = $derived(ctx.combatants ?? []);
    const isGM: boolean = $derived(ctx.isGM ?? false);

    function woundPercent(wounds: { value: number; max: number }): number {
        if (wounds.max <= 0) return 100;
        return Math.max(0, Math.min(100, (wounds.value / wounds.max) * 100));
    }

    function woundColor(pct: number): string {
        if (pct > 50) return "var(--dh2e-green, #4a8)";
        if (pct > 25) return "var(--dh2e-gold, #b49545)";
        return "var(--dh2e-red-bright, #d44)";
    }

    async function toggleAction(combatant: CombatantEntry, type: string) {
        await combatant.useAction(type);
    }
</script>

<div class="dh2e-tracker">
    <div class="tracker-header">
        <span class="round-display">Round {ctx.round}</span>
        {#if isGM}
            <div class="tracker-controls">
                <button class="tracker-btn" onclick={() => ctx.rollAll?.()} title="Roll All">
                    <i class="fas fa-dice"></i>
                </button>
                <button class="tracker-btn" onclick={() => ctx.rollNPC?.()} title="Roll NPCs">
                    <i class="fas fa-skull"></i>
                </button>
                <button class="tracker-btn" onclick={() => ctx.resetAll?.()} title="Reset">
                    <i class="fas fa-undo"></i>
                </button>
            </div>
        {/if}
    </div>

    <div class="combatant-list">
        {#each combatants as c (c.id)}
            <div class="combatant-row" class:active={c.isActive}>
                <div class="combatant-init">{c.initiative ?? "—"}</div>
                <img class="combatant-img" src={c.img} alt={c.name} />
                <div class="combatant-info">
                    <span class="combatant-name">{c.name}</span>
                    <div class="wound-bar-container">
                        <div
                            class="wound-bar-fill"
                            style="width: {woundPercent(c.wounds)}%; background: {woundColor(woundPercent(c.wounds))};"
                        ></div>
                        <span class="wound-text">{c.wounds.value}/{c.wounds.max}</span>
                    </div>
                    {#if c.conditions.length > 0}
                        <div class="condition-badges">
                            {#each c.conditions as cond}
                                <span class="condition-badge" title={cond.name}>
                                    {cond.name}{#if cond.remaining > 0} ({cond.remaining}){/if}
                                </span>
                            {/each}
                        </div>
                    {/if}
                </div>
                {#if c.isActive}
                    <div class="action-economy">
                        <button
                            class="action-btn"
                            class:used={c.actionsUsed.half}
                            onclick={() => toggleAction(c, "half")}
                            title="Half Action"
                        >H</button>
                        <button
                            class="action-btn"
                            class:used={c.actionsUsed.full}
                            onclick={() => toggleAction(c, "full")}
                            title="Full Action"
                        >F</button>
                        <button
                            class="action-btn"
                            class:used={c.actionsUsed.free}
                            onclick={() => toggleAction(c, "free")}
                            title="Free Action"
                        >Fr</button>
                        <button
                            class="action-btn"
                            class:used={c.actionsUsed.reaction}
                            onclick={() => toggleAction(c, "reaction")}
                            title="Reaction"
                        >Re</button>
                    </div>
                {/if}
            </div>
        {/each}
    </div>

    <div class="turn-controls">
        <button class="turn-btn" onclick={() => ctx.previousTurn?.()} title="Previous Turn">
            <i class="fas fa-chevron-left"></i>
        </button>
        <button class="turn-btn next" onclick={() => ctx.nextTurn?.()} title="Next Turn">
            <i class="fas fa-chevron-right"></i> Next Turn
        </button>
        <button class="turn-btn" onclick={() => ctx.nextRound?.()} title="Next Round">
            <i class="fas fa-forward"></i>
        </button>
    </div>
</div>

<style lang="scss">
    .dh2e-tracker {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .tracker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-light, #3a3a45);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .round-display {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #b49545);
    }

    .tracker-controls {
        display: flex;
        gap: 2px;
    }

    .tracker-btn {
        width: 1.5rem;
        height: 1.5rem;
        border: none;
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: 0.7rem;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { color: var(--dh2e-text-primary, #d0cfc8); }
    }

    .combatant-list {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .combatant-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xs, 0.25rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        transition: background var(--dh2e-transition-fast, 0.15s);

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
        &.active {
            background: rgba(180, 149, 69, 0.15);
            border-left: 2px solid var(--dh2e-gold, #b49545);
        }
    }

    .combatant-init {
        width: 1.5rem;
        text-align: center;
        font-size: var(--dh2e-text-sm, 0.8rem);
        font-weight: 700;
        color: var(--dh2e-text-primary, #d0cfc8);
        flex-shrink: 0;
    }

    .combatant-img {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid var(--dh2e-border, #4a4a55);
    }

    .combatant-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .combatant-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .wound-bar-container {
        position: relative;
        height: 6px;
        background: var(--dh2e-bg-dark, #1e1e22);
        border-radius: 3px;
        overflow: hidden;
    }

    .wound-bar-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
    }

    .wound-text {
        position: absolute;
        top: -1px;
        right: 2px;
        font-size: 0.5rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        text-shadow: 0 0 2px #000;
        line-height: 8px;
    }

    .condition-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
    }

    .condition-badge {
        font-size: 0.55rem;
        padding: 0 3px;
        background: var(--dh2e-red-dim, #4a2020);
        border-radius: 2px;
        color: var(--dh2e-red-bright, #d44);
        white-space: nowrap;
    }

    .action-economy {
        display: flex;
        gap: 2px;
        flex-shrink: 0;
    }

    .action-btn {
        width: 1.3rem;
        height: 1.3rem;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: 2px;
        background: var(--dh2e-bg-mid, #2e2e35);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-size: 0.55rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { background: var(--dh2e-bg-light, #3a3a45); }
        &.used {
            background: var(--dh2e-red-dim, #4a2020);
            color: var(--dh2e-text-secondary, #a0a0a8);
            text-decoration: line-through;
        }
    }

    .turn-controls {
        display: flex;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding-top: var(--dh2e-space-xs, 0.25rem);
    }

    .turn-btn {
        flex: 0 0 auto;
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: transparent;
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: var(--dh2e-text-xs, 0.7rem);

        &:hover { background: var(--dh2e-bg-light, #3a3a45); }
        &.next {
            flex: 1;
            background: var(--dh2e-gold-muted, #7a6a3e);
            color: var(--dh2e-text-primary, #d0cfc8);
            font-weight: 700;

            &:hover { background: var(--dh2e-gold, #b49545); color: #1e1e22; }
        }
    }
</style>
