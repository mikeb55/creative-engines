/**
 * Resolve chord bars for Wyble etude presets (V95).
 * Templates are defined from tonic; transposed by preset.key (PitchClass).
 */

import { noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import type {
  WybleEtudeDifficulty,
  WybleEtudePatternType,
  WybleEtudePreset,
} from './wybleEtudePresetTypes';

const ROOT_RE = /^([A-G](?:#|b)?)/i;

const PC_ROOT_NAMES: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

type BarSpec = { readonly offset: number; readonly quality: string };

function rootNameFromPc(keyPc: PitchClass, semitoneOffset: number): string {
  const pc = (((keyPc + semitoneOffset) % 12) + 12) % 12;
  return PC_ROOT_NAMES[pc]!;
}

function barsFromSpecs(keyPc: PitchClass, specs: readonly BarSpec[]): string[] {
  return specs.map(({ offset, quality }) => `${rootNameFromPc(keyPc, offset)}${quality}`);
}

const PENTATONIC: Record<WybleEtudeDifficulty, readonly BarSpec[]> = {
  easy: [
    { offset: 0, quality: 'maj7' },
    { offset: 5, quality: 'maj7' },
    { offset: 7, quality: '7' },
    { offset: 0, quality: 'maj7' },
  ],
  medium: [
    { offset: 2, quality: 'm7' },
    { offset: 7, quality: '7' },
    { offset: 0, quality: 'maj7' },
    { offset: 9, quality: 'm7' },
    { offset: 2, quality: 'm7' },
    { offset: 7, quality: '7' },
    { offset: 0, quality: 'maj7' },
    { offset: 0, quality: 'maj7' },
  ],
  hard: [
    { offset: 2, quality: 'm9' },
    { offset: 7, quality: '13' },
    { offset: 0, quality: 'maj9' },
    { offset: 5, quality: 'maj7' },
    { offset: 9, quality: 'm7' },
    { offset: 2, quality: 'm7' },
    { offset: 7, quality: '7alt' },
    { offset: 0, quality: 'maj7' },
    { offset: 4, quality: 'm7' },
    { offset: 9, quality: '7' },
    { offset: 2, quality: 'm7' },
    { offset: 0, quality: 'maj7' },
  ],
};

const CHROMATIC: Record<WybleEtudeDifficulty, readonly BarSpec[]> = {
  easy: [
    { offset: 0, quality: 'maj7' },
    { offset: 3, quality: 'maj7' },
    { offset: 5, quality: '7' },
    { offset: 0, quality: 'maj7' },
  ],
  medium: [
    { offset: 0, quality: 'maj7' },
    { offset: 1, quality: '7' },
    { offset: 2, quality: 'm7' },
    { offset: 5, quality: 'maj7' },
    { offset: 6, quality: '7' },
    { offset: 7, quality: '7' },
    { offset: 0, quality: 'maj7' },
    { offset: 11, quality: '7' },
  ],
  hard: [
    { offset: 0, quality: 'maj7#11' },
    { offset: 1, quality: '7b9' },
    { offset: 3, quality: 'maj7' },
    { offset: 4, quality: 'm7b5' },
    { offset: 6, quality: '7alt' },
    { offset: 7, quality: '7' },
    { offset: 8, quality: 'm7' },
    { offset: 10, quality: '7' },
    { offset: 11, quality: '7b9' },
    { offset: 0, quality: 'maj9' },
    { offset: 1, quality: '7alt' },
    { offset: 0, quality: 'maj7' },
  ],
};

const WHOLE_TONE: Record<WybleEtudeDifficulty, readonly BarSpec[]> = {
  easy: [
    { offset: 0, quality: 'aug' },
    { offset: 2, quality: 'aug' },
    { offset: 4, quality: 'aug' },
    { offset: 6, quality: 'aug' },
  ],
  medium: [
    { offset: 0, quality: 'maj7#5' },
    { offset: 2, quality: '7#5' },
    { offset: 4, quality: 'maj7#5' },
    { offset: 6, quality: '7#5' },
    { offset: 8, quality: 'maj7#5' },
    { offset: 10, quality: '7#5' },
    { offset: 0, quality: 'maj7#5' },
    { offset: 2, quality: '7#5' },
  ],
  hard: [
    { offset: 0, quality: 'maj7#5' },
    { offset: 2, quality: '7#5' },
    { offset: 4, quality: 'maj7#11' },
    { offset: 6, quality: '7alt' },
    { offset: 8, quality: 'maj7#5' },
    { offset: 10, quality: '7#5' },
    { offset: 0, quality: 'maj7#5' },
    { offset: 2, quality: '7#5' },
    { offset: 4, quality: 'maj7#11' },
    { offset: 6, quality: '7alt' },
    { offset: 8, quality: 'maj7#5' },
    { offset: 10, quality: '7#5' },
  ],
};

const PATTERN_TABLE: Record<
  string,
  Record<WybleEtudeDifficulty, readonly BarSpec[]> | undefined
> = {
  pentatonic: PENTATONIC,
  chromatic: CHROMATIC,
  whole_tone: WHOLE_TONE,
};

/** Pitch-class root label for a Wyble etude preset key. */
export function wybleEtudeKeyRootName(key: PitchClass): string {
  return PC_ROOT_NAMES[key]!;
}

/** Raw chord symbols (one per bar) before MusicContext normalisation. */
export function resolveWybleEtudePresetChordBars(preset: WybleEtudePreset): string[] {
  const patternKey = String(preset.patternType || 'pentatonic').trim().toLowerCase();
  const table = PATTERN_TABLE[patternKey] ?? PENTATONIC;
  const specs = table[preset.difficulty] ?? table.easy;
  return barsFromSpecs(preset.key, specs);
}

const DIFFICULTIES: readonly WybleEtudeDifficulty[] = ['easy', 'medium', 'hard'];
const PATTERN_TYPES: readonly WybleEtudePatternType[] = ['chromatic', 'pentatonic', 'whole_tone'];

function parsePitchClass(value: unknown): PitchClass | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return (((Math.round(value) % 12) + 12) % 12) as PitchClass;
}

/** Parse partial preset payload from API/UI (key may be PitchClass or omitted). */
export function parseWybleEtudePreset(input: unknown): Partial<WybleEtudePreset> | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const o = input as Record<string, unknown>;
  const out: Partial<WybleEtudePreset> = {};
  const key = parsePitchClass(o.key);
  if (key !== undefined) out.key = key;
  if (typeof o.keyRoot === 'string' && o.keyRoot.trim()) {
    const raw = o.keyRoot.trim();
    const m = raw.match(ROOT_RE);
    const root = m ? m[1]![0]!.toUpperCase() + m[1]!.slice(1) : 'C';
    const pc = noteNameToPitchClass(root);
    if (pc !== undefined) out.key = pc as PitchClass;
  }
  if (typeof o.tempo === 'number' && o.tempo > 0) out.tempo = o.tempo;
  if (typeof o.patternType === 'string' && o.patternType.trim()) {
    out.patternType = o.patternType.trim().toLowerCase();
  }
  if (typeof o.difficulty === 'string' && DIFFICULTIES.includes(o.difficulty as WybleEtudeDifficulty)) {
    out.difficulty = o.difficulty as WybleEtudeDifficulty;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Merge request fields into a ready-to-fire Wyble etude preset (always-on — no feature flag). */
export function resolveWybleEtudePreset(
  partial: unknown,
  fallback: { keyLabel?: string; bpm?: number }
): WybleEtudePreset {
  const parsed = parseWybleEtudePreset(partial) ?? {};
  const keyLabel = fallback.keyLabel?.trim() || 'C';
  const rootMatch = keyLabel.match(ROOT_RE);
  const root = rootMatch ? rootMatch[1]![0]!.toUpperCase() + rootMatch[1]!.slice(1) : 'C';
  const key =
    parsed.key ?? ((noteNameToPitchClass(root) ?? 0) as PitchClass);
  const tempo =
    parsed.tempo ??
    (typeof fallback.bpm === 'number' && fallback.bpm > 0 ? fallback.bpm : 120);
  const patternType =
    typeof parsed.patternType === 'string' && parsed.patternType.trim()
      ? parsed.patternType
      : 'pentatonic';
  const difficulty =
    parsed.difficulty && DIFFICULTIES.includes(parsed.difficulty)
      ? parsed.difficulty
      : 'medium';
  if (
    PATTERN_TYPES.includes(patternType as WybleEtudePatternType) ||
    PATTERN_TABLE[patternType.toLowerCase()]
  ) {
    return { key, tempo, patternType, difficulty };
  }
  return { key, tempo, patternType: 'pentatonic', difficulty };
}
