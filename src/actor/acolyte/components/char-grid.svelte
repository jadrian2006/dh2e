<script lang="ts">
    let { abbreviation, label, value, bonus, onclick }: {
        abbreviation: string;
        label: string;
        value: number;
        bonus: number;
        onclick?: (e: MouseEvent) => void;
    } = $props();
</script>

<button class="char-cell" {onclick} title="Roll {label}">
    <span class="char-label">{label}</span>
    <span class="char-abbrev">{abbreviation}</span>
    <span class="char-value">{value}</span>
    <span class="char-bonus">B: {bonus}</span>
</button>

<style lang="scss">
    .char-cell {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 1px;
        background: var(--dh2e-parchment);
        border: 1px solid var(--dh2e-gold-dark);
        border-radius: var(--dh2e-radius-md);
        padding: 4px 6px;
        cursor: pointer;
        transition: all var(--dh2e-transition-fast);
        min-width: 0;
        height: auto !important;
        min-height: 72px !important;

        &:hover {
            border-color: var(--dh2e-gold);
            box-shadow: 0 0 6px var(--dh2e-gold-dark);
            transform: translateY(-1px);
        }

        &:active {
            transform: translateY(0);
        }
    }

    .char-label {
        font-size: 0.55rem;
        color: var(--dh2e-text-dark-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        line-height: 1;
    }

    .char-abbrev {
        font-family: var(--dh2e-font-header);
        font-size: 0.75rem;
        color: var(--dh2e-gold-dark);
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.05em;
        line-height: 1;
    }

    .char-value {
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--dh2e-text-dark);
        line-height: 1;
    }

    .char-bonus {
        font-size: 0.6rem;
        color: var(--dh2e-text-dark-secondary);
        font-weight: 600;
        line-height: 1;
    }
</style>
