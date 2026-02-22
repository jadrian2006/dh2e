/**
 * Foundry VTT V13 Document Type Declarations
 */

// Pre-create source type
type PreCreate<T> = T & { _id?: string };

// Document construction context
interface DocumentConstructionContext<TParent = unknown> {
    parent?: TParent;
    pack?: string;
    strict?: boolean;
}

// Document modification context
interface DocumentModificationContext {
    parent?: Document;
    pack?: string;
    render?: boolean;
    renderSheet?: boolean;
    diff?: boolean;
    recursive?: boolean;
    noHook?: boolean;
}

// Base Document class
declare class Document<TParent = unknown> {
    constructor(data?: Record<string, unknown>, context?: DocumentConstructionContext<TParent>);

    readonly _id: string | null;
    readonly id: string;
    readonly uuid: string;
    readonly name: string;
    readonly type: string;
    readonly parent: TParent;
    readonly pack: string | null;
    readonly isEmbedded: boolean;
    readonly isOwner: boolean;
    readonly sheet: unknown;

    readonly _source: Record<string, unknown>;
    readonly _stats: { duplicateSource?: string; compendiumSource?: string };

    get system(): Record<string, unknown>;

    update(data: Record<string, unknown>, context?: DocumentModificationContext): Promise<this>;
    delete(context?: DocumentModificationContext): Promise<this>;
    toObject(source?: boolean): Record<string, unknown>;
    getFlag(scope: string, key: string): unknown;
    setFlag(scope: string, key: string, value: unknown): Promise<this>;
    unsetFlag(scope: string, key: string): Promise<this>;

    static create<T extends Document>(
        this: new (...args: unknown[]) => T,
        data: Record<string, unknown> | Record<string, unknown>[],
        context?: DocumentModificationContext,
    ): Promise<StoredDocument<T>>;

    static updateDocuments(
        updates: Record<string, unknown>[],
        context?: DocumentModificationContext,
    ): Promise<Document[]>;

    static deleteDocuments(
        ids: string[],
        context?: DocumentModificationContext,
    ): Promise<Document[]>;
}

// Actor document
declare class Actor<TParent = TokenDocument | null> extends Document<TParent> {
    static DEFAULT_ICON: string;

    readonly items: Collection<Item<this>>;
    readonly effects: Collection<ActiveEffect<this>>;
    readonly img: string;
    readonly prototypeToken: PrototypeToken;

    get system(): Record<string, unknown>;

    prepareData(): void;
    prepareBaseData(): void;
    prepareDerivedData(): void;
    prepareEmbeddedDocuments(): void;

    getRollData(): Record<string, unknown>;

    createEmbeddedDocuments(
        embeddedName: string,
        data: Record<string, unknown>[],
        context?: DocumentModificationContext,
    ): Promise<Document[]>;

    updateEmbeddedDocuments(
        embeddedName: string,
        updates: Record<string, unknown>[],
        context?: DocumentModificationContext,
    ): Promise<Document[]>;

    deleteEmbeddedDocuments(
        embeddedName: string,
        ids: string[],
        context?: DocumentModificationContext,
    ): Promise<Document[]>;

    static getDefaultArtwork(actorData: Record<string, unknown>): { img: ImageFilePath; texture: { src: ImageFilePath } };
}

// Item document
declare class Item<TParent = Actor | null> extends Document<TParent> {
    readonly actor: TParent;
    readonly img: string;
    readonly effects: Collection<ActiveEffect<this>>;

    get system(): Record<string, unknown>;

    prepareData(): void;
    prepareBaseData(): void;
    prepareDerivedData(): void;

    getRollData(): Record<string, unknown>;

    static getDefaultArtwork(itemData: Record<string, unknown>): { img: ImageFilePath };
}

// ActiveEffect document
declare class ActiveEffect<TParent = Actor | Item> extends Document<TParent> {
    readonly disabled: boolean;
    readonly duration: {
        startTime: number | null;
        seconds: number | null;
        rounds: number | null;
        turns: number | null;
    };
    readonly changes: ActiveEffectChange[];
}

interface ActiveEffectChange {
    key: string;
    mode: number;
    value: string;
    priority: number;
}

// Token document
declare class TokenDocument<TParent = Scene | null> extends Document<TParent> {
    readonly actor: Actor | null;
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly disposition: number;
    readonly hidden: boolean;
}

// Scene
declare class Scene extends Document {
    readonly tokens: Collection<TokenDocument<this>>;
    readonly grid: { size: number; distance: number };
}

// PrototypeToken
interface PrototypeToken {
    name: string;
    texture: { src: string };
    disposition: number;
    sight: { enabled: boolean };
}

// ChatMessage document
declare class ChatMessage extends Document {
    static create(
        data: ChatMessageCreateData | ChatMessageCreateData[],
        context?: DocumentModificationContext,
    ): Promise<StoredDocument<ChatMessage>>;

    static getSpeaker(options?: {
        scene?: Scene | null;
        actor?: Actor | null;
        token?: TokenDocument | null;
        alias?: string;
    }): ChatSpeaker;

    readonly speaker: ChatSpeaker;
    readonly content: string;
    readonly rolls: Roll[];
    readonly whisper: string[];
    readonly blind: boolean;
    readonly user: User;
}

interface ChatMessageCreateData {
    content?: string;
    speaker?: ChatSpeaker;
    rolls?: (Roll | string)[];
    whisper?: string[];
    blind?: boolean;
    type?: number;
    flavor?: string;
    flags?: Record<string, unknown>;
}

interface ChatSpeaker {
    scene?: string | null;
    actor?: string | null;
    token?: string | null;
    alias?: string;
}

// Combat/Combatant
declare class Combat extends Document {
    readonly combatants: Collection<Combatant>;
    readonly current: { round: number; turn: number; combatantId: string | null };
    readonly round: number;
    readonly turn: number;
    readonly started: boolean;

    startCombat(): Promise<this>;
    nextRound(): Promise<this>;
    nextTurn(): Promise<this>;
    previousRound(): Promise<this>;
    previousTurn(): Promise<this>;
}

declare class Combatant extends Document<Combat> {
    readonly actor: Actor | null;
    readonly token: TokenDocument | null;
    readonly initiative: number | null;
    readonly defeated: boolean;
    readonly hidden: boolean;
}

// Macro
declare class Macro extends Document {
    readonly type: "script" | "chat";
    readonly command: string;
    execute(): void;
}
