<script lang="ts">
    let { members, charKeys, comparison }: {
        members: any[];
        charKeys: string[];
        comparison: Record<string, { value: number; bonus: number; isHighest: boolean }[]>;
    } = $props();

    const CHAR_LABELS: Record<string, string> = {
        ws: "WS", bs: "BS", s: "S", t: "T", ag: "Ag",
        int: "Int", per: "Per", wp: "WP", fel: "Fel",
    };
</script>

<div class="char-comparison">
    <table class="comparison-table">
        <thead>
            <tr>
                <th class="name-col"></th>
                {#each charKeys as key}
                    <th class="char-col">{CHAR_LABELS[key] ?? key}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each members as member, i (member.uuid)}
                <tr>
                    <td class="name-cell">
                        <img class="mini-portrait" src={member.img} alt={member.name} />
                        <span>{member.name}</span>
                    </td>
                    {#each charKeys as key}
                        {@const cell = comparison[key]?.[i]}
                        <td class="char-cell" class:highest={cell?.isHighest}>
                            <span class="char-value">{cell?.value ?? 0}</span>
                            <span class="char-bonus">({cell?.bonus ?? 0})</span>
                        </td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style lang="scss">
    .char-comparison {
        overflow-x: auto;
    }
    .comparison-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;

        th, td {
            padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
            border-bottom: 1px solid var(--dh2e-border);
            text-align: center;
        }
        th {
            font-family: var(--dh2e-font-header);
            color: var(--dh2e-gold);
            text-transform: uppercase;
            font-size: 0.7rem;
            letter-spacing: 0.05em;
        }
    }
    .name-col {
        text-align: left !important;
        min-width: 120px;
    }
    .name-cell {
        text-align: left !important;
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs);
        color: var(--dh2e-text-primary);
    }
    .mini-portrait {
        width: 24px;
        height: 24px;
        border-radius: var(--dh2e-radius-sm);
        border: 1px solid var(--dh2e-border);
        object-fit: cover;
    }
    .char-cell {
        color: var(--dh2e-text-primary);
    }
    .char-value {
        font-weight: bold;
    }
    .char-bonus {
        color: var(--dh2e-text-secondary);
        font-size: 0.7rem;
    }
    .highest {
        color: var(--dh2e-gold-bright);
        background: rgba(180, 149, 69, 0.1);
        .char-value {
            color: var(--dh2e-gold-bright);
        }
    }
</style>
