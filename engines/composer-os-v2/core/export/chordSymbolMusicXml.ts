/**
 * Chord symbol handling for MusicXML harmony export.
 * Root lives in <root>; <kind text="…"> must be suffix-only so readers (e.g. Sibelius)
 * do not concatenate root + full symbol into duplicate letters (DDmin9, GG13).
 *
 * Display suffixes are normalized here only (lead-sheet style), not in harmony generation.
 */

import { normalizeChordToken } from '../harmony/chordProgressionParser';

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
 * Lead-sheet suffix for `<kind text="…">` only: major/minor/maj7 wording, not harmonic semantics.
 */
export function formatChordKindSuffixForDisplay(rawSuffix: string): string {
  let s = rawSuffix.trim();
  if (s.length === 0) return '';

  // Cmajor7 → maj7 (before stripping bare "major")
  s = s.replace(/major(\d+)/gi, 'maj$1');

  // Dminor7 → m7, minor → m
  s = s.replace(/minor/gi, 'm');

  // Gmajor → (empty); Dmajor/F# handled as root + empty suffix + bass
  s = s.replace(/major/gi, '');

  // min7 → m7 (display alignment with m7 from minor)
  s = s.replace(/min(?=\d)/gi, 'm');

  return s;
}

function alterToAccidental(alter: number): string {
  if (alter === 1) return '#';
  if (alter === -1) return 'b';
  return '';
}

/** Full chord string as it should read on a lead sheet (for tests / UI); uses the same rules as MusicXML display. */
export function formatChordSymbolForDisplay(chord: string): string {
  const p = parseChordForMusicXmlHarmony(chord);
  const root = `${p.rootStep}${alterToAccidental(p.rootAlter)}`;
  const kind = p.kindText ?? '';
  if (p.bassStep !== undefined) {
    const bass = `${p.bassStep}${alterToAccidental(p.bassAlter ?? 0)}`;
    return `${root}${kind}/${bass}`;
  }
  return `${root}${kind}`;
}

/**
 * Parse a chord string into MusicXML root + display suffix.
 * Strips a duplicated leading root from the suffix when present (DDmin9 → min9).
 */
export function parseChordRootAndMusicXmlKindText(chord: string): ChordRootAndKindText {
  const t = chord.trim();
  const m = t.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) {
    return { rootStep: 'C', rootAlter: 0, kindText: t.length > 0 ? formatChordKindSuffixForDisplay(t) : '' };
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

  const kindText = suffix.length > 0 ? formatChordKindSuffixForDisplay(suffix) : '';
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

function unescapeXmlAttr(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Reconstruct a chord string from a single exported `<harmony>...</harmony>` block (same shape as musicxmlExporter).
 * Used to verify written MusicXML matches the score without silent reconstruction.
 */
export function chordStringFromMusicXmlHarmonyBlock(block: string): string | null {
  const rootStep = block.match(/<root-step>([A-G])<\/root-step>/)?.[1];
  if (!rootStep) return null;
  const rootAlter = parseInt(block.match(/<root-alter>(-?\d+)<\/root-alter>/)?.[1] ?? '0', 10);
  const kindMatch = block.match(/<kind text="([^"]*)"/);
  const kindRaw = kindMatch ? unescapeXmlAttr(kindMatch[1]) : '';
  const bassStep = block.match(/<bass-step>([A-G])<\/bass-step>/)?.[1];
  const bassAlter = parseInt(block.match(/<bass-alter>(-?\d+)<\/bass-alter>/)?.[1] ?? '0', 10);
  let acc = '';
  if (rootAlter === 1) acc = '#';
  else if (rootAlter === -1) acc = 'b';
  let s = `${rootStep}${acc}${kindRaw}`;
  if (bassStep) {
    let ba = '';
    if (bassAlter === 1) ba = '#';
    else if (bassAlter === -1) ba = 'b';
    s += `/${bassStep}${ba}`;
  }
  return s;
}

/** Lead-sheet–canonical equality for pipeline truth (score vs XML vs user input). */
export function chordSymbolsEqualForPipelineTruth(a: string, b: string): boolean {
  return (
    normalizeChordToken(formatChordSymbolForDisplay(a)) ===
    normalizeChordToken(formatChordSymbolForDisplay(b))
  );
}
