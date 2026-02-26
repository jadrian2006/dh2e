<script lang="ts">
    import { rulesToYaml } from "../rule-element/yaml-editor.ts";

    let {
        rule = $bindable({ key: "FlatModifier" } as Record<string, any>),
        onSave,
        onCancel,
    }: {
        rule: Record<string, any>;
        onSave: (rule: Record<string, any>) => void;
        onCancel: () => void;
    } = $props();

    const RE_TYPES = [
        { key: "FlatModifier", label: "Flat Modifier", desc: "Add a numeric modifier to a domain" },
        { key: "RollOption", label: "Roll Option", desc: "Inject a roll option flag" },
        { key: "DiceOverride", label: "Dice Override", desc: "Modify damage dice (Tearing, Proven)" },
        { key: "AdjustDegree", label: "Adjust Degree", desc: "Adjust degrees of success/failure" },
        { key: "GrantItem", label: "Grant Item", desc: "Auto-grant an item by UUID" },
        { key: "Resistance", label: "Resistance", desc: "Damage reduction by type" },
        { key: "AdjustToughness", label: "Adjust Toughness", desc: "Modify effective TB for soak" },
        { key: "ChoiceSet", label: "Choice Set", desc: "Prompt user to choose from options" },
        { key: "ActorValue", label: "Actor Value", desc: "Dynamic value from actor stats (e.g., half WSB)" },
        { key: "AttributeOverride", label: "Attribute Override", desc: "Swap characteristic for a test domain" },
    ] as const;

    const DICE_MODES = [
        { value: "rerollLowest", label: "Reroll Lowest (Tearing)" },
        { value: "minimumDie", label: "Minimum Die (Proven)" },
        { value: "maximizeDie", label: "Maximize Die (Maximal)" },
    ];

    const DAMAGE_TYPES = ["energy", "impact", "rending", "explosive"];

    const COMMON_DOMAINS = [
        "characteristic:ws", "characteristic:bs", "characteristic:s", "characteristic:t",
        "characteristic:ag", "characteristic:int", "characteristic:per", "characteristic:wp",
        "characteristic:fel", "skill:athletics", "skill:awareness", "skill:stealth",
        "damage:melee", "damage:ranged", "soak:all",
    ];

    // Live preview YAML
    const previewYaml = $derived(() => {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(rule)) {
            if (v !== undefined && v !== "" && v !== null) {
                clean[k] = v;
            }
        }
        return rulesToYaml([clean as any]);
    });

    // Validation
    const validationErrors = $derived(() => {
        const errs: string[] = [];
        if (!rule.key) errs.push("Select a rule element type.");
        switch (rule.key) {
            case "FlatModifier":
                if (!rule.domain) errs.push("Domain is required.");
                if (rule.value === undefined || rule.value === "") errs.push("Value is required.");
                break;
            case "RollOption":
                if (!rule.option) errs.push("Option string is required.");
                break;
            case "DiceOverride":
                if (!rule.domain) errs.push("Domain is required.");
                if (!rule.mode) errs.push("Mode is required.");
                break;
            case "AdjustDegree":
                if (rule.amount === undefined || rule.amount === "") errs.push("Amount is required.");
                break;
            case "GrantItem":
                if (!rule.uuid) errs.push("Item UUID is required.");
                break;
            case "Resistance":
                if (!rule.damageType) errs.push("Damage type is required.");
                break;
            case "AdjustToughness":
                if (rule.value === undefined || rule.value === "") errs.push("Value is required.");
                break;
            case "ChoiceSet":
                if (!rule.flag) errs.push("Flag name is required.");
                break;
            case "ActorValue":
                if (!rule.domain) errs.push("Domain is required.");
                if (!rule.path) errs.push("Actor path is required.");
                break;
            case "AttributeOverride":
                if (!rule.domain) errs.push("Domain is required.");
                if (!rule.characteristic) errs.push("Characteristic is required.");
                break;
        }
        return errs;
    });

    function onTypeChange(e: Event) {
        const newKey = (e.target as HTMLSelectElement).value;
        // Reset to defaults for the new type
        rule = { key: newKey };
    }

    function handleSave() {
        if (validationErrors().length > 0) return;
        // Clean empty fields
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(rule)) {
            if (v !== undefined && v !== "" && v !== null) {
                if (k === "value" || k === "amount") {
                    clean[k] = Number(v);
                } else {
                    clean[k] = v;
                }
            }
        }
        onSave(clean);
    }
</script>

<div class="rule-builder">
    <div class="rb-type-row">
        <label class="rb-label" for="rb-type">Type</label>
        <select id="rb-type" class="rb-select" value={rule.key} onchange={onTypeChange}>
            {#each RE_TYPES as t}
                <option value={t.key}>{t.label}</option>
            {/each}
        </select>
        <span class="rb-desc">{RE_TYPES.find(t => t.key === rule.key)?.desc ?? ""}</span>
    </div>

    <div class="rb-fields">
        {#if rule.key === "FlatModifier"}
            <div class="rb-field">
                <label class="rb-label" for="rb-domain">Domain</label>
                <input id="rb-domain" type="text" class="rb-input" list="domain-list"
                    bind:value={rule.domain} placeholder="characteristic:bs" />
                <datalist id="domain-list">
                    {#each COMMON_DOMAINS as d}<option value={d}></option>{/each}
                </datalist>
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-value">Value</label>
                <input id="rb-value" type="number" class="rb-input rb-narrow"
                    bind:value={rule.value} placeholder="10" />
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-label">Label</label>
                <input id="rb-label" type="text" class="rb-input"
                    bind:value={rule.label} placeholder="Marksman" />
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-source">Source</label>
                <input id="rb-source" type="text" class="rb-input"
                    bind:value={rule.source} placeholder="talent" />
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-excl">Exclusion Group</label>
                <input id="rb-excl" type="text" class="rb-input"
                    bind:value={rule.exclusionGroup} placeholder="" />
            </div>

        {:else if rule.key === "RollOption"}
            <div class="rb-field">
                <label class="rb-label" for="rb-option">Option</label>
                <input id="rb-option" type="text" class="rb-input"
                    bind:value={rule.option} placeholder="self:aim:full" />
            </div>

        {:else if rule.key === "DiceOverride"}
            <div class="rb-field">
                <label class="rb-label" for="rb-domain">Domain</label>
                <input id="rb-domain" type="text" class="rb-input" list="domain-list"
                    bind:value={rule.domain} placeholder="damage:melee" />
                <datalist id="domain-list">
                    {#each COMMON_DOMAINS as d}<option value={d}></option>{/each}
                </datalist>
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-mode">Mode</label>
                <select id="rb-mode" class="rb-select" bind:value={rule.mode}>
                    <option value="">Select...</option>
                    {#each DICE_MODES as m}
                        <option value={m.value}>{m.label}</option>
                    {/each}
                </select>
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-value">Value</label>
                <input id="rb-value" type="number" class="rb-input rb-narrow"
                    bind:value={rule.value} placeholder="0" />
            </div>

        {:else if rule.key === "AdjustDegree"}
            <div class="rb-field">
                <label class="rb-label" for="rb-amount">Amount</label>
                <input id="rb-amount" type="number" class="rb-input rb-narrow"
                    bind:value={rule.amount} placeholder="1" />
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-label">Label</label>
                <input id="rb-label" type="text" class="rb-input"
                    bind:value={rule.label} placeholder="Keen Intuition" />
            </div>

        {:else if rule.key === "GrantItem"}
            <div class="rb-field">
                <label class="rb-label" for="rb-uuid">Item UUID</label>
                <input id="rb-uuid" type="text" class="rb-input"
                    bind:value={rule.uuid} placeholder="Compendium.dh2e-data.talents.aBcDeF1234567890" />
            </div>

        {:else if rule.key === "Resistance"}
            <div class="rb-field">
                <label class="rb-label" for="rb-dtype">Damage Type</label>
                <select id="rb-dtype" class="rb-select" bind:value={rule.damageType}>
                    <option value="">Select...</option>
                    {#each DAMAGE_TYPES as dt}
                        <option value={dt}>{dt}</option>
                    {/each}
                </select>
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-value">Reduction</label>
                <input id="rb-value" type="number" class="rb-input rb-narrow"
                    bind:value={rule.value} placeholder="2" />
            </div>

        {:else if rule.key === "AdjustToughness"}
            <div class="rb-field">
                <label class="rb-label" for="rb-value">TB Adjustment</label>
                <input id="rb-value" type="number" class="rb-input rb-narrow"
                    bind:value={rule.value} placeholder="1" />
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-label">Label</label>
                <input id="rb-label" type="text" class="rb-input"
                    bind:value={rule.label} placeholder="Subskin Armour" />
            </div>

        {:else if rule.key === "ChoiceSet"}
            <div class="rb-field">
                <label class="rb-label" for="rb-flag">Flag Name</label>
                <input id="rb-flag" type="text" class="rb-input"
                    bind:value={rule.flag} placeholder="selectedSkill" />
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-prompt">Prompt</label>
                <input id="rb-prompt" type="text" class="rb-input"
                    bind:value={rule.prompt} placeholder="Choose a skill:" />
            </div>
            <div class="rb-field">
                <label class="rb-label">Choices (comma-separated)</label>
                <input type="text" class="rb-input"
                    value={Array.isArray(rule.choices) ? rule.choices.join(", ") : ""}
                    oninput={(e) => {
                        rule.choices = (e.target as HTMLInputElement).value.split(",").map(s => s.trim()).filter(Boolean);
                    }}
                    placeholder="Athletics, Stealth, Awareness" />
            </div>

        {:else if rule.key === "ActorValue"}
            <div class="rb-field">
                <label class="rb-label" for="rb-domain">Domain</label>
                <input id="rb-domain" type="text" class="rb-input" list="domain-list"
                    bind:value={rule.domain} placeholder="damage:melee" />
                <datalist id="domain-list">
                    {#each COMMON_DOMAINS as d}<option value={d}></option>{/each}
                </datalist>
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-path">Actor Path</label>
                <input id="rb-path" type="text" class="rb-input"
                    bind:value={rule.path} placeholder="system.characteristics.ws.bonus" />
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-transform">Transform</label>
                <select id="rb-transform" class="rb-select" bind:value={rule.transform}>
                    <option value="">identity (raw value)</option>
                    <option value="half-ceil">half-ceil (round up)</option>
                    <option value="half-floor">half-floor (round down)</option>
                    <option value="negate">negate</option>
                </select>
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-label">Label</label>
                <input id="rb-label" type="text" class="rb-input"
                    bind:value={rule.label} placeholder="Crushing Blow" />
            </div>

        {:else if rule.key === "AttributeOverride"}
            <div class="rb-field">
                <label class="rb-label" for="rb-domain">Domain</label>
                <input id="rb-domain" type="text" class="rb-input"
                    bind:value={rule.domain} placeholder="initiative" />
            </div>
            <div class="rb-field">
                <label class="rb-label" for="rb-char">Characteristic</label>
                <select id="rb-char" class="rb-select" bind:value={rule.characteristic}>
                    <option value="">Select...</option>
                    <option value="ws">WS</option>
                    <option value="bs">BS</option>
                    <option value="s">S</option>
                    <option value="t">T</option>
                    <option value="ag">Ag</option>
                    <option value="int">Int</option>
                    <option value="per">Per</option>
                    <option value="wp">WP</option>
                    <option value="fel">Fel</option>
                </select>
            </div>
        {/if}

        <!-- Predicate (universal, optional) -->
        <div class="rb-field">
            <label class="rb-label">Predicate (optional, comma-separated)</label>
            <input type="text" class="rb-input"
                value={Array.isArray(rule.predicate) ? rule.predicate.join(", ") : ""}
                oninput={(e) => {
                    const val = (e.target as HTMLInputElement).value.trim();
                    rule.predicate = val ? val.split(",").map(s => s.trim()).filter(Boolean) : undefined;
                }}
                placeholder="self:aim:full, target:within:30" />
        </div>
    </div>

    <!-- YAML Preview -->
    <div class="rb-preview">
        <span class="rb-preview-label">YAML Preview</span>
        <pre class="rb-yaml">{previewYaml()}</pre>
    </div>

    <!-- Validation errors -->
    {#if validationErrors().length > 0}
        <div class="rb-errors">
            {#each validationErrors() as err}
                <span class="rb-error"><i class="fas fa-exclamation-triangle"></i> {err}</span>
            {/each}
        </div>
    {/if}

    <!-- Actions -->
    <div class="rb-actions">
        <button class="btn-add" onclick={handleSave} disabled={validationErrors().length > 0}>
            <i class="fas fa-plus"></i> Add Rule Element
        </button>
        <button class="btn-cancel" onclick={onCancel}>Cancel</button>
    </div>
</div>

<style lang="scss">
    .rule-builder {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-sm, 0.5rem);
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-dark, #1a1a20);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
    }

    .rb-type-row {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
        flex-wrap: wrap;
    }

    .rb-desc {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-style: italic;
    }

    .rb-fields {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xs, 0.25rem);
    }

    .rb-field {
        display: flex;
        align-items: center;
        gap: var(--dh2e-space-sm, 0.5rem);
    }

    .rb-label {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-gold, #c8a84e);
        font-weight: 600;
        min-width: 7rem;
        text-align: right;
    }

    .rb-input, .rb-select {
        flex: 1;
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-darkest, #111114);
        color: var(--dh2e-text-primary, #d0cfc8);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-family: inherit;

        &:focus {
            outline: none;
            border-color: var(--dh2e-gold-muted, #8a7a3e);
        }
    }

    .rb-narrow { max-width: 5rem; flex: 0 0 5rem; }

    .rb-preview {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .rb-preview-label {
        font-size: 0.6rem;
        color: var(--dh2e-text-secondary, #a0a0a8);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .rb-yaml {
        padding: var(--dh2e-space-sm, 0.5rem);
        background: var(--dh2e-bg-darkest, #111114);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        font-family: "Fira Code", "Consolas", monospace;
        font-size: 0.7rem;
        color: var(--dh2e-text-primary, #d0cfc8);
        white-space: pre-wrap;
        max-height: 120px;
        overflow-y: auto;
        margin: 0;
    }

    .rb-errors {
        display: flex;
        flex-direction: column;
        gap: var(--dh2e-space-xxs, 0.125rem);
    }

    .rb-error {
        font-size: var(--dh2e-text-xs, 0.7rem);
        color: var(--dh2e-red-bright, #d44);
        i { margin-right: 0.3em; }
    }

    .rb-actions {
        display: flex;
        gap: var(--dh2e-space-sm, 0.5rem);
        justify-content: flex-end;
    }

    .btn-add {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-md, 0.75rem);
        background: var(--dh2e-gold-dark, #9c7a28);
        border: 1px solid var(--dh2e-gold, #c8a84e);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-bg-darkest, #111114);
        font-size: var(--dh2e-text-xs, 0.7rem);
        font-weight: 700;
        cursor: pointer;

        &:hover { background: var(--dh2e-gold, #c8a84e); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-cancel {
        padding: var(--dh2e-space-xxs, 0.125rem) var(--dh2e-space-md, 0.75rem);
        background: transparent;
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-secondary, #a0a0a8);
        font-size: var(--dh2e-text-xs, 0.7rem);
        cursor: pointer;

        &:hover { background: var(--dh2e-bg-mid, #2e2e35); }
    }
</style>
