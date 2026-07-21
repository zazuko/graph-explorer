import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { createElementOnCanvas, openLocalDemo } from "./helpers";

/** Clicks a toolbar export button and returns the downloaded file's contents. */
async function download(
  page: import("@playwright/test").Page,
  title: string
): Promise<Buffer> {
  const [downloaded] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page.getByTitle(title).click(),
  ]);
  return readFileSync(await downloaded.path());
}

test.describe("diagram export", () => {
  test.beforeEach(async ({ page }) => {
    await openLocalDemo(page);
    await createElementOnCanvas(page);
  });

  /**
   * Regression guard: the exported SVG is detached from the workspace root, so
   * the design tokens declared there are out of scope. If they are not
   * re-declared on the export, every `var(--…)` resolves to nothing and the
   * diagram loses its background, corner radius, shadow and text colour.
   */
  test("SVG export declares every design token it references", async ({
    page,
  }) => {
    const svg = (await download(page, "Export diagram as SVG")).toString(
      "utf8"
    );

    const referenced = new Set(
      (svg.match(/var\(\s*(--[\w-]+)/g) ?? []).map((match) =>
        match.replace(/var\(\s*/, "")
      )
    );
    const declared = new Set(svg.match(/--[\w-]+(?=\s*:)/g) ?? []);

    // the templates do use tokens - otherwise this test proves nothing
    expect(referenced.size).toBeGreaterThan(0);

    const undeclared = [...referenced].filter((name) => !declared.has(name));
    expect(undeclared, "tokens referenced but never declared").toEqual([]);
  });

  test("SVG export contains the diagram content and its styles", async ({
    page,
  }) => {
    const svg = (await download(page, "Export diagram as SVG")).toString(
      "utf8"
    );

    expect(svg).toContain("<svg");
    expect(svg).toContain("<style>");
    // the element is exported as foreignObject content
    expect(svg).toContain("graph-explorer-exported-element");
    expect(svg).toContain("lemma");
  });

  test("PNG export produces a real image", async ({ page }) => {
    const png = await download(page, "Export diagram as PNG");

    // PNG magic number
    expect([...png.subarray(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(png.byteLength).toBeGreaterThan(2000);
  });
});
