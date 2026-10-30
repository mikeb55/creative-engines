/**
 * Full-song mood → existing EmotionalDrift reharm controls.
 * Omitting mood / using neutral leaves chord symbols untouched.
 */

import {
  generateReharmCandidates,
  scoreReharmCandidate,
  type EmotionalDrift,
} from '../harmony/reharmCandidateEngine';
import { mapChordToVaultType, parseRootNoteToPc } from '../irealpro/chordSymbolMapper';
import type { ParsedChord } from '../irealpro/parsedChart';
import type { SectionChordPlan } from './songCompilationTypes';
import { alignRepeatedChorusHarmony } from './chorusReturnIdentity';

/** Canonical mood ids accepted by the browser full-song API (map 1:1 onto EmotionalDrift). */
export const FULL_SONG_MOOD_VALUES = [
  'darker',
  'brighter',
  'more-suspended',
  'more-unstable',
  'more-cinematic',
  'neutral',
] as const;

export type FullSongMood = (typeof FULL_SONG_MOOD_VALUES)[number];

const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/**
 * Vault chordType → lead-sheet quality body that round-trips through
 * {@link mapChordToVaultType} and locked-harmony tone parity (e.g. min7b5 → m7b5).
 */
const VAULT_ID_TO_LEAD_QUALITY: Readonly<Record<string, string>> = {
  'Maj7#11#9': 'maj7#11#9',
  'minMaj13#11#9': 'minmaj13#11#9',
  'Maj7#11': 'maj7#11',
  'Maj7#5': 'maj7#5',
  Maj9: 'maj9',
  Maj6: '6',
  Maj7: 'maj7',
  minMaj9: 'minmaj9',
  min11: 'm11',
  min7b5: 'm7b5',
  min9: 'm9',
  '13#11#9': '13#11',
  '13b9': '13b9',
  '7#9#5': '7alt',
  dim7b13: 'dim7',
  'sus-b9': '7susb9',
  sus9: '9sus',
};

const ALIAS_TO_MOOD: Record<string, FullSongMood> = {
  darker: 'darker',
  dark: 'darker',
  brighter: 'brighter',
  bright: 'brighter',
  'more-suspended': 'more-suspended',
  suspended: 'more-suspended',
  sus: 'more-suspended',
  'more-unstable': 'more-unstable',
  unstable: 'more-unstable',
  'more-cinematic': 'more-cinematic',
  cinematic: 'more-cinematic',
  neutral: 'neutral',
};

/** Matches {@link reharmController} / sequence ranker seeded unit. */
function seededUnit(seed: number, bar: number, salt = 0): number {
  let s = (seed * 7919 + bar * 104729 + salt * 503) >>> 0;
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 0xffffffff;
}

function formatAppliedChordSymbol(
  rootPc: number,
  vaultChordTypeId: string,
  slashBass?: string
): string | null {
  const quality = VAULT_ID_TO_LEAD_QUALITY[vaultChordTypeId];
  if (quality === undefined) return null;
  const r = ROOT_NAMES[((rootPc % 12) + 12) % 12]!;
  const base = `${r}${quality}`;
  return slashBass ? `${base}/${slashBass}` : base;
}

function parseSymbolForVault(symbol: string): {
  parsed: ParsedChord;
  slashBass: string | undefined;
} | null {
  const s = symbol.trim();
  if (!s || /^n\.?c\.?$/i.test(s)) return null;
  const slash = /^(.+)\/([A-Ga-g][#b]?)$/.exec(s);
  const harmony = slash ? slash[1]!.trim() : s;
  const slashBass = slash ? slash[2] : undefined;
  const m = /^([A-Ga-g])([#b]?)(.*)$/.exec(harmony);
  if (!m) return null;
  const rootNote = (m[1]! + (m[2] ?? '')).toLowerCase();
  if (parseRootNoteToPc(rootNote) === null) return null;
  return {
    parsed: {
      symbol: s,
      rootNote,
      chordQuality: (m[3] ?? '').trim(),
      duration: 1,
      barIndex: 0,
      beatIndex: 0,
    },
    slashBass,
  };
}

/**
 * Resolve optional API mood string to EmotionalDrift.
 * Empty / omitted → null (no transform). Unknown non-empty → throws.
 */
export function resolveFullSongMood(mood: string | undefined | null): EmotionalDrift | null {
  if (mood == null) return null;
  const key = String(mood).trim().toLowerCase();
  if (key === '') return null;
  const resolved = ALIAS_TO_MOOD[key];
  if (!resolved) {
    throw new Error(
      `generateFullSongMusicXml: unknown mood "${mood}" (supported: ${FULL_SONG_MOOD_VALUES.join(', ')} + aliases dark/bright/suspended/unstable/cinematic)`
    );
  }
  if (resolved === 'neutral') return null;
  return resolved;
}

function applyDriftToSymbol(
  symbol: string,
  seed: number,
  barIndex: number,
  drift: EmotionalDrift
): string {
  const parts = parseSymbolForVault(symbol);
  if (!parts) return symbol;
  const mapped = mapChordToVaultType(parts.parsed);
  if (!mapped) return symbol;

  const cands = generateReharmCandidates(mapped.vaultChordTypeId, mapped.rootPc, null, drift);
  if (cands.length === 0) return symbol;

  const scored = cands
    .map((c, idx) => ({ c, idx, sc: scoreReharmCandidate(c, drift, null) }))
    .filter(({ c }) => VAULT_ID_TO_LEAD_QUALITY[c.substituteChordTypeId] !== undefined)
    .sort((a, b) => {
      if (Math.abs(b.sc - a.sc) > 1e-9) return b.sc - a.sc;
      return seededUnit(seed, barIndex, a.idx) - seededUnit(seed, barIndex, b.idx);
    });

  for (const { c } of scored) {
    if (c.substituteChordTypeId === mapped.vaultChordTypeId && c.substituteRootPc === mapped.rootPc) {
      continue;
    }
    const formatted = formatAppliedChordSymbol(c.substituteRootPc, c.substituteChordTypeId, parts.slashBass);
    if (!formatted) continue;
    const check = parseSymbolForVault(formatted);
    if (!check) continue;
    const remapped = mapChordToVaultType(check.parsed);
    if (!remapped || remapped.vaultChordTypeId !== c.substituteChordTypeId) continue;
    return formatted;
  }
  return symbol;
}

/**
 * Bias Song Mode chord plan via Tonality Vault EmotionalDrift ranking.
 * Re-aligns repeated choruses afterward so form identity stays intact.
 */
export function applyMoodDriftToChordPlan(
  chordPlan: SectionChordPlan[],
  seed: number,
  drift: EmotionalDrift
): SectionChordPlan[] {
  let bar = 0;
  const next = chordPlan.map((block) => {
    const chordSymbols = block.chordSymbols.map((sym) => {
      bar += 1;
      return applyDriftToSymbol(sym, seed, bar, drift);
    });
    return { ...block, chordSymbols };
  });
  return alignRepeatedChorusHarmony(next);
}
