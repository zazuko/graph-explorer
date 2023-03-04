import * as N3 from 'n3';
import * as RDF from 'rdf-js';

import { RdfNode, Triple } from './sparqlModels';

export function parseTurtleText(turtleText: string): Promise<Triple[]> {
  return new Promise<Triple[]>((resolve, reject) => {
    const triples: Triple[] = [];
    new N3.Parser().parse(turtleText, (error, triple, hash) => {
      if (error) {
        reject(error);
      } else if (triple) {
        triples.push({
          subject: n3toRdfNode(triple.subject),
          predicate: n3toRdfNode(triple.predicate),
          object: n3toRdfNode(triple.object),
        });
      } else {
        resolve(triples);
      }
    });
  });
}

export function n3toRdfNode(entity: RDF.Term): RdfNode {
  if (N3.Util.isLiteral(entity)) {
    const literal = entity as RDF.Literal;
    return {
      type: 'literal',
      value: literal.value,
      datatype: literal.datatype.value,
      'xml:lang': literal.language
    };
  } else {
    return { type: 'uri', value: entity.value };
  }
}
