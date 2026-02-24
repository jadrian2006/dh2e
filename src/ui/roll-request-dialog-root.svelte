<script lang="ts">
    import type { RollRequestPlayerEntry, RollRequestPayload } from "./roll-request-dialog.ts";
    import type { CharacteristicAbbrev } from "@actor/types.ts";

    let { ctx }: { ctx: Record<string, any> } = $props();

    const CHARACTERISTICS: { value: CharacteristicAbbrev; label: string }[] = [
        { value: "ws", label: "DH2E.Characteristic.WeaponSkill" },
        { value: "bs", label: "DH2E.Characteristic.BallisticSkill" },
        { value: "s", label: "DH2E.Characteristic.Strength" },
        { value: "t", label: "DH2E.Characteristic.Toughness" },
        { value: "ag", label: "DH2E.Characteristic.Agility" },
        { value: "int", label: "DH2E.Characteristic.Intelligence" },
        { value: "per", label: "DH2E.Characteristic.Perception" },
        { value: "wp", label: "DH2E.Characteristic.Willpower" },
        { value: "fel", label: "DH2E.Characteristic.Fellowship" },
    ];

    const players: RollRequestPlayerEntry[] = $derived(ctx.players ?? []);
    const hasPlayers = $derived(players.length > 0);

    let selected: Record<string, boolean> = $state({});
    let testType: "characteristic" | "skill" = $state("characteristic");
    let characteristic: CharacteristicAbbrev = $state("ws");
    let skillName = $state("");
    let dosThreshold = $state(0);
    let modifier = $state(0);

    // Select all players by default
    $effect(() => {
        const sel: Record<string, boolean> = {};
        for (const p of players) sel[p.userId] = true;
        selected = sel;
    });

    const selectedIds = $derived(
        Object.entries(selected)
            .filter(([, v]) => v)
            .map(([k]) => k),
    );

    const testLabel = $derived(
        testType === "characteristic"
            ? `${game.i18n.localize(CHARACTERISTICS.find(c => c.value === characteristic)?.label ?? "")} Test`
            : `${skillName} Test`,
    );

    const canSend = $derived(
        selectedIds.length > 0 &&
        (testType === "characteristic" || skillName.trim().length > 0),
    );

    function doSend() {
        if (!canSend) return;
        const payload: RollRequestPayload = {
            targetUserIds: selectedIds,
            testLabel,
            ...(testType === "characteristic" ? { characteristic } : { skillName: skillName.trim() }),
            ...(dosThreshold > 0 ? { dosThreshold } : {}),
            ...(modifier !== 0 ? { modifier } : {}),
        };
        ctx.onSend?.(payload);
    }
</script>

<div class="roll-request-dialog">
    {#if !hasPlayers}
        <p class="no-players">{game.i18n.localize("DH2E.XP.Award.NoPlayers")}</p>
    {:else}
        <!-- Test Type -->
        <div class="field-row">
            <label class="field-label">{game.i18n.localize("DH2E.Request.TestType")}</label>
            <div class="test-type-row">
                <label class="radio-label">
                    <input type="radio" name="test-type" value="characteristic" bind:group={testType} />
                    {game.i18n.localize("DH2E.Advancement.Characteristics")}
                </label>
                <label class="radio-label">
                    <input type="radio" name="test-type" value="skill" bind:group={testType} />
                    {game.i18n.localize("DH2E.Advancement.Skills")}
                </label>
            </div>
        </div>

        {#if testType === "characteristic"}
            <div class="field-row">
                <select bind:value={characteristic}>
                    {#each CHARACTERISTICS as char (char.value)}
                        <option value={char.value}>{game.i18n.localize(char.label)}</option>
                    {/each}
                </select>
            </div>
        {:else}
            <div class="field-row">
                <input type="text" bind:value={skillName} placeholder="Skill name..." />
            </div>
        {/if}

        <!-- Threshold + Modifier -->
        <div class="field-pair">
            <div class="field-row">
                <label class="field-label" for="rr-threshold">{game.i18n.localize("DH2E.Request.DoSThreshold")}</label>
                <input id="rr-threshold" type="number" min="0" bind:value={dosThreshold} />
            </div>
            <div class="field-row">
                <label class="field-label" for="rr-modifier">{game.i18n.localize("DH2E.Request.Modifier")}</label>
                <input id="rr-modifier" type="number" bind:value={modifier} />
            </div>
        </div>

        <!-- Recipients -->
        <div class="field-row">
            <span class="field-label">{game.i18n.localize("DH2E.Request.Recipients")}</span>
            <div class="player-list">
                {#each players as player (player.userId)}
                    <label class="player-row">
                        <input
                            type="checkbox"
                            checked={selected[player.userId] ?? false}
                            onchange={(e) => { selected[player.userId] = e.currentTarget.checked; }}
                        />
                        <span class="player-name">{player.userName}</span>
                    </label>
                {/each}
            </div>
        </div>

        <!-- Send button -->
        <button class="send-btn" disabled={!canSend} onclick={doSend}>
            {game.i18n.localize("DH2E.Request.Send")}
        </button>
    {/if}
</div>

<style lang="scss">
    .roll-request-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .no-players {
        text-align: center;
        color: var(--dh2e-text-secondary, #a0a0a8);
        padding: var(--dh2e-space-lg, 1rem);
    }

    .field-row {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .field-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
    }

    .test-type-row {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);
    }

    .radio-label {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xxs, 0.125rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
    }

    .field-pair {
        display: flex;
        gap: var(--dh2e-space-md, 0.75rem);

        .field-row {
            flex: 1;
        }
    }

    select,
    input[type="number"],
    input[type="text"] {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:focus {
            border-color: var(--dh2e-gold, #c8a84e);
            outline: none;
        }
    }

    .player-list {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
        max-height: 160px;
        overflow-y: auto;
    }

    .player-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-xs, 0.25rem);
        border-radius: var(--dh2e-radius-sm, 3px);
        cursor: pointer;

        &:hover {
            background: rgba(255, 255, 255, 0.03);
        }
    }

    .player-name {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-text-primary, #d0cfc8);
        font-weight: 600;
    }

    .send-btn {
        padding: var(--dh2e-space-sm, 0.5rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #0d0d12);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-family: var(--dh2e-font-header, serif);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;

        &:hover:not(:disabled) {
            background: var(--dh2e-gold, #c8a84e);
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }
</style>
