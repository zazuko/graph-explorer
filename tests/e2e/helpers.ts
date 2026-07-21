import type { Page } from "@playwright/test";

export interface PageProblems {
  consoleErrors: string[];
  pageErrors: string[];
  failedImages: string[];
}

const isSameOrigin = (url: string) =>
  url.startsWith("http://localhost:") || url.startsWith("/");

/**
 * Starts collecting console/page errors. Must be called before navigating.
 * Third-party resources (e.g. the font-awesome CDN used by the demo pages) are
 * ignored so the assertions stay stable on flaky networks.
 */
export function collectPageProblems(page: Page): PageProblems {
  const problems: PageProblems = {
    consoleErrors: [],
    pageErrors: [],
    failedImages: [],
  };

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }
    const location = message.location()?.url ?? "";
    if (location && !isSameOrigin(location)) {
      return;
    }
    problems.consoleErrors.push(message.text());
  });

  page.on("pageerror", (error) => problems.pageErrors.push(error.message));

  page.on("response", (response) => {
    const url = response.url();
    if (!isSameOrigin(url) || response.status() < 400) {
      return;
    }
    if (/\.(svg|png|jpe?g|gif)(\?|$)/i.test(url)) {
      problems.failedImages.push(`${response.status()} ${url}`);
    }
  });

  return problems;
}

/** Opens the bundled local demo (deterministic, no network data source). */
export async function openLocalDemo(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForSelector(".graph-explorer-class-leaf");
}

/** Drags the first available instance onto the canvas to create an element. */
export async function createElementOnCanvas(
  page: Page,
  targetPosition = { x: 500, y: 300 }
): Promise<void> {
  await page.locator(".graph-explorer-class-leaf__body").first().click();
  await page.waitForSelector(".graph-explorer-list-element-view");

  const created = page.locator(".graph-explorer-overlayed-element").first();
  // the browser occasionally drops the simulated HTML5 drag, so retry
  for (let attempt = 0; attempt < 3; attempt++) {
    await page
      .locator(".graph-explorer-list-element-view")
      .first()
      .dragTo(page.locator(".graph-explorer-paper-area").first(), {
        targetPosition,
        force: true,
      });
    try {
      await created.waitFor({ state: "visible", timeout: 5_000 });
      return;
    } catch {
      // fall through and try the drag again
    }
  }
  throw new Error("could not create an element on the canvas after 3 attempts");
}

/**
 * The paper area adjusts and re-centres its scroll position asynchronously
 * after mounting (and after content changes). Panning before that settles gets
 * overwritten, so wait until the scroll offsets stop moving.
 */
export async function waitForCanvasSettled(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as unknown as Record<string, unknown>).__geScroll;
  });
  await page.waitForFunction(
    () => {
      const area = document.querySelector(".graph-explorer-paper-area__area");
      if (!area) {
        return false;
      }
      const store = window as unknown as {
        __geScroll?: { left: number; top: number; stable: number };
      };
      const previous = store.__geScroll;
      const current = {
        left: area.scrollLeft,
        top: area.scrollTop,
        stable: 0,
      };
      if (
        previous &&
        previous.left === current.left &&
        previous.top === current.top
      ) {
        current.stable = previous.stable + 1;
      }
      store.__geScroll = current;
      // stay stable long enough to outlast the mount/centring animation
      return current.stable >= 5;
    },
    undefined,
    { timeout: 15_000, polling: 150 }
  );
}

export function paperScroll(page: Page): Promise<{ left: number; top: number }> {
  return page.evaluate(() => {
    const area = document.querySelector(".graph-explorer-paper-area__area");
    return { left: area.scrollLeft, top: area.scrollTop };
  });
}

/** Presses the given mouse button and drags in steps so move handlers run. */
export async function dragWithButton(
  page: Page,
  button: "left" | "middle",
  from: { x: number; y: number },
  delta: { x: number; y: number }
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  const steps = 5;
  for (let step = 1; step <= steps; step++) {
    await page.mouse.move(
      from.x + (delta.x * step) / steps,
      from.y + (delta.y * step) / steps
    );
  }
  await page.mouse.up({ button });
}
