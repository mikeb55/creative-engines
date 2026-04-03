/**
 * Chord symbol → MusicXML harmony primitives (no dependency on chordSemantics).
 * Barrel `chordSymbolMusicXml.ts` re-exports this plus `buildHarmonyXmlLine` from chordSemantics.
 */

import { normalizeLeadSheetChordSpelling } from './leadSheetChordNormalize';

export interface ChordRootAndKindText {
  rootStep: string;
  rootAlter: number;
  /** Suffix only, e.g. min9, 13, maj9, 7alt */
  kindText: string;
}

const DEFAULT_MUSICXML_KIND_CONTENT = 'major';

const VALID_SLASH_BASS = /^[A-G][#b]?$/i;

/**
 * Split slash bass using the same rule as lead-sheet normalization (last `/` only if bass is a note).
 * Does not rewrite 6/9 → 69 — preserves display spelling for kind/@text.
 */
export function splitHarmonyChordForDisplay(chord: string): { harmonyPart: string; bassPart?: string } {
  const t = chord.trim();
  const slashIdx = t.lastIndexOf('/');
  if (slashIdx >= 0) {
    const possibleBass = t.slice(slashIdx + 1).trim();
    if (VALID_SLASH_BASS.test(possibleBass)) {
      return { harmonyPart: t.slice(0, slashIdx).trim(), bassPart: possibleBass };
    }
  }
  return { harmonyPart: t };
}

/**
 * Maps semantic (normalized) lead-sheet suffix to MusicXML &lt;kind&gt; element body — prefer most specific built-in.
 */
export function musicXmlKindContentFromKindText(kindText: string): string {
  const raw = kindText.trim();
  if (raw === '') return DEFAULT_MUSICXML_KIND_CONTENT;

  const key = raw.toLowerCase().replace(/\s+/g, '');

  /** m7b5 must win over generic "b5" alteration branch below. */
  if (/m7b5/i.test(raw) || /^ø$/i.test(raw.trim())) return 'half-diminished';

  if (/\(/.test(raw) || /#(9|11|5|13)/.test(raw) || /b(9|11|5|13)/.test(raw)) {
    if (/^maj|maj7|Δ|major/i.test(raw)) return 'major-seventh';
    if (/^m[^a]|^min|ø|dim|m7b5/i.test(raw) && !/^maj/i.test(raw)) return 'minor-seventh';
    return 'dominant';
  }
  if (/\balt\b|alt$/i.test(raw)) return 'dominant';

  const exact: Record<string, string> = {
    m: 'minor',
    min: 'minor',
    minor: 'minor',
    maj: 'major',
    major: 'major',
    dim: 'diminished',
    aug: 'augmented',
    '+': 'augmented',
    o: 'diminished',
    '7': 'dominant',
    '9': 'dominant-ninth',
    '11': 'dominant-11th',
    '13': 'dominant-13th',
    '7alt': 'dominant',
    maj7: 'major-seventh',
    maj9: 'major-ninth',
    maj11: 'major-11th',
    maj13: 'major-13th',
    m7: 'minor-seventh',
    min7: 'minor-seventh',
    m9: 'minor-ninth',
    min9: 'minor-ninth',
    m11: 'minor-11th',
    m13: 'minor-13th',
    m7b5: 'half-diminished',
    dim7: 'diminished-seventh',
    sus: 'suspended-fourth',
    sus2: 'suspended-second',
    sus4: 'suspended-fourth',
    '6': 'major-sixth',
    m6: 'minor-sixth',
  };

  if (exact[key]) return exact[key];

  if (key.startsWith('maj')) return 'major-seventh';
  if (key.includes('alt')) return 'dominant';
  if (key === '69' || key === '6/9') return 'major-sixth';
  if (/13sus|13sus4/i.test(key)) return 'dominant-13th';
  if (/13/.test(key) && !/#13|b13/.test(key)) return 'dominant-13th';
  if (/11/.test(key) && !/#11/.test(key)) return 'dominant-11th';
  if (/9/.test(key) && !/#9/.test(key) && !/b9/.test(key)) {
    return key.startsWith('m') || key.includes('min') ? 'minor-ninth' : 'dominant-ninth';
  }
  if (/7/.test(key)) return 'dominant';
  if (key.startsWith('m') && !key.startsWith('maj')) return 'minor';

  return DEFAULT_MUSICXML_KIND_CONTENT;
}

/**
 * When true, enumerated &lt;kind&gt; bodies (major-seventh, dominant-13th, …) are not enough for
 * downstream notation apps: many importers render from the enum and ignore or flatten
 * {@link kind} text="…" / hidden degrees. In those cases the export uses &lt;kind&gt;other&lt;/kind&gt;
 * so {@link kind} text carries the full jazz suffix faithfully.
 */
export function needsHarmonyKindOther(kindText: string): boolean {
  const raw = kindText.trim();
  if (!raw) return false;
  const key = raw.toLowerCase().replace(/\s+/g, '');

  if (key === 'm7b5' || raw === 'ø' || /^ø7$/i.test(raw.trim())) return false;

  if (/\balt\b|7alt/i.test(raw)) return true;
  if (key === '69' || key === '6/9') return true;
  if (/\([^)]*[#b]/.test(raw)) return true;
  if (/#(5|9|11|13)|b(9|11|13|5)(?!\d)/i.test(raw)) return true;
  if (/13sus|13sus4|11sus/i.test(raw)) return true;
  if (/sus/i.test(raw) && /1[13]/.test(raw)) return true;

  return false;
}

/**
 * MusicXML &lt;kind&gt; element body for export: either a standard enum string or {@code other}
 * when {@link needsHarmonyKindOther} so {@link kind} text="…" is the authoritative display.
 */
export function musicXmlKindBodyForHarmonyExport(kindText: string): string {
  if (needsHarmonyKindOther(kindText)) return 'other';
  return musicXmlKindContentFromKindText(kindText);
}

/** MusicXML harmony: harmonic root/kind on the upper structure; slash bass in `<bass>`. */
export interface MusicXmlHarmonyParts extends ChordRootAndKindText {
  bassStep?: string;
  bassAlter?: number;
}

export function formatChordKindSuffixForDisplay(rawSuffix: string): string {
  let s = rawSuffix.trim();
  if (s.length === 0) return '';

  s = s.replace(/major(\d+)/gi, 'maj$1');
  s = s.replace(/minor/gi, 'm');
  s = s.replace(/major/gi, '');
  s = s.replace(/min(?=\d)/gi, 'm');

  return s;
}

export function parseChordRootAndMusicXmlKindText(
  chord: string,
  opts?: { literalKind?: boolean }
): ChordRootAndKindText {
  const t = chord.trim();
  const m = t.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) {
    return {
      rootStep: 'C',
      rootAlter: 0,
      kindText: t.length > 0 ? formatChordKindSuffixForDisplay(t) : '',
    };
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

  const kindText =
    suffix.length > 0
      ? opts?.literalKind
        ? suffix
        : formatChordKindSuffixForDisplay(suffix)
      : '';
  return { rootStep: letter, rootAlter: alter, kindText };
}

export function parseChordForMusicXmlHarmony(
  chord: string,
  opts?: { literalKind?: boolean }
): MusicXmlHarmonyParts {
  const t = normalizeLeadSheetChordSpelling(chord.trim());
  const slashIdx = t.lastIndexOf('/');
  let harmonyPart = t;
  let bassPart: string | undefined;
  if (slashIdx >= 0) {
    const possibleBass = t.slice(slashIdx + 1).trim();
    if (VALID_SLASH_BASS.test(possibleBass)) {
      harmonyPart = t.slice(0, slashIdx).trim();
      bassPart = possibleBass;
    }
  }
  const base = parseChordRootAndMusicXmlKindText(harmonyPart, opts);
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

/** Display suffix for kind/@text (unnormalized harmony spelling, e.g. 6/9 not 69). */
export function parseChordForMusicXmlHarmonyDisplay(chord: string): MusicXmlHarmonyParts {
  const { harmonyPart, bassPart } = splitHarmonyChordForDisplay(chord);
  const base = parseChordRootAndMusicXmlKindText(harmonyPart, { literalKind: true });
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

export function escapeXmlForHarmony(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function alterToAccidental(alter: number): string {
  if (alter === 1) return '#';
  if (alter === -1) return 'b';
  return '';
}

export type HarmonyDegreeType = 'add' | 'alter' | 'subtract';

function degreeXmlFragment(
  value: number,
  alter: number,
  degType: HarmonyDegreeType,
  printObjectNo: boolean
): string {
  const po = printObjectNo ? ' print-object="no"' : '';
  return `<degree${po}><degree-value>${value}</degree-value><degree-alter>${alter}</degree-alter><degree-type>${degType}</degree-type></degree>`;
}

/**
 * Semantic degrees from normalized suffix; kind/@text carries display — degrees are non-printing when requested.
 */
export function harmonyDegreeXmlFromKindText(kindText: string, opts?: { printObjectNo?: boolean }): string {
  const printNo = opts?.printObjectNo !== false;
  const raw = kindText.trim();
  if (!raw) return '';

  type E = { v: number; a: number; t: HarmonyDegreeType };
  const entries: E[] = [];
  const seen = new Set<string>();
  const push = (value: number, alter: number, degType: HarmonyDegreeType = 'add') => {
    const k = `${value}:${alter}:${degType}`;
    if (seen.has(k)) return;
    seen.add(k);
    entries.push({ v: value, a: alter, t: degType });
  };

  const isAltDominant =
    /\b7\s*alt\b/i.test(raw) ||
    /^m?7\s*alt$/i.test(raw.trim()) ||
    /^7alt$/i.test(raw.trim()) ||
    /\(alt\)/i.test(raw);

  if (isAltDominant) {
    push(9, -1, 'alter');
    push(9, 1, 'alter');
    push(5, -1, 'alter');
    push(5, 1, 'alter');
    return entries.map((e) => degreeXmlFragment(e.v, e.a, e.t, printNo)).join('');
  }

  const hasSus = /sus/i.test(raw);
  if (hasSus) {
    if (/\bsus2\b/i.test(raw) && !/\bsus4\b/i.test(raw)) {
      push(3, 0, 'subtract');
      push(2, 0, 'add');
    } else {
      push(3, 0, 'subtract');
      push(4, 0, 'add');
    }
  }

  const keyNorm = raw.toLowerCase().replace(/\s+/g, '');
  if (keyNorm === '69' || keyNorm === '6/9') {
    push(9, 0, 'add');
  }

  for (const m of raw.matchAll(/\(([#b]?)(\d+)\)/g)) {
    const acc = m[1];
    const value = parseInt(m[2]!, 10);
    if (acc === '#') push(value, 1, 'alter');
    else if (acc === 'b') push(value, -1, 'alter');
    else push(value, 0, 'add');
  }

  const rest = raw.replace(/\([^)]*\)/g, ' ');
  for (const m of rest.matchAll(/([#b])(\d+)/g)) {
    const value = parseInt(m[2]!, 10);
    const alter = m[1] === '#' ? 1 : -1;
    push(value, alter, 'alter');
  }

  if (/maj9\b/i.test(raw)) push(9, 0, 'add');
  if (/maj11\b/i.test(raw)) push(11, 0, 'add');
  if (/maj13\b/i.test(raw)) push(13, 0, 'add');

  if (/m(9|11|13)\b/i.test(raw) && !/maj/i.test(raw)) {
    const mm = raw.match(/m(9|11|13)\b/i);
    if (mm) push(parseInt(mm[1]!, 10), 0, 'add');
  }
  if (/\bmin(9|11|13)\b/i.test(raw)) {
    const mm = raw.match(/\bmin(9|11|13)\b/i);
    if (mm) push(parseInt(mm[1]!, 10), 0, 'add');
  }

  if (/\badd(9|11|13|6)\b/i.test(raw)) {
    const mm = raw.match(/\badd(9|11|13|6)\b/i);
    if (mm) push(parseInt(mm[1]!, 10), 0, 'add');
  }

  if (/13/.test(raw) && !entries.some((e) => e.v === 13)) {
    push(13, 0, 'add');
  }
  if (!hasSus && /11/.test(raw) && !/#11|b11/.test(raw) && !entries.some((e) => e.v === 11)) {
    push(11, 0, 'add');
  }
  if (!hasSus && /\b9\b/.test(raw) && !/#9|b9/.test(raw) && !entries.some((e) => e.v === 9)) {
    push(9, 0, 'add');
  }

  return entries.map((e) => degreeXmlFragment(e.v, e.a, e.t, printNo)).join('');
}

/** Lead-sheet display string (root + suffix + optional slash bass). */
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
