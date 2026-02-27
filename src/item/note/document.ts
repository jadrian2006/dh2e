import { ItemDH2e } from "@item/base/document.ts";

/** Note system data stored in DB */
export interface NoteSystemData {
    description: string;
    content: string;
    timestamp: number;
    gameDate: string;
}

/** Note item — personal journal entries and field reports */
class NoteDH2e extends ItemDH2e {
    declare system: NoteSystemData;
}

export { NoteDH2e };
