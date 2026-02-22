<script lang="ts">
    let { abbreviation, label, value, bonus, onclick }: {
        abbreviation: string;
        label: string;
        value: number;
        bonus: number;
        onclick?: () => void;
    } = $props();
</script>

<button class="char-cell" {onclick} title="Roll {label}">
    <span class="char-abbrev">{abbreviation}</span>
    <span class="char-value">{value}</span>
    <span class="char-bonus">{bonus}</span>
</button>

<style lang="scss">
    .char-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--dh2e-parchment);
        border: 1px solid var(--dh2e-gold-muted);
        border-radius: var(--dh2e-radius-md);
        padding: var(--dh2e-space-sm) var(--dh2e-space-md);
        cursor: pointer;
        transition: all var(--dh2e-transition-fast);
        min-width: 70px;

        &:hover {
            border-color: var(--dh2e-gold);
            box-shadow: 0 0 6px var(--dh2e-gold-dark);
            transform: translateY(-1px);
        }

        &:active {
            transform: translateY(0);
        }
    }

    .char-abbrev {
        font-family: var(--dh2e-font-header);
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-gold-dark);
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.05em;
    }

    .char-value {
        font-size: var(--dh2e-text-xl);
        font-weight: 700;
        color: var(--dh2e-text-dark);
        line-height: 1.2;
    }

    .char-bonus {
        font-size: var(--dh2e-text-sm);
        color: var(--dh2e-text-dark-secondary);
        font-weight: 600;

        &::before {
            content: "B: ";
            font-weight: 400;
        }
    }
</style>
