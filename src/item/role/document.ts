import { ItemDH2e } from "@item/base/document.ts";
import type { RoleSystemSource } from "./data.ts";

/** Role item — character role (class archetype) */
class RoleDH2e extends ItemDH2e {
    /** Get typed system data */
    get roleSystem(): RoleSystemSource {
        return this.system as unknown as RoleSystemSource;
    }
}

export { RoleDH2e };
