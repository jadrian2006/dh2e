import { ItemSheetDH2e } from "@item/base/sheet/sheet.ts";

class MentalDisorderSheetDH2e extends ItemSheetDH2e {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "item", "mental-disorder"],
    });
}

export { MentalDisorderSheetDH2e };
