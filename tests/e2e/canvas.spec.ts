import { expect, test } from "@playwright/test";

import {
  collectPageProblems,
  createElementOnCanvas,
  dragWithButton,
  elementPlacement,
  openLocalDemo,
  waitForCanvasSettled,
} from "./helpers";

test.describe("diagram elements", () => {
  test("creates an element on the canvas from the instances list", async ({
    page,
  }) => {
    const problems = collectPageProblems(page);
    await openLocalDemo(page);
    await createElementOnCanvas(page);

    await expect(page.locator(".graph-explorer-overlayed-element")).toHaveCount(
      1
    );
    expect(problems.pageErrors).toEqual([]);
  });

  /**
   * Regression guard: the halo action buttons ("expand", "navigate to related",
   * …) are transparent <div>s whose icon comes from a CSS background-image. When
   * the stylesheet asset URLs broke, the buttons were still in the DOM but
   * completely invisible.
   */
  test("shows halo action buttons with their icons when an element is selected", async ({
    page,
  }) => {
    const problems = collectPageProblems(page);
    await openLocalDemo(page);
    await createElementOnCanvas(page);

    await page.locator(".graph-explorer-overlayed-element").first().click();
    await page.waitForSelector(".graph-explorer-halo");

    const buttons = page.locator(
      '.graph-explorer-halo [role="button"], .graph-explorer-halo a'
    );
    await expect(buttons).not.toHaveCount(0);

    const withoutIcon = await buttons.evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const image = getComputedStyle(node).backgroundImage;
          return !image || image === "none";
        })
        .map((node) => node.className)
    );
    expect(withoutIcon).toEqual([]);
    expect(problems.failedImages).toEqual([]);
  });
});

test.describe("canvas panning", () => {
  test("pans with the middle mouse button on empty canvas", async ({
    page,
  }) => {
    await openLocalDemo(page);
    // an element acts as a visual reference for how far the canvas moved
    await createElementOnCanvas(page, { x: 300, y: 150 });
    await waitForCanvasSettled(page);

    const before = await elementPlacement(page);
    // drag from a point well clear of the element and the navigator widget
    await dragWithButton(page, "middle", { x: 800, y: 480 }, { x: -120, y: -80 });
    const after = await elementPlacement(page);

    // the diagram followed the pointer...
    expect(after.left - before.left).toBeCloseTo(-120, 0);
    expect(after.top - before.top).toBeCloseTo(-80, 0);
    // ...without anything being repositioned inside the diagram
    expect(after.transform).toBe(before.transform);
  });

  test("middle-drag starting on an element pans instead of moving it", async ({
    page,
  }) => {
    await openLocalDemo(page);
    await createElementOnCanvas(page, { x: 500, y: 300 });

    await waitForCanvasSettled(page);
    const before = await elementPlacement(page);

    await dragWithButton(
      page,
      "middle",
      {
        x: before.left + before.width / 2,
        y: before.top + before.height / 2,
      },
      { x: -100, y: -60 }
    );

    const after = await elementPlacement(page);

    // the element moved *with* the canvas, by exactly the pan amount...
    expect(after.left - before.left).toBeCloseTo(-100, 0);
    expect(after.top - before.top).toBeCloseTo(-60, 0);
    // ...and was not dragged: its position within the diagram is unchanged
    expect(after.transform).toBe(before.transform);
  });

  test("the dot grid pans together with the diagram", async ({ page }) => {
    await openLocalDemo(page);
    await waitForCanvasSettled(page);

    // the grid is painted on the scrolling element, so it must shift with the
    // content rather than staying pinned to the viewport
    await expect(
      page.locator(".graph-explorer-paper-area__area")
    ).toHaveCSS("background-attachment", "local");

    // an empty patch of canvas, away from the toolbar and the navigator
    const clip = { x: 500, y: 200, width: 160, height: 120 };
    const before = await page.screenshot({ clip });

    // half a grid cell: a grid that moves looks visibly different
    await dragWithButton(page, "middle", { x: 800, y: 500 }, { x: -12, y: 0 });

    const after = await page.screenshot({ clip });
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test("the dot grid scales with the zoom level", async ({ page }) => {
    await openLocalDemo(page);
    await waitForCanvasSettled(page);

    const gridSize = () =>
      page
        .locator(".graph-explorer-paper-area__area")
        .evaluate((el) => parseFloat(getComputedStyle(el).backgroundSize));

    const initial = await gridSize();
    expect(initial).toBeGreaterThan(0);

    await page.getByTitle("Zoom In").click();
    // grid spacing follows the diagram scale, so it grows when zooming in
    await expect.poll(gridSize).toBeGreaterThan(initial);

    await page.getByTitle("Zoom Out").click();
    await page.getByTitle("Zoom Out").click();
    await expect.poll(gridSize).toBeLessThan(initial);
  });

  test("left-drag on empty canvas still pans", async ({ page }) => {
    await openLocalDemo(page);
    await createElementOnCanvas(page, { x: 300, y: 150 });
    await waitForCanvasSettled(page);

    const before = await elementPlacement(page);
    await dragWithButton(page, "left", { x: 800, y: 480 }, { x: -90, y: -60 });
    const after = await elementPlacement(page);

    expect(after.left - before.left).toBeCloseTo(-90, 0);
    expect(after.top - before.top).toBeCloseTo(-60, 0);
    expect(after.transform).toBe(before.transform);
  });
});
