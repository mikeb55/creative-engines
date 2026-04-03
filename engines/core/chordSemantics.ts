/**
 * Unified chord semantics — single structural representation for parser-adjacent tooling,
 * validation, MusicXML export, and future engines.
 *
 * Built from the same suffix extraction as {@link parseChordForMusicXmlHarmony} (via chordSymbolMusicXmlCore)
 * plus the same #/b extension strings as canonical chord parsing — no ad-hoc symbol regex.
 */

import {
  escapeXmlForHarmony,
  harmonyDegreeXmlFromKindText,
  musicXmlKindBodyForHarmonyExport,
  musicXmlKindContentFromKindText,
  parseChordForMusicXmlHarmony,
  parseChordForMusicXmlHarmonyDisplay,
} from './chordSymbolMusicXmlCore';
import { normalizeLeadSheetChordSpelling } from './leadSheetChordNormalize';
import { parseChordStructureFromNormalized } from './chordSymbolRegistry';

/** Same as {@link parseLeadSheetChordToCanonical} / extractExtensionsAlterations — kept local to avoid import cycles. */
function extractExtensionsAlterations(suffix: string): { extensions: string[]; alterations: string[] } {
  const extensions: string[] = [];
  const alterations: string[] = [];
  if (/\balt\b|7alt/i.test(suffix)) alterations.push('alt');
  const extSet = new Set<string>();
  for (const m of suffix.matchAll(/\b(6|9|11|13)\b/gi)) {
    extSet.add(m[1]!.toLowerCase());
  }
  for (const m of suffix.matchAll(/\b(?:m|min|maj)(9|11|13)\b/gi)) {
    extSet.add(m[1]!.toLowerCase());
  }
  extensions.push(...[...extSet].sort());
  for (const m of suffix.matchAll(/([#b])(9|11|13)/gi)) {
    alterations.push(`${m[1]}${m[2]}`);
  }
  return { extensions, alterations };
}

function rootLetterFromStepAlter(step: string, alter: number): string {
  if (alter === 1) return `${step}#`;
  if (alter === -1) return `${step}b`;
  return step;
}

export interface ChordSemantics {
  root: string;
  bass?: string;

  quality:
    | 'major'
    | 'minor'
    | 'dominant'
    | 'diminished'
    | 'half-diminished'
    | 'suspended';

  /** Chord tones at extension degrees 7 / 9 / 11 / 13 (stacked harmony). */
  extensions: number[];

  alterations: {
    degree: number;
    alter: -1 | 1;
  }[];

  /** Tones added to a simpler core (e.g. 6 and 9 on major-sixth). */
  additions: number[];

  /** Scale degrees omitted or replaced (e.g. 3 under sus). */
  omissions: number[];

  flags: {
    alt?: boolean;
    sus?: boolean;
  };
}

/** MusicXML &lt;kind&gt; body → coarse quality for semantics. */
function qualityFromKindBody(kindBody: string): ChordSemantics['quality'] {
  const k = kindBody.toLowerCase();
  if (k === 'half-diminished') return 'half-diminished';
  if (k.startsWith('diminished') || k === 'diminished') return 'diminished';
  if (k.startsWith('suspended')) return 'suspended';
  if (k.startsWith('minor') || k === 'minor') return 'minor';
  if (k.startsWith('dominant') || k === 'dominant') return 'dominant';
  if (k.startsWith('major') || k === 'major') return 'major';
  return 'major';
}

/**
 * Extension stack implied by MusicXML kind enumeration (deterministic, kind-body–driven).
 */
const KIND_BODY_EXTENSIONS: Record<string, number[]> = {
  'major-seventh': [7],
  'major-ninth': [7, 9],
  'major-11th': [7, 9, 11],
  'major-13th': [7, 9, 11, 13],
  'major-sixth': [6],
  'minor-seventh': [7],
  'minor-ninth': [7, 9],
  'minor-11th': [7, 9, 11],
  'minor-13th': [7, 9, 11, 13],
  'minor-sixth': [6],
  dominant: [7],
  'dominant-ninth': [7, 9],
  'dominant-11th': [7, 9, 11],
  'dominant-13th': [7, 9, 11, 13],
  major: [],
  minor: [],
  'half-diminished': [7],
  'diminished-seventh': [7],
  diminished: [],
  'suspended-second': [],
  'suspended-fourth': [],
  augmented: [],
};

function extensionsForKindBody(kindBody: string): number[] {
  return [...(KIND_BODY_EXTENSIONS[kindBody] ?? [])];
}

/**
 * Stack degrees 7/9/11/13 from kind + explicit altered upper extensions.
 * Altered 5/9 from a plain "alt" dominant are not treated as stacked extensions.
 */
function mergeStackedExtensions(
  suffix: string,
  baseExts: number[],
  alterations: ChordSemantics['alterations'],
  flags: { alt?: boolean }
): number[] {
  const out = new Set(baseExts);
  for (const a of alterations) {
    if (![7, 9, 11, 13].includes(a.degree)) continue;
    if (flags.alt) {
      const isAltPack =
        (a.degree === 9 && (a.alter === -1 || a.alter === 1)) ||
        (a.degree === 5 && (a.alter === -1 || a.alter === 1));
      if (isAltPack) continue;
    }
    out.add(a.degree);
  }
  if (/#11|b11/i.test(suffix)) out.add(11);
  if (/#13|b13/i.test(suffix)) out.add(13);
  return [...out].sort((x, y) => x - y);
}

function parseAlterToken(token: string): { degree: number; alter: -1 | 1 } | null {
  const m = token.trim().match(/^([#b])([0-9]+)$/i);
  if (!m) return null;
  const deg = parseInt(m[2]!, 10);
  if (![5, 9, 11, 13].includes(deg)) return null;
  return { degree: deg, alter: m[1] === '#' ? 1 : -1 };
}

/**
 * Parse root letter + accidental into MusicXML-style step + alter.
 */
export function parseRootNotation(root: string): { rootStep: string; rootAlter: number } {
  const m = root.trim().match(/^([A-G])([#b]?)$/i);
  if (!m) return { rootStep: 'C', rootAlter: 0 };
  let alter = 0;
  if (m[2] === '#') alter = 1;
  else if (m[2] === 'b') alter = -1;
  return { rootStep: m[1]!.toUpperCase(), rootAlter: alter };
}

/**
 * Build unified semantics from a normalized lead-sheet token (full symbol including root).
 */
export function buildChordSemantics(normalizedSymbol: string): ChordSemantics {
  const text = normalizeLeadSheetChordSpelling(normalizedSymbol.trim()).replace(/\s+/g, ' ').trim();
  const parts = parseChordForMusicXmlHarmony(text, { literalKind: true });
  const struct = parseChordStructureFromNormalized(text);

  const suffix = parts.kindText ?? '';
  const { alterations: altStrings } = extractExtensionsAlterations(suffix);
  const kindBody = musicXmlKindContentFromKindText(suffix);
  let quality = qualityFromKindBody(kindBody);

  const flags = {
    alt: /\balt\b|7alt/i.test(suffix),
    sus: /sus/i.test(suffix),
  };

  let extensions = extensionsForKindBody(kindBody);
  const additions: number[] = [];
  const omissions: number[] = [];

  const lower = suffix.toLowerCase().replace(/\s+/g, '');
  if (lower === '69' || lower === '6/9') {
    additions.push(6, 9);
    extensions = [];
  }

  if (flags.sus) {
    omissions.push(3);
    if (/\d/.test(suffix) && /sus/i.test(suffix)) {
      quality = 'suspended';
    }
  }

  const alterations: ChordSemantics['alterations'] = [];
  const seenAlt = new Set<string>();

  for (const a of altStrings) {
    if (/^alt$/i.test(a.trim())) continue;
    const p = parseAlterToken(a);
    if (p) {
      const k = `${p.degree}:${p.alter}`;
      if (!seenAlt.has(k)) {
        seenAlt.add(k);
        alterations.push(p);
      }
    }
  }

  for (const m of suffix.matchAll(/\(([#b])(\d+)\)/g)) {
    const p = parseAlterToken(`${m[1]}${m[2]}`);
    if (p) {
      const k = `${p.degree}:${p.alter}`;
      if (!seenAlt.has(k)) {
        seenAlt.add(k);
        alterations.push(p);
      }
    }
  }
  for (const m of suffix.replace(/\([^)]*\)/g, ' ').matchAll(/([#b])(9|11|13|5)(?!\d)/g)) {
    const p = parseAlterToken(`${m[1]}${m[2]}`);
    if (p) {
      const k = `${p.degree}:${p.alter}`;
      if (!seenAlt.has(k)) {
        seenAlt.add(k);
        alterations.push(p);
      }
    }
  }

  if (flags.alt) {
    const altSet: ChordSemantics['alterations'] = [
      { degree: 9, alter: -1 },
      { degree: 9, alter: 1 },
      { degree: 5, alter: -1 },
      { degree: 5, alter: 1 },
    ];
    for (const p of altSet) {
      const k = `${p.degree}:${p.alter}`;
      if (!seenAlt.has(k)) {
        seenAlt.add(k);
        alterations.push(p);
      }
    }
  }

  if (additions.length === 0) {
    extensions = mergeStackedExtensions(suffix, extensions, alterations, flags);
  }

  const root =
    struct?.root ?? rootLetterFromStepAlter(parts.rootStep, parts.rootAlter);
  const bass =
    (struct?.bass ??
      (parts.bassStep !== undefined
        ? rootLetterFromStepAlter(parts.bassStep, parts.bassAlter ?? 0)
        : null)) ?? undefined;

  return {
    root,
    bass,
    quality,
    extensions,
    alterations,
    additions: [...new Set(additions)].sort((a, b) => a - b),
    omissions: [...new Set(omissions)].sort((a, b) => a - b),
    flags,
  };
}

/**
 * One line of MusicXML: `<harmony>…</harmony>` at beat 1. Optional `<staff>` for multi-staff parts.
 * Root and bass come from {@link buildChordSemantics}; kind text and degrees unchanged from prior behaviour.
 */
export function buildHarmonyXmlLine(
  chordSymbol: string,
  opts?: {
    staffNumber?: number;
    /** @deprecated No longer used; display is always kind/@text. */
    exactChordTextElement?: boolean;
  }
): string {
  const sem = buildChordSemantics(chordSymbol);
  const semantic = parseChordForMusicXmlHarmony(chordSymbol, { literalKind: true });
  const display = parseChordForMusicXmlHarmonyDisplay(chordSymbol);
  const kindContent = musicXmlKindBodyForHarmonyExport(semantic.kindText);
  const kindAttrText = display.kindText;
  const degreeXml = harmonyDegreeXmlFromKindText(semantic.kindText, { printObjectNo: true });
  const r = parseRootNotation(sem.root);
  const alterEl = r.rootAlter !== 0 ? `<root-alter>${r.rootAlter}</root-alter>` : '';
  const bassEl =
    sem.bass !== undefined
      ? (() => {
          const b = parseRootNotation(sem.bass);
          const bassAlterEl = b.rootAlter !== 0 ? `<bass-alter>${b.rootAlter}</bass-alter>` : '';
          return `<bass><bass-step>${b.rootStep}</bass-step>${bassAlterEl}</bass>`;
        })()
      : '';
  const staffEl = opts?.staffNumber !== undefined ? `<staff>${opts.staffNumber}</staff>` : '';
  return `    <harmony>${staffEl}<root><root-step>${r.rootStep}</root-step>${alterEl}</root><kind text="${escapeXmlForHarmony(
    kindAttrText
  )}">${escapeXmlForHarmony(kindContent)}</kind>${bassEl}${degreeXml}</harmony>\n`;
}
