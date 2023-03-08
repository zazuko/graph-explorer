import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {
  Workspace,
  WorkspaceProps,
  DemoDataProvider,
  ToolbarProps,
} from '../src/graph-explorer/index';
import {
  onPageLoad,
  tryLoadLayoutFromLocalStorage,
  saveLayoutToLocalStorage,
} from './common';

const CLASSES = require('./resources/classes.json');
const LINK_TYPES = require('./resources/linkTypes.json');
const ELEMENTS = require('./resources/elements.json');
const LINKS = require('./resources/links.json');

export interface Props extends ToolbarProps {
  onExampleClick?: (workspace: Workspace) => void;
}

const CLASS_NAME = 'graph-explorer-toolbar';

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
                onClick={() => this.props.onExampleClick(this.props.workspace)}
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
    dataProvider: new DemoDataProvider(CLASSES, LINK_TYPES, ELEMENTS, LINKS),
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
      onExampleClick={(workspace : Workspace) => {
        alert('Example button has been pressed!');
      }}
    />
  ),
};

onPageLoad((container) => {
  ReactDOM.render(React.createElement(Workspace, props), container);
});
