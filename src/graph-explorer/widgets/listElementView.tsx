import * as React from "react";
import { hcl } from "d3-color";

import { ElementModel } from "../data/model";
import { DiagramView } from "../diagram/view";

export interface ListElementViewProps {
  className?: string;
  view: DiagramView;
  model: ElementModel;
  highlightText?: string;
  disabled?: boolean;
  selected?: boolean;
  onClick?: (event: React.MouseEvent<any>, model: ElementModel) => void;
  onDragStart?: React.HTMLProps<HTMLElement>["onDragStart"];
}

const CLASS_NAME = "graph-explorer-list-element-view";

export class ListElementView extends React.Component<ListElementViewProps, {}> {
  render() {
    const {
      className,
      view,
      model,
      highlightText,
      disabled,
      selected,
      onDragStart,
    } = this.props;

    const { h, c, l } = view.getTypeStyle(model.types).color;
    const frontColor =
      selected && !disabled ? hcl(h, c, l * 1.2) : hcl("white");

    let classNames = `${CLASS_NAME}`;
    classNames += disabled ? ` ${CLASS_NAME}--disabled` : "";
    classNames += className ? ` ${className}` : "";
    const localizedText = view.formatLabel(model.label.values, model.id);
    const classesString =
      model.types.length > 0
        ? `\nClasses: ${view.getElementTypeString(model)}`
        : "";

    return (
      <li
        className={classNames}
        draggable={!disabled && Boolean(onDragStart)}
        title={`${localizedText} ${view.formatIri(model.id)}${classesString}`}
        style={{ background: hcl(h, c, l).toString() }}
        onClick={this.onClick}
        onDragStart={onDragStart}
      >
        <div
          className={`${CLASS_NAME}__label`}
          style={{ background: frontColor.toString() }}
        >
          {highlightSubstring(localizedText, highlightText)}
        </div>
      </li>
    );
  }

  private onClick = (event: React.MouseEvent<any>) => {
    const { disabled, model, onClick } = this.props;
    if (!disabled && onClick) {
      event.persist();
      onClick(event, model);
    }
  };
}

export function startDragElements(
  e: React.DragEvent<{}>,
  iris: readonly string[]
) {
  try {
    e.dataTransfer.setData(
      "application/x-graph-explorer-elements",
      JSON.stringify(iris)
    );
  } catch (ex) {
    // IE fix
    e.dataTransfer.setData("text", JSON.stringify(iris));
  }
  return false;
}

const DEFAULT_HIGHLIGHT_PROPS: React.HTMLProps<HTMLSpanElement> = {
  className: `graph-explorer-text-highlight`,
};

export function highlightSubstring(
  text: string,
  substring: string | undefined,
  highlightProps = DEFAULT_HIGHLIGHT_PROPS
) {
  if (!substring) {
    return <span>{text}</span>;
  }

  const start = text.toLowerCase().indexOf(substring.toLowerCase());
  if (start < 0) {
    return <span>{text}</span>;
  }

  const end = start + substring.length;
  const before = text.substring(0, start);
  const highlighted = text.substring(start, end);
  const after = text.substring(end);

  return (
    <span>
      {before}
      <span {...highlightProps}>{highlighted}</span>
      {after}
    </span>
  );
}
