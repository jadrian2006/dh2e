import { ItemDH2e } from "@item/base/document.ts";
import type { HomeworldSystemSource } from "./data.ts";

/** Homeworld item — character origin world */
class HomeworldDH2e extends ItemDH2e {
    /** Get typed system data */
    get homeworldSystem(): HomeworldSystemSource {
        return this.system as unknown as HomeworldSystemSource;
    }

    /** Roll starting wounds using the homeworld formula */
    async rollWounds(): Promise<Roll> {
        const formula = this.homeworldSystem.woundsFormula || "8+1d5";
        const roll = new Roll(formula);
        await roll.evaluate();
        return roll;
    }
}

export { HomeworldDH2e };
