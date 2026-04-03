/**
 * Lead-sheet chord normalization: single pass before token validation / harmony split.
 * Fixes stacked extensions written with a slash (e.g. C6/9) vs true slash-bass (Cmaj7/E).
 */

import {
  CHORD_SUFFIX_MAX_LEN,
  classifyChordQualityFamily,
  isChordSuffixRecognized,
  isChordSymbolRecognizedNormalized,
  parseChordStructureFromNormalized,
  type ParsedChordStructure,
} from './chordSymbolRegistry';

const VALID_SLASH_BASS = /^[A-G][#b]?$/i;

/** Same shape as progression parser: root + quality + optional slash bass note. */
export const CHORD_TOKEN_SHAPE =
  /^([A-G](?:#|b)?)([^/]*?)(?:\/([A-G](?:#|b)?))?$/i;

/**
 * Synonym pass on the harmony fragment only (after root letter, before slash bass).
 */
export function normalizeHarmonySynonyms(harmony: string): string {
  let h = harmony;

  h = h.replace(/\u0394/g, 'maj').replace(/Δ/g, 'maj');

  h = h.replace(/^Maj\b/i, 'maj');

  h = h.replace(/\badd2\b/gi, 'add9');

  /** Leading minor hyphen before a figure (e.g. Bb-9 → Bbm9). Run before M→maj so "-" never becomes "maj". */
  h = h.replace(/^[-–](?=\d)/, 'm');

  h = h.replace(/\bminor\b/gi, 'm');
  h = h.replace(/\bmin(?=\d)/gi, 'm');
  h = h.replace(/\bmin\b/gi, 'm');
  h = h.replace(/\bmi(?=\d)/gi, 'm');

  /**
   * CM7 → Cmaj7 only when M is uppercase. Do NOT use /i — it would match m7/m9 and wrongly turn minor into major.
   */
  h = h.replace(/^M(7|9|11|13|6|69)?(?=\b|(?=[#(])|$)/, (_, n: string | undefined) =>
    n ? `maj${n}` : 'maj'
  );
  h = h.replace(/^M$/, 'maj');

  return h;
}

/**
 * Pre-parse normalization: trim, synonym pass, stacked-extension rewrites, canonical string downstream.
 */
export function normalizeChordSymbol(input: string): string {
  return normalizeLeadSheetChordSpelling(input);
}

/**
 * Rewrite common jazz spellings so `/` in extensions is not mistaken for bass.
 * True slash bass uses last `/` only when the segment after it is a note name (A–G, optional #/b).
 */
export function normalizeLeadSheetChordSpelling(input: string): string {
  const s = input.trim();
  if (!s) return s;
  const m = s.match(/^([A-G](?:#|b)?)(.*)$/i);
  if (!m) return s;
  const root = m[1]!;
  let rest = m[2] ?? '';

  let harmony = rest;
  let bass = '';
  const slashIdx = rest.lastIndexOf('/');
  if (slashIdx >= 0) {
    const possibleBass = rest.slice(slashIdx + 1).trim();
    if (VALID_SLASH_BASS.test(possibleBass)) {
      harmony = rest.slice(0, slashIdx);
      bass = possibleBass;
    }
  }

  harmony = normalizeHarmonySynonyms(harmony);

  harmony = harmony.replace(/maj7\s*\/\s*9\b/gi, 'maj9');
  harmony = harmony.replace(/maj7\s*\/\s*13\b/gi, 'maj13');
  harmony = harmony.replace(/min7\s*\/\s*9\b/gi, 'm9');
  harmony = harmony.replace(/min7\s*\/\s*11\b/gi, 'm11');
  harmony = harmony.replace(/\bm7\s*\/\s*9\b/gi, 'm9');
  harmony = harmony.replace(/\bm7\s*\/\s*11\b/gi, 'm11');
  harmony = harmony.replace(/6\s*\/\s*9/g, '69');

  return bass ? `${root}${harmony}/${bass}` : `${root}${harmony}`;
}

export function normalizeChordTokenForValidation(raw: string): string {
  return normalizeChordSymbol(raw).trim().replace(/\s+/g, '');
}

export function isValidChordShapeNormalized(s: string): boolean {
  if (!s) return false;
  const m = s.match(CHORD_TOKEN_SHAPE);
  if (!m) return false;
  const qual = (m[2] ?? '').trim();
  if (qual.length > CHORD_SUFFIX_MAX_LEN) return false;
  return isChordSuffixRecognized(qual);
}

export interface ChordDiagnostic {
  originalInput: string;
  normalized: string;
  parsed: ParsedChordStructure | null;
  fallbackApplied: boolean;
  warning?: string;
}

export interface ChordFallbackResult {
  chord: string;
  usedFallback: boolean;
  warning?: string;
  diagnostic?: ChordDiagnostic;
}

function extractRootLetter(raw: string): string {
  const r = raw.trim().match(/^([A-G](?:#|b)?)/i);
  return r ? r[1]! : 'C';
}

function tryBuildRecognizedChord(root: string, suffix: string, bass: string | null): string | null {
  const body = `${root}${suffix}`;
  const full = bass ? `${body}/${bass}` : body;
  const collapsed = full.replace(/\s+/g, '');
  if (isChordSymbolRecognizedNormalized(collapsed) && isValidChordShapeNormalized(collapsed)) {
    return full.replace(/\s+/g, ' ').trim();
  }
  return null;
}

/**
 * Structured parse + optional fallback chain. Logs:
 * `Chord normalized/fallback: <input> → <output>` when a fallback mapping is applied.
 */
export function chordWithFallback(raw: string): ChordFallbackResult {
  const originalInput = raw.trim();
  const normalized = normalizeChordSymbol(originalInput).replace(/\s+/g, ' ').trim();
  const collapsed = normalized.replace(/\s+/g, '');

  if (isChordSymbolRecognizedNormalized(collapsed) && isValidChordShapeNormalized(collapsed)) {
    return {
      chord: normalized,
      usedFallback: false,
      diagnostic: {
        originalInput,
        normalized,
        parsed: parseChordStructureFromNormalized(normalized),
        fallbackApplied: false,
      },
    };
  }

  const parsedSeed = parseChordStructureFromNormalized(normalized);
  const root = parsedSeed?.root ?? extractRootLetter(originalInput);
  const bass = parsedSeed?.bass ?? null;
  let suffix = parsedSeed?.suffix ?? '';

  const trySuffix = (suf: string) => tryBuildRecognizedChord(root, suf, bass);

  /** No stripping of #11 / alt / sus or simplification of extensions — only last-resort root+maj7. */
  let out =
    (suffix.length > 0 ? trySuffix(suffix) : null) ||
    trySuffix('maj7');

  if (!out) {
    out = `${root}maj7`;
  }

  const usedFallback = out.replace(/\s+/g, '') !== collapsed.replace(/\s+/g, '');
  const warning = usedFallback
    ? `Chord normalized/fallback: ${originalInput} → ${out}`
    : undefined;
  if (usedFallback) {
    console.warn(`[chord] ${warning}`);
  }

  const parsed = parseChordStructureFromNormalized(out) ?? {
    root,
    bass,
    suffix: out.slice(root.length).split('/')[0] ?? '',
    qualityFamily: classifyChordQualityFamily(out.slice(root.length).split('/')[0] ?? ''),
  };

  return {
    chord: out,
    usedFallback,
    warning,
    diagnostic: {
      originalInput,
      normalized: out,
      parsed,
      fallbackApplied: usedFallback,
      warning,
    },
  };
}

/**
 * Diagnostic record for logging / UI: original, normalized, parsed structure, fallback flag.
 */
export function chordDiagnosticForInput(raw: string): ChordDiagnostic {
  const r = chordWithFallback(raw);
  return (
    r.diagnostic ?? {
      originalInput: raw.trim(),
      normalized: r.chord,
      parsed: null,
      fallbackApplied: r.usedFallback,
      warning: r.warning,
    }
  );
}

export {
  classifyChordQualityFamily,
  parseChordStructureFromNormalized,
  isChordSuffixRecognized,
  isChordSymbolRecognizedNormalized,
} from './chordSymbolRegistry';
export { ChordQualityFamily } from './chordSymbolRegistry';
