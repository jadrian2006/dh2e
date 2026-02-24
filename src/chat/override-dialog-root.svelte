<script lang="ts">
    let { ctx }: { ctx: Record<string, any> } = $props();

    interface ActionEntry {
        id: string;
        label: string;
        icon: string;
        needsInput?: boolean;
        inputLabel?: string;
        currentValue?: number;
    }

    const actions: ActionEntry[] = $derived(ctx.actions ?? []);

    /** Track which action has its input expanded */
    let expandedAction: string | null = $state(null);
    let inputValue: number = $state(0);

    function handleClick(action: ActionEntry) {
        if (action.needsInput) {
            expandedAction = action.id;
            inputValue = action.currentValue ?? 0;
        } else {
            ctx.onAction?.(action.id);
        }
    }

    function submitInput(actionId: string) {
        ctx.onAction?.(actionId, inputValue);
    }

    function cancelInput() {
        expandedAction = null;
    }
</script>

<div class="override-dialog">
    <div class="override-header">
        <span class="type-badge">{ctx.msgType}</span>
    </div>

    <div class="action-list">
        {#each actions as action}
            {#if expandedAction === action.id}
                <div class="input-prompt">
                    <label class="input-label">{action.inputLabel ?? action.label}</label>
                    <div class="input-row">
                        <input
                            type="number"
                            class="input-field"
                            bind:value={inputValue}
                            onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter") submitInput(action.id); }}
                        />
                        <button class="confirm-btn" onclick={() => submitInput(action.id)}>
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <button class="cancel-input-btn" onclick={cancelInput}>
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <span class="input-hint">
                        {#if action.id === "adjust-dos"}
                            Positive = DoS, negative = DoF
                        {:else if action.id === "change-severity"}
                            1-10 severity level
                        {:else}
                            New value
                        {/if}
                    </span>
                </div>
            {:else}
                <button
                    class="action-btn"
                    onclick={() => handleClick(action)}
                    disabled={expandedAction !== null}
                >
                    <i class={action.icon}></i>
                    <span>{action.label}</span>
                    {#if action.needsInput && action.currentValue !== undefined}
                        <span class="current-value">(current: {action.currentValue})</span>
                    {/if}
                </button>
            {/if}
        {/each}
    </div>

    <div class="dialog-footer">
        <button class="btn-cancel" onclick={() => ctx.onCancel?.()}>Cancel</button>
    </div>
</div>

<style lang="scss">
    .override-dialog {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-md, 0.75rem);
        padding: var(--dh2e-space-md, 0.75rem);
    }

    .override-header {
        text-align: center;
    }

    .type-badge {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .action-list {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .action-btn {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: transparent;
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);
        text-align: left;
        transition: background var(--dh2e-transition-fast, 0.15s);

        &:hover:not(:disabled) {
            background: var(--dh2e-bg-light, #3a3a45);
            border-color: var(--dh2e-gold-muted, #7a6a3e);
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        i {
            width: 1rem;
            text-align: center;
            color: var(--dh2e-gold-muted, #7a6a3e);
        }
    }

    .current-value {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        margin-left: auto;
    }

    .input-prompt {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        border: 1px solid var(--dh2e-gold-muted, #7a6a3e);
        border-radius: var(--dh2e-radius-sm, 3px);
        background: var(--dh2e-bg-light, #3a3a45);
    }

    .input-label {
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #b49545);
        font-weight: 600;
    }

    .input-row {
        display: flex;
        gap: var(--dh2e-space-xs, 0.25rem);
        align-items: center;
    }

    .input-field {
        flex: 1;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-sm, 0.5rem);
        font-size: var(--dh2e-text-sm, 0.8rem);
        text-align: center;

        &:focus {
            border-color: var(--dh2e-gold-muted, #7a6a3e);
            outline: none;
        }
    }

    .confirm-btn {
        width: 2rem;
        height: 2rem;
        background: var(--dh2e-gold-dark, #6a5a2e);
        border: 1px solid var(--dh2e-gold, #b49545);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { background: var(--dh2e-gold, #b49545); color: var(--dh2e-bg-darkest, #1a1a20); }
    }

    .cancel-input-btn {
        width: 2rem;
        height: 2rem;
        background: transparent;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { border-color: var(--dh2e-text-secondary, #a0a0a8); }
    }

    .input-hint {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
    }

    .btn-cancel {
        padding: var(--dh2e-space-xs, 0.25rem) var(--dh2e-space-md, 0.75rem);
        background: transparent;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        cursor: pointer;
        font-size: var(--dh2e-text-sm, 0.8rem);

        &:hover { background: var(--dh2e-bg-light, #3a3a45); }
    }
</style>
