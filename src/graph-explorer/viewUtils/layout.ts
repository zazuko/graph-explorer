import * as cola from "webcola";
import ELK from "elkjs";

import { DiagramModel } from "../diagram/model";
import { boundsOf, Vector, computeGrouping, Size } from "../diagram/geometry";
import { Element } from "../diagram/elements";
import { EventObserver } from "./events";
import { getContentFittingBox } from "../diagram/paperArea";

export interface LayoutNode {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bounds?: any;
  fixed?: number;
  innerBounds?: any;
}

export interface LayoutLink {
  source: LayoutNode;
  target: LayoutNode;
}

/**
 * Rectangle-only overlap resolution (nudges overlapping nodes apart with
 * minimal displacement, ignoring links entirely). Kept on webcola: elk has
 * no public equivalent — `org.eclipse.elk.overlapRemoval` is an internal
 * option used by its own algorithms, not an invocable one — and this is a
 * narrower, different problem than graph layout, so it isn't worth
 * reimplementing webcola's solver from scratch.
 */
export function groupRemoveOverlaps(nodes: LayoutNode[]) {
  const nodeRectangles: cola.Rectangle[] = [];
  for (const node of nodes) {
    nodeRectangles.push(
      new cola.Rectangle(
        node.x,
        node.x + node.width,
        node.y,
        node.y + node.height
      )
    );
  }

  cola.removeOverlaps(nodeRectangles);

  for (let i = 0; i < nodeRectangles.length; i++) {
    const node = nodes[i];
    const rectangle = nodeRectangles[i];
    node.x = rectangle.x;
    node.y = rectangle.y;
  }
}

export function translateToPositiveQuadrant(
  positions: Map<string, Vector>,
  offset: Vector
) {
  let minX = Infinity,
    minY = Infinity;
  positions.forEach((position) => {
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
  });

  const { x, y } = offset;
  positions.forEach((position, key) => {
    positions.set(key, {
      x: position.x - minX + x,
      y: position.y - minY + y,
    });
  });
}

export function uniformGrid(params: {
  rows: number;
  cellSize: Vector;
}): (cellIndex: number) => LayoutNode {
  return (cellIndex) => {
    const row = Math.floor(cellIndex / params.rows);
    const column = cellIndex - row * params.rows;
    return {
      x: column * params.cellSize.x,
      y: row * params.cellSize.y,
      width: params.cellSize.x,
      height: params.cellSize.y,
    };
  };
}

export function padded(
  nodes: LayoutNode[],
  padding: { x: number; y: number } | undefined,
  transform: () => void
) {
  if (padding) {
    for (const node of nodes) {
      node.x -= padding.x;
      node.y -= padding.y;
      node.width += 2 * padding.x;
      node.height += 2 * padding.y;
    }
  }

  transform();

  if (padding) {
    for (const node of nodes) {
      node.x += padding.x;
      node.y += padding.y;
      node.width -= 2 * padding.x;
      node.height -= 2 * padding.y;
    }
  }
}

export function biasFreePadded(
  nodes: LayoutNode[],
  padding: { x: number; y: number } | undefined,
  transform: () => void
) {
  const nodeSizeMap = new Map<string, Size>();
  const possibleCompression = { x: Infinity, y: Infinity };
  for (const node of nodes) {
    nodeSizeMap.set(node.id, { width: node.width, height: node.height });
    const maxSide = Math.max(node.width, node.height);

    const compressionX = node.width ? maxSide / node.width : 1;
    const compressionY = node.height ? maxSide / node.height : 1;
    possibleCompression.x = Math.min(
      1 + (compressionX - 1),
      possibleCompression.x
    );
    possibleCompression.y = Math.min(
      1 + (compressionY - 1),
      possibleCompression.y
    );

    node.height = maxSide;
    node.width = maxSide;
  }
  padded(nodes, padding, () => transform());

  const fittingBox = getContentFittingBoxForLayout(nodes);
  for (const node of nodes) {
    const size = nodeSizeMap.get(node.id);
    node.x = (node.x - fittingBox.x) / possibleCompression.x + fittingBox.x;
    node.y = (node.y - fittingBox.y) / possibleCompression.y + fittingBox.y;
    node.height = size.height;
    node.width = size.width;
  }
}

export type CalculatedLayout = object & { readonly layoutBrand: any };

export interface UnzippedCalculatedLayout extends CalculatedLayout {
  group?: string;
  keepAveragePosition: boolean;
  positions: Map<string, Vector>;
  nestedLayouts: UnzippedCalculatedLayout[];
}

function gatherLayoutNodesAndLinks(
  model: DiagramModel,
  elements: readonly Element[],
  fixedElements: ReadonlySet<Element> | undefined
): { nodes: LayoutNode[]; links: LayoutLink[] } {
  const nodes: LayoutNode[] = [];
  const nodeById: Record<string, LayoutNode> = {};
  for (const element of elements) {
    const { x, y, width, height } = boundsOf(element);
    const node: LayoutNode = {
      id: element.id,
      x,
      y,
      width,
      height,
      fixed: fixedElements && fixedElements.has(element) ? 1 : 0,
    };
    nodeById[element.id] = node;
    nodes.push(node);
  }

  const links: LayoutLink[] = [];
  for (const link of model.links) {
    if (!model.isSourceAndTargetVisible(link)) {
      continue;
    }
    const source = model.sourceOf(link);
    const target = model.targetOf(link);
    const sourceNode = nodeById[source.id];
    const targetNode = nodeById[target.id];
    if (sourceNode && targetNode) {
      links.push({ source: sourceNode, target: targetNode });
    }
  }

  return { nodes, links };
}

export function calculateLayout(params: {
  model: DiagramModel;
  layoutFunction: (
    nodes: LayoutNode[],
    links: LayoutLink[],
    group: string
  ) => void;
  fixedElements?: ReadonlySet<Element>;
  group?: string;
  selectedElements?: ReadonlySet<Element>;
}): CalculatedLayout {
  const grouping = computeGrouping(params.model.elements);
  const { layoutFunction, model, fixedElements, selectedElements } = params;

  if (selectedElements && selectedElements.size <= 1) {
    return {
      positions: new Map(),
      nestedLayouts: [],
      keepAveragePosition: false,
    } as UnzippedCalculatedLayout;
  }
  return internalRecursion(params.group);

  function internalRecursion(group: string): CalculatedLayout {
    const elementsToProcess = group
      ? grouping.get(group)
      : model.elements.filter((el) => el.group === undefined);
    const elements = selectedElements
      ? elementsToProcess.filter((el) => selectedElements.has(el))
      : elementsToProcess;

    const nestedLayouts: CalculatedLayout[] = [];
    for (const element of elements) {
      if (grouping.has(element.id)) {
        nestedLayouts.push(internalRecursion(element.id));
      }
    }

    const { nodes, links } = gatherLayoutNodesAndLinks(
      model,
      elements,
      fixedElements
    );
    layoutFunction(nodes, links, group);

    const positions = new Map<string, Vector>();
    for (const node of nodes) {
      positions.set(node.id, { x: node.x, y: node.y });
    }

    return {
      positions,
      group,
      nestedLayouts,
      keepAveragePosition: Boolean(selectedElements),
    } as UnzippedCalculatedLayout;
  }
}

/**
 * Async counterpart to `calculateLayout`, for layout functions backed by
 * elkjs (whose `layout()` call is promise-based). Mirrors the same
 * grouping/fixedElements/selectedElements handling, including recursion
 * into nested groups.
 */
export async function calculateLayoutAsync(params: {
  model: DiagramModel;
  layoutFunction: (
    nodes: LayoutNode[],
    links: LayoutLink[],
    group: string
  ) => Promise<void>;
  fixedElements?: ReadonlySet<Element>;
  group?: string;
  selectedElements?: ReadonlySet<Element>;
}): Promise<CalculatedLayout> {
  const grouping = computeGrouping(params.model.elements);
  const { layoutFunction, model, fixedElements, selectedElements } = params;

  if (selectedElements && selectedElements.size <= 1) {
    return {
      positions: new Map(),
      nestedLayouts: [],
      keepAveragePosition: false,
    } as UnzippedCalculatedLayout;
  }
  return internalRecursion(params.group);

  async function internalRecursion(group: string): Promise<CalculatedLayout> {
    const elementsToProcess = group
      ? grouping.get(group)
      : model.elements.filter((el) => el.group === undefined);
    const elements = selectedElements
      ? elementsToProcess.filter((el) => selectedElements.has(el))
      : elementsToProcess;

    const nestedLayouts: CalculatedLayout[] = [];
    for (const element of elements) {
      if (grouping.has(element.id)) {
        nestedLayouts.push(await internalRecursion(element.id));
      }
    }

    const { nodes, links } = gatherLayoutNodesAndLinks(
      model,
      elements,
      fixedElements
    );
    await layoutFunction(nodes, links, group);

    const positions = new Map<string, Vector>();
    for (const node of nodes) {
      positions.set(node.id, { x: node.x, y: node.y });
    }

    return {
      positions,
      group,
      nestedLayouts,
      keepAveragePosition: Boolean(selectedElements),
    } as UnzippedCalculatedLayout;
  }
}

export function applyLayout(model: DiagramModel, layout: CalculatedLayout) {
  const { positions, group, nestedLayouts, keepAveragePosition } =
    layout as UnzippedCalculatedLayout;
  const elements = model.elements.filter(({ id }) => positions.has(id));
  for (const nestedLayout of nestedLayouts) {
    applyLayout(model, nestedLayout);
  }

  if (group) {
    const offset: Vector = getContentFittingBox(elements, []);
    translateToPositiveQuadrant(positions, offset);
  }

  const averagePosition = keepAveragePosition
    ? calculateAveragePosition(elements)
    : undefined;
  for (const element of elements) {
    element.setPosition(positions.get(element.id));
  }

  if (keepAveragePosition) {
    const newAveragePosition = calculateAveragePosition(elements);
    const averageDiff = {
      x: averagePosition.x - newAveragePosition.x,
      y: averagePosition.y - newAveragePosition.y,
    };
    positions.forEach((position, elementId) => {
      const element = model.getElement(elementId);
      element.setPosition({
        x: position.x + averageDiff.x,
        y: position.y + averageDiff.y,
      });
    });
  }
}

export function calculateAveragePosition(position: readonly Element[]): Vector {
  let xSum = 0;
  let ySum = 0;
  for (const element of position) {
    xSum += element.position.x + element.size.width / 2;
    ySum += element.position.y + element.size.height / 2;
  }
  return {
    x: xSum / position.length,
    y: ySum / position.length,
  };
}

export function placeElementsAround(params: {
  model: DiagramModel;
  elements: readonly Element[];
  prefferedLinksLength: number;
  targetElement: Element;
  startAngle?: number;
}) {
  const { model, elements, targetElement, prefferedLinksLength } = params;
  const targetElementBounds = boundsOf(targetElement);
  const targetPosition: Vector = {
    x: targetElementBounds.x + targetElementBounds.width / 2,
    y: targetElementBounds.y + targetElementBounds.height / 2,
  };
  let outgoingAngle = 0;
  if (targetElement.links.length > 0) {
    const averageSourcePosition = calculateAveragePosition(
      targetElement.links.map((link) => {
        const linkSource = model.sourceOf(link);
        return linkSource !== targetElement ? linkSource : model.targetOf(link);
      })
    );
    const vectorDiff: Vector = {
      x: targetPosition.x - averageSourcePosition.x,
      y: targetPosition.y - averageSourcePosition.y,
    };
    if (vectorDiff.x !== 0 || vectorDiff.y !== 0) {
      outgoingAngle = Math.atan2(vectorDiff.y, vectorDiff.x);
    }
  }

  const step = Math.min(Math.PI / elements.length, Math.PI / 6);
  const elementsSteck: Element[] = [].concat(elements);

  const placeElementFromSteck = (curAngle: number, element: Element) => {
    if (element) {
      const size = element.size;
      element.setPosition({
        x:
          targetPosition.x +
          prefferedLinksLength * Math.cos(curAngle) -
          size.width / 2,
        y:
          targetPosition.y +
          prefferedLinksLength * Math.sin(curAngle) -
          size.height / 2,
      });
    }
  };

  const isOddLength = elementsSteck.length % 2 === 0;
  if (isOddLength) {
    for (let angle = step / 2; elementsSteck.length > 0; angle += step) {
      placeElementFromSteck(outgoingAngle - angle, elementsSteck.pop());
      placeElementFromSteck(outgoingAngle + angle, elementsSteck.pop());
    }
  } else {
    placeElementFromSteck(outgoingAngle, elementsSteck.pop());
    for (let angle = step; elementsSteck.length > 0; angle += step) {
      placeElementFromSteck(outgoingAngle - angle, elementsSteck.pop());
      placeElementFromSteck(outgoingAngle + angle, elementsSteck.pop());
    }
  }

  return new Promise((resolve) => {
    const listener = new EventObserver();
    listener.listen(model.events, "changeCells", () => {
      listener.stopListening();

      removeOverlaps({
        model,
        padding: { x: 15, y: 15 },
      });
      resolve(true);
    });
  });
}

export function removeOverlaps(params: {
  model: DiagramModel;
  fixedElements?: ReadonlySet<Element>;
  padding?: Vector;
  group?: string;
  selectedElements?: ReadonlySet<Element>;
}): CalculatedLayout {
  const { padding, model, group, fixedElements, selectedElements } = params;
  return calculateLayout({
    model,
    group,
    fixedElements,
    selectedElements,
    layoutFunction: (nodes) => {
      padded(nodes, padding, () => groupRemoveOverlaps(nodes));
    },
  });
}

const elk = new ELK();

/**
 * Runs an elkjs layout over the given nodes/links and writes the resulting
 * x/y back onto the same `LayoutNode` objects (mutating in place), matching
 * how `calculateLayout`/`calculateLayoutAsync` read positions back out.
 */
async function runElkLayout(
  nodes: LayoutNode[],
  links: LayoutLink[],
  layoutOptions: Record<string, string>
): Promise<void> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const children = nodes.map((node) => ({
    id: node.id,
    width: node.width,
    height: node.height,
  }));
  const edges = links.map((link, index) => ({
    id: `e${index}`,
    sources: [link.source.id],
    targets: [link.target.id],
  }));

  const result = await elk.layout({ id: "root", layoutOptions, children, edges });
  for (const child of result.children ?? []) {
    const node = nodeById.get(child.id);
    if (node && child.x !== undefined && child.y !== undefined) {
      node.x = child.x;
      node.y = child.y;
    }
  }
}

/**
 * General-purpose layout, now backed by elkjs's `stress` algorithm instead
 * of webcola (unmaintained since ~2018). `stress` targets a desired edge
 * length like webcola's `jaccardLinkLengths` did, but doesn't guarantee
 * zero overlap between unrelated nodes, so the result is still polished
 * with `groupRemoveOverlaps` exactly like the old implementation did.
 *
 * `fixedElements` is honored on a best-effort basis via elk's `interactive`
 * mode (bias the result toward the existing layout) — elk has no public
 * per-node "pin in place" constraint the way webcola's `.fixed` flag did,
 * so this is softer than before. No caller in this codebase currently
 * passes `fixedElements`.
 */
export async function forceLayout(params: {
  model: DiagramModel;
  fixedElements?: ReadonlySet<Element>;
  group?: string;
  selectedElements?: ReadonlySet<Element>;
}): Promise<CalculatedLayout> {
  const { model, group, fixedElements, selectedElements } = params;
  const hasFixed = Boolean(fixedElements && fixedElements.size > 0);
  return calculateLayoutAsync({
    model,
    group,
    fixedElements,
    selectedElements,
    layoutFunction: async (nodes, links) => {
      await runElkLayout(nodes, links, {
        "elk.algorithm": "stress",
        "elk.stress.desiredEdgeLength": "200",
        "elk.spacing.nodeNode": "40",
        ...(hasFixed ? { "elk.interactive": "true" } : {}),
      });
      biasFreePadded(nodes, { x: 50, y: 50 }, () => groupRemoveOverlaps(nodes));
    },
  });
}

/**
 * Top-down layered layout via elkjs's `layered` algorithm, as an
 * alternative to `forceLayout` for graphs that have a meaningful direction
 * (e.g. `subClassOf`/`broader`-style edges). `separateConnectedComponents`
 * keeps unrelated subgraphs from overlapping.
 */
export async function hierarchyLayout(params: {
  model: DiagramModel;
  group?: string;
  selectedElements?: ReadonlySet<Element>;
}): Promise<CalculatedLayout> {
  const { model, group, selectedElements } = params;
  return calculateLayoutAsync({
    model,
    group,
    selectedElements,
    layoutFunction: async (nodes, links) => {
      await runElkLayout(nodes, links, {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.separateConnectedComponents": "true",
        "elk.spacing.nodeNode": "50",
        "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      });
    },
  });
}

/**
 * Compact, non-overlapping placement via elkjs's `box` algorithm — links
 * are ignored entirely. Useful when you just want a tidy arrangement of a
 * batch of elements rather than a layout that means anything graph-wise
 * (e.g. dropping in several unrelated search results at once).
 *
 * elk's `disco` algorithm would be the closer match to "pack each connected
 * component separately," but it isn't included in elkjs's default bundle
 * (only `layered`/`force`/`stress`/`mrtree`/`radial`/`box`/etc. are) — `box`
 * covers the "just place these" case directly since it doesn't consider
 * edges at all.
 */
export async function scatterLayout(params: {
  model: DiagramModel;
  group?: string;
  selectedElements?: ReadonlySet<Element>;
}): Promise<CalculatedLayout> {
  const { model, group, selectedElements } = params;
  return calculateLayoutAsync({
    model,
    group,
    selectedElements,
    layoutFunction: async (nodes, links) => {
      await runElkLayout(nodes, links, {
        "elk.algorithm": "box",
        "elk.box.packingMode": "GROUP_MIXED",
        "elk.aspectRatio": "1.6",
        "elk.spacing.nodeNode": "40",
      });
    },
  });
}

export function getContentFittingBoxForLayout(nodes: readonly LayoutNode[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const node of nodes) {
    const { x, y, width, height } = node;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    x: Number.isFinite(minX) ? minX : 0,
    y: Number.isFinite(minY) ? minY : 0,
    width: Number.isFinite(minX) && Number.isFinite(maxX) ? maxX - minX : 0,
    height: Number.isFinite(minY) && Number.isFinite(maxY) ? maxY - minY : 0,
  };
}
