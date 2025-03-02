import { createElement, ClassAttributes } from 'react';
import * as ReactDOM from 'react-dom';
const SparqlGenerator = require('sparqljs').Generator;
import SparqlClient from 'sparql-http-client'

const RDFS_PREFIX = 'http://www.w3.org/2000/01/rdf-schema#';
const RDF_PREFIX = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

import {
  Workspace,
  WorkspaceProps,
  ElementTypeIri,
  LinkTypeIri,
  LocalizedString,
  ElementModel,
  LinkModel,
  SparqlDataProvider,
  SparqlQueryMethod,
  OWLRDFSSettings,
  AuthoringState,
} from '../src/graph-explorer/index';

import {
  ExampleMetadataApi,
} from './resources/exampleMetadataApi';
import {
  onPageLoad,
  tryLoadLayoutFromLocalStorage,
  saveLayoutToLocalStorage,
} from './common';

const rdfs = {
    subClassOf: (RDFS_PREFIX + 'subClassOf') as LinkTypeIri,
    label: (RDFS_PREFIX + 'label') as LinkTypeIri,
    subPropertyOf: (RDFS_PREFIX + 'subPropertyOf') as LinkTypeIri,
};
const rdf = {
    class: (RDF_PREFIX + 'Class') as ElementTypeIri,
    a: (RDF_PREFIX + 'type') as LinkTypeIri
};

function onWorkspaceMounted(workspace: Workspace) {
  if (!workspace) {
    return;
  }
  
  const SparqlDialect = OWLRDFSSettings;
    SparqlDialect.fullTextSearch = {
            prefix: '',
            queryPattern: `
            ?inst rdfs:label ?searchLabel.
            (?searchLabel ?score) <tag:stardog:api:property:textMatch> "\${text}".
        `};
    SparqlDialect.filterTypePattern = '?inst a ?class';

    const sparqlDataProvider = new SparqlDataProvider({
        endpointUrl: "/sparql",
        queryMethod: SparqlQueryMethod.GET
    }, SparqlDialect);

    const diagram = tryLoadLayoutFromLocalStorage();
    workspace.getModel().importLayout({
        diagram,
        validateLinks: true,
        dataProvider : sparqlDataProvider,
    });
}

const props: WorkspaceProps & ClassAttributes<Workspace> = {
    ref: onWorkspaceMounted,
    onSaveDiagram: (workspace) => {
        const diagram = workspace.getModel().exportLayout();
        window.location.hash = saveLayoutToLocalStorage(diagram);
        window.location.reload();
    },    
    onPersistChanges: generateSparqlUpdate,
    metadataApi: new ExampleMetadataApi(),
    
    elementTemplateResolver: (types) => {
            return undefined;
    },
};

onPageLoad((container) => {
    ReactDOM.render(createElement(Workspace, props), container);
});

function generateSparqlUpdate(workspace: Workspace) {
    const state = workspace.getEditor().authoringState;
    const model = workspace.getModel();
    const elementUpdateStructure = {
        "type": "update",
        "updates": [] as any
    };
    const deletedElements: string[] = [];
    const deletedLinks: string[] = [];
    state.elements.forEach(element => {
        
        if(element.deleted) {
            deletedElements.push(element.after.id);  
            elementUpdateStructure.updates.push({   updateType: "delete", 
                                                    delete: [{type:'bgp',triples: triplesFromElementState(element.after)}]
                                                });
        } else if(!element.before){
            // simple insert data
            elementUpdateStructure.updates.push({   updateType: "insert", 
                                                    insert: [{type:'bgp',triples: triplesFromElementState(element.after)}]
                                                });
        }
        else {
            elementUpdateStructure.updates.push({   updateType: "insertdelete", 
                                                    delete: [{type:'bgp',triples: triplesFromElementState(element.before)}],
                                                    where: [{type:'bgp',triples: triplesFromElementState(element.before)}],
                                                    insert: [{type:'bgp',triples: triplesFromElementState(element.after)}]
                                                });
        }

    });
    state.links.forEach(link => {
        if (link.deleted) {
            deletedLinks.push(model.findLink(
                                                link.after.linkTypeId,
                                                model.elements.find(element => element.iri == link.after.sourceId).id,
                                                model.elements.find(element => element.iri == link.after.targetId).id
                                                ).id);
            elementUpdateStructure.updates.push({   updateType: "delete", 
                                                    delete: [{type:'bgp',triples: triplesFromLinkState(link.after)}]
                                                });  
        } else {
            elementUpdateStructure.updates.push({   updateType: "insert", 
                                                    insert: [{type:'bgp',triples: triplesFromLinkState(link.after)}]
                                                });   
        }
    });

    const parser = new SparqlGenerator({newline:''});
    if(elementUpdateStructure.updates.length >0 )
    {
        const updateQuery = parser.stringify(elementUpdateStructure);
        const client = new SparqlClient({
            endpointUrl: window.location.origin + '/query',
            updateUrl:  window.location.origin + '/update',
        });
        console.log(updateQuery);
        client.query.update(updateQuery);
        
       
        workspace.getEditor().setAuthoringState(AuthoringState.empty);
       
        deletedElements.forEach( iri => {
            console.log(model.elements.find(element => element.iri == iri).id);
            model.removeElement(model.elements.find(element => element.iri == iri).id);
        });
        
        deletedLinks.forEach(id => {
            model.removeLink(id);
        });
    }
}

/**
 * 
 * @param elementState the state of an element, either before or after
 * @returns a arrary of triples in BGP format for SparqlJS
 */
function triplesFromElementState(elementState: ElementModel){
    const triples = [] as any;

    // grab types
    elementState.types.forEach(type => {
        triples.push({
            "subject": {
              "termType": "NamedNode",
              "value": elementState.id
            },
            "predicate": {
              "termType": "NamedNode",
              "value": rdf.a
            },
            "object": {
                "termType": "NamedNode",
                "value": type
            }
          });
    });


    // grab label
    elementState.label.values.forEach(label => {
        triples.push({
            "subject": {
              "termType": "NamedNode",
              "value": elementState.id
            },
            "predicate": {
              "termType": "NamedNode",
              "value": rdfs.label
            },
            "object": {
                "termType": "Literal",
                "value": label.value,
                "language": label.language
            }
          });
    });

    // grab all properties
    for(const [key,property ] of  Object.entries(elementState.properties)){
        property.values.forEach( (value)  => {
            const v = value as LocalizedString;
            triples.push({
                "subject": {
                  "termType": "NamedNode",
                  "value": elementState.id
                },
                "predicate": {
                  "termType": "NamedNode",
                  "value": key
                },
                "object": {
                    "termType": "Literal",
                    "value": v.value,
                    "language": v.language
                }
              });
        });
    }
    return triples;
}

/**
 * 
 * @param linkState the state of a link, either before or after
 * @returns a array of triples in BGP format for SparqlJS
  */
function triplesFromLinkState(linkState: LinkModel){
    const triples = [];
    triples.push({
        "subject": {
          "termType": "NamedNode",
          "value": linkState.sourceId
        },
        "predicate": {
          "termType": "NamedNode",
          "value": linkState.linkTypeId
        },
        "object": {
            "termType": "NamedNode",
            "value": linkState.targetId
        }
    });
    return triples;
}
