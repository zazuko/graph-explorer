import { describe, expect, it } from "vitest";

import {
  convertToSerializedDiagram,
  emptyDiagram,
  emptyLayoutData,
  makeSerializedDiagram,
} from "../../src/graph-explorer/editor/serializedDiagram";
import type { LayoutData } from "../../src/graph-explorer/editor/serializedDiagram";
import { DIAGRAM_CONTEXT_URL_V1 } from "../../src/graph-explorer/data/schema";

describe("emptyDiagram", () => {
  it("is a well-formed, empty JSON-LD diagram", () => {
    const diagram = emptyDiagram();
    expect(diagram["@type"]).toBe("Diagram");
    expect(diagram["@context"]).toBe(DIAGRAM_CONTEXT_URL_V1);
    expect(diagram.layoutData).toEqual(emptyLayoutData());
    expect(diagram.layoutData.elements).toEqual([]);
    expect(diagram.layoutData.links).toEqual([]);
  });
});

describe("makeSerializedDiagram", () => {
  it("keeps the provided layout data and link type options", () => {
    const layoutData: LayoutData = {
      "@type": "Layout",
      elements: [],
      links: [],
    };
    const linkTypeOptions = [
      {
        "@type": "LinkTypeOptions" as const,
        property: "http://example.org/knows" as never,
        visible: true,
      },
    ];

    const diagram = makeSerializedDiagram({ layoutData, linkTypeOptions });

    expect(diagram.layoutData).toBe(layoutData);
    expect(diagram.linkTypeOptions).toBe(linkTypeOptions);
    expect(diagram["@type"]).toBe("Diagram");
  });

  it("falls back to an empty layout when none is given", () => {
    expect(makeSerializedDiagram({}).layoutData).toEqual(emptyLayoutData());
  });
});

/**
 * Diagrams saved by older versions are stored as a flat `cells` list. The demo
 * pages still load those from local storage, so this migration has to keep
 * working.
 */
describe("convertToSerializedDiagram (legacy layout migration)", () => {
  const convert = (cells: unknown[]) =>
    convertToSerializedDiagram({
      layoutData: { cells },
      linkTypeOptions: [],
    });

  it("normalises legacy element cells", () => {
    const { layoutData } = convert([
      {
        id: "element-1",
        type: "element",
        iri: "http://example.org/alice",
        position: { x: 10, y: 20 },
        size: { width: 100, height: 50 },
        isExpanded: true,
      },
    ]);

    expect(layoutData.links).toEqual([]);
    expect(layoutData.elements).toHaveLength(1);
    expect(layoutData.elements[0]).toMatchObject({
      "@type": "Element",
      "@id": "element-1",
      iri: "http://example.org/alice",
      position: { x: 10, y: 20 },
      isExpanded: true,
    });
  });

  it("also accepts the fully qualified legacy element type", () => {
    const { layoutData } = convert([
      { id: "e1", type: "GraphExplorer.Element", position: { x: 0, y: 0 } },
    ]);
    expect(layoutData.elements[0]["@type"]).toBe("Element");
  });

  it("falls back to the cell id when a element has no iri", () => {
    const { layoutData } = convert([
      { id: "http://example.org/bob", type: "element", position: { x: 0, y: 0 } },
    ]);
    expect(layoutData.elements[0].iri).toBe("http://example.org/bob");
  });

  it("normalises legacy link cells and renames typeId to property", () => {
    const { layoutData } = convert([
      {
        id: "link-1",
        type: "link",
        typeId: "http://example.org/knows",
        source: { id: "element-1" },
        target: { id: "element-2" },
        vertices: [{ x: 1, y: 2 }],
      },
    ]);

    expect(layoutData.elements).toEqual([]);
    expect(layoutData.links).toHaveLength(1);
    expect(layoutData.links[0]).toMatchObject({
      "@type": "Link",
      "@id": "link-1",
      property: "http://example.org/knows",
      source: { "@id": "element-1" },
      target: { "@id": "element-2" },
      vertices: [{ x: 1, y: 2 }],
    });
    // the internal names must not leak into the serialized form
    expect(layoutData.links[0]).not.toHaveProperty("typeId");
    expect(layoutData.links[0].source).not.toHaveProperty("id");
  });

  it("drops properties that are not part of the serialized form", () => {
    const { layoutData } = convert([
      {
        id: "e1",
        type: "element",
        position: { x: 0, y: 0 },
        somethingInternal: "should not be persisted",
      },
    ]);
    expect(layoutData.elements[0]).not.toHaveProperty("somethingInternal");
  });

  it("splits a mixed cell list into elements and links", () => {
    const { layoutData, "@type": type } = convert([
      { id: "e1", type: "element", position: { x: 0, y: 0 } },
      { id: "e2", type: "element", position: { x: 5, y: 5 } },
      {
        id: "l1",
        type: "link",
        typeId: "http://example.org/knows",
        source: { id: "e1" },
        target: { id: "e2" },
      },
    ]);

    expect(type).toBe("Diagram");
    expect(layoutData.elements).toHaveLength(2);
    expect(layoutData.links).toHaveLength(1);
  });
});
