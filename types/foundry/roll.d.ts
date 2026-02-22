/**
 * Foundry VTT V13 Roll Type Declarations
 */

declare class Roll {
    constructor(formula: string, data?: Record<string, unknown>, options?: Record<string, unknown>);

    readonly formula: string;
    readonly total: number | undefined;
    readonly result: string;
    readonly terms: RollTerm[];
    readonly dice: Die[];
    readonly _evaluated: boolean;

    evaluate(): Promise<this>;
    toMessage(messageData?: Record<string, unknown>, options?: Record<string, unknown>): Promise<ChatMessage>;
    toJSON(): Record<string, unknown>;

    static fromData(data: Record<string, unknown>): Roll;
    static fromJSON(json: string): Roll;
}

declare class Die extends RollTerm {
    readonly faces: number;
    readonly number: number;
    readonly results: DieResult[];
}

interface DieResult {
    result: number;
    active: boolean;
    discarded?: boolean;
    rerolled?: boolean;
}

declare class RollTerm {
    readonly options: Record<string, unknown>;
}
