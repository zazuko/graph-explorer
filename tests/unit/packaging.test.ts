import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const dist = join(repoRoot, "dist");

const umd = join(dist, "graph-explorer.js");
const esm = join(dist, "graph-explorer.mjs");
const standalone = join(dist, "graph-explorer-full.min.js");
const typings = join(dist, "graph-explorer.d.ts");

const artifacts = [umd, esm, standalone, typings];
const isBuilt = artifacts.every((file) => existsSync(file));

/**
 * Guards the Vite library build configuration: which formats are emitted, what
 * stays external, and that the package entry points actually resolve. Runs once
 * the library has been built (CI builds before running the tests).
 */
describe.skipIf(!isBuilt)("published library artifacts", () => {
  it("emits the UMD, ESM and standalone builds plus bundled typings", () => {
    for (const file of artifacts) {
      expect(statSync(file).size, `${file} looks empty`).toBeGreaterThan(1000);
    }
  });

  it("points every package entry point at a file that exists", () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8")
    ) as { main: string; module: string; typings: string };

    for (const entry of [pkg.main, pkg.module, pkg.typings]) {
      expect(existsSync(join(repoRoot, entry)), `missing ${entry}`).toBe(true);
    }
  });

  it("keeps peer dependencies external in the default build", () => {
    // react must not be inlined, otherwise consumers get a second copy
    expect(readFileSync(umd, "utf8")).toMatch(/require\(["']react["']\)/);
    expect(readFileSync(esm, "utf8")).toMatch(/from\s*["']react["']/);
  });

  it("inlines dependencies in the standalone build", () => {
    expect(readFileSync(standalone, "utf8")).not.toMatch(
      /require\(["']react["']\)/
    );
    expect(statSync(standalone).size).toBeGreaterThan(statSync(umd).size);
  });

  it("declares the documented public API in the bundled typings", () => {
    const declarations = readFileSync(typings, "utf8");
    for (const name of [
      "Workspace",
      "renderTo",
      "DemoDataProvider",
      "SparqlDataProvider",
      "EmbeddedLayer",
      "AuthoredEntity",
      "WorkspaceEventKey",
      "DiagramModel",
    ]) {
      expect(declarations, `${name} is missing from the typings`).toMatch(
        new RegExp(`\\b${name}\\b`)
      );
    }
  });
});
