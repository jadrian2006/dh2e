<script lang="ts">
    let { skill, onRoll }: {
        skill: {
            name: string;
            displayName: string;
            linkedCharacteristic: string;
            advancement: number;
            advancementBonus: number;
            totalTarget: number;
            isTrained: boolean;
        };
        onRoll: () => void;
    } = $props();

    const charAbbrevMap: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };

    const maxPips = 4;
</script>

<button class="skill-row" class:untrained={!skill.isTrained} onclick={onRoll} title="Roll {skill.displayName}">
    <span class="skill-name">{skill.displayName}</span>
    <span class="skill-char">{charAbbrevMap[skill.linkedCharacteristic] ?? skill.linkedCharacteristic}</span>
    <span class="skill-pips">
        {#each Array(maxPips) as _, i}
            <span class="pip" class:filled={i < skill.advancement}></span>
        {/each}
    </span>
    <span class="skill-target">{skill.totalTarget}</span>
</button>

<style lang="scss">
    .skill-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        cursor: pointer;
        border-radius: var(--dh2e-radius-sm, 3px);
        transition: background var(--dh2e-transition-fast, 0.15s);

        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
        }

        &:nth-child(even) {
            background: rgba(255, 255, 255, 0.02);

            &:hover {
                background: var(--dh2e-bg-mid, #2e2e35);
            }
        }

        &.untrained {
            opacity: 0.6;
        }
    }

    .skill-name {
        flex: 1;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .skill-char {
        width: 2rem;
        text-align: center;
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        font-weight: 600;
    }

    .skill-pips {
        display: flex;
        gap: 2px;
    }

    .pip {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        background: transparent;

        &.filled {
            background: var(--dh2e-gold, #c8a84e);
        }
    }

    .skill-target {
        width: 2.5rem;
        text-align: right;
        font-weight: 700;
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold-bright, #e8c84e);
    }
</style>
