# Graph Explorer
[![npm version](https://badge.fury.io/js/graph-explorer.svg)](https://www.npmjs.com/package/graph-explorer)
![CI status](https://github.com/zazuko/graph-explorer/workflows/Node.js%20CI/badge.svg)

Working with RDF graph-based data and struggling to grasp the underlying model?

Experiencing rapid graph growth and seeking an exploratory tool to better comprehend your knowledge graph's connections?

Need a solution for documenting your schema, ontology, or data for others?

Graph Explorer is the perfect tool for you!

Graph Explorer is a JavaScript application and library designed to visualize, navigate, and examine RDF-based knowledge graphs and data sources. It's configurable to operate with single or multiple SPARQL endpoints and can load RDF resources from the web.

In essence, Graph Explorer empowers you, your team, and the global community to access and understand linked data more effectively.

Graph Explorer is a fork of [Ontodia](https://github.com/metaphacts/ontodia), now incorporated into [Metaphacts](https://metaphacts.com/). To advance the open-source version, we chose to fork, maintain, and expand the codebase as necessary. Contributions from partners are highly encouraged!

## Features

- Visual navigation and diagramming for extensive graph data sets
- Engaging graph visualization and context-aware navigation capabilities
- Diagram storage and retrieval functionality
- User-friendly design, no graph query language or schema knowledge needed
- Customizable UI (by adjusting node and link templates) and data storage back-end

## Examples

`npm run demo` and open <http://localhost:10444/>

## Installation

`npm install graph-explorer`

## Building / Publishing

```
npm run build-all
npm run typings
<bump>
npm publish
```
