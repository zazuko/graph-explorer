import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

// if BUNDLE_PEERS is set, produce a standalone bundle with all dependencies
const BUNDLE_PEERS = Boolean(process.env.BUNDLE_PEERS);

// dependencies kept external in the default (non-bundled) build, mirroring the
// previous webpack `externals` configuration
const externalDeps = [
  "react",
  "react-dom",
  "lodash",
  "n3",
  "d3-color",
  "file-saverjs",
  "webcola",
];

// UMD global names for the external dependencies
const globals: Record<string, string> = {
  react: "React",
  "react-dom": "ReactDOM",
  "react-dom/client": "ReactDOM",
  lodash: "_",
  n3: "N3",
  "d3-color": "d3",
  "file-saverjs": "saveAs",
  webcola: "cola",
};

export default defineConfig({
  // node polyfills for browser-side use of n3 / sparql-http-client; CSS injected
  // at runtime to preserve the previous style-loader behaviour
  plugins: [nodePolyfills(), cssInjectedByJsPlugin()],
  build: {
    outDir: "dist",
    // keep both builds (default + BUNDLE_PEERS) side by side in dist/
    emptyOutDir: false,
    sourcemap: true,
    minify: BUNDLE_PEERS ? "esbuild" : false,
    // inline every asset (icons referenced from CSS/JS) as a data URI so the
    // runtime-injected stylesheet is self-contained, matching the previous
    // url-loader behaviour
    assetsInlineLimit: () => true,
    lib: {
      entry: "src/graph-explorer/index.ts",
      name: "GraphExplorer",
      formats: BUNDLE_PEERS ? ["umd"] : ["umd", "es"],
      fileName: (format) => {
        if (BUNDLE_PEERS) {
          return "graph-explorer-full.min.js";
        }
        return format === "es" ? "graph-explorer.mjs" : "graph-explorer.js";
      },
    },
    rollupOptions: BUNDLE_PEERS
      ? {}
      : {
          external: (id) =>
            externalDeps.some(
              (dep) => id === dep || id.startsWith(`${dep}/`)
            ),
          output: { globals },
        },
  },
});
