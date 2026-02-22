/**
 * Foundry VTT V13 Hooks Type Declarations
 */

declare class Hooks {
    static on(hook: string, callback: (...args: unknown[]) => void | boolean): number;
    static once(hook: string, callback: (...args: unknown[]) => void | boolean): number;
    static off(hook: string, id: number): void;

    static callAll(hook: string, ...args: unknown[]): boolean;
    static call(hook: string, ...args: unknown[]): boolean;
}
