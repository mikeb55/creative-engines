/**
 * Hexatonic Phase H2 catalogue.
 * Scalar collections and WPS pairs share one list and keep separate ids.
 * Equal pitch-class sets stay as separate entries when the musical object differs.
 */

import { listHexatonicScalars, type HexatonicScalarCollection } from './collections';
import { listHexatonicWpsPairs, type HexatonicWpsPair } from './triadPairs';

export type HexatonicCatalogueEntry = HexatonicScalarCollection | HexatonicWpsPair;

export function listHexatonicCatalogue(): readonly HexatonicCatalogueEntry[] {
  return [...listHexatonicScalars(), ...listHexatonicWpsPairs()];
}

export function getHexatonicCatalogueEntry(id: string): HexatonicCatalogueEntry | undefined {
  return listHexatonicCatalogue().find((entry) => entry.id === id);
}
