import {
  ElementModel,
  LinkModel,
  ElementIri,
  sameLink,
  hashLink,
} from '../data/model';

import { HashMap, ReadonlyHashMap, cloneMap } from '../viewUtils/collections';

export interface TemporaryState {
  readonly elements: ReadonlyMap<ElementIri, ElementModel>;
  readonly links: ReadonlyHashMap<LinkModel, LinkModel>;
}
export const TemporaryState = {
  empty: {
    elements: new Map<ElementIri, ElementModel>(),
    links: new HashMap<LinkModel, LinkModel>(hashLink, sameLink),
  } as TemporaryState,

  addElement(state: TemporaryState, element: ElementModel) {
    const elements = cloneMap(state.elements);
    elements.set(element.id, element);
    return { ...state, elements };
  },

  deleteElement(state: TemporaryState, element: ElementModel) {
    const elements = cloneMap(state.elements);
    elements.delete(element.id);
    return { ...state, elements };
  },

  addLink(state: TemporaryState, link: LinkModel) {
    const links = state.links.clone();
    links.set(link, link);
    return { ...state, links };
  },
  deleteLink(state: TemporaryState, link: LinkModel) {
    const links = state.links.clone();
    links.delete(link);
    return { ...state, links };
  },
};
