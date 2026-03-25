/**
 * Chord symbol handling for MusicXML harmony export.
 * Root lives in <root>; <kind text="…"> must be suffix-only so readers (e.g. Sibelius)
 * do not concatenate root + full symbol into duplicate letters (DDmin9, GG13).
 */

export interface ChordRootAndKindText {
  rootStep: string;
  rootAlter: number;
  /** Suffix only, e.g. min9, 13, maj9, 7alt */
  kindText: string;
}

/** MusicXML harmony: root + kind + optional slash bass (not folded into kind text). */
export interface MusicXmlHarmonyParts extends ChordRootAndKindText {
  bassStep?: string;
  bassAlter?: number;
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

/**
 * Chord symbol for `<harmony>`: harmonic root/kind on the upper structure; slash bass in `<bass>`.
 */
export function parseChordForMusicXmlHarmony(chord: string): MusicXmlHarmonyParts {
  const t = chord.trim();
  const slash = t.indexOf('/');
  const harmonyPart = slash >= 0 ? t.slice(0, slash).trim() : t;
  const bassPart = slash >= 0 ? t.slice(slash + 1).trim() : undefined;
  const base = parseChordRootAndMusicXmlKindText(harmonyPart);
  if (!bassPart) {
    return base;
  }
  const bm = bassPart.match(/^([A-Ga-g])([#b]?)$/);
  if (!bm) {
    return { ...base, kindText: `${base.kindText}/${bassPart}` };
  }
  const letter = bm[1].toUpperCase();
  let bassAlter = 0;
  if (bm[2] === '#') bassAlter = 1;
  else if (bm[2] === 'b') bassAlter = -1;
  return {
    rootStep: base.rootStep,
    rootAlter: base.rootAlter,
    kindText: base.kindText,
    bassStep: letter,
    bassAlter,
  };
}
