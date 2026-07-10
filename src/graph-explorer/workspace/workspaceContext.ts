import { createContext } from "react";
import { EditorController } from "../editor/editorController";

export type WorkspaceEventHandler = (key: WorkspaceEventKey) => void;
export enum WorkspaceEventKey {
  searchUpdateCriteria = "search:updateCriteria",
  searchQueryItem = "search:queryItems",
  connectionsLoadLinks = "connections:loadLinks",
  connectionsExpandLink = "connections:expandLink",
  connectionsLoadElements = "connections:loadElements",
  editorChangeSelection = "editor:changeSelection",
  editorToggleDialog = "editor:toggleDialog",
  editorAddElements = "editor:addElements",
}

export interface WorkspaceContextWrapper {
  workspace: WorkspaceContext;
}

export interface WorkspaceContext {
  editor: EditorController;
  triggerWorkspaceEvent: WorkspaceEventHandler;
}

export const WorkspaceContext =
  createContext<WorkspaceContextWrapper>(null);
