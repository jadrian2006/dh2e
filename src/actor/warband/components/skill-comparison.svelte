<script lang="ts">
    let { members, skills }: {
        members: any[];
        skills: { name: string; cells: { advancement: number; target: number; isHighest: boolean; trained: boolean }[] }[];
    } = $props();
</script>

<div class="skill-comparison">
    {#if skills.length === 0}
        <p class="empty-msg">No skills found among warband members.</p>
    {:else}
        <table class="skill-table">
            <thead>
                <tr>
                    <th class="skill-name-col">Skill</th>
                    {#each members as member (member.uuid)}
                        <th class="member-col">
                            <img class="mini-portrait" src={member.img} alt={member.name} />
                            <span class="member-label">{member.name}</span>
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each skills as row (row.name)}
                    <tr>
                        <td class="skill-name">{row.name}</td>
                        {#each row.cells as cell, i}
                            <td class="skill-cell" class:highest={cell.isHighest}>
                                {#if cell.trained}
                                    <span class="advancement-pips">
                                        {#each Array(4) as _, p}
                                            <span class="pip" class:filled={p < cell.advancement}></span>
                                        {/each}
                                    </span>
                                    <span class="target-num">{cell.target}</span>
                                {:else}
                                    <span class="untrained">---</span>
                                {/if}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<style lang="scss">
    .skill-comparison {
        overflow-x: auto;
    }
    .empty-msg {
        color: var(--dh2e-text-secondary);
        font-style: italic;
        text-align: center;
        padding: var(--dh2e-space-lg);
    }
    .skill-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.78rem;

        th, td {
            padding: var(--dh2e-space-xs) var(--dh2e-space-sm);
            border-bottom: 1px solid var(--dh2e-border);
        }
        th {
            font-family: var(--dh2e-font-header);
            color: var(--dh2e-gold);
            text-transform: uppercase;
            font-size: 0.68rem;
            letter-spacing: 0.04em;
            text-align: center;
        }
    }
    .skill-name-col {
        text-align: left !important;
        min-width: 140px;
    }
    .member-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }
    .mini-portrait {
        width: 20px;
        height: 20px;
        border-radius: var(--dh2e-radius-sm);
        border: 1px solid var(--dh2e-border);
        object-fit: cover;
    }
    .member-label {
        font-size: 0.6rem;
        max-width: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .skill-name {
        color: var(--dh2e-text-primary);
        text-align: left;
    }
    .skill-cell {
        text-align: center;
        color: var(--dh2e-text-primary);
    }
    .advancement-pips {
        display: inline-flex;
        gap: 2px;
        margin-right: 4px;
    }
    .pip {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        border: 1px solid var(--dh2e-gold-dark);
        background: transparent;
        display: inline-block;

        &.filled {
            background: var(--dh2e-gold);
        }
    }
    .target-num {
        font-weight: bold;
        font-size: 0.75rem;
    }
    .untrained {
        color: var(--dh2e-text-secondary);
        font-size: 0.7rem;
    }
    .highest {
        color: var(--dh2e-gold-bright);
        background: rgba(180, 149, 69, 0.1);
        .target-num {
            color: var(--dh2e-gold-bright);
        }
    }
</style>
