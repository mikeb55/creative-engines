/**
 * V102 — Tritonic realisation: Wayne behaviour + voice-leading phrases → MusicContext.
 * Dictionary-only; does not touch phraseEngineV2 or existing ECM/Duo/BB producers.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import { wybleEtudeKeyRootName } from '../music-context/wybleEtudePresetProgressions';
import type { TritonicCell, TritonicCellFamily } from './tritonicCell';
import { applyWayneBehaviour, type WayneBehaviourOptions } from './tritonicBehaviourLayer';
import { getVoiceLeadingCandidates } from './tritonicVoiceLeading';

export type TritonicRealisationMode = 'bb' | 'sq' | 'ecm';

export type TritonicRealisationContext = {
  mode: TritonicRealisationMode;
  cells: TritonicCell[];
  behaviourOptions: WayneBehaviourOptions;
};

export type TritonicRealisationResult = {
  phrases: TritonicCell[][];
  mode: TritonicRealisationMode;
  checksum: string;
};

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

const FAMILY_CHORD_SUFFIX: Record<TritonicCellFamily, string> = {
  quartal: 'sus4',
  cluster: '7alt',
  suspended: '7sus4',
  shorter_floating: 'maj7',
  bergonzi: '7',
};

type PhrasePlan = { phraseCount: number; cellsPerPhrase: number };

const MODE_PHRASE_PLAN: Record<TritonicRealisationMode, PhrasePlan> = {
  bb: { phraseCount: 1, cellsPerPhrase: 4 },
  sq: { phraseCount: 2, cellsPerPhrase: 3 },
  ecm: { phraseCount: 1, cellsPerPhrase: 4 },
};

/** Mode-specific Wayne knobs (ECM forces delayedResolution). */
export function resolveWayneBehaviourForRealisation(
  mode: TritonicRealisationMode,
  options: WayneBehaviourOptions,
): WayneBehaviourOptions {
  if (mode === 'bb') {
    return {
      ...options,
      oddityScore: Math.max(options.oddityScore, 0.65),
    };
  }
  if (mode === 'sq') {
    return {
      ...options,
      oddityScore: Math.min(options.oddityScore, 0.25),
    };
  }
  return {
    ...options,
    delayedResolution: true,
  };
}

function modeCellPool(cells: TritonicCell[], mode: TritonicRealisationMode): TritonicCell[] {
  if (mode !== 'ecm') return cells;
  const preferred = cells.filter(
    (c) => c.family === 'suspended' || c.family === 'shorter_floating',
  );
  return preferred.length > 0 ? preferred : cells;
}

function pickStartCell(cells: TritonicCell[], mode: TritonicRealisationMode): TritonicCell {
  const pool = modeCellPool(cells, mode);
  if (mode === 'bb') {
    return [...pool].sort((a, b) => b.tension - a.tension)[0]!;
  }
  if (mode === 'ecm') {
    return (
      pool.find((c) => c.family === 'suspended') ??
      pool.find((c) => c.family === 'shorter_floating') ??
      pool[0]!
    );
  }
  return [...pool].sort((a, b) => a.tension - b.tension)[0]!;
}

function pickNextCell(
  from: TritonicCell,
  pool: TritonicCell[],
  options: WayneBehaviourOptions,
): TritonicCell {
  const candidates = getVoiceLeadingCandidates(from, pool);
  if (candidates.length === 0) return from;
  const ranked = applyWayneBehaviour(candidates, options);
  return ranked[0]?.to ?? from;
}

function buildPhrase(
  start: TritonicCell,
  pool: TritonicCell[],
  length: number,
  options: WayneBehaviourOptions,
): TritonicCell[] {
  const phrase: TritonicCell[] = [start];
  let current = start;
  for (let i = 1; i < length; i++) {
    const next = pickNextCell(current, pool, options);
    phrase.push(next);
    current = next;
  }
  return phrase;
}

/** Fingerprint phrase cell pitch-class content (sorted triads). */
export function checksumFromTritonicPhrases(phrases: TritonicCell[][]): string {
  const tokens = phrases.flat().map((cell) =>
    cell.notes
      .slice()
      .sort((a, b) => a - b)
      .join(','),
  );
  return computeMusicContextChecksum(tokens);
}

function cellToChordSymbol(cell: TritonicCell, key: PitchClass): string {
  const bass = [...cell.notes].sort((a, b) => a - b)[0]!;
  const rootPc = (((bass + key) % 12) + 12) % 12;
  const root = PC_ROOT_NAMES[rootPc]!;
  const suffix = FAMILY_CHORD_SUFFIX[cell.family];
  return `${root}${suffix}`;
}

export function realiseTritonic(ctx: TritonicRealisationContext): TritonicRealisationResult {
  if (!ctx.cells.length) {
    throw new Error('TritonicRealisationContext requires at least one cell');
  }

  const pool = modeCellPool(ctx.cells, ctx.mode);
  const behaviour = resolveWayneBehaviourForRealisation(ctx.mode, ctx.behaviourOptions);
  const plan = MODE_PHRASE_PLAN[ctx.mode];
  const phrases: TritonicCell[][] = [];

  for (let p = 0; p < plan.phraseCount; p++) {
    const start = pickStartCell(pool, ctx.mode);
    const len = ctx.mode === 'sq' ? Math.min(plan.cellsPerPhrase, 2 + (p % 2)) : plan.cellsPerPhrase;
    phrases.push(buildPhrase(start, pool, len, behaviour));
  }

  return {
    phrases,
    mode: ctx.mode,
    checksum: checksumFromTritonicPhrases(phrases),
  };
}

/** Map realised phrases to MusicContext harmony (one bar per cell). */
export function realisationToMusicContext(
  result: TritonicRealisationResult,
  key: PitchClass,
): MusicContext {
  const harmonyBars = result.phrases
    .flat()
    .map((cell) => normalizeChordSymbol(cellToChordSymbol(cell, key)));
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'generated',
  };
  const root = wybleEtudeKeyRootName(key);
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: `tritonic_${result.mode}`,
    key: { root, mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm: 120,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'tritonic',
      capturedAt: Date.now(),
    },
    receipts: [],
  };
}
