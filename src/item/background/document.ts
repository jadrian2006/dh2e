import { ItemDH2e } from "@item/base/document.ts";
import type { BackgroundSystemSource } from "./data.ts";

/** Background item — character career background */
class BackgroundDH2e extends ItemDH2e {
    /** Get typed system data */
    get backgroundSystem(): BackgroundSystemSource {
        return this.system as unknown as BackgroundSystemSource;
    }
}

export { BackgroundDH2e };
