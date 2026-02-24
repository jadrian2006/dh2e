<script lang="ts">
    import { rulesToYaml, yamlToRules, validateRules, YAML_TEMPLATE } from "./yaml-editor.ts";
    import RuleBuilder from "../rule-builder/rule-builder.svelte";

    let {
        rules = [],
        item,
        editable = false,
    }: {
        rules: any[];
        item: any;
        editable: boolean;
    } = $props();

    let editing = $state(false);
    let showBuilder = $state(false);
    let builderRule: Record<string, any> = $state({ key: "FlatModifier" });
    let yamlText = $state("");
    let errors: string[] = $state([]);
    let saved = $state(false);

    // Derive display YAML from rules prop
    const displayYaml = $derived(rulesToYaml(rules ?? []));
    const ruleCount = $derived((rules ?? []).length);

    function startEditing() {
        yamlText = displayYaml;
        errors = [];
        saved = false;
        editing = true;
    }

    function cancelEditing() {
        editing = false;
        errors = [];
    }

    async function saveRules() {
        errors = [];
        saved = false;

        try {
            const parsed = yamlToRules(yamlText);
            const validationErrors = validateRules(parsed);

            if (validationErrors.length > 0) {
                errors = validationErrors;
                return;
            }

            // Save to the item's system.rules field
            await item.update({ "system.rules": parsed });
            editing = false;
            saved = true;

            // Flash the saved indicator
            setTimeout(() => { saved = false; }, 2000);
        } catch (e: any) {
            errors = [e.message || "Invalid YAML syntax."];
        }
    }

    function openBuilder() {
        builderRule = { key: "FlatModifier" };
        showBuilder = true;
    }

    async function onBuilderSave(newRule: Record<string, any>) {
        const current = rules ? [...rules] : [];
        current.push(newRule as any);
        await item.update({ "system.rules": current });
        showBuilder = false;
        saved = true;
        setTimeout(() => { saved = false; }, 2000);
    }

    function handleKeydown(event: KeyboardEvent) {
        // Ctrl+S / Cmd+S to save
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
            event.preventDefault();
            saveRules();
        }
        // Escape to cancel
        if (event.key === "Escape") {
            cancelEditing();
        }
        // Tab to insert spaces
        if (event.key === "Tab") {
            event.preventDefault();
            const target = event.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            yamlText = yamlText.substring(0, start) + "  " + yamlText.substring(end);
            // Restore cursor position after Svelte updates
            requestAnimationFrame(() => {
                target.selectionStart = target.selectionEnd = start + 2;
            });
        }
    }
</script>

<div class="re-editor">
    <div class="re-header">
        <h3 class="section-title">
            Rule Elements
            {#if ruleCount > 0}
                <span class="rule-count">({ruleCount})</span>
            {/if}
        </h3>
        {#if editable && !editing && !showBuilder}
            <button class="edit-btn" onclick={startEditing} title="Edit Rule Elements (YAML)">
                <i class="fas fa-code"></i> YAML
            </button>
            <button class="edit-btn visual-btn" onclick={openBuilder} title="Add rule element visually">
                <i class="fas fa-wand-magic-sparkles"></i> Visual
            </button>
        {/if}
        {#if saved}
            <span class="saved-indicator">Saved</span>
        {/if}
    </div>

    {#if editing}
        <div class="editor-container">
            <div class="editor-toolbar">
                <span class="toolbar-hint">YAML format &middot; Ctrl+S to save &middot; Esc to cancel</span>
            </div>
            <textarea
                class="yaml-textarea"
                class:has-errors={errors.length > 0}
                bind:value={yamlText}
                onkeydown={handleKeydown}
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                placeholder={YAML_TEMPLATE}
            ></textarea>
            {#if errors.length > 0}
                <div class="error-list">
                    {#each errors as error}
                        <div class="error-item">
                            <i class="fas fa-exclamation-triangle"></i>
                            {error}
                        </div>
                    {/each}
                </div>
            {/if}
            <div class="editor-actions">
                <button class="btn-save" onclick={saveRules}>
                    <i class="fas fa-save"></i> Save
                </button>
                <button class="btn-cancel" onclick={cancelEditing}>
                    Cancel
                </button>
            </div>
        </div>
    {:else if ruleCount > 0}
        <div class="rules-display">
            {#each rules as rule, i}
                <div class="rule-chip" title={JSON.stringify(rule, null, 2)}>
                    <span class="rule-key">{rule.key}</span>
                    {#if rule.label}
                        <span class="rule-label">{rule.label}</span>
                    {:else if rule.domain}
                        <span class="rule-label">{rule.domain}</span>
                    {:else if rule.option}
                        <span class="rule-label">{rule.option}</span>
                    {/if}
                    {#if rule.value !== undefined}
                        <span class="rule-value"
                            class:positive={typeof rule.value === "number" && rule.value > 0}
                            class:negative={typeof rule.value === "number" && rule.value < 0}
                        >
                            {typeof rule.value === "number" && rule.value > 0 ? "+" : ""}{rule.value}
                        </span>
                    {/if}
                </div>
            {/each}
        </div>
    {:else if editable}
        <p class="empty-rules">No rule elements. Click YAML or Visual to add effects.</p>
    {/if}

    {#if showBuilder}
        <RuleBuilder
            bind:rule={builderRule}
            onSave={onBuilderSave}
            onCancel={() => { showBuilder = false; }}
        />
    {/if}
</div>

<style lang="scss">
    .re-editor {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .re-header {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .section-title {
        font-family: var(--dh2e-font-header, serif);
        font-size: var(--dh2e-text-sm, 0.8rem);
        color: var(--dh2e-gold, #c8a84e);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding-bottom: var(--dh2e-space-xs, 0.25rem);
        border-bottom: 1px solid var(--dh2e-gold-muted, #8a7a3e);
        margin: 0;
        flex: 1;
    }

    .rule-count {
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-weight: normal;
        font-size: var(--dh2e-text-xs, 0.7rem);
    }

    .edit-btn {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;
        white-space: nowrap;

        &:hover {
            background: var(--dh2e-gold-dark, #9c7a28);
            color: var(--dh2e-bg-darkest, #111114);
            border-color: var(--dh2e-gold, #c8a84e);
        }
    }

    .visual-btn {
        background: var(--dh2e-gold-dark, #9c7a28);
        color: var(--dh2e-bg-darkest, #111114);
        border-color: var(--dh2e-gold, #c8a84e);

        &:hover {
            background: var(--dh2e-gold, #c8a84e);
        }
    }

    .saved-indicator {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: #6c6;
        animation: fade-out 2s ease-out forwards;
    }

    @keyframes fade-out {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
    }

    .editor-container {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .editor-toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    .toolbar-hint {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .yaml-textarea {
        width: 100%;
        min-height: 180px;
        max-height: 400px;
        resize: vertical;
        font-family: "Fira Code", "Cascadia Code", "JetBrains Mono", "Consolas", monospace;
        font-size: 0.75rem;
        line-height: 1.5;
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-darkest, #111114);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        tab-size: 2;
        white-space: pre;
        overflow-wrap: normal;
        overflow-x: auto;

        &:focus {
            outline: none;
            border-color: var(--dh2e-gold-muted, #8a7a3e);
        }

        &.has-errors {
            border-color: var(--dh2e-red-bright, #d44);
        }
    }

    .error-list {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .error-item {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-red-bright, #d44);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: rgba(221, 68, 68, 0.1);
        border-radius: var(--dh2e-radius-sm, 3px);

        i { margin-right: 0.3em; }
    }

    .editor-actions {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        justify-content: flex-end;
    }

    .btn-save {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-gold-dark, #9c7a28);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-bg-darkest, #111114);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        cursor: pointer;

        &:hover {
            background: var(--dh2e-gold, #c8a84e);
        }
    }

    .btn-cancel {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-md, 0.75rem);
        background: transparent;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;

        &:hover {
            background: var(--dh2e-bg-mid, #2e2e35);
        }
    }

    .rules-display {
        display: flex;
        flex-wrap: wrap;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .rule-chip {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-xs, 0.25rem);
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: default;

        &:hover {
            border-color: var(--dh2e-gold-muted, #8a7a3e);
        }
    }

    .rule-key {
        color: var(--dh2e-gold, #c8a84e);
        font-weight: 700;
        font-family: "Fira Code", "Consolas", monospace;
        font-size: 0.65rem;
    }

    .rule-label {
        color: var(--dh2e-text-primary, #d0cfc8);
    }

    .rule-value {
        font-weight: 700;
        font-family: "Fira Code", "Consolas", monospace;

        &.positive { color: #6c6; }
        &.negative { color: #c66; }
    }

    .empty-rules {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
        margin: 0;
    }
</style>
