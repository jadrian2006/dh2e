/**
 * Foundry VTT V13 Utility Type Declarations
 */

// Drag-and-drop
declare class DragDrop {
    constructor(options: DragDropOptions);
    bind(element: HTMLElement): this;
}

interface DragDropOptions {
    dragSelector?: string | null;
    dropSelector?: string | null;
    permissions?: Record<string, (selector: string) => boolean>;
    callbacks?: {
        dragstart?: (event: DragEvent) => void;
        dragover?: (event: DragEvent) => void;
        drop?: (event: DragEvent) => void;
    };
}

// TextEditor
declare class TextEditor {
    static enrichHTML(content: string, options?: Record<string, unknown>): Promise<string>;
    static getDragEventData(event: DragEvent): Record<string, unknown> | undefined;
}

// Dialog
declare class Dialog {
    constructor(data: DialogData, options?: Record<string, unknown>);
    render(force?: boolean): this;
    static confirm(config: {
        title: string;
        content: string;
        yes?: () => void;
        no?: () => void;
        defaultYes?: boolean;
    }): Promise<boolean>;

    static prompt(config: {
        title: string;
        content: string;
        callback: (html: HTMLElement) => void;
    }): Promise<unknown>;
}

interface DialogData {
    title: string;
    content: string;
    buttons: Record<string, DialogButton>;
    default?: string;
    close?: () => void;
}

interface DialogButton {
    icon?: string;
    label: string;
    callback?: (html: HTMLElement | JQuery) => void;
}

// FilePicker
declare class FilePicker {
    static browse(source: string, target: string, options?: Record<string, unknown>): Promise<unknown>;
    static upload(source: string, target: string, file: File, options?: Record<string, unknown>): Promise<unknown>;
}

// ProseMirror
declare class ProseMirrorEditor {
    readonly view: any;
    destroy(): void;
    isDirty(): boolean;
    static create(
        target: HTMLElement,
        content?: string,
        options?: {
            document?: any;
            fieldName?: string;
            plugins?: Record<string, any>;
        },
    ): Promise<ProseMirrorEditor>;
}

declare namespace foundry {
    namespace prosemirror {
        const ProseMirrorMenu: {
            build(schema: any, options?: { destroyOnSave?: boolean; onSave?: () => void }): Record<string, any>;
        };
        const defaultSchema: any;
        const dom: {
            serializeString(content: any, schema?: any): string;
        };
    }
}

// Socket
declare const socketlib: {
    registerSystem(systemId: string): SocketlibSocket;
};

interface SocketlibSocket {
    register(name: string, handler: (...args: unknown[]) => unknown): void;
    executeAsGM(name: string, ...args: unknown[]): Promise<unknown>;
    executeAsUser(name: string, userId: string, ...args: unknown[]): Promise<unknown>;
    executeForEveryone(name: string, ...args: unknown[]): Promise<unknown>;
    executeForOthers(name: string, ...args: unknown[]): Promise<unknown>;
}
