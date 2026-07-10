import { TypeStyleResolver } from "./props";

import classIcon from "../../../images/icons/class.svg";
import objectPropertyIcon from "../../../images/icons/objectProperty.svg";
import datatypePropertyIcon from "../../../images/icons/datatypeProperty.svg";
import personIcon from "../../../images/icons/person.svg";
import countryIcon from "../../../images/icons/country.svg";
import organizationIcon from "../../../images/icons/organization.svg";
import locationIcon from "../../../images/icons/location.svg";
import eventIcon from "../../../images/icons/event.svg";
import objectIcon from "../../../images/icons/object.svg";

export const DefaultTypeStyleBundle: TypeStyleResolver = (types) => {
  if (
    types.indexOf("http://www.w3.org/2002/07/owl#Class") !== -1 ||
    types.indexOf("http://www.w3.org/2000/01/rdf-schema#Class") !== -1
  ) {
    return { color: "#eaac77", icon: classIcon };
  } else if (
    types.indexOf("http://www.w3.org/2002/07/owl#ObjectProperty") !== -1
  ) {
    return { color: "#34c7f3", icon: objectPropertyIcon };
  } else if (
    types.indexOf("http://www.w3.org/2002/07/owl#DatatypeProperty") !== -1
  ) {
    return { color: "#34c7f3", icon: datatypePropertyIcon };
  } else if (
    types.indexOf("http://xmlns.com/foaf/0.1/Person") !== -1 ||
    types.indexOf("http://www.wikidata.org/entity/Q5") !== -1
  ) {
    return { color: "#eb7777", icon: personIcon };
  } else if (types.indexOf("http://www.wikidata.org/entity/Q6256") !== -1) {
    return { color: "#77ca98", icon: countryIcon };
  } else if (
    types.indexOf("http://schema.org/Organization") !== -1 ||
    types.indexOf("http://dbpedia.org/ontology/Organisation") !== -1 ||
    types.indexOf("http://xmlns.com/foaf/0.1/Organization") !== -1 ||
    types.indexOf("http://www.wikidata.org/entity/Q43229") !== -1
  ) {
    return { color: "#77ca98", icon: organizationIcon };
  } else if (types.indexOf("http://www.wikidata.org/entity/Q618123") !== -1) {
    return { color: "#bebc71", icon: locationIcon };
  } else if (types.indexOf("http://www.wikidata.org/entity/Q1190554") !== -1) {
    return { color: "#b4b1fb", icon: eventIcon };
  } else if (types.indexOf("http://www.wikidata.org/entity/Q488383") !== -1) {
    return { color: "#53ccb2", icon: objectIcon };
  } else {
    return undefined;
  }
};
