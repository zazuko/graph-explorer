import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// vitest runs with the project root as the working directory
const repoRoot = process.cwd();
const stylesDir = join(repoRoot, "styles");
const distLib = join(repoRoot, "dist", "graph-explorer.js");

function scssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return scssFiles(full);
    }
    return entry.isFile() && full.endsWith(".scss") ? [full] : [];
  });
}

const URL_PATTERN = /url\(\s*['"]?([^'")]+?)['"]?\s*\)/g;
const isExternal = (ref: string) => /^(data:|https?:|\/\/|#)/.test(ref);

/**
 * Regression guard: Sass partials are resolved by the bundler *relative to the
 * partial that contains the url()*. A wrong depth (e.g. `../images/` from
 * `styles/widgets/`) silently produces unresolvable icon URLs, which is what
 * made the halo buttons render as invisible transparent boxes.
 */
describe("stylesheet asset references", () => {
  const files = scssFiles(stylesDir);

  const references = files.flatMap((file) => {
    const contents = readFileSync(file, "utf8");
    return [...contents.matchAll(URL_PATTERN)]
      .map(([, ref]) => ref)
      .filter((ref) => !isExternal(ref))
      .map((ref) => ({ file, ref }));
  });

  it("scans the stylesheets and finds asset references", () => {
    expect(files.length).toBeGreaterThan(0);
    // guards against the regex silently matching nothing
    expect(references.length).toBeGreaterThan(0);
  });

  it("resolves every url() to a file that exists on disk", () => {
    const missing = references
      .filter(({ file, ref }) => {
        const cleaned = ref.split("?")[0].split("#")[0];
        return !existsSync(resolve(dirname(file), cleaned));
      })
      .map(({ file, ref }) => `${relative(repoRoot, file)} -> ${ref}`);

    expect(missing).toEqual([]);
  });

  it("references the halo button icons", () => {
    // the icons that make the on-canvas action arrows visible
    const halo = readFileSync(join(stylesDir, "widgets", "_halo.scss"), "utf8");
    for (const icon of [
      "connections.svg",
      "link.svg",
      "delete.svg",
      "expand-properties.png",
      "add-to-filter.png",
    ]) {
      expect(halo).toContain(icon);
    }
  });
});

/**
 * The library injects its CSS at runtime, so any asset left as a relative URL
 * would break for consumers. Only runs once the library has been built.
 */
describe.skipIf(!existsSync(distLib))("built library assets", () => {
  it("inlines every image as a data URI (no relative asset URLs)", () => {
    const bundle = readFileSync(distLib, "utf8");
    const unresolved = [...bundle.matchAll(URL_PATTERN)]
      .map(([, ref]) => ref)
      .filter((ref) => !isExternal(ref))
      .filter((ref) => /\.(svg|png|jpe?g|gif)$/i.test(ref));

    expect(unresolved).toEqual([]);
  });
});
