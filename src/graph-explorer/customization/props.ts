import { ComponentClass } from "react";
import { DiagramModel } from "../diagram/model";

import {
  ElementIri,
  ElementModel,
  Dictionary,
  LocalizedString,
  Property,
} from "../data/model";
import { Link } from "../diagram/elements";

export type TypeStyleResolver = (
  types: string[]
) => CustomTypeStyle | undefined;
export type LinkTemplateResolver = (
  linkType: string
) => LinkTemplate | undefined;
export type TemplateResolver = (types: string[]) => ElementTemplate | undefined;

export interface CustomTypeStyle {
  color?: string;
  icon?: string;
}

export type ElementTemplate = ComponentClass<TemplateProps>;

export interface TemplateProps {
  elementId: string;
  data: ElementModel;
  iri: ElementIri;
  types: string;
  label: string;
  color: any;
  iconUrl: string;
  imgUrl?: string;
  isExpanded?: boolean;
  propsAsList?: PropArray;
  props?: Dictionary<Property>;
}

export type PropArray = {
  id: string;
  name: string;
  property: Property;
}[];

export interface LinkTemplate {
  markerSource?: LinkMarkerStyle;
  markerTarget?: LinkMarkerStyle;
  renderLink?(link: Link): LinkStyle;
  setLinkLabel?: (link: Link, label: string) => void;
}

export interface LinkStyle {
  connection?: {
    fill?: string;
    stroke?: string;
    "stroke-width"?: number;
    "stroke-dasharray"?: string;
  };
  label?: LinkLabel;
  properties?: LinkLabel[];
  connector?: { name?: string; args?: {} };
}

export interface LinkRouter {
  route(model: DiagramModel): RoutedLinks;
}

export type RoutedLinks = Map<string, RoutedLink>;

export interface RoutedLink {
  linkId: string;
  vertices: readonly Vertex[];
  labelTextAnchor?: "start" | "middle" | "end";
}

export interface Vertex {
  x: number;
  y: number;
}

export interface LinkMarkerStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  d?: string;
  width?: number;
  height?: number;
}

export interface LinkLabel {
  position?: number;
  title?: string;
  attrs?: {
    rect?: {
      fill?: string;
      stroke?: string;
      "stroke-width"?: number;
    };
    text?: {
      fill?: string;
      stroke?: string;
      "stroke-width"?: number;
      "font-family"?: string;
      "font-size"?: string | number;
      "font-weight"?: "normal" | "bold" | "lighter" | "bolder" | number;
      text?: LocalizedString[];
    };
  };
}
