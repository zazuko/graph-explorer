import { createElement, ClassAttributes } from "react";
import { createRoot } from "react-dom/client";

import {
  Workspace,
  WorkspaceProps,
  SparqlDataProvider,
  SparqlQueryMethod,
  QLeverSettings,
} from "../src/graph-explorer/index";

import {
  onPageLoad,
  tryLoadLayoutFromLocalStorage,
  saveLayoutToLocalStorage,
} from "./common";

function onWorkspaceMounted(workspace: Workspace) {
  if (!workspace) {
    return;
  }

  const diagram = tryLoadLayoutFromLocalStorage();
  workspace.getModel().importLayout({
    diagram,
    validateLinks: true,
    dataProvider: new SparqlDataProvider(
      {
        // this goes to process.env.SPARQL_ENDPOINT via the dev-server proxy rule in vite.demo.config.mts
        endpointUrl: "../sparql",
        queryMethod: SparqlQueryMethod.GET,
      },
      {
        ...QLeverSettings,
        // the swiss-linked-data QLever test instance used to develop this
        // demo labels resources via schema:name rather than rdfs:label —
        // adjust (or remove) to match whatever dataset your endpoint serves
        dataLabelProperty: "<http://schema.org/name>",
        // many real-world datasets (including this test one) never formally
        // declare `owl:Class`, so list types actually used by instances instead
        classTreeQuery: `
          SELECT distinct ?class ?label WHERE {
            ?inst a ?class .
            OPTIONAL {?class rdfs:label ?label.}
          }`,
      }
    ),
  });
}

const props: WorkspaceProps & ClassAttributes<Workspace> = {
  ref: onWorkspaceMounted,
  onSaveDiagram: (workspace) => {
    const diagram = workspace.getModel().exportLayout();
    window.location.hash = saveLayoutToLocalStorage(diagram);
    window.location.reload();
  },
  viewOptions: {
    onIriClick: ({ iri }) => window.open(iri),
  },
};

onPageLoad((container) => {
  createRoot(container).render(createElement(Workspace, props));
});
