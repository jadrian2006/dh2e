import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@sheet/mixin.ts";
import WizardRoot from "./wizard-root.svelte";
import type { CreationState } from "./types.ts";
import type { CharacteristicAbbrev } from "@actor/types.ts";

const DEFAULT_CHARACTERISTICS: Record<CharacteristicAbbrev, number> = {
    ws: 25, bs: 25, s: 25, t: 25, ag: 25, int: 25, per: 25, wp: 25, fel: 25,
};

/**
 * Character creation wizard — multi-step guided or manual creation.
 *
 * Steps: 1) Homeworld → 2) Background → 3) Role → 4) Divination → 5) Review
 * Ships with framework/UI only. Actual homeworld/background/role options
 * come from community data packs. Includes manual creation fallback.
 */
class CreationWizard extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        id: "dh2e-creation-wizard",
        classes: ["dh2e", "dialog", "creation-wizard"],
        position: { width: 640, height: 600 },
        window: { resizable: true, minimizable: false },
    });

    protected override root = WizardRoot;

    #actor: Actor;
    #state: CreationState;

    constructor(actor: Actor) {
        super({});
        this.#actor = actor;
        this.#state = {
            step: 0,
            homeworld: null,
            background: null,
            role: null,
            divination: null,
            characteristics: { ...DEFAULT_CHARACTERISTICS },
            mode: "manual",
        };
    }

    override get title(): string {
        return `Character Creation — ${this.#actor.name}`;
    }

    protected override async _prepareContext(): Promise<SvelteApplicationRenderContext> {
        return {
            ctx: {
                actor: this.#actor,
                state: this.#state,
                onNext: () => this.#nextStep(),
                onPrev: () => this.#prevStep(),
                onFinish: () => this.#finish(),
                onCancel: () => this.close(),
                onUpdateState: (updates: Partial<CreationState>) => {
                    Object.assign(this.#state, updates);
                    this.render();
                },
            },
        };
    }

    #nextStep(): void {
        if (this.#state.step < 4) {
            this.#state.step++;
            this.render();
        }
    }

    #prevStep(): void {
        if (this.#state.step > 0) {
            this.#state.step--;
            this.render();
        }
    }

    async #finish(): Promise<void> {
        const updates: Record<string, unknown> = {};

        // Apply characteristics
        for (const [key, value] of Object.entries(this.#state.characteristics)) {
            updates[`system.characteristics.${key}.base`] = value;
        }

        // Apply homeworld bonuses
        if (this.#state.homeworld) {
            const hw = this.#state.homeworld;
            for (const [key, bonus] of Object.entries(hw.characteristicBonuses)) {
                const current = this.#state.characteristics[key as CharacteristicAbbrev] ?? 25;
                updates[`system.characteristics.${key}.base`] = current + bonus;
            }
            for (const [key, penalty] of Object.entries(hw.characteristicPenalties)) {
                const current = this.#state.characteristics[key as CharacteristicAbbrev] ?? 25;
                updates[`system.characteristics.${key}.base`] = current + penalty;
            }
            updates["system.fate.max"] = hw.fateThreshold;
            updates["system.fate.value"] = hw.fateThreshold;
            updates["system.details.homeworld"] = hw.name;
        }

        // Apply background
        if (this.#state.background) {
            updates["system.details.background"] = this.#state.background.name;
        }

        // Apply role
        if (this.#state.role) {
            updates["system.details.role"] = this.#state.role.name;
        }

        // Apply divination
        if (this.#state.divination) {
            updates["system.details.divination"] = this.#state.divination.text;
        }

        await this.#actor.update(updates);
        ui.notifications.info(`${this.#actor.name} creation complete!`);
        this.close();
    }

    /** Open the wizard for an actor */
    static open(actor: Actor): CreationWizard {
        const wizard = new CreationWizard(actor);
        wizard.render(true);
        return wizard;
    }
}

export { CreationWizard };
