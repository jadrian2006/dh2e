<script lang="ts">
    import { consumeCombatAction, getCombatantForActor } from "@combat/combat-state.ts";
    import { AttackResolver } from "@combat/attack.ts";

    let {
        actor,
        actions = { half: false, full: false, free: false, reaction: false },
        combatant,
    }: {
        actor: any;
        actions: Record<string, boolean>;
        combatant: any;
    } = $props();

    const movement = $derived(actor?.system?.movement ?? { half: 0, full: 0, charge: 0, run: 0 });

    // Derive actor roll options for talent-gated buttons
    const actorRollOptions = $derived((actor as any)?.synthetics?.rollOptions as Set<string> | undefined);
    const hasSwiftAttack = $derived(actorRollOptions?.has("talent:swift-attack") ?? false);
    const hasLightningAttack = $derived(actorRollOptions?.has("talent:lightning-attack") ?? false);
    const hasFrenzy = $derived(actorRollOptions?.has("talent:frenzy") ?? false);
    const isFrenzied = $derived(actorRollOptions?.has("self:frenzied") ?? false);

    interface QuickButton {
        label: string;
        icon: string;
        actionType: "half" | "full" | "reaction";
        group: "movement" | "combat" | "reaction" | "melee" | "frenzy";
        effect?: string;
        visible?: boolean;
    }

    const quickButtons: QuickButton[] = [
        // Movement
        { label: "Half Move", icon: "fa-solid fa-shoe-prints", actionType: "half", group: "movement" },
        { label: "Full Move", icon: "fa-solid fa-person-walking", actionType: "full", group: "movement" },
        { label: "Run", icon: "fa-solid fa-bolt-lightning", actionType: "full", group: "movement", effect: "running" },
        // Combat
        { label: "Aim", icon: "fa-solid fa-bullseye", actionType: "half", group: "combat" },
        { label: "All Out", icon: "fa-solid fa-burst", actionType: "full", group: "combat", effect: "all-out-attack" },
        { label: "Overwatch", icon: "fa-solid fa-eye", actionType: "half", group: "combat" },
        // Reactions
        { label: "Dodge", icon: "fa-solid fa-shield", actionType: "reaction", group: "reaction" },
        { label: "Parry", icon: "fa-solid fa-swords", actionType: "reaction", group: "reaction" },
    ];

    // Dynamic melee multi-attack buttons (talent-gated)
    const meleeButtons = $derived.by(() => {
        const btns: QuickButton[] = [];
        if (hasSwiftAttack) {
            btns.push({
                label: game.i18n?.localize("DH2E.Attack.SwiftAttack") ?? "Swift Attack",
                icon: "fa-solid fa-wind",
                actionType: "full",
                group: "melee",
            });
        }
        if (hasLightningAttack) {
            btns.push({
                label: game.i18n?.localize("DH2E.Attack.LightningAttack") ?? "Lightning Attack",
                icon: "fa-solid fa-bolt",
                actionType: "full",
                group: "melee",
            });
        }
        return btns;
    });

    function isUsed(actionType: string): boolean {
        if (actionType === "half") return actions.half || actions.full;
        if (actionType === "full") return actions.full || actions.half;
        if (actionType === "reaction") return actions.reaction;
        return false;
    }

    function getMoveDistance(btn: QuickButton): string {
        if (btn.group !== "movement") return "";
        if (btn.label === "Half Move") return `${movement.half}m`;
        if (btn.label === "Full Move") return `${movement.full}m`;
        if (btn.label === "Run") return `${movement.run}m`;
        return "";
    }

    async function doQuickAction(btn: QuickButton) {
        if (!combatant?.useAction) return;

        // Consume the action
        await consumeCombatAction(actor?.id, btn.actionType);

        // Apply turn effects (e.g. "running", "all-out-attack")
        if (btn.effect) {
            await combatant.addTurnEffect(btn.effect);
        }

        // Build chat message
        const dist = getMoveDistance(btn);
        const distSuffix = dist ? ` (${dist})` : "";
        const content = `<div class="dh2e-action-msg"><strong>${actor?.name ?? "?"}</strong> uses <em>${btn.label}</em>${distSuffix}.</div>`;

        await ChatMessage.create({
            content,
            speaker: ChatMessage.getSpeaker({ actor }),
            type: CONST.CHAT_MESSAGE_STYLES.EMOTE,
        });
    }

    /** Trigger a melee multi-attack (Swift/Lightning) on equipped melee weapon */
    async function doMeleeMultiAttack(mode: "swift" | "lightning") {
        if (!actor) return;
        // Find first equipped melee weapon
        const weapon = actor.items?.find(
            (i: Item) => i.type === "weapon" && (i.system as any)?.class === "melee" && (i.system as any)?.equipped,
        );
        if (!weapon) {
            ui.notifications.warn(game.i18n?.localize("DH2E.Attack.NoMeleeWeapon") ?? "No equipped melee weapon.");
            return;
        }
        await AttackResolver.resolve({
            actor,
            weapon,
            fireMode: "single",
            meleeMode: mode,
        });
    }

    /** Toggle frenzy condition on the actor */
    async function toggleFrenzy() {
        if (!actor) return;
        if (isFrenzied) {
            // Remove frenzied condition
            const condition = actor.items?.find(
                (i: Item) => i.type === "condition" && (i.system as any)?.slug === "frenzied",
            );
            if (condition) {
                await actor.deleteEmbeddedDocuments("Item", [condition.id!]);
            }
            const content = `<div class="dh2e-action-msg"><strong>${actor.name}</strong> ${game.i18n?.localize("DH2E.Frenzy.End") ?? "ends Frenzy"}.</div>`;
            await ChatMessage.create({
                content,
                speaker: ChatMessage.getSpeaker({ actor }),
                type: CONST.CHAT_MESSAGE_STYLES.EMOTE,
            });
        } else {
            // Consume Full Action to enter frenzy
            await consumeCombatAction(actor.id, "full");
            // Create frenzied condition from static data
            const conditionData = (game as any).dh2e?.conditions?.find?.((c: any) => c.system?.slug === "frenzied")
                ?? {
                    name: "Frenzied",
                    type: "condition",
                    img: "systems/dh2e/icons/conditions/frenzied.svg",
                    system: { slug: "frenzied", rules: [] },
                };
            await actor.createEmbeddedDocuments("Item", [conditionData]);
            const content = `<div class="dh2e-action-msg"><strong>${actor.name}</strong> ${game.i18n?.localize("DH2E.Frenzy.Enter") ?? "enters a Frenzy"}! <em>${game.i18n?.localize("DH2E.Frenzy.MustAttack") ?? "Must attack nearest enemy!"}</em></div>`;
            await ChatMessage.create({
                content,
                speaker: ChatMessage.getSpeaker({ actor }),
                type: CONST.CHAT_MESSAGE_STYLES.EMOTE,
            });
        }
    }
</script>

<div class="quick-actions">
    <div class="qa-group">
        <span class="qa-group-label">Move</span>
        <div class="qa-row">
            {#each quickButtons.filter(b => b.group === "movement") as btn}
                {@const dist = getMoveDistance(btn)}
                <button
                    class="quick-btn"
                    class:used={isUsed(btn.actionType)}
                    onclick={() => doQuickAction(btn)}
                    title="{btn.label}{dist ? ` — ${dist}` : ''}"
                >
                    <i class={btn.icon}></i>
                    <span class="qa-label">{btn.label}</span>
                    {#if dist}
                        <span class="qa-dist">{dist}</span>
                    {/if}
                </button>
            {/each}
        </div>
    </div>
    <div class="qa-group">
        <span class="qa-group-label">Actions</span>
        <div class="qa-row">
            {#each quickButtons.filter(b => b.group === "combat") as btn}
                <button
                    class="quick-btn"
                    class:used={isUsed(btn.actionType)}
                    onclick={() => doQuickAction(btn)}
                    title={btn.label}
                >
                    <i class={btn.icon}></i>
                    <span class="qa-label">{btn.label}</span>
                </button>
            {/each}
        </div>
    </div>

    {#if meleeButtons.length > 0}
    <div class="qa-group">
        <span class="qa-group-label">Melee</span>
        <div class="qa-row">
            {#each meleeButtons as btn}
                <button
                    class="quick-btn"
                    class:used={isUsed(btn.actionType)}
                    onclick={() => doMeleeMultiAttack(btn.label.includes("Lightning") ? "lightning" : "swift")}
                    title={btn.label}
                >
                    <i class={btn.icon}></i>
                    <span class="qa-label">{btn.label}</span>
                </button>
            {/each}
        </div>
    </div>
    {/if}

    {#if hasFrenzy}
    <div class="qa-group">
        <span class="qa-group-label">Frenzy</span>
        <div class="qa-row">
            <button
                class="quick-btn"
                class:active={isFrenzied}
                class:used={!isFrenzied && isUsed("full")}
                onclick={toggleFrenzy}
                title={isFrenzied
                    ? (game.i18n?.localize("DH2E.Frenzy.End") ?? "End Frenzy")
                    : (game.i18n?.localize("DH2E.Frenzy.Enter") ?? "Enter Frenzy")}
            >
                <i class="fa-solid fa-fire"></i>
                <span class="qa-label">{isFrenzied
                    ? (game.i18n?.localize("DH2E.Frenzy.End") ?? "End Frenzy")
                    : (game.i18n?.localize("DH2E.Frenzy.Enter") ?? "Enter Frenzy")}</span>
            </button>
        </div>
    </div>
    {/if}

    <div class="qa-group">
        <span class="qa-group-label">React</span>
        <div class="qa-row">
            {#each quickButtons.filter(b => b.group === "reaction") as btn}
                <button
                    class="quick-btn"
                    class:used={isUsed(btn.actionType)}
                    onclick={() => doQuickAction(btn)}
                    title={btn.label}
                >
                    <i class={btn.icon}></i>
                    <span class="qa-label">{btn.label}</span>
                </button>
            {/each}
        </div>
    </div>
</div>

<style lang="scss">
    .quick-actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .qa-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .qa-group-label {
        font-size: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dh2e-text-secondary, #a0a0a8);
        opacity: 0.6;
    }
    .qa-row {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
    }
    .quick-btn {
        display: flex; flex-direction: column; align-items: center; gap: 1px;
        padding: 3px 6px;
        background: var(--dh2e-bg-mid, #2e2e35);
        border: 1px solid var(--dh2e-border, #4a4a55);
        border-radius: var(--dh2e-radius-sm, 3px);
        color: var(--dh2e-text-primary, #d0cfc8);
        cursor: pointer; font-size: 0.55rem;

        i { font-size: 0.7rem; color: var(--dh2e-gold-muted, #8a7a3e); }

        &:hover:not(.used) {
            border-color: var(--dh2e-gold, #c8a84e);
            i { color: var(--dh2e-gold, #c8a84e); }
        }

        &.used {
            opacity: 0.3;
            cursor: default;
        }

        &.active {
            background: var(--dh2e-danger-dim, #5a2020);
            border-color: var(--dh2e-danger, #c44040);
            i { color: var(--dh2e-danger, #c44040); }
        }
    }
    .qa-label { white-space: nowrap; }
    .qa-dist {
        font-size: 0.5rem;
        font-weight: 700;
        color: var(--dh2e-gold-muted, #8a7a3e);
        font-family: monospace;
    }
</style>
