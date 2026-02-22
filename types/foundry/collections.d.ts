/**
 * Foundry VTT V13 Collections Type Declarations
 */

// WorldCollection for actors/items
declare class WorldCollection<T extends Document> extends Collection<T> {
    readonly documentClass: new (...args: unknown[]) => T;

    get(id: string): T | undefined;
    getName(name: string): T | undefined;
}

// Actors collection
declare class Actors extends WorldCollection<Actor> {
    static registerSheet(
        scope: string,
        sheetClass: unknown,
        options?: foundry.SheetRegistrationOptions,
    ): void;
    static unregisterSheet(
        scope: string,
        sheetClass: unknown,
        options?: { types?: string[] },
    ): void;
}

// Items collection
declare class Items extends WorldCollection<Item> {
    static registerSheet(
        scope: string,
        sheetClass: unknown,
        options?: foundry.SheetRegistrationOptions,
    ): void;
    static unregisterSheet(
        scope: string,
        sheetClass: unknown,
        options?: { types?: string[] },
    ): void;
}
