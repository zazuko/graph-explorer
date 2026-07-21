import { describe, expect, it } from "vitest";

import { DemoDataProvider } from "../../src/graph-explorer/data/demo/provider";
import type { FilterParams } from "../../src/graph-explorer/data/provider";
import type {
  ClassModel,
  Dictionary,
  ElementIri,
  ElementModel,
  ElementTypeIri,
  LinkModel,
  LinkType,
  LinkTypeIri,
} from "../../src/graph-explorer/data/model";

const PERSON = "http://example.org/Person" as ElementTypeIri;
const CITY = "http://example.org/City" as ElementTypeIri;
const KNOWS = "http://example.org/knows" as LinkTypeIri;
const LIVES_IN = "http://example.org/livesIn" as LinkTypeIri;

const ALICE = "http://example.org/alice" as ElementIri;
const BOB = "http://example.org/bob" as ElementIri;
const PARIS = "http://example.org/paris" as ElementIri;

const label = (value: string) => ({ values: [{ value, language: "en" }] });

const classes: ClassModel[] = [
  { id: PERSON, label: label("Person"), count: 2, children: [] },
  { id: CITY, label: label("City"), count: 1, children: [] },
];

const linkTypes: LinkType[] = [
  { id: KNOWS, label: label("knows") },
  { id: LIVES_IN, label: label("lives in") },
];

const elements: Dictionary<ElementModel> = {
  [ALICE]: { id: ALICE, types: [PERSON], label: label("Alice"), properties: {} },
  [BOB]: { id: BOB, types: [PERSON], label: label("Bob"), properties: {} },
  [PARIS]: { id: PARIS, types: [CITY], label: label("Paris"), properties: {} },
};

const links: LinkModel[] = [
  { linkTypeId: KNOWS, sourceId: ALICE, targetId: BOB },
  { linkTypeId: LIVES_IN, sourceId: ALICE, targetId: PARIS },
];

const provider = () => new DemoDataProvider(classes, linkTypes, elements, links);

/** `offset` and `languageCode` are required by the interface but rarely vary. */
const filterParams = (overrides: Partial<FilterParams> = {}): FilterParams => ({
  offset: 0,
  languageCode: "en",
  ...overrides,
});

describe("DemoDataProvider", () => {
  it("returns the class tree and link types", async () => {
    await expect(provider().classTree()).resolves.toHaveLength(2);
    await expect(provider().linkTypes()).resolves.toHaveLength(2);
  });

  it("returns only known elements, keyed by iri", async () => {
    const result = await provider().elementInfo({
      elementIds: [ALICE, "http://example.org/missing" as ElementIri],
    });
    expect(Object.keys(result)).toEqual([ALICE]);
    expect(result[ALICE].label.values[0].value).toBe("Alice");
  });

  it("filters elements by type", async () => {
    const result = await provider().filter(
      filterParams({ elementTypeId: PERSON })
    );
    expect(Object.keys(result).sort()).toEqual([ALICE, BOB].sort());
  });

  describe("text search", () => {
    it("matches labels case-insensitively", async () => {
      const result = await provider().filter(filterParams({ text: "aLiCe" }));
      expect(Object.keys(result)).toEqual([ALICE]);
    });

    it("matches on the element iri as well as the label", async () => {
      const result = await provider().filter(filterParams({ text: "paris" }));
      expect(Object.keys(result)).toEqual([PARIS]);
    });

    it("returns nothing when there is no match", async () => {
      const result = await provider().filter(
        filterParams({ text: "nothing-matches-this" })
      );
      expect(result).toEqual({});
    });
  });

  describe("filtering by a reference element", () => {
    it("returns elements connected in either direction", async () => {
      const result = await provider().filter(
        filterParams({ refElementId: ALICE })
      );
      expect(Object.keys(result).sort()).toEqual([BOB, PARIS].sort());
    });

    it("honours the link direction", async () => {
      const incoming = await provider().filter(
        filterParams({ refElementId: BOB, linkDirection: "in" })
      );
      expect(Object.keys(incoming)).toEqual([ALICE]);

      const outgoing = await provider().filter(
        filterParams({ refElementId: BOB, linkDirection: "out" })
      );
      expect(outgoing).toEqual({});
    });

    it("narrows down to a single link type", async () => {
      const result = await provider().filter(
        filterParams({ refElementId: ALICE, refElementLinkId: LIVES_IN })
      );
      expect(Object.keys(result)).toEqual([PARIS]);
    });
  });

  it("returns nothing beyond the first page", async () => {
    const result = await provider().filter(
      filterParams({ elementTypeId: PERSON, offset: 10, limit: 10 })
    );
    expect(result).toEqual({});
  });

  it("rejects a filter without any supported criteria", async () => {
    await expect(provider().filter(filterParams())).rejects.toThrow(
      /not implemented/
    );
  });

  it("counts incoming and outgoing links per type", async () => {
    const counts = await provider().linkTypesOf({ elementId: ALICE });
    const byType = Object.fromEntries(counts.map((count) => [count.id, count]));

    expect(byType[KNOWS]).toMatchObject({ outCount: 1, inCount: 0 });
    expect(byType[LIVES_IN]).toMatchObject({ outCount: 1, inCount: 0 });
  });

  it("returns only links between the requested elements and types", async () => {
    const result = await provider().linksInfo({
      elementIds: [ALICE, BOB],
      linkTypeIds: [KNOWS, LIVES_IN],
    });
    // the livesIn link points at Paris, which was not requested
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ linkTypeId: KNOWS, sourceId: ALICE });
  });
});
