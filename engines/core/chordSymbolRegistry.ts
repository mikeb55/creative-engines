/**
 * Single source for chord quality families and lead-sheet suffix validation.
 * Used by progression parser, chord input parser, and validation helpers.
 */

export enum ChordQualityFamily {
  Maj = 'maj',
  Min = 'm',
  Dom = 'dom',
  Dim = 'dim',
  HalfDim = 'half-dim',
  Sus = 'sus',
}

const VALID_ROOT = /^[A-G][#b]?$/i;
const VALID_BASS = /^[A-G][#b]?$/i;

/** Max length of harmony suffix (after root, before slash) — generous for jazz symbols. */
export const CHORD_SUFFIX_MAX_LEN = 48;

/**
 * Classify normalized suffix into a coarse family for engine / diagnostics.
 */
export function classifyChordQualityFamily(suffix: string): ChordQualityFamily {
  const s = suffix.toLowerCase().replace(/\s+/g, '');
  if (!s) return ChordQualityFamily.Maj;

  if (/\bsus/.test(s) || /^sus/.test(s)) return ChordQualityFamily.Sus;

  if (/dim|°|o7|ø|half-dim|m7b5/.test(s)) {
    if (/dim7|°|o7/.test(s) && !/m7b5|ø/.test(s)) return ChordQualityFamily.Dim;
    if (/m7b5|ø|half-dim/.test(s)) return ChordQualityFamily.HalfDim;
    return ChordQualityFamily.Dim;
  }

  if (/^maj|maj\d|maj$|Δ|major|ma(?=\d)/.test(s) || /^69\b|^6\b/.test(s)) {
    return ChordQualityFamily.Maj;
  }

  if (/^m[^a]|^m$|^m\d|^min|^-/.test(s) || /^mi\d/.test(s)) {
    return ChordQualityFamily.Min;
  }

  return ChordQualityFamily.Dom;
}

/**
 * After normalization: suffix is "recognized" if it looks like a standard jazz lead-sheet fragment.
 * Allows inline #/b, parentheses, alt, extensions; rejects garbage characters.
 */
export function isChordSuffixRecognized(suffix: string): boolean {
  const q = suffix.trim();
  if (q.length === 0) return true;
  if (q.length > CHORD_SUFFIX_MAX_LEN) return false;

  const noParens = q.replace(/\([^)]*\)/g, '');
  const compact = noParens.replace(/\s+/g, '');
  if (!compact.length) return true;

  if (!/^[a-zA-Z0-9#+°ø\u00B0\u2013\-–]+$/u.test(compact)) {
    return false;
  }

  const lower = compact.toLowerCase();
  const hasCoreQuality =
    /^maj/.test(lower) ||
    /^(m|min|mi|dim|aug|sus|add|alt|half|dom|\+|o|ø)/.test(lower) ||
    /\d/.test(lower) ||
    /[+#]/.test(compact) ||
    /alt/.test(lower) ||
    /sus/.test(lower);

  return hasCoreQuality;
}

export interface ParsedChordStructure {
  root: string;
  bass: string | null;
  suffix: string;
  qualityFamily: ChordQualityFamily;
}

export function parseChordStructureFromNormalized(normalizedChord: string): ParsedChordStructure | null {
  const t = normalizedChord.trim().replace(/\s+/g, ' ');
  const m = t.match(/^([A-G](?:#|b)?)(.*)$/i);
  if (!m) return null;
  const root = m[1]!;
  let rest = (m[2] ?? '').trim();

  let bass: string | null = null;
  const slashIdx = rest.lastIndexOf('/');
  if (slashIdx >= 0) {
    const possibleBass = rest.slice(slashIdx + 1).trim();
    if (VALID_BASS.test(possibleBass)) {
      bass = possibleBass;
      rest = rest.slice(0, slashIdx).trim();
    }
  }

  if (!VALID_ROOT.test(root)) return null;
  if (bass && !VALID_BASS.test(bass)) return null;

  const suffix = rest;
  const qualityFamily = classifyChordQualityFamily(suffix);
  return { root, bass, suffix, qualityFamily };
}

/**
 * Full token check: root + optional bass + suffix must all be structurally valid.
 */
export function isChordSymbolRecognizedNormalized(collapsedNoSpaces: string): boolean {
  if (!collapsedNoSpaces) return false;
  const m = collapsedNoSpaces.match(/^([A-G](?:#|b)?)([^/]*?)(?:\/([A-G](?:#|b)?))?$/i);
  if (!m) return false;
  const root = m[1] ?? '';
  const qual = (m[2] ?? '').trim();
  const bass = m[3];
  if (!VALID_ROOT.test(root)) return false;
  if (bass !== undefined && !VALID_BASS.test(bass)) return false;
  return isChordSuffixRecognized(qual);
}
