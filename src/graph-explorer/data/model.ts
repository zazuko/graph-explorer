import { hashFnv32a } from "./utils";
import { RdfIri } from "./sparql/sparqlModels";

export type Dictionary<T> = Record<string, T>;

export interface LocalizedString {
  readonly value: string;
  readonly language: string;
  /** Equals `xsd:string` if not defined. */
  readonly datatype?: { readonly value: string };
}

export interface IriProperty {
  type: "uri";
  values: readonly RdfIri[];
}
export interface LiteralProperty {
  type: "string";
  values: readonly LocalizedString[];
}
export type Property = IriProperty | LiteralProperty;

export function isIriProperty(e: Property): e is IriProperty {
  return e && e.type === "uri";
}
export function isLiteralProperty(e: Property): e is LiteralProperty {
  return e && e.type === "string";
}

export type ElementIri = string & { readonly elementBrand: any };
export type ElementTypeIri = string & { readonly classBrand: any };
export type LinkTypeIri = string & { readonly linkTypeBrand: any };
export type PropertyTypeIri = string & { readonly propertyTypeBrand: any };

export interface ElementModel {
  id: ElementIri;
  types: ElementTypeIri[];
  label: { values: LocalizedString[] };
  image?: string;
  properties: Record<string, Property>;
  sources?: string[];
}

export interface LinkModel {
  linkTypeId: LinkTypeIri;
  sourceId: ElementIri;
  targetId: ElementIri;
  properties?: Record<string, Property>;
}

export interface ClassModel {
  id: ElementTypeIri;
  label: { values: LocalizedString[] };
  count?: number;
  children: ClassModel[];
}

export interface LinkCount {
  id: LinkTypeIri;
  inCount: number;
  outCount: number;
}

export interface LinkType {
  id: LinkTypeIri;
  label: { values: LocalizedString[] };
  count?: number;
}

export interface PropertyModel {
  id: PropertyTypeIri;
  label: { values: LocalizedString[] };
}

export function sameLink(left: LinkModel, right: LinkModel) {
  return (
    left.linkTypeId === right.linkTypeId &&
    left.sourceId === right.sourceId &&
    left.targetId === right.targetId
  );
}

export function hashLink(link: LinkModel): number {
  const { linkTypeId, sourceId, targetId } = link;
  let hash = hashFnv32a(linkTypeId);
  hash = hash * 31 + hashFnv32a(sourceId);
  hash = hash * 31 + hashFnv32a(targetId);
  return hash;
}

export function sameElement(left: ElementModel, right: ElementModel): boolean {
  return (
    left.id === right.id &&
    isArraysEqual(left.types, right.types) &&
    isLiteralsEqual(left.label.values, right.label.values) &&
    left.image === right.image &&
    isPropertiesEqual(left.properties, right.properties) &&
    ((!left.sources && !right.sources) ||
      (left.sources &&
        right.sources &&
        isArraysEqual(left.sources, right.sources)))
  );
}

function isArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) {
      return false;
    }
  }
  return true;
}

function isLiteralsEqual(
  left: readonly LocalizedString[],
  right: readonly LocalizedString[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    const leftValue = left[i];
    const rightValue = right[i];
    if (
      leftValue.value !== rightValue.value ||
      leftValue.language !== rightValue.language
    ) {
      return false;
    }
  }
  return true;
}

function isIriPropertiesEqual(left: Property, right: Property): boolean {
  if (!isIriProperty(left) || !isIriProperty(right)) {
    return false;
  }
  if (left.values.length !== right.values.length) {
    return false;
  }
  for (let i = 0; i < left.values.length; i++) {
    const leftValue = left.values[i];
    const rightValue = right.values[i];
    if (leftValue.value !== rightValue.value) {
      return false;
    }
  }
  return true;
}

function isLiteralPropertiesEqual(left: Property, right: Property): boolean {
  if (!isLiteralProperty(left) || !isLiteralProperty(right)) {
    return false;
  }
  return isLiteralsEqual(left.values, right.values);
}

function isPropertiesEqual(
  left: Record<string, Property>,
  right: Record<string, Property>
) {
  if (Object.keys(left).length !== Object.keys(right).length) {
    return false;
  }
  for (const key in left.properties) {
    if (key in left.properties) {
      const leftProperty = left[key];
      const rightProperty = right[key];
      if (!rightProperty) {
        return false;
      }
      if (
        !isIriPropertiesEqual(leftProperty, rightProperty) &&
        !isLiteralPropertiesEqual(leftProperty, rightProperty)
      ) {
        return false;
      }
    }
  }
  return true;
}
