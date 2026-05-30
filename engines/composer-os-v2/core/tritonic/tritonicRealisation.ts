/**
 * V102 — Tritonic realisation: Wayne behaviour + voice-leading phrases → MusicContext.
 * Dictionary-only; does not touch phraseEngineV2 or existing ECM/Duo/BB producers.
 */

import {
  normalizeChordSymbol,
  noteNameToPitchClass,
  parseChordSymbol,
} from '../harmony/chordSymbolAnalysis';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import {
  computeMusicContextChecksum,
  harmonyBarsFromMusicContext,
} from '../music-context/musicContextAdapters';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import { wybleEtudeKeyRootName } from '../music-context/wybleEtudePresetProgressions';
import type { TritonicCell, TritonicCellFamily } from './tritonicCell';
import { applyWayneBehaviour, type WayneBehaviourOptions } from './tritonicBehaviourLayer';
import { scheduleTritonicTimeline, type TritonicTimelineEvent } from './tritonicTimeline';
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
  timeline: TritonicTimelineEvent[];
};

export type { TritonicTimelineEvent };

/** Vault-anchored realisation — one floating cell per vault harmony bar. */
export type VaultAnchoredTritonicResult = TritonicRealisationResult & {
  anchorBars: readonly string[];
  anchorChecksum: string;
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

/** True when MusicContext originated from Tonality Vault export. */
export function isVaultMusicContext(ctx: MusicContext): boolean {
  return ctx.provenance?.sourceEngineId === 'vault' || ctx.presetId === 'vault';
}

/** Pitch class of anchor chord root (harmony part only — slash bass ignored for float reference). */
export function anchorRootPcFromSymbol(symbol: string): PitchClass {
  const parsed = parseChordSymbol(symbol);
  const rootMatch = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  const rootName = rootMatch?.[1];
  const pc = rootName ? noteNameToPitchClass(rootName) : undefined;
  return ((pc ?? 0) % 12) as PitchClass;
}

/** Transpose cell pitch classes so they float above the anchor root (shape preserved). */
export function floatCellAboveAnchor(cell: TritonicCell, anchorSymbol: string): TritonicCell {
  const anchorPc = anchorRootPcFromSymbol(anchorSymbol);
  const notes = cell.notes.map(
    (pc) => (((pc + anchorPc) % 12) + 12) % 12,
  ) as PitchClass[];
  return { ...cell, notes };
}

function cellToChordSymbol(cell: TritonicCell, key: PitchClass): string {
  const bass = [...cell.notes].sort((a, b) => a - b)[0]!;
  const rootPc = (((bass + key) % 12) + 12) % 12;
  const root = PC_ROOT_NAMES[rootPc]!;
  const suffix = FAMILY_CHORD_SUFFIX[cell.family];
  return `${root}${suffix}`;
}

/**
 * Voice-lead tritonic cells bar-for-bar over Vault harmony anchors (LOCK checksum).
 * harmony.bars in output remain vault anchors — cells float above, not replace.
 */
export function realiseTritonicFromVault(
  vaultCtx: MusicContext,
  ctx: TritonicRealisationContext,
): VaultAnchoredTritonicResult {
  if (!isVaultMusicContext(vaultCtx)) {
    throw new Error('realiseTritonicFromVault requires a Vault MusicContext source');
  }
  if (!ctx.cells.length) {
    throw new Error('TritonicRealisationContext requires at least one cell');
  }

  const anchorBars = harmonyBarsFromMusicContext(vaultCtx);
  if (anchorBars.length === 0) {
    throw new Error('Vault MusicContext has no harmony bars to anchor');
  }
  const anchorChecksum = vaultCtx.harmony.checksum;

  const pool = modeCellPool(ctx.cells, ctx.mode);
  const behaviour = resolveWayneBehaviourForRealisation(ctx.mode, ctx.behaviourOptions);

  const floatingCells: TritonicCell[] = [];
  let current = pickStartCell(pool, ctx.mode);
  floatingCells.push(floatCellAboveAnchor(current, anchorBars[0]!));

  for (let i = 1; i < anchorBars.length; i++) {
    const next = pickNextCell(current, pool, behaviour);
    current = next;
    floatingCells.push(floatCellAboveAnchor(current, anchorBars[i]!));
  }

  const phrases = [floatingCells];
  const timeline = scheduleTritonicTimeline(floatingCells, ctx.mode, {
    barCount: anchorBars.length,
  });
  return {
    phrases,
    mode: ctx.mode,
    checksum: checksumFromTritonicPhrases(phrases),
    anchorBars,
    anchorChecksum,
    timeline,
  };
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
    timeline: scheduleTritonicTimeline(phrases.flat(), ctx.mode),
  };
}

/**
 * Vault-anchored MusicContext — harmony.bars stay vault anchors (shared checksum LOCK).
 * Floating cells recorded in tritonic_vault_realisation_complete receipt.
 */
export function vaultAnchoredTritonicToMusicContext(
  vaultCtx: MusicContext,
  result: VaultAnchoredTritonicResult,
): MusicContext {
  const harmonyBars = result.anchorBars.map(normalizeChordSymbol);
  const harmonyChecksum = computeMusicContextChecksum(harmonyBars);
  if (harmonyChecksum !== result.anchorChecksum) {
    throw new Error('Vault anchor checksum mismatch after normalisation');
  }
  if (harmonyChecksum !== vaultCtx.harmony.checksum) {
    throw new Error('Vault anchor checksum drift from source MusicContext');
  }

  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: harmonyChecksum,
    source: vaultCtx.harmony.source,
  };

  return {
    ...vaultCtx,
    presetId: `tritonic_vault_${result.mode}`,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'tritonic',
      capturedAt: Date.now(),
      sourceRunId: vaultCtx.provenance?.sourceRunId,
    },
    receipts: [
      ...vaultCtx.receipts,
      {
        engine: 'tritonic',
        kind: 'tritonic_vault_realisation_complete',
        payload: {
          mode: result.mode,
          anchorChecksum: result.anchorChecksum,
          floatingChecksum: result.checksum,
          barCount: harmonyBars.length,
          timelineEventCount: result.timeline.length,
        },
      },
    ],
  };
}

/** Vault source → anchored realisation → MusicContext (always-on, no feature flag). */
export function buildMusicContextFromVaultTritonic(
  vaultCtx: MusicContext,
  ctx: TritonicRealisationContext,
): MusicContext {
  const result = realiseTritonicFromVault(vaultCtx, ctx);
  return vaultAnchoredTritonicToMusicContext(vaultCtx, result);
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
