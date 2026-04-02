/**
 * Canonical chord: single source from user input through parser → engine → MusicXML.
 * `text` is immutable (exact bar token); structural fields support harmony engine + validation.
 */

import {
  buildHarmonyXmlLine,
  musicXmlKindContentFromKindText,
  parseChordForMusicXmlHarmony,
} from './chordSymbolMusicXml';

export interface CanonicalChord {
  /** Root letter + optional #/b (e.g. Bb, F#) — for chord-tone engine. */
  root: string;
  /** Engine quality: maj | min | dom (matches existing Wyble SCALE_DEGREES keys). */
  quality: string;
  extensions: string[];
  alterations: string[];
  bass: string | null;
  /** Exact user chord string for this bar (no mutation). */
  text: string;
  /** MusicXML &lt;kind&gt; body (enumeration-compatible). */
  kind: string;
  /** Pitch classes 0–11 relative to root (set of chord tones + listed extensions). */
  degreeSet: number[];
}

function rootLetterFromStepAlter(step: string, alter: number): string {
  if (alter === 1) return `${step}#`;
  if (alter === -1) return `${step}b`;
  return step;
}

/** Map lead-sheet suffix to Wyble engine quality (maj / min / dom). */
export function engineQualityFromKindSuffix(suffix: string): string {
  const s = suffix.toLowerCase().replace(/\s+/g, '');
  if (!s) return 'maj';
  if (/^maj|maj7|maj9|maj11|maj13|Δ|major/.test(suffix)) return 'maj';
  if (/dim|m7b5|ø/.test(s)) return 'min';
  if (/^m[^a]|^min|m7|m9|m11|m13/.test(s) || (s.startsWith('m') && !s.startsWith('maj'))) return 'min';
  return 'dom';
}

function extractExtensionsAlterations(suffix: string): { extensions: string[]; alterations: string[] } {
  const extensions: string[] = [];
  const alterations: string[] = [];
  if (/\balt\b|7alt/i.test(suffix)) alterations.push('alt');
  const extSet = new Set<string>();
  for (const m of suffix.matchAll(/\b(6|9|11|13)\b/gi)) {
    extSet.add(m[1]!.toLowerCase());
  }
  /** m9 / min9 / maj9 / maj13 — digit is not on a word boundary inside "m9", so \b(9) alone misses it. */
  for (const m of suffix.matchAll(/\b(?:m|min|maj)(9|11|13)\b/gi)) {
    extSet.add(m[1]!.toLowerCase());
  }
  extensions.push(...[...extSet].sort());
  for (const m of suffix.matchAll(/([#b])(9|11|13)/gi)) {
    alterations.push(`${m[1]}${m[2]}`);
  }
  return { extensions, alterations };
}

function degreeSetForEngineQuality(
  quality: string,
  extensions: string[],
  alterations: string[]
): number[] {
  const s = new Set<number>();
  if (quality === 'maj') {
    [0, 4, 7, 11].forEach((p) => s.add(p));
  } else if (quality === 'min') {
    [0, 3, 7, 10].forEach((p) => s.add(p));
  } else {
    [0, 4, 7, 10].forEach((p) => s.add(p));
  }
  for (const e of extensions) {
    const n = parseInt(e.replace(/\D/g, ''), 10);
    if (n === 6) s.add(9);
    if (n === 9) s.add(2);
    if (n === 11) s.add(5);
    if (n === 13) s.add(9);
  }
  if (alterations.some((a) => /alt/i.test(a))) {
    [1, 3, 6, 8].forEach((p) => s.add(p));
  }
  return [...s].sort((a, b) => a - b);
}

/**
 * Parse one lead-sheet token into a canonical chord. Preserves exact `text`;
 * MusicXML kind body from same suffix rules as `chordSymbolMusicXml`.
 */
export function parseLeadSheetChordToCanonical(raw: string): CanonicalChord {
  const text = raw.trim();
  const parts = parseChordForMusicXmlHarmony(text, { literalKind: true });
  const kindText = parts.kindText ?? '';
  const kind = musicXmlKindContentFromKindText(kindText);
  const root = rootLetterFromStepAlter(parts.rootStep, parts.rootAlter);
  const quality = engineQualityFromKindSuffix(kindText);
  const bass =
    parts.bassStep !== undefined
      ? rootLetterFromStepAlter(parts.bassStep, parts.bassAlter ?? 0)
      : null;
  const { extensions, alterations } = extractExtensionsAlterations(kindText);
  const degreeSet = degreeSetForEngineQuality(quality, extensions, alterations);

  return { root, quality, extensions, alterations, bass, text, kind, degreeSet };
}

/** Maps `#11`, `b9`, etc. (from {@link extractExtensionsAlterations}) to pitch class relative to root (0–11). */
function alterationStringToPitchClassRelativeToRoot(alt: string): number | null {
  const t = alt.trim().toLowerCase();
  if (t === 'alt') return null;
  const m = t.match(/^([#b]?)(9|11|13|5)$/);
  if (!m) return null;
  const acc = m[1];
  const deg = m[2]!;
  if (acc === '') return null;
  if (acc === '#') {
    if (deg === '5') return 8;
    if (deg === '9') return 3;
    if (deg === '11') return 6;
    if (deg === '13') return 10;
  }
  if (acc === 'b') {
    if (deg === '5') return 6;
    if (deg === '9') return 1;
    if (deg === '11') return 4;
    if (deg === '13') return 8;
  }
  return null;
}

/**
 * Pitch classes (relative to chord root) allowed for Wyble upper-line melody against this chord:
 * engine {@link CanonicalChord.degreeSet} plus explicit altered extensions from {@link CanonicalChord.alterations}.
 */
export function melodyAllowedPitchClassesForCanonical(c: CanonicalChord): number[] {
  const s = new Set<number>(c.degreeSet);
  for (const a of c.alterations) {
    const pc = alterationStringToPitchClassRelativeToRoot(a);
    if (pc !== null) s.add(pc);
  }
  if (s.size === 0) {
    if (c.quality === 'maj') [0, 4, 7, 11].forEach((x) => s.add(x));
    else if (c.quality === 'min') [0, 3, 7, 10].forEach((x) => s.add(x));
    else [0, 4, 7, 10].forEach((x) => s.add(x));
  }
  return [...s].sort((a, b) => a - b);
}

/** MusicXML `<harmony>` line: always uses canonical `text` (identical to user input). */
export function buildHarmonyXmlLineFromCanonical(
  c: CanonicalChord,
  opts?: { staffNumber?: number }
): string {
  return buildHarmonyXmlLine(c.text, {
    staffNumber: opts?.staffNumber,
    exactChordTextElement: true,
  });
}

/** Minimal Wyble pipeline checks: length matches bars, every chord non-empty, root parseable. */
export function validateWybleCanonicalChordList(chords: CanonicalChord[], barCount: number): void {
  if (chords.length !== barCount) {
    throw new Error(`Wyble harmony: canonicalChord length ${chords.length} !== barCount ${barCount}.`);
  }
  for (let i = 0; i < chords.length; i++) {
    const c = chords[i];
    if (!c || !c.text.trim()) {
      throw new Error(`Wyble harmony: empty canonical chord at bar ${i + 1}.`);
    }
    if (!c.root || !/^[A-G][#b]?$/.test(c.root)) {
      throw new Error(`Wyble harmony: invalid root at bar ${i + 1}: "${c.root}".`);
    }
    if (!c.quality) {
      throw new Error(`Wyble harmony: missing quality at bar ${i + 1}.`);
    }
  }
}
