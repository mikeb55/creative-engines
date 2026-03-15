/**
 * Jimmy Wyble Engine — Runtime prototype
 * Implements design spec from gml-composer-engines
 */

import { generateWybleEtude as generate } from './wybleGenerator';
import type { WybleParameters, WybleOutput } from './wybleTypes';

export { WybleParameters, WybleOutput, VoiceLine, NoteEvent, HarmonicContext } from './wybleTypes';

/**
 * Generate a two-line contrapuntal guitar etude in the spirit of Jimmy Wyble.
 */
export function generateWybleEtude(parameters: WybleParameters): WybleOutput {
  return generate(parameters);
}
