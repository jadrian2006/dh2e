/**
 * Foundry VTT V13 Application Type Declarations
 */

// Abstract constructor type
type AbstractConstructorOf<T> = abstract new (...args: any[]) => T;

// Deep partial utility
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

declare namespace foundry {
    namespace applications {
        /** ApplicationV2 — the new application framework in V13 */
        class ApplicationV2 {
            constructor(options?: DeepPartial<ApplicationConfiguration>);

            static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;
            static PARTS: Record<string, ApplicationPart>;

            get id(): string;
            get title(): string;
            get element(): HTMLElement;
            get rendered(): boolean;
            get position(): ApplicationPosition;
            get options(): ApplicationConfiguration;

            render(options?: ApplicationRenderOptions): Promise<this>;
            close(options?: ApplicationClosingOptions): Promise<void>;
            setPosition(position?: Partial<ApplicationPosition>): ApplicationPosition;

            protected _prepareContext(options: ApplicationRenderOptions): Promise<Record<string, unknown>>;
            protected _renderHTML(context: Record<string, unknown>): Promise<Record<string, unknown>>;
            protected _replaceHTML(
                result: Record<string, unknown>,
                content: HTMLElement,
                options: ApplicationRenderOptions,
            ): void;
            protected _onRender(context: Record<string, unknown>, options: ApplicationRenderOptions): void;
            protected _attachFrameListeners(): void;
            protected _onClose(options: ApplicationClosingOptions): void;
        }

        /** DocumentSheetV2 — base sheet for documents */
        class DocumentSheetV2<TDocument extends Document = Document> extends ApplicationV2 {
            static DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

            get document(): TDocument;
            get actor(): TDocument extends Item ? Actor | null : TDocument;
            get isEditable(): boolean;
            get isOwner(): boolean;

            protected _prepareContext(options: ApplicationRenderOptions): Promise<Record<string, unknown>>;
            protected _onDrop(event: DragEvent): Promise<void>;
            _canDragDrop(selector: string): boolean;

            submit(): Promise<void>;
        }

        interface DocumentSheetConfiguration extends ApplicationConfiguration {
            document: Document;
            viewPermission: number;
            editPermission: number;
        }

        interface ApplicationConfiguration {
            id: string;
            classes: string[];
            tag: string;
            window: WindowConfiguration;
            actions: Record<string, ApplicationAction>;
            form?: FormConfiguration;
            position: Partial<ApplicationPosition>;
        }

        interface WindowConfiguration {
            frame?: boolean;
            positioned?: boolean;
            title?: string;
            icon?: string;
            controls?: WindowControl[];
            minimizable?: boolean;
            resizable?: boolean;
            contentTag?: string;
            contentClasses?: string[];
        }

        interface WindowControl {
            icon: string;
            label: string;
            action: string;
            ownership?: string;
        }

        interface ApplicationPart {
            template: string;
            scrollable?: string[];
        }

        interface ApplicationPosition {
            top: number;
            left: number;
            width: number | "auto";
            height: number | "auto";
            scale: number;
            zIndex: number;
        }

        interface ApplicationRenderOptions {
            force?: boolean;
            position?: Partial<ApplicationPosition>;
            window?: Partial<WindowConfiguration>;
            parts?: string[];
            isFirstRender?: boolean;
        }

        interface ApplicationClosingOptions {
            animate?: boolean;
        }

        type ApplicationAction = (event: Event, target: HTMLElement) => void | Promise<void>;

        interface FormConfiguration {
            handler?: (event: Event, form: HTMLFormElement, formData: FormDataExtended) => Promise<void>;
            submitOnChange?: boolean;
            closeOnSubmit?: boolean;
        }

        /** HandlebarsApplicationMixin */
        function HandlebarsApplicationMixin<TBase extends AbstractConstructorOf<ApplicationV2>>(
            Base: TBase,
        ): TBase;

        /** Handlebars runtime */
        const Handlebars: {
            registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
            compile(template: string): (data: Record<string, unknown>) => string;
        };
    }

    namespace handlebars {
        function renderTemplate(path: string, data: Record<string, unknown>): Promise<string>;
        function loadTemplates(paths: string[]): Promise<void>;
        function getTemplate(path: string): Promise<(data: Record<string, unknown>) => string>;
    }

    namespace appv1 {
        /** Legacy Application class */
        class Application {
            render(force?: boolean, options?: Record<string, unknown>): this;
            close(options?: Record<string, unknown>): Promise<void>;
        }
    }

    namespace documents {
        class ChatMessage extends Document {
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
            readonly rolls: foundry.dice.Roll[];
            readonly whisper: string[];
            readonly blind: boolean;
            readonly user: User;
        }

        namespace collections {
            class Actors {
                static registerSheet(
                    scope: string,
                    sheetClass: unknown,
                    options?: SheetRegistrationOptions,
                ): void;
                static unregisterSheet(
                    scope: string,
                    sheetClass: unknown,
                    options?: { types?: string[] },
                ): void;
            }

            class Items {
                static registerSheet(
                    scope: string,
                    sheetClass: unknown,
                    options?: SheetRegistrationOptions,
                ): void;
                static unregisterSheet(
                    scope: string,
                    sheetClass: unknown,
                    options?: { types?: string[] },
                ): void;
            }
        }
    }

    interface SheetRegistrationOptions {
        types?: string[];
        makeDefault?: boolean;
        label?: string;
    }

    namespace dice {
        class Roll {
            constructor(formula: string, data?: Record<string, unknown>, options?: Record<string, unknown>);

            readonly formula: string;
            readonly total: number | undefined;
            readonly result: string;
            readonly terms: unknown[];
            readonly _evaluated: boolean;

            evaluate(): Promise<this>;
            toMessage(messageData?: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
            toJSON(): Record<string, unknown>;

            static fromData(data: Record<string, unknown>): Roll;
            static fromJSON(json: string): Roll;
        }
    }

    namespace helpers {
        class Handlebars {
            static registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
        }
    }

    namespace utils {
        function mergeObject<T extends Record<string, unknown>>(
            original: T,
            other: DeepPartial<T>,
            options?: {
                insertKeys?: boolean;
                insertValues?: boolean;
                overwrite?: boolean;
                recursive?: boolean;
                inplace?: boolean;
                enforceTypes?: boolean;
            },
        ): T;

        function duplicate<T>(original: T): T;
        function randomID(length?: number): string;
        function getProperty(object: Record<string, unknown>, key: string): unknown;
        function setProperty(object: Record<string, unknown>, key: string, value: unknown): boolean;
        function flattenObject(obj: Record<string, unknown>): Record<string, unknown>;
        function expandObject(obj: Record<string, unknown>): Record<string, unknown>;
        function isEmpty(obj: unknown): boolean;

        /** Fetch JSON with a timeout */
        function fetchJsonWithTimeout(url: string, options?: RequestInit): Promise<unknown>;
    }

    const CONST: {
        CHAT_MESSAGE_STYLES: Record<string, number>;
        DOCUMENT_OWNERSHIP_LEVELS: {
            NONE: 0;
            LIMITED: 1;
            OBSERVER: 2;
            OWNER: 3;
        };
        TOKEN_DISPOSITIONS: {
            HOSTILE: -1;
            NEUTRAL: 0;
            FRIENDLY: 1;
        };
        ACTIVE_EFFECT_MODES: {
            CUSTOM: 0;
            MULTIPLY: 1;
            ADD: 2;
            DOWNGRADE: 3;
            UPGRADE: 4;
            OVERRIDE: 5;
        };
        DICE_ROLL_MODES: {
            PUBLIC: "publicroll";
            PRIVATE: "gmroll";
            BLIND: "blindroll";
            SELF: "selfroll";
        };
    };
}

// FormDataExtended
declare class FormDataExtended {
    constructor(form: HTMLFormElement);
    readonly object: Record<string, unknown>;
    toObject(): Record<string, unknown>;
}

// Handlebars global
declare const Handlebars: {
    registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
    compile(template: string): (data: Record<string, unknown>) => string;
};

// loadTemplates
declare function loadTemplates(paths: string[]): Promise<void>;
declare function getTemplate(path: string): Promise<(data: Record<string, unknown>) => string>;
declare function renderTemplate(path: string, data: Record<string, unknown>): Promise<string>;
