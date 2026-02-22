/**
 * Foundry VTT V13 Global Type Declarations
 */

// Build-time constants injected by Vite define
declare const SYSTEM_ID: string;
declare const BUILD_MODE: "development" | "production";

// Foundry namespace aliases (injected by Vite define)
declare const fa: typeof foundry.applications;
declare const fd: typeof foundry.documents;
declare const fu: typeof foundry.utils;
declare const fh: typeof foundry.helpers;
declare const fc: typeof foundry.CONST;
declare const fav1: typeof foundry.appv1;

// Image file path branded type
type ImageFilePath = string & { __brand: "ImageFilePath" };

// Foundry global game object
declare const game: Game;
declare const ui: FoundryUI;
declare const canvas: Canvas;

interface Game {
    system: { id: string; version: string };
    i18n: Localization;
    settings: ClientSettings;
    user: StoredDocument<User> | null;
    users: Collection<StoredDocument<User>>;
    actors: Collection<StoredDocument<Actor>>;
    items: Collection<StoredDocument<Item>>;
    ready: boolean;
    dh2e: {
        config: Record<string, unknown>;
    };
    socket: {
        on(event: string, callback: (...args: unknown[]) => void): void;
        emit(event: string, ...args: unknown[]): void;
    };
}

interface FoundryUI {
    notifications: Notifications;
    sidebar: unknown;
    chat: unknown;
}

interface Notifications {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

interface Localization {
    localize(key: string): string;
    format(key: string, data?: Record<string, unknown>): string;
    has(key: string): boolean;
}

interface ClientSettings {
    register(module: string, key: string, data: SettingConfig): void;
    registerMenu(module: string, key: string, data: SettingMenuConfig): void;
    get(module: string, key: string): unknown;
    set(module: string, key: string, value: unknown): Promise<unknown>;
}

interface SettingConfig {
    name?: string;
    hint?: string;
    scope: "world" | "client";
    config: boolean;
    type: typeof String | typeof Number | typeof Boolean | typeof Object;
    default: unknown;
    choices?: Record<string, string>;
    range?: { min: number; max: number; step: number };
    onChange?: (value: unknown) => void;
}

interface SettingMenuConfig {
    name: string;
    label: string;
    hint?: string;
    icon?: string;
    type: new () => FormApplication;
    restricted?: boolean;
}

interface Canvas {
    ready: boolean;
}

// StoredDocument type utility
type StoredDocument<T> = T & { id: string; uuid: string };

// Collection type
declare class Collection<T> extends Map<string, T> {
    get contents(): T[];
    getName(name: string): T | undefined;
    filter(predicate: (value: T) => boolean): T[];
    find(predicate: (value: T) => boolean): T | undefined;
    map<U>(fn: (value: T) => U): U[];
    some(predicate: (value: T) => boolean): boolean;
}

// User document
declare class User {
    id: string;
    name: string;
    isGM: boolean;
    active: boolean;
    character: Actor | null;
}

// FormApplication (legacy)
declare class FormApplication {
    render(force?: boolean): void;
    close(): Promise<void>;
}
