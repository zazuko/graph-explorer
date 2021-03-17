import { ElementTypeIri, LinkTypeIri } from './model';
import { generate128BitID } from './utils';

// context could be imported directly from NPM package, e.g.
export const DIAGRAM_CONTEXT_URL_V1 =
  'https://graph-explorer.org/context/v1.json';

export const PLACEHOLDER_ELEMENT_TYPE = 'http://graph-explorer.org/NewEntity' as ElementTypeIri;
export const PLACEHOLDER_LINK_TYPE = 'http://graph-explorer.org/NewLink' as LinkTypeIri;
const GRAPH_EXPLORER_ID_URL_PREFIX = 'http://graph-explorer.org/data/';

export const GenerateID = {
  forElement() {
    return `${GRAPH_EXPLORER_ID_URL_PREFIX}e_${generate128BitID()}`;
  },
  forLink() {
    return `${GRAPH_EXPLORER_ID_URL_PREFIX}l_${generate128BitID()}`;
  },
};

export const TemplateProperties = {
  PinnedProperties: 'graph-explorer:pinnedProperties',
  CustomLabel: 'graph-explorer:customLabel',
};
