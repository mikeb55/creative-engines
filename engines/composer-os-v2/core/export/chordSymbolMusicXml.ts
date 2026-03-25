/**
 * Chord symbol handling for MusicXML harmony export.
 * Root lives in <root>; <kind text="…"> must be suffix-only so readers (e.g. Sibelius)
 * do not concatenate root + full symbol into duplicate letters (DDmin9, GG13).
 */

export interface ChordRootAndKindText {
  rootStep: string;
  rootAlter: number;
  /** Suffix only, e.g. min9, 13, maj9, 7alt, maj7/E */
  kindText: string;
}

/**
 * Parse a chord string into MusicXML root + display suffix.
 * Strips a duplicated leading root from the suffix when present (DDmin9 → min9).
 */
export function parseChordRootAndMusicXmlKindText(chord: string): ChordRootAndKindText {
  const t = chord.trim();
  const m = t.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) {
    return { rootStep: 'C', rootAlter: 0, kindText: t.length > 0 ? t : 'major' };
  }
  const letter = m[1].toUpperCase();
  let alter = 0;
  if (m[2] === '#') alter = 1;
  else if (m[2] === 'b') alter = -1;
  let suffix = (m[3] ?? '').trim();

  const dup = suffix.match(/^([A-Ga-g])([#b]?)/);
  if (dup) {
    const sl = dup[1].toUpperCase();
    const sa = dup[2] === '#' ? 1 : dup[2] === 'b' ? -1 : 0;
    if (sl === letter && sa === alter) {
      suffix = suffix.slice(dup[0].length).trim();
    }
  }

  const kindText = suffix.length > 0 ? suffix : 'major';
  return { rootStep: letter, rootAlter: alter, kindText };
}
