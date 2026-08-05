# Embedding

## As an npm dependency (the common case)

```
npm install graph-explorer
```

`graph-explorer` has two **peer dependencies** you need to have installed yourself: `react` and `react-dom` (`^18.0.0 || ^19.0.0`). Everything else it needs (`lodash`, `n3`, `d3-color`, `webcola`, `elkjs`, ...) is a regular dependency and gets pulled in automatically.

One thing that *isn't* an npm dependency: **Font Awesome**. The icon set used throughout the UI is loaded as CSS, not bundled — every example in `examples/*.html` pulls it from a CDN:

```html
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" />
```

Graph Explorer's own CSS *is* handled for you — the library's entry point (`src/graph-explorer/index.ts`) imports its stylesheet directly, so it's injected at runtime as soon as you import the package; you don't need a separate `<link>` or bundler CSS config for it.

Minimal setup:

```tsx
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { Workspace, DemoDataProvider } from "graph-explorer";

function onWorkspaceMounted(workspace: Workspace) {
  if (!workspace) return;
  workspace.getModel().importLayout({
    dataProvider: new DemoDataProvider(),
  });
}

createRoot(document.getElementById("root")).render(
  createElement(Workspace, { ref: onWorkspaceMounted })
);
```

Swap `DemoDataProvider` for `SparqlDataProvider` to point at a real endpoint — see [data-providers.md](./data-providers.md).

## Without a build pipeline (`<script>` tag)

The default published bundle (`dist/graph-explorer.js`/`.mjs`) keeps `react`/`react-dom` (and the other dependencies above) external — fine if you already have a bundler resolving them, not fine for a plain `<script>` tag with nothing else on the page.

For that case, build (or fetch) the **standalone bundle**, which inlines everything:

```
BUNDLE_PEERS=true npm run build
```

This produces `dist/graph-explorer-full.min.js`, exposing a `window.GraphExplorer` global. You still need to provide React, ReactDOM, and Font Awesome's CSS yourself (those three are the only things it doesn't inline):

```html
<script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" />
<script src="https://unpkg.com/graph-explorer/dist/graph-explorer-full.min.js"></script>

<div id="root"></div>
<script>
  function onWorkspaceMounted(workspace) {
    if (!workspace) return;
    workspace.getModel().importLayout({
      dataProvider: new GraphExplorer.DemoDataProvider(),
    });
  }
  ReactDOM.createRoot(document.getElementById("root")).render(
    React.createElement(GraphExplorer.Workspace, { ref: onWorkspaceMounted })
  );
</script>
```

## Saving and loading a diagram

Graph Explorer only persists *geometry* — element/link positions, not the underlying data. Every time a diagram loads, the actual classes/labels/properties are re-fetched from the `DataProvider`, so what's shown is always current. The serialized shape is `SerializedDiagram`, plain JSON.

**Export** (e.g. from a "Save" button — wire it via `WorkspaceProps.onSaveDiagram`):

```ts
onSaveDiagram: (workspace) => {
  const diagram = workspace.getModel().exportLayout();
  // diagram: SerializedDiagram — store it however you like
},
```

**Import** (when mounting, alongside the data provider):

```ts
workspace.getModel().importLayout({
  dataProvider,
  diagram, // a previously-exported SerializedDiagram, or omit for an empty canvas
  validateLinks: true, // re-check that links are still valid before showing them
});
```

`examples/common.ts` has a minimal localStorage-backed implementation of both directions if you want a working reference.
