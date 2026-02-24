import { ItemDH2e } from "@item/base/document.ts";
import type { CyberneticSystemSource } from "./data.ts";

/** Cybernetic item — replacement limbs and enhancement implants */
class CyberneticDH2e extends ItemDH2e {
    declare system: CyberneticSystemSource;

    /** Whether this cybernetic is currently installed and active */
    get isInstalled(): boolean {
        return this.system.installed;
    }

    /** Toggle the installed state */
    async toggleInstalled(): Promise<void> {
        await this.update({ "system.installed": !this.system.installed });
    }
}

export { CyberneticDH2e };
