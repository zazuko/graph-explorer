import {
  ElementModel,
  LinkModel,
  ElementIri,
  sameLink,
  hashLink,
} from "../data/model";

import { HashMap, ReadonlyHashMap, cloneMap } from "../viewUtils/collections";

export interface AuthoringState {
  readonly elements: ReadonlyMap<ElementIri, ElementChange>;
  readonly links: ReadonlyHashMap<LinkModel, LinkChange>;
}

export type AuthoringEvent = ElementChange | LinkChange;

export enum AuthoringKind {
  ChangeElement = "changeElement",
  ChangeLink = "changeLink",
}

export interface ElementChange {
  readonly type: AuthoringKind.ChangeElement;
  readonly before?: ElementModel;
  readonly after: ElementModel;
  readonly newIri?: ElementIri;
  readonly deleted: boolean;
}

export interface LinkChange {
  readonly type: AuthoringKind.ChangeLink;
  readonly before?: LinkModel;
  readonly after: LinkModel;
  readonly deleted: boolean;
}

interface MutableAuthoringState extends AuthoringState {
  readonly elements: Map<ElementIri, ElementChange>;
  readonly links: HashMap<LinkModel, LinkChange>;
}

export const AuthoringState = {
  empty: {
    elements: new Map<ElementIri, ElementChange>(),
    links: new HashMap<LinkModel, LinkChange>(hashLink, sameLink),
  } as AuthoringState,

  isEmpty(state: AuthoringState) {
    return state.elements.size === 0 && state.links.size === 0;
  },

  clone(index: AuthoringState): MutableAuthoringState {
    return {
      elements: cloneMap(index.elements),
      links: index.links.clone(),
    };
  },

  has(state: AuthoringState, event: AuthoringEvent): boolean {
    return event.type === AuthoringKind.ChangeElement
      ? state.elements.get(event.after.id) === event
      : state.links.get(event.after) === event;
  },

  discard(state: AuthoringState, discarded: AuthoringEvent): AuthoringState {
    if (!this.has(state, discarded)) {
      return state;
    }
    const newState = this.clone(state);
    if (discarded.type === AuthoringKind.ChangeElement) {
      newState.elements.delete(discarded.after.id);
      if (!discarded.before) {
        state.links.forEach((e) => {
          if (isLinkConnectedToElement(e.after, discarded.after.id)) {
            newState.links.delete(e.after);
          }
        });
      }
    } else {
      newState.links.delete(discarded.after);
    }
    return newState;
  },

  addElement(state: AuthoringState, item: ElementModel): AuthoringState {
    const event: ElementChange = {
      type: AuthoringKind.ChangeElement,
      after: item,
      deleted: false,
    };
    const newState = this.clone(state);
    newState.elements.set(event.after.id, event);
    return newState;
  },

  addLink(state: AuthoringState, item: LinkModel): AuthoringState {
    const event: LinkChange = {
      type: AuthoringKind.ChangeLink,
      after: item,
      deleted: false,
    };
    const newState = this.clone(state);
    newState.links.set(event.after, event);
    return newState;
  },

  changeElement(
    state: AuthoringState,
    before: ElementModel,
    after: ElementModel
  ): AuthoringState {
    const newState = this.clone(state);
    // delete previous state for an entity
    newState.elements.delete(before.id);

    const previous = state.elements.get(before.id);
    if (previous && !previous.before) {
      // adding or changing new entity
      newState.elements.set(after.id, {
        type: AuthoringKind.ChangeElement,
        after,
        deleted: false,
      });
      if (before.id !== after.id) {
        state.links.forEach((e) => {
          if (!e.before && isLinkConnectedToElement(e.after, before.id)) {
            const updatedLink = updateLinkToReferByNewIri(
              e.after,
              before.id,
              after.id
            );
            newState.links.delete(e.after);
            newState.links.set(updatedLink, {
              type: AuthoringKind.ChangeLink,
              after: updatedLink,
              deleted: false,
            });
          }
        });
      }
    } else {
      // changing existing entity
      const iriChanged = after.id !== before.id;
      const previousBefore = previous ? previous.before : undefined;
      newState.elements.set(before.id, {
        type: AuthoringKind.ChangeElement,
        // always initialize 'before', otherwise entity will be considered new
        before: previousBefore || before,
        after: iriChanged ? { ...after, id: before.id } : after,
        newIri: iriChanged ? after.id : undefined,
        deleted: false,
      });
    }

    return newState;
  },

  changeLink(
    state: AuthoringState,
    before: LinkModel,
    after: LinkModel
  ): AuthoringState {
    if (!sameLink(before, after)) {
      throw new Error("Cannot move link to another element or change its type");
    }
    const newState = this.clone(state);
    const previous = state.links.get(before);
    newState.links.set(before, {
      type: AuthoringKind.ChangeLink,
      before: previous ? previous.before : undefined,
      after: after,
      deleted: false,
    });
    return newState;
  },

  deleteElement(state: AuthoringState, model: ElementModel): AuthoringState {
    const newState = this.clone(state);
    newState.elements.delete(model.id);
    state.links.forEach((e) => {
      if (isLinkConnectedToElement(e.after, model.id)) {
        newState.links.delete(e.after);
      }
    });
    if (!this.isNewElement(state, model.id)) {
      newState.elements.set(model.id, {
        type: AuthoringKind.ChangeElement,
        before: model,
        after: model,
        deleted: true,
      });
    }
    return newState;
  },

  deleteLink(state: AuthoringState, target: LinkModel): AuthoringState {
    const newState = this.clone(state);
    newState.links.delete(target);
    if (!this.isNewLink(state, target)) {
      newState.links.set(target, {
        type: AuthoringKind.ChangeLink,
        before: target,
        after: target,
        deleted: true,
      });
    }
    return newState;
  },

  deleteNewLinksConnectedToElements(
    state: AuthoringState,
    elementIris: Set<ElementIri>
  ): AuthoringState {
    const newState = this.clone(state);
    state.links.forEach((e) => {
      if (!e.before) {
        const target = e.after;
        if (
          elementIris.has(target.sourceId) ||
          elementIris.has(target.targetId)
        ) {
          newState.links.delete(target);
        }
      }
    });
    return newState;
  },

  isNewElement(state: AuthoringState, target: ElementIri): boolean {
    const event = state.elements.get(target);
    return event && event.type === AuthoringKind.ChangeElement && !event.before;
  },

  isDeletedElement(state: AuthoringState, target: ElementIri): boolean {
    const event = state.elements.get(target);
    return event && event.deleted;
  },

  isElementWithModifiedIri(state: AuthoringState, target: ElementIri): boolean {
    const event = state.elements.get(target);
    return (
      event &&
      event.type === AuthoringKind.ChangeElement &&
      event.before &&
      Boolean(event.newIri)
    );
  },

  isNewLink(state: AuthoringState, linkModel: LinkModel): boolean {
    const event = state.links.get(linkModel);
    return event && !event.before;
  },

  isDeletedLink(state: AuthoringState, linkModel: LinkModel): boolean {
    const event = state.links.get(linkModel);
    return (
      (event && event.deleted) ||
      this.isDeletedElement(state, linkModel.sourceId) ||
      this.isDeletedElement(state, linkModel.targetId)
    );
  },

  isUncertainLink(state: AuthoringState, linkModel: LinkModel): boolean {
    return (
      !this.isDeletedLink(state, linkModel) &&
      (this.isElementWithModifiedIri(state, linkModel.sourceId) ||
        this.isElementWithModifiedIri(state, linkModel.targetId))
    );
  },
};

export function isLinkConnectedToElement(
  link: LinkModel,
  elementIri: ElementIri
) {
  return link.sourceId === elementIri || link.targetId === elementIri;
}

function updateLinkToReferByNewIri(
  link: LinkModel,
  oldIri: ElementIri,
  newIri: ElementIri
): LinkModel {
  return {
    ...link,
    sourceId: link.sourceId === oldIri ? newIri : link.sourceId,
    targetId: link.targetId === oldIri ? newIri : link.targetId,
  };
}
