/**
 * Global type augmentations for the DH2E system
 */

import type { ActorDH2e } from "@actor/base.ts";
import type { ItemDH2e } from "@item/base/document.ts";

declare global {
    interface Game {
        dh2e: {
            config: DH2EConfig;
            awardXP: () => void;
            grantAdvance: () => void;
            assignObjective: () => void;
            requisition: () => void;
            voxTerminal: () => void;
            warband: any;
        };
    }

    interface FoundryConfig {
        DH2E: DH2EConfig;
    }
}

export type {};
