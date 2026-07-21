import * as React from "react";
import { createRoot } from "react-dom/client";

import {
  Workspace,
  WorkspaceProps,
  DemoDataProvider,
  ToolbarProps,
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

export interface Props extends ToolbarProps {
  onExampleClick?: () => void;
}

const CLASS_NAME = "graph-explorer-toolbar";

export class Toolbar extends React.Component<Props, {}> {
  render() {
    return (
      <div className={CLASS_NAME}>
        <div className="graph-explorer-btn-group graph-explorer-btn-group-sm">
          <span className={`${CLASS_NAME}__layout-group`}>
            <label className="graph-explorer-label">
              <span>Layout - </span>
            </label>
            <span className="graph-explorer-btn-group graph-explorer-btn-group-sm">
              <button
                type="button"
                className="graph-explorer-btn graph-explorer-btn-default"
                onClick={this.props.onForceLayout}
              >
                <span
                  title="Force layout"
                  className="fa fa-snowflake-o"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className="graph-explorer-btn graph-explorer-btn-default"
                onClick={this.props.onExampleClick}
              >
                <span title="Example button">Exapmle button</span>
              </button>
            </span>
          </span>
        </div>
      </div>
    );
  }
}

function onWorkspaceMounted(workspace: Workspace) {
  if (!workspace) {
    return;
  }

  const model = workspace.getModel();

  const diagram = tryLoadLayoutFromLocalStorage();
  model.importLayout({
    dataProvider: new DemoDataProvider(
      CLASSES as never,
      LINK_TYPES as never,
      ELEMENTS as never,
      LINKS as never
    ),
    diagram,
    validateLinks: true,
  });
}

const props: WorkspaceProps & React.ClassAttributes<Workspace> = {
  ref: onWorkspaceMounted,
  onSaveDiagram: (workspace) => {
    const diagram = workspace.getModel().exportLayout();
    window.location.hash = saveLayoutToLocalStorage(diagram);
    window.location.reload();
  },
  toolbar: (
    <Toolbar
      onExampleClick={() => {
        alert("Example button has been pressed!");
      }}
    />
  ),
};

onPageLoad((container) => {
  createRoot(container).render(React.createElement(Workspace, props));
});
