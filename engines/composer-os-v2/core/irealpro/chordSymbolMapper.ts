import { TONALITY_VAULT_DATABASE } from '../harmony/tonalityVaultDatabase';
import type { ParsedChord } from './parsedChart';

const VAULT_TYPE_IDS = new Set(TONALITY_VAULT_DATABASE.map((row) => row.chordType));

const ROOT_TO_PC: Record<string, number> = {
  c: 0,
  'c#': 1,
  db: 1,
  d: 2,
  'd#': 3,
  eb: 3,
  e: 4,
  f: 5,
  'f#': 6,
  gb: 6,
  g: 7,
  'g#': 8,
  ab: 8,
  a: 9,
  'a#': 10,
  bb: 10,
  b: 11,
};

/** Normalise iReal-style extensions for stable matching (Δ, ^, -, M7/M9 major rules). */
export function normalizeChordQualityForMapping(raw: string): string {
  let s = raw.trim();
  if (!s) return '';
  s = s.replace(/^M(\d)/g, 'maj$1');
  if (s === 'M') {
    s = 'major';
  }
  s = s.replace(/mM7/gi, 'minmaj7');
  s = s.replace(/mM9/gi, 'minmaj9');
  s = s.replace(/-M7/gi, 'minmaj7');
  s = s.replace(/-M9/gi, 'minmaj9');
  s = s.toLowerCase();
  s = s.replace(/\s+/g, '');
  s = s.replace(/Δ/g, 'maj');
  s = s.replace(/\^/g, 'maj');
  if (s.startsWith('-')) {
    s = `m${s.slice(1)}`;
  }
  s = s.replace(/^maj#11#9$/, 'maj7#11#9');
  s = s.replace(/^maj#11$/, 'maj7#11');
  return s;
}

export function parseRootNoteToPc(rootNote: string): number | null {
  const key = rootNote.trim().toLowerCase();
  if (!key) return null;
  const pc = ROOT_TO_PC[key];
  return pc === undefined ? null : pc;
}

type Rule = { match: (s: string) => boolean; vaultId: string };

/**
 * Longest / most specific qualities first. Only returns ids present in {@link TONALITY_VAULT_DATABASE}.
 */
const QUALITY_RULES: Rule[] = [
  { match: (s) => s === 'maj7#11#9', vaultId: 'Maj7#11#9' },
  { match: (s) => s === 'minmaj13#11#9', vaultId: 'minMaj13#11#9' },
  { match: (s) => s === 'maj7#11', vaultId: 'Maj7#11' },
  { match: (s) => s === 'maj7#5', vaultId: 'Maj7#5' },
  { match: (s) => s === 'maj9', vaultId: 'Maj9' },
  { match: (s) => s === 'maj7' || s === 'maj', vaultId: 'Maj7' },
  { match: (s) => s === 'major', vaultId: 'Maj7' },
  { match: (s) => s === 'minmaj9', vaultId: 'minMaj9' },
  { match: (s) => s === 'minmaj7', vaultId: 'minMaj9' },
  { match: (s) => s === 'min11' || s === 'm11', vaultId: 'min11' },
  { match: (s) => s === 'm7b5' || s === 'ø' || s === 'ø7', vaultId: 'min7b5' },
  { match: (s) => s === 'min9' || s === 'm9', vaultId: 'min9' },
  { match: (s) => s === 'min7' || s === 'm7', vaultId: 'min9' },
  { match: (s) => s === 'min' || s === 'm', vaultId: 'min9' },
  { match: (s) => s === '-', vaultId: 'min9' },
  { match: (s) => s === '13#11' || s === '7#11', vaultId: '13#11#9' },
  { match: (s) => s === '13b9' || s === '7b9', vaultId: '13b9' },
  { match: (s) => s === '7#9#5' || s === '7alt', vaultId: '7#9#5' },
  { match: (s) => s === 'dom7' || s === '7', vaultId: '13#11#9' },
  { match: (s) => s === 'dim' || s === 'dim7' || s === 'o' || s === 'o7', vaultId: 'dim7b13' },
  { match: (s) => s === 'susb9' || s === '7susb9', vaultId: 'sus-b9' },
  { match: (s) => s === 'sus' || s === 'sus4' || s === 'sus2', vaultId: 'sus9' },
];

function mapNormalisedQualityToVaultId(normalised: string): string | null {
  if (normalised === '') {
    return 'Maj7';
  }
  for (const { match, vaultId } of QUALITY_RULES) {
    if (match(normalised) && VAULT_TYPE_IDS.has(vaultId)) {
      return vaultId;
    }
  }
  return null;
}

/**
 * Map a parsed chord symbol to a Tonality Vault **`chordType`** id + absolute **root PC** (C = 0 … B = 11).
 */
export function mapChordToVaultType(chord: ParsedChord): { vaultChordTypeId: string; rootPc: number } | null {
  const rootPc = parseRootNoteToPc(chord.rootNote);
  if (rootPc === null) {
    return null;
  }
  const q = normalizeChordQualityForMapping(chord.chordQuality);
  const vaultChordTypeId = mapNormalisedQualityToVaultId(q);
  if (vaultChordTypeId === null) {
    return null;
  }
  return { vaultChordTypeId, rootPc };
}
