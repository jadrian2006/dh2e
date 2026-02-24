import { defineConfig } from "vitest/config";
import path from "node:path";

const srcDir = path.resolve(import.meta.dirname, "src");

// Safely reference foundry mocks — these get replaced at compile time by Vite's `define`.
// The `?.` guard prevents crashes in Vite's internal @vite/env module, which is processed
// before our setupFiles have a chance to install globalThis.__foundryMocks.
const fmock = (key: string) => `(globalThis.__foundryMocks?.${key} ?? {})`;

export default defineConfig({
    resolve: {
        alias: {
            "@actor": path.resolve(srcDir, "actor"),
            "@item": path.resolve(srcDir, "item"),
            "@rules": path.resolve(srcDir, "rules"),
            "@check": path.resolve(srcDir, "check"),
            "@combat": path.resolve(srcDir, "combat"),
            "@chat": path.resolve(srcDir, "chat"),
            "@scripts": path.resolve(srcDir, "scripts"),
            "@sheet": path.resolve(srcDir, "sheet"),
            "@ui": path.resolve(srcDir, "ui"),
            "@util": path.resolve(srcDir, "util"),
            "@advancement": path.resolve(srcDir, "advancement"),
            "@psychic": path.resolve(srcDir, "psychic"),
            "@corruption": path.resolve(srcDir, "corruption"),
            "@insanity": path.resolve(srcDir, "insanity"),
            "@requisition": path.resolve(srcDir, "requisition"),
            "@migration": path.resolve(srcDir, "migration"),
        },
    },
    define: {
        SYSTEM_ID: JSON.stringify("dh2e"),
        BUILD_MODE: JSON.stringify("test"),
        fa: fmock("fa"),
        fd: fmock("fd"),
        fu: fmock("fu"),
        fh: fmock("fh"),
        fc: fmock("fc"),
        fav1: fmock("fav1"),
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["tests/setup.ts"],
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "src/**/*.svelte",
                "src/**/index.ts",
                "src/dh2e.ts",
                "src/scripts/hooks/**",
                "src/sheet/**",
            ],
        },
    },
});
