# Data providers

Graph Explorer never talks to a data source directly — `Workspace`/`DiagramModel` talk to a `DataProvider`, an interface with methods like `classTree()`, `filter()`, `elementInfo()`, `linksInfo()`, `linkTypesOf()`. Anything implementing that interface can back the diagram: RDF over SPARQL, a hardcoded demo dataset, or something else entirely.

Two implementations ship with the library:

- **`DemoDataProvider`** — an in-memory provider over a fixed dataset (see `src/graph-explorer/data/demo/provider.ts` and `examples/demo.ts`). No network, no endpoint — the fastest way to try the UI or work on a customization without needing a triplestore.
- **`SparqlDataProvider`** — talks to a real SPARQL endpoint. This is what almost every real integration uses, and the rest of this document is about it.

## Options vs. settings

`SparqlDataProvider`'s constructor takes two separate things, and the split is intentional:

```ts
new SparqlDataProvider(options: SparqlDataProviderOptions, settings?: SparqlDataProviderSettings)
```

- **Options** (`sparqlDataProvider.ts`) are the runtime-ish knobs you're likely to set per deployment: `endpointUrl`, `queryMethod` (`SparqlQueryMethod.GET` or `.POST` — GET is more compatible with older/simpler proxies but hits URL-length limits on large queries; POST scales better and is what you want once queries get big), `imagePropertyUris`/`prepareImages` for pulling in images, `acceptBlankNodes`, and an escape hatch `queryFunction` if you need to control the HTTP layer yourself.
- **Settings** (`sparqlDataProviderSettings.ts`) are dataset-shape-specific SPARQL query *templates* — how to find the class tree, how to search by text, what predicate holds a label, how to detect a resource's type. These change rarely (once per backend/ontology shape, not per request), which is why they default to a shared preset (`OWLStatsSettings`) rather than something you configure by hand every time.

If you don't pass `settings` at all, you get `OWLStatsSettings`.

## The same-origin problem

`SparqlDataProvider` runs entirely in the browser, so calls to a different origin than the page it's on are blocked by the browser's same-origin policy unless the endpoint opts in. Two ways around it, both already used in `examples/`:

1. **Point at a CORS-enabled endpoint directly.** `examples/dbpedia.ts` does this — DBPedia's public endpoint sends the right CORS headers, so `endpointUrl` can just be the real URL.
2. **Proxy it through your own server.** `examples/envendpoint.ts` and `examples/qlever.ts` do this: `endpointUrl: "../sparql"` is a relative path that the dev server proxies to whatever `SPARQL_ENDPOINT` env var you set (see the proxy rules in `vite.demo.config.mts`). In production you'd do the equivalent in whatever's serving the page.

Which one to use isn't a graph-explorer-specific decision — it's the same CORS-vs-proxy tradeoff any browser app calling a third-party API has to make.

## Settings presets

All in `src/graph-explorer/data/sparql/sparqlDataProviderSettings.ts`, each one typically built by spreading a more generic preset and overriding a few fields (e.g. `OWLStatsSettings = { ...OWLRDFSSettings, ...OWLStatsOverride }`):

| Preset | Use it when | Notes |
|---|---|---|
| `OWLRDFSSettings` | generic RDFS/OWL data, no class-usage stats | the practical base preset — real `classTreeQuery`/`elementInfoQuery`/full-text search (regex fallback), unlike `RDFSettings` which is mostly empty placeholders meant to be built on top of, not used as-is |
| `OWLStatsSettings` (default) | same as above, plus per-class instance counts in the class tree | the extra `GROUP BY` in `classTreeQuery` is expensive on large datasets — switch to `OWLRDFSSettings` if the class tree is slow to load |
| `WikidataSettings` | Wikidata specifically | uses Blazegraph's `bds:search` for full-text search |
| `DBPediaSettings` | DBPedia specifically | filters out `yago` classes, uses Virtuoso's `bif:contains` |
| `QLeverSettings` | a QLever-backed endpoint | uses QLever's `ql:has-word` magic property (see below) |

Building a custom one for your own backend follows the same pattern — spread whichever preset is closest to your data's shape, override just the fields that differ:

```ts
const MySettings: SparqlDataProviderSettings = {
  ...OWLRDFSSettings,
  dataLabelProperty: "schema:name",
  fullTextSearch: { /* ... */ },
};
```

## Full-text search

The instances search panel (the "Search for…" box under a selected class) calls `dataProvider.filter({ text, elementTypeId, ... })`, which builds and runs a SPARQL query in `createFilterQuery()` (`sparqlDataProvider.ts`). The text-search-specific part of that query comes entirely from `SparqlDataProviderSettings.fullTextSearch: FullTextSearchSettings`, which is fully pluggable per backend — every triplestore has its own syntax for this, and none of it is hardcoded.

```ts
export interface FullTextSearchSettings {
  prefix: string;              // PREFIX declarations the syntax needs
  queryPattern?: string;       // whole-phrase pattern, templated with ${text}
  queryPatternPerWord?: string; // one-word-per-triple pattern, templated with ${word}
  extractLabel?: boolean;      // fall back to extracting a label from the IRI
  elementFirst?: boolean;      // run the type filter before the text search
}
```

Whichever one you set, the pattern is expected to bind `?inst` (the matched resource) and `?score` (for `ORDER BY DESC(?score)`).

### `queryPattern` — whole-phrase syntaxes

Most full-text extensions accept the whole search phrase as one string and handle multi-word matching themselves. `${text}` is substituted once, verbatim, into wherever you put it.

Blazegraph, used by `WikidataSettings`:

```ts
fullTextSearch: {
  prefix: "PREFIX bds: <http://www.bigdata.com/rdf/search#>\n",
  queryPattern: `
    ?inst rdfs:label ?searchLabel.
    SERVICE bds:search {
           ?searchLabel bds:search "${text}*" ;
                        bds:minRelevance '0.5' ;
                        bds:matchAllTerms 'true' .
    }
    BIND(IF(STRLEN(?strInst) > 33,
          0-<http://www.w3.org/2001/XMLSchema#integer>(SUBSTR(?strInst, 33)),
          -10000) as ?score)
  `,
},
```

(that score is a Wikidata-specific hack — lower Q-numbers rank higher, as a rough proxy for notability)

Virtuoso, used by `DBPediaSettings`:

```ts
fullTextSearch: {
  prefix: "PREFIX dbo: <http://dbpedia.org/ontology/>\n",
  queryPattern: `
    ?inst rdfs:label ?searchLabel.
    ?searchLabel bif:contains "${text}".
    ?inst dbo:wikiPageID ?origScore .
    BIND(0-?origScore as ?score)
  `,
},
```

The generic fallback in `OWLRDFSSettings` (used when the store has no full-text index at all) is a plain SPARQL `regex`, with `extractLabel: true` so it can also match against a label extracted from the IRI itself:

```ts
fullTextSearch: {
  prefix: "",
  queryPattern: ` OPTIONAL {?inst ${dataLabelProperty} ?search1}
      FILTER regex(COALESCE(str(?search1), str(?extractedLabel)), "${text}", "i")
      BIND(0 as ?score)
`,
  extractLabel: true,
},
```

This works everywhere but doesn't scale — it's an unindexed scan over every label. Fine for small/demo datasets, not for anything with a real full-text index available.

### `queryPatternPerWord` — one-word-per-triple syntaxes

Some full-text extensions don't accept a whole phrase — they match one word per triple, and multiple words need multiple triples ANDed together. QLever's `ql:has-word` magic property works this way (case-insensitively):

```ts
const QLeverOverride: Partial<SparqlDataProviderSettings> = {
  fullTextSearch: {
    prefix: "PREFIX ql: <http://qlever.cs.uni-freiburg.de/builtin-functions/>\n",
    queryPatternPerWord: `
      ?inst ${dataLabelProperty} ?searchLabel .
      ?searchLabel ql:has-word "${word}" .
    `,
  },
};
```

When `queryPatternPerWord` is set, `createFilterQuery()` splits the user's search text on whitespace, resolves this pattern once per word (each one SPARQL-string-escaped), and concatenates the results — so searching "zurich university" produces:

```sparql
?inst schema:name ?searchLabel .
?searchLabel ql:has-word "zurich" .

?inst schema:name ?searchLabel .
?searchLabel ql:has-word "university" .
BIND(0 as ?score)
```

Repeating the `?inst`/`?searchLabel` triple in each block is harmless (SPARQL triple patterns can repeat freely), but the `BIND(0 as ?score)` is only added *once*, after all the per-word blocks — SPARQL doesn't allow re-binding the same variable twice in one scope, so it can't live inside the per-word template itself.

### Adding support for a new store

The question that decides which field to use: does the store's full-text syntax take a whole phrase in one go, or does it match one word at a time? Phrase-based (Virtuoso, Blazegraph) → `queryPattern`. One-word-per-triple (QLever) → `queryPatternPerWord`. Either way, follow the same override pattern as `QLeverSettings`/`DBPediaSettings` — spread a base preset, override `fullTextSearch` (and `dataLabelProperty`/`prefix` if your data uses different predicates than the base preset assumes).
