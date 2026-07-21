import { createElement, ClassAttributes } from "react";
import { createRoot } from "react-dom/client";

import {
  Workspace,
  WorkspaceProps,
  SparqlDataProvider,
  SparqlQueryMethod,
  OWLRDFSSettings,
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

        imagePropertyUris: [
          "http://xmlns.com/foaf/0.1/depiction",
          "http://xmlns.com/foaf/0.1/img",
        ],
        queryMethod: SparqlQueryMethod.GET,
      },
      {
        ...OWLRDFSSettings,
        ...{
          classTreeQuery: `        
          SELECT distinct ?class ?label ?parent WHERE {
            ?class a owl:Class.
            OPTIONAL {?class rdfs:label ?label.}
            OPTIONAL {?class rdfs:subClassOf ?parent}
          }`,
        },
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
