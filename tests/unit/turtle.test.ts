import { describe, expect, it } from "vitest";

import {
  n3toRdfNode,
  parseTurtleText,
} from "../../src/graph-explorer/data/sparql/turtle";

/**
 * Exercises the real `n3` dependency through our wrapper. This is the guard
 * that caught the n3 v1 -> v2 upgrade: it asserts the callback-style
 * `Parser.parse()` contract and `Util.isLiteral()` behaviour we rely on.
 */
describe("parseTurtleText", () => {
  it("parses IRI and literal objects into RdfNode triples", async () => {
    const triples = await parseTurtleText(`
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .
      <http://example.org/alice> foaf:name "Alice"@en ;
                                 foaf:knows <http://example.org/bob> .
    `);

    expect(triples).toHaveLength(2);

    const byPredicate = (iri: string) =>
      triples.find((t) => t.predicate.value === iri);

    const name = byPredicate("http://xmlns.com/foaf/0.1/name");
    expect(name.subject).toEqual({
      type: "uri",
      value: "http://example.org/alice",
    });
    expect(name.object).toMatchObject({
      type: "literal",
      value: "Alice",
      "xml:lang": "en",
    });

    const knows = byPredicate("http://xmlns.com/foaf/0.1/knows");
    expect(knows.object).toEqual({
      type: "uri",
      value: "http://example.org/bob",
    });
  });

  it("preserves the datatype of typed literals", async () => {
    const triples = await parseTurtleText(
      `<http://example.org/a> <http://example.org/age> "42"^^<http://www.w3.org/2001/XMLSchema#integer> .`
    );

    expect(triples).toHaveLength(1);
    expect(triples[0].object).toMatchObject({
      type: "literal",
      value: "42",
      datatype: "http://www.w3.org/2001/XMLSchema#integer",
    });
  });

  it("resolves to an empty list for empty input", async () => {
    await expect(parseTurtleText("")).resolves.toEqual([]);
  });

  it("rejects on malformed turtle", async () => {
    await expect(parseTurtleText("this is not turtle {{{")).rejects.toBeTruthy();
  });
});

describe("n3toRdfNode", () => {
  it("maps a named node to a uri node", () => {
    const term = { termType: "NamedNode", value: "http://example.org/x" };
    expect(n3toRdfNode(term as never)).toEqual({
      type: "uri",
      value: "http://example.org/x",
    });
  });
});
