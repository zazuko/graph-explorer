import { defineConfig, type ProxyOptions } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(rootDir, "examples");

const {
  SPARQL_ENDPOINT,
  SPARQL_UPDATE_ENDPOINT,
  WIKIDATA_ENDPOINT,
  LOD_PROXY,
  PROP_SUGGEST,
} = process.env;

// dev-server proxy, driven by environment variables (mirrors the previous
// webpack-dev-server configuration)
const proxy: Record<string, ProxyOptions> = {};
if (SPARQL_ENDPOINT) {
  proxy["/sparql"] = {
    target: SPARQL_ENDPOINT,
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/sparql/, ""),
  };
}
if (SPARQL_UPDATE_ENDPOINT) {
  proxy["/update"] = {
    target: SPARQL_UPDATE_ENDPOINT,
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/update/, ""),
  };
}
if (WIKIDATA_ENDPOINT || SPARQL_ENDPOINT) {
  proxy["/wikidata"] = {
    target: WIKIDATA_ENDPOINT || SPARQL_ENDPOINT,
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/wikidata/, ""),
  };
}
if (LOD_PROXY) {
  proxy["/lod-proxy"] = {
    target: LOD_PROXY,
    changeOrigin: true,
    secure: false,
  };
}
if (PROP_SUGGEST) {
  proxy["/wikidata-prop-suggest"] = {
    target: PROP_SUGGEST,
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/wikidata-prop-suggest/, ""),
  };
}

export default defineConfig({
  root: examplesDir,
  plugins: [nodePolyfills()],
  build: {
    outDir: resolve(rootDir, "dist", "examples"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve(examplesDir, "index.html"),
        edit: resolve(examplesDir, "edit.html"),
        dbpedia: resolve(examplesDir, "dbpedia.html"),
        wikidata: resolve(examplesDir, "wikidata.html"),
        wikidataGraph: resolve(examplesDir, "wikidataGraph.html"),
        toolbarCustomization: resolve(examplesDir, "toolbarCustomization.html"),
        envendpoint: resolve(examplesDir, "envendpoint.html"),
      },
    },
  },
  server: {
    port: 10444,
    // allow importing library sources from outside the examples/ root
    fs: { allow: [rootDir] },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "X-Requested-With, content-type, Authorization",
    },
    proxy,
  },
});
