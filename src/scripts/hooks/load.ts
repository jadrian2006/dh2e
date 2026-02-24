import { ActorProxyDH2e } from "@actor/base.ts";
import { ItemProxyDH2e } from "@item/base/document.ts";
import { CheckRollDH2e } from "@check/roll.ts";

const ICON_PATH = `systems/${SYSTEM_ID}/icons`;

/** Runs on initial script load — assigns document classes to CONFIG */
export class Load {
    static listen(): void {
        // Assign document classes
        CONFIG.Actor.documentClass = ActorProxyDH2e as typeof Actor;
        CONFIG.Item.documentClass = ItemProxyDH2e as typeof Item;

        // Register custom roll class for serialization/deserialization
        CONFIG.Dice.rolls.push(CheckRollDH2e as typeof Roll);

        // Set default types
        CONFIG.Actor.defaultType = "acolyte";
        CONFIG.Item.defaultType = "gear";

        // Type icons — Font Awesome classes for sidebar/compendium display
        CONFIG.Actor.typeIcons = {
            acolyte: "fa-solid fa-user",
            npc: "fa-solid fa-skull",
        };

        CONFIG.Item.typeIcons = {
            weapon: "fa-solid fa-gun",
            armour: "fa-solid fa-shield",
            gear: "fa-solid fa-box",
            skill: "fa-solid fa-book",
            talent: "fa-solid fa-star",
            condition: "fa-solid fa-bolt",
            power: "fa-solid fa-hat-wizard",
        };

        // Default icons — custom SVGs used as default images for new documents
        Actor.DEFAULT_ICON = `${ICON_PATH}/default-icons/acolyte.svg` as ImageFilePath;
        Item.DEFAULT_ICON = `${ICON_PATH}/items/gear.svg` as ImageFilePath;
    }
}
