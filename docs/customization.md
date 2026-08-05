# Customizing appearance

Everything about how a node or link looks — color, icon, the whole card layout, link routing — is customizable via three kinds of **resolvers**, each a plain function of an element/link's RDF type(s) that returns a style object, or `undefined` to fall through to the built-in default. All three are optional props on `Workspace` (`src/graph-explorer/customization/props.ts` has the full types).

```ts
type TypeStyleResolver = (types: string[]) => CustomTypeStyle | undefined;
type LinkTemplateResolver = (linkType: string) => LinkTemplate | undefined;
type TemplateResolver = (types: string[]) => ElementTemplate | undefined;
```

Wire them up as `Workspace` props:

```tsx
createElement(Workspace, {
  typeStyleResolver: myTypeStyleResolver,
  elementTemplateResolver: myElementTemplateResolver,
  linkTemplateResolver: myLinkTemplateResolver,
});
```

If a resolver returns `undefined` for a given type (or you don't pass one at all), the built-in default is used — you only need to handle the types you actually want to change.

## `CustomTypeStyle` — color and icon only

The cheapest customization: just a background color and an icon class, without touching layout at all.

```ts
const typeStyleResolver: TypeStyleResolver = (types) => {
  if (types.includes("http://xmlns.com/foaf/0.1/Person")) {
    return { color: "#eaac77", icon: "fa fa-user" };
  }
  return undefined;
};
```

If you don't resolve a color yourself, one is generated automatically from a hash of the type IRI(s) — see `getHueFromClasses` in `src/graph-explorer/diagram/view.ts` — so every class gets a distinct, consistent color for free without configuring anything.

## `ElementTemplate` — the whole node

For anything beyond color/icon — a different layout, more/fewer fields, custom interactions — provide a full React component. `ElementTemplate` is `ComponentClass<TemplateProps>` (a class component, not a function component):

```ts
interface TemplateProps {
  elementId: string;
  data: ElementModel;       // the full RDF element data (types, labels, properties)
  iri: ElementIri;
  types: string;             // types, already formatted as a label string
  label: string;
  color: any;
  iconUrl: string;
  imgUrl?: string;
  isExpanded?: boolean;      // whether the node is showing its expanded property table
  propsAsList?: PropArray;
  props?: Dictionary<Property>;
}
```

```tsx
class PersonTemplate extends React.Component<TemplateProps> {
  render() {
    return (
      <div style={{ borderColor: this.props.color }} className="person-card">
        <img src={this.props.iconUrl} />
        <div>{this.props.label}</div>
      </div>
    );
  }
}

const elementTemplateResolver: TemplateResolver = (types) =>
  types.includes("http://xmlns.com/foaf/0.1/Person") ? PersonTemplate : undefined;
```

`src/graph-explorer/customization/templates/default.tsx` (`DefaultElementTemplate`) is the real one shipped by default — a good reference for what a complete template looks like (property table, expand/collapse, image thumbnail, etc.).

## `LinkTemplate` / `LinkStyle` — link appearance

```ts
interface LinkTemplate {
  markerSource?: LinkMarkerStyle;
  markerTarget?: LinkMarkerStyle;
  renderLink?(link: Link): LinkStyle;
  setLinkLabel?: (link: Link, label: string) => void;
}

interface LinkStyle {
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
```

```ts
const linkTemplateResolver: LinkTemplateResolver = (linkType) => {
  if (linkType === "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
    return {
      markerTarget: { fill: "#8cd965", stroke: "#5b9a3b" },
      renderLink: () => ({
        connection: { stroke: "#8cd965", "stroke-width": 2 },
      }),
    };
  }
  return undefined;
};
```

## Routing links (`LinkRouter`)

One level up from individual link styling: `LinkRouter` (passed via `WorkspaceProps.viewOptions.linkRouter`) controls *where* links are drawn — vertices, bundling multiple links between the same pair of elements, etc. This is a coarser, whole-diagram concern rather than a per-type style, so it's worth knowing it exists but is a separate mechanism from the three resolvers above; see `src/graph-explorer/customization/props.ts` (`LinkRouter`, `RoutedLink`) if you need to go there.
