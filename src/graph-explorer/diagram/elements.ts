import {
  ElementModel,
  LinkModel,
  LocalizedString,
  ElementIri,
  ElementTypeIri,
  LinkTypeIri,
  PropertyTypeIri,
} from "../data/model";
import { GenerateID } from "../data/schema";

import { EventSource, Events, PropertyChange } from "../viewUtils/events";

import { Vector, Size, isPolylineEqual, Rect } from "./geometry";

export type Cell = Element | Link | LinkVertex;

export enum LinkDirection {
  in = "in",
  out = "out",
}

export interface ElementEvents {
  changeData: PropertyChange<Element, ElementModel>;
  changePosition: PropertyChange<Element, Vector>;
  changeSize: PropertyChange<Element, Size>;
  changeExpanded: PropertyChange<Element, boolean>;
  changeGroup: PropertyChange<Element, string>;
  changeElementState: PropertyChange<Element, ElementTemplateState | undefined>;
  requestedFocus: { source: Element };
  requestedGroupContent: { source: Element };
  requestedAddToFilter: {
    source: Element;
    linkType?: FatLinkType;
    direction?: "in" | "out";
  };
  requestedRedraw: { source: Element };
}

export class Element {
  private readonly source = new EventSource<ElementEvents>();
  readonly events: Events<ElementEvents> = this.source;

  readonly id: string;
  /** All in and out links of the element */
  readonly links: Link[] = [];

  private _data: ElementModel;
  private _position: Vector;
  private _size: Size;
  private _expanded: boolean;
  private _group: string | undefined;
  private _elementState: ElementTemplateState | undefined;
  private _temporary: boolean;

  constructor(props: {
    id: string;
    data: ElementModel;
    position?: Vector;
    size?: Size;
    expanded?: boolean;
    group?: string;
    elementState?: ElementTemplateState;
    temporary?: boolean;
  }) {
    const {
      id,
      data,
      position = { x: 0, y: 0 },
      size = { width: 0, height: 0 },
      expanded = false,
      group,
      elementState,
      temporary = false,
    } = props;

    this.id = id;
    this._data = data;
    this._position = position;
    this._size = size;
    this._expanded = expanded;
    this._group = group;
    this._elementState = elementState;
    this._temporary = temporary;
  }

  get iri() {
    return this._data.id;
  }

  get data() {
    return this._data;
  }
  setData(value: ElementModel) {
    const previous = this._data;
    if (previous === value) {
      return;
    }
    this._data = value;
    this.source.trigger("changeData", { source: this, previous });
    updateLinksToReferByNewIri(this, previous.id, value.id);
  }

  get position(): Vector {
    return this._position;
  }
  setPosition(value: Vector) {
    const previous = this._position;
    const same = previous.x === value.x && previous.y === value.y;
    if (same) {
      return;
    }
    this._position = value;
    this.source.trigger("changePosition", { source: this, previous });
  }

  get size(): Size {
    return this._size;
  }
  setSize(value: Size) {
    const previous = this._size;
    const same =
      previous.width === value.width && previous.height === value.height;
    if (same) {
      return;
    }
    this._size = value;
    this.source.trigger("changeSize", { source: this, previous });
  }

  get isExpanded(): boolean {
    return this._expanded;
  }
  setExpanded(value: boolean) {
    const previous = this._expanded;
    if (previous === value) {
      return;
    }
    this._expanded = value;
    this.source.trigger("changeExpanded", { source: this, previous });
  }

  get group(): string | undefined {
    return this._group;
  }
  setGroup(value: string | undefined) {
    const previous = this._group;
    if (previous === value) {
      return;
    }
    this._group = value;
    this.source.trigger("changeGroup", { source: this, previous });
  }

  get elementState(): ElementTemplateState | undefined {
    return this._elementState;
  }
  setElementState(value: ElementTemplateState | undefined) {
    const previous = this._elementState;
    if (previous === value) {
      return;
    }
    this._elementState = value;
    this.source.trigger("changeElementState", { source: this, previous });
  }

  get temporary(): boolean {
    return this._temporary;
  }

  focus() {
    this.source.trigger("requestedFocus", { source: this });
  }

  requestGroupContent() {
    this.source.trigger("requestedGroupContent", { source: this });
  }

  addToFilter(linkType?: FatLinkType, direction?: "in" | "out") {
    this.source.trigger("requestedAddToFilter", {
      source: this,
      linkType,
      direction,
    });
  }

  redraw() {
    this.source.trigger("requestedRedraw", { source: this });
  }
}

export type ElementTemplateState = Record<string, any>;

export interface AddToFilterRequest {
  element: Element;
  linkType?: FatLinkType;
  direction?: "in" | "out";
}

function updateLinksToReferByNewIri(
  element: Element,
  oldIri: ElementIri,
  newIri: ElementIri
) {
  if (oldIri === newIri) {
    return;
  }
  for (const link of element.links) {
    let data = link.data;
    if (data.sourceId === oldIri) {
      data = { ...data, sourceId: newIri };
    }
    if (data.targetId === oldIri) {
      data = { ...data, targetId: newIri };
    }
    link.setData(data);
  }
}

export interface FatClassModelEvents {
  changeLabel: PropertyChange<FatClassModel, readonly LocalizedString[]>;
  changeCount: PropertyChange<FatClassModel, number | undefined>;
}

export class FatClassModel {
  private readonly source = new EventSource<FatClassModelEvents>();
  readonly events: Events<FatClassModelEvents> = this.source;

  readonly id: ElementTypeIri;

  private _label: readonly LocalizedString[];
  private _count: number | undefined;

  constructor(props: {
    id: ElementTypeIri;
    label?: readonly LocalizedString[];
    count?: number;
  }) {
    const { id, label = [], count } = props;
    this.id = id;
    this._label = label;
    this._count = count;
  }

  get label() {
    return this._label;
  }
  setLabel(value: readonly LocalizedString[]) {
    const previous = this._label;
    if (previous === value) {
      return;
    }
    this._label = value;
    this.source.trigger("changeLabel", { source: this, previous });
  }

  get count() {
    return this._count;
  }
  setCount(value: number | undefined) {
    const previous = this._count;
    if (previous === value) {
      return;
    }
    this._count = value;
    this.source.trigger("changeCount", { source: this, previous });
  }
}

export interface RichPropertyEvents {
  changeLabel: PropertyChange<RichProperty, readonly LocalizedString[]>;
}

export class RichProperty {
  private readonly source = new EventSource<RichPropertyEvents>();
  readonly events: Events<RichPropertyEvents> = this.source;

  readonly id: PropertyTypeIri;

  private _label: readonly LocalizedString[];

  constructor(props: {
    id: PropertyTypeIri;
    label?: readonly LocalizedString[];
  }) {
    const { id, label = [] } = props;
    this.id = id;
    this._label = label;
  }

  get label(): readonly LocalizedString[] {
    return this._label;
  }
  setLabel(value: readonly LocalizedString[]) {
    const previous = this._label;
    if (previous === value) {
      return;
    }
    this._label = value;
    this.source.trigger("changeLabel", { source: this, previous });
  }
}

export interface LinkEvents {
  changeData: PropertyChange<Link, LinkModel>;
  changeLayoutOnly: PropertyChange<Link, boolean>;
  changeVertices: PropertyChange<Link, readonly Vector[]>;
  changeLabelBounds: PropertyChange<Link, Rect>;
  changeLinkState: PropertyChange<Link, LinkTemplateState | undefined>;
}

export class Link {
  private readonly source = new EventSource<LinkEvents>();
  readonly events: Events<LinkEvents> = this.source;

  readonly id: string;

  private _typeId: LinkTypeIri;
  private _sourceId: string;
  private _targetId: string;

  private _data: LinkModel | undefined;
  private _labelBounds: Rect | undefined;
  private _layoutOnly: boolean;
  private _vertices: readonly Vector[];

  private _linkState: LinkTemplateState | undefined;

  constructor(props: {
    id?: string;
    typeId: LinkTypeIri;
    sourceId: string;
    targetId: string;
    data?: LinkModel;
    vertices?: readonly Vector[];
    linkState?: LinkTemplateState;
  }) {
    const {
      id = GenerateID.forLink(),
      typeId,
      sourceId,
      targetId,
      data,
      vertices = [],
      linkState,
    } = props;
    this.id = id;
    this._typeId = typeId;
    this._sourceId = sourceId;
    this._targetId = targetId;
    this._data = data;
    this._vertices = vertices;
    this._linkState = linkState;
  }

  get typeId() {
    return this._typeId;
  }
  get sourceId(): string {
    return this._sourceId;
  }
  get targetId(): string {
    return this._targetId;
  }

  get data() {
    return this._data;
  }
  setData(value: LinkModel | undefined) {
    const previous = this._data;
    if (previous === value) {
      return;
    }
    this._data = value;
    this._typeId = value.linkTypeId;
    this.source.trigger("changeData", { source: this, previous });
  }

  get labelBounds() {
    return this._labelBounds;
  }
  setLabelBounds(value: Rect | undefined) {
    const previous = this._labelBounds;
    if (previous === value) {
      return;
    }
    this._labelBounds = value;
    this.source.trigger("changeLabelBounds", { source: this, previous });
  }

  get layoutOnly(): boolean {
    return this._layoutOnly;
  }
  setLayoutOnly(value: boolean) {
    const previous = this._layoutOnly;
    if (previous === value) {
      return;
    }
    this._layoutOnly = value;
    this.source.trigger("changeLayoutOnly", { source: this, previous });
  }

  get vertices(): readonly Vector[] {
    return this._vertices;
  }
  setVertices(value: readonly Vector[]) {
    const previous = this._vertices;
    if (isPolylineEqual(this._vertices, value)) {
      return;
    }
    this._vertices = value;
    this.source.trigger("changeVertices", { source: this, previous });
  }

  get linkState(): LinkTemplateState | undefined {
    return this._linkState;
  }
  setLinkState(value: LinkTemplateState | undefined) {
    const previous = this._linkState;
    if (previous === value) {
      return;
    }
    this._linkState = value;
    this.source.trigger("changeLinkState", { source: this, previous });
  }
}

export type LinkTemplateState = Record<string, any>;

export function linkMarkerKey(linkTypeIndex: number, startMarker: boolean) {
  return `graph-explorer-${startMarker ? "mstart" : "mend"}-${linkTypeIndex}`;
}

export interface FatLinkTypeEvents {
  changeLabel: PropertyChange<FatLinkType, readonly LocalizedString[]>;
  changeIsNew: PropertyChange<FatLinkType, boolean>;
  changeVisibility: {
    source: FatLinkType;
    preventLoading: boolean;
  };
}

/**
 * Properties:
 *     visible: boolean
 *     showLabel: boolean
 *     isNew?: boolean
 *     label?: { values: LocalizedString[] }
 */
export class FatLinkType {
  private readonly source = new EventSource<FatLinkTypeEvents>();
  readonly events: Events<FatLinkTypeEvents> = this.source;

  readonly id: LinkTypeIri;

  private _index: number | undefined;

  private _label: readonly LocalizedString[];
  private _isNew = false;

  private _visible = true;
  private _showLabel = true;

  constructor(props: {
    id: LinkTypeIri;
    index?: number;
    label?: readonly LocalizedString[];
  }) {
    const { id, index, label = [] } = props;
    this.id = id;
    this._index = index;
    this._label = label;
  }

  get index() {
    return this._index;
  }
  setIndex(value: number) {
    if (typeof this._index === "number") {
      throw new Error("Cannot set index for link type more than once.");
    }
    this._index = value;
  }

  get label() {
    return this._label;
  }
  setLabel(value: readonly LocalizedString[]) {
    const previous = this._label;
    if (previous === value) {
      return;
    }
    this._label = value;
    this.source.trigger("changeLabel", { source: this, previous });
  }

  get visible() {
    return this._visible;
  }
  get showLabel() {
    return this._showLabel;
  }
  setVisibility(params: {
    visible: boolean;
    showLabel: boolean;
    preventLoading?: boolean;
  }) {
    const same =
      this._visible === params.visible && this._showLabel === params.showLabel;
    if (same) {
      return;
    }
    const preventLoading =
      Boolean(params.preventLoading) || this._visible === params.visible;
    this._visible = params.visible;
    this._showLabel = params.showLabel;
    this.source.trigger("changeVisibility", { source: this, preventLoading });
  }

  get isNew() {
    return this._isNew;
  }
  setIsNew(value: boolean) {
    const previous = this._isNew;
    if (previous === value) {
      return;
    }
    this._isNew = value;
    this.source.trigger("changeIsNew", { source: this, previous });
  }
}

export class LinkVertex {
  constructor(readonly link: Link, readonly vertexIndex: number) {}

  createAt(location: Vector) {
    const vertices = [...this.link.vertices];
    vertices.splice(this.vertexIndex, 0, location);
    this.link.setVertices(vertices);
  }

  moveTo(location: Vector) {
    const vertices = [...this.link.vertices];
    vertices.splice(this.vertexIndex, 1, location);
    this.link.setVertices(vertices);
  }

  remove() {
    const vertices = [...this.link.vertices];
    vertices.splice(this.vertexIndex, 1);
    this.link.setVertices(vertices);
  }
}
