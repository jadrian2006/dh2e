import { ItemSheetDH2e } from "@item/base/sheet/sheet.ts";

class TalentSheetDH2e extends ItemSheetDH2e {
    static override DEFAULT_OPTIONS = fu.mergeObject(super.DEFAULT_OPTIONS, {
        classes: ["dh2e", "sheet", "item", "talent"],
    });
}

export { TalentSheetDH2e };
