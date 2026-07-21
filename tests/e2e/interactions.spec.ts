import { expect, test } from "@playwright/test";

import {
  createElementOnCanvas,
  dragWithButton,
  elementPlacement,
  openLocalDemo,
  waitForCanvasSettled,
} from "./helpers";

const OVERLAYED = ".graph-explorer-overlayed-element";

/** Selects the element on the canvas so its halo appears. */
async function selectElement(page: import("@playwright/test").Page) {
  await page.locator(OVERLAYED).first().click();
  await page.waitForSelector(".graph-explorer-halo");
}

test.describe("moving elements", () => {
  /**
   * Counterpart to the middle-drag panning tests: left-dragging an element must
   * still reposition it inside the diagram rather than pan the canvas.
   */
  test("left-drag moves an element within the diagram", async ({ page }) => {
    await openLocalDemo(page);
    await createElementOnCanvas(page, { x: 350, y: 200 });
    await waitForCanvasSettled(page);

    const before = await elementPlacement(page);
    await dragWithButton(
      page,
      "left",
      {
        x: before.left + before.width / 2,
        y: before.top + before.height / 2,
      },
      { x: 120, y: 70 }
    );
    const after = await elementPlacement(page);

    // it followed the pointer on screen...
    expect(after.left - before.left).toBeCloseTo(120, 0);
    expect(after.top - before.top).toBeCloseTo(70, 0);
    // ...and its position inside the diagram actually changed
    expect(after.transform).not.toBe(before.transform);
  });
});

test.describe("halo actions", () => {
  test("the expand button expands the element", async ({ page }) => {
    await openLocalDemo(page);
    await createElementOnCanvas(page);
    await selectElement(page);

    const element = page.locator(OVERLAYED).first();
    const expand = page.locator(".graph-explorer-halo__expand");
    const collapsedHeight = (await element.boundingBox()).height;

    // the modifier mirrors the element's expanded state in the model
    await expect(expand).toHaveClass(/--open/);

    await expand.click();

    // the template re-renders with the extra properties, so the node grows
    await expect
      .poll(async () => (await element.boundingBox()).height)
      .toBeGreaterThan(collapsedHeight);
    await expect(expand).toHaveClass(/--closed/);
  });

  test("the remove button takes the element off the canvas", async ({
    page,
  }) => {
    await openLocalDemo(page);
    await createElementOnCanvas(page);
    await expect(page.locator(OVERLAYED)).toHaveCount(1);

    await selectElement(page);
    await page.locator(".graph-explorer-halo__remove").click();

    await expect(page.locator(OVERLAYED)).toHaveCount(0);
  });
});

test.describe("toolbar actions", () => {
  test("Clear All empties the canvas", async ({ page }) => {
    await openLocalDemo(page);
    await createElementOnCanvas(page);
    await expect(page.locator(OVERLAYED)).toHaveCount(1);

    await page.getByTitle("Clear All").click();

    await expect(page.locator(OVERLAYED)).toHaveCount(0);
  });

  test("zoom controls resize the diagram", async ({ page }) => {
    await openLocalDemo(page);
    await createElementOnCanvas(page);
    await waitForCanvasSettled(page);

    const width = async () => (await elementPlacement(page)).width;
    const original = await width();

    await page.getByTitle("Zoom In").click();
    await expect.poll(width).toBeGreaterThan(original);

    await page.getByTitle("Zoom Out").click();
    await page.getByTitle("Zoom Out").click();
    await expect.poll(width).toBeLessThan(original);
  });
});
