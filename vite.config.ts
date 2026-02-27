import { defineConfig, type UserConfig } from "vite";
import { svelte as sveltePlugin } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import fs from "node:fs";

const SYSTEM_ID = "dh2e";
const foundryPort = 30000;
const serverPort = 30001;

export default defineConfig(({ command, mode }): UserConfig => {
    const buildMode = mode === "production" ? "production" : "development";
    const outDir = `dist/${SYSTEM_ID}`;
    const srcDir = path.resolve(import.meta.dirname, "src");

    const plugins = [
        sveltePlugin({
            compilerOptions: {
                css: "injected",
            },
        }),
    ];

    // HMR for lang files and templates in dev mode
    if (buildMode === "development") {
        plugins.push({
            name: "hmr-handler",
            apply: "serve",
            handleHotUpdate(context) {
                const basePath = path.relative(
                    path.resolve(import.meta.dirname, "static"),
                    context.file,
                );
                if (context.file.endsWith("en.json")) {
                    const content = fs.readFileSync(context.file, "utf-8");
                    fs.mkdirSync(path.dirname(path.join(outDir, basePath)), {
                        recursive: true,
                    });
                    fs.writeFileSync(path.join(outDir, basePath), content);
                    context.server.ws.send({
                        type: "custom",
                        event: "lang-update",
                        data: { path: `systems/${SYSTEM_ID}/${basePath}` },
                    });
                    return [];
                } else if (context.file.endsWith(".hbs")) {
                    fs.mkdirSync(path.dirname(path.join(outDir, basePath)), {
                        recursive: true,
                    });
                    fs.promises
                        .copyFile(context.file, path.join(outDir, basePath))
                        .then(() => {
                            context.server.ws.send({
                                type: "custom",
                                event: "template-update",
                                data: {
                                    path: `systems/${SYSTEM_ID}/${basePath}`,
                                },
                            });
                        });
                    return [];
                }
            },
        });
    }

    return {
        plugins,
        base: command === "build" ? "./" : `/systems/${SYSTEM_ID}/`,
        publicDir: "static",
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
                "@divination": path.resolve(srcDir, "divination"),
                "@character-creation": path.resolve(srcDir, "character-creation"),
            },
        },
        define: {
            SYSTEM_ID: JSON.stringify(SYSTEM_ID),
            BUILD_MODE: JSON.stringify(buildMode),
            fa: "foundry.applications",
            fd: "foundry.documents",
            fu: "foundry.utils",
            fh: "foundry.helpers",
            fc: "foundry.CONST",
            fav1: "foundry.appv1",
        },
        build: {
            outDir,
            emptyOutDir: true,
            minify: buildMode === "production",
            sourcemap: buildMode === "development",
            rollupOptions: {
                input: path.resolve(srcDir, "dh2e.ts"),
                output: {
                    format: "es",
                    assetFileNames: `styles/${SYSTEM_ID}.css`,
                    chunkFileNames: "[name].mjs",
                    entryFileNames: `${SYSTEM_ID}.mjs`,
                    manualChunks:
                        buildMode === "production"
                            ? { vendor: ["svelte"] }
                            : {},
                },
            },
        },
        server: {
            port: serverPort,
            open: "/game",
            proxy: {
                [`^(?!/systems/${SYSTEM_ID}/)`]: `http://localhost:${foundryPort}/`,
                "/socket.io": {
                    target: `ws://localhost:${foundryPort}`,
                    ws: true,
                },
            },
        },
    };
});
