import { DiagramModel } from "../diagram/model";
import { AuthoringState } from "../editor/authoringState";
import { CancellationToken } from "../viewUtils/async";

import { ElementModel, LinkModel, ElementIri, PropertyTypeIri } from "./model";

export interface ElementError {
  readonly type: "element";
  readonly target: ElementIri;
  readonly message: string;
  readonly propertyType?: PropertyTypeIri;
}

export interface LinkError {
  readonly type: "link";
  readonly target: LinkModel;
  readonly message: string;
}

export interface ValidationEvent {
  readonly target: ElementModel;
  readonly outboundLinks: readonly LinkModel[];
  readonly model: DiagramModel;
  readonly state: AuthoringState;
  readonly cancellation: CancellationToken;
}

export interface ValidationApi {
  /**
   * Validate element and its outbound links.
   */
  validate(e: ValidationEvent): Promise<(ElementError | LinkError)[]>;
}
