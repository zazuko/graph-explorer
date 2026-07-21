import { createElement, ClassAttributes } from "react";
import { createRoot } from "react-dom/client";

import {
  Workspace,
  WorkspaceProps,
  DemoDataProvider,
} from "../src/graph-explorer/index";

import {
  onPageLoad,
  tryLoadLayoutFromLocalStorage,
  saveLayoutToLocalStorage,
} from "./common";

import CLASSES from "./resources/classes.json";
import LINK_TYPES from "./resources/linkTypes.json";
import ELEMENTS from "./resources/elements.json";
import LINKS from "./resources/links.json";

function onWorkspaceMounted(workspace: Workspace) {
  if (!workspace) {
    return;
  }

  const diagram = tryLoadLayoutFromLocalStorage();
  workspace.getModel().importLayout({
    diagram,
    dataProvider: new DemoDataProvider(
      CLASSES as never,
      LINK_TYPES as never,
      ELEMENTS as never,
      LINKS as never
    ),
    validateLinks: true,
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
