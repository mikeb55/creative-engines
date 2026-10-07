/**
 * Descriptive colour-degree report.
 * Characteristic degrees against a local sonority. Nothing here is required to be played.
 * Not a Woody Shaw operator and not a semitone-pair generator.
 */

import type { PentatonicField } from './fieldDistance';
import { pcDistance } from './fieldDistance';
import { mod12, sharpName } from './pitch';

export interface ColourDegreeReport {
  descriptive: true;
  mustPlay: false;
  chordTones: readonly string[];
  extensions: readonly string[];
  alteredTensions: readonly string[];
  semitoneEdges: readonly string[];
  unstableTones: readonly string[];
}

const EXTENSIONS: Record<number, string> = { 2: '9', 5: '11', 9: '13' };
const ALTERED: Record<number, string> = { 1: 'b9', 3: '#9', 6: '#11', 8: 'b13' };

export function reportColourDegrees(field: PentatonicField, harmony?: { rootPc?: number | null; chordPitchClasses?: readonly number[] }): ColourDegreeReport {
  const chord = (harmony?.chordPitchClasses ?? []).map((pc) => mod12(pc));
  const chordSet = new Set(chord);
  const names = (pc: number) => sharpName(pc);
  const chordTones = field.pitchClasses.filter((pc) => chordSet.has(pc)).map(names);
  const root = harmony?.rootPc;
  const extensions: string[] = [];
  const altered: string[] = [];
  if (root !== null && root !== undefined) {
    for (const pc of field.pitchClasses) {
      if (chordSet.has(pc)) continue;
      const interval = mod12(pc - root);
      if (EXTENSIONS[interval]) extensions.push(`${names(pc)} ${EXTENSIONS[interval]}`);
      if (ALTERED[interval]) altered.push(`${names(pc)} ${ALTERED[interval]}`);
    }
  }
  const semitoneEdges = field.pitchClasses
    .filter((pc) => chord.some((tone) => pcDistance(pc, tone) === 1))
    .map(names);
  const unstable = field.pitchClasses
    .filter((pc) => !chordSet.has(pc) && (semitoneEdges.includes(names(pc)) || (root !== null && root !== undefined && pcDistance(pc, root) === 6)))
    .map(names);
  return {
    descriptive: true,
    mustPlay: false,
    chordTones,
    extensions,
    alteredTensions: altered,
    semitoneEdges,
    unstableTones: unstable,
  };
}
