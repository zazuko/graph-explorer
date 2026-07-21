import { describe, expect, it, vi } from "vitest";

import { DiagramModel } from "../../src/graph-explorer/diagram/model";
import { DiagramView } from "../../src/graph-explorer/diagram/view";
import { NonRememberingHistory } from "../../src/graph-explorer/diagram/history";

const makeView = () =>
  new DiagramView(new DiagramModel(new NonRememberingHistory()));

/**
 * The toolbar's language `<select>` is driven by `view.getLanguage()` and
 * re-rendered from the `changeLanguage` event, so this contract has to hold for
 * the selector to stay in sync with the chosen locale.
 */
describe("DiagramView language", () => {
  it("defaults to english", () => {
    expect(makeView().getLanguage()).toBe("en");
  });

  it("updates the language and announces the previous one", () => {
    const view = makeView();
    const listener = vi.fn();
    view.events.on("changeLanguage", listener);

    view.setLanguage("ru");

    expect(view.getLanguage()).toBe("ru");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      source: view,
      previous: "en",
    });
  });

  it("does not announce a change when the language is unchanged", () => {
    const view = makeView();
    const listener = vi.fn();
    view.events.on("changeLanguage", listener);

    view.setLanguage("en");

    expect(listener).not.toHaveBeenCalled();
  });

  it("refuses an empty language", () => {
    expect(() => makeView().setLanguage("")).toThrow(/empty language/i);
  });
});
