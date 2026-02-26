export interface TreasureSystemSource {
    description: string;
    /** Value in Imperial Thrones */
    value: number;
    weight: number;
    quantity: number;
    /** Category: thrones, gem, relic, valuable, artefact */
    category: string;
}
