import { expect, test } from "@playwright/test";

import { collectPageProblems, openLocalDemo } from "./helpers";

test.describe("workspace shell", () => {
  test("renders the workspace with no console or page errors", async ({
    page,
  }) => {
    const problems = collectPageProblems(page);
    await openLocalDemo(page);

    await expect(page.locator(".graph-explorer")).toBeVisible();
    await expect(page.locator(".graph-explorer-paper-area")).toBeVisible();
    // class tree is populated from the bundled demo data
    expect(await page.locator(".graph-explorer-class-leaf").count()).toBeGreaterThan(0);

    expect(problems.pageErrors).toEqual([]);
    expect(problems.consoleErrors).toEqual([]);
  });

  test("loads every class-tree icon (asset imports resolve)", async ({
    page,
  }) => {
    const problems = collectPageProblems(page);
    await openLocalDemo(page);

    const icons = page.locator(".graph-explorer-class-leaf__icon");
    const count = await icons.count();
    expect(count).toBeGreaterThan(0);

    // a broken asset import renders an <img> with naturalWidth === 0
    const broken = await icons.evaluateAll((imgs) =>
      imgs
        .filter((img) => !(img as HTMLImageElement).complete ||
          (img as HTMLImageElement).naturalWidth === 0)
        .map((img) => (img as HTMLImageElement).src)
    );
    expect(broken).toEqual([]);
    expect(problems.failedImages).toEqual([]);
  });
});

test.describe("toolbar", () => {
  test("shows the data language selector without a trailing dash", async ({
    page,
  }) => {
    await openLocalDemo(page);

    const label = page.locator(
      ".graph-explorer-toolbar__language-selector label"
    );
    await expect(label).toHaveText("Data Language");
    await expect(
      page.locator(".graph-explorer-toolbar__language-selector select")
    ).toBeVisible();
  });

  /**
   * Regression guard: the selector is a controlled `<select>` fed from
   * `view.getLanguage()`. If the toolbar does not re-render on the language
   * change, React resets the element and it keeps showing the old language.
   */
  test("keeps the data language selector in sync with the chosen language", async ({
    page,
  }) => {
    await openLocalDemo(page);
    const select = page.locator(
      ".graph-explorer-toolbar__language-selector select"
    );
    await expect(select).toHaveValue("en");

    await select.selectOption("ru");
    await expect(select).toHaveValue("ru");

    // it must also survive an unrelated re-render of the toolbar
    await page.getByTitle("Zoom In").click();
    await expect(select).toHaveValue("ru");

    // and switch back again
    await select.selectOption("en");
    await expect(select).toHaveValue("en");
  });
});

test.describe("instances search field", () => {
  test("input and search button have the same height", async ({ page }) => {
    await openLocalDemo(page);

    const group = page.locator(
      ".graph-explorer-instances-search .graph-explorer-input-group"
    );
    await expect(group).toBeVisible();

    const heights = await group.evaluate((el) => {
      const input = el.querySelector(".graph-explorer-form-control");
      const button = el.querySelector(".graph-explorer-btn");
      return {
        input: Math.round(input.getBoundingClientRect().height),
        button: Math.round(button.getBoundingClientRect().height),
      };
    });

    expect(heights.input).toBeGreaterThan(0);
    expect(heights.button).toBe(heights.input);
  });
});
