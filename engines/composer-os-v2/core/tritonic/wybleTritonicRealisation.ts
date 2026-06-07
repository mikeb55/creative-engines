/**
 * V105p3 — Wyble MusicContext × Tritonic anchor feed (always-on, no feature flag).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
  harmonyBarsFromMusicContext,
} from '../music-context/musicContextAdapters';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import type { TritonicCell } from './tritonicCell';
import { buildTritonicDictionary } from './tritonicCell';
import {
  anchorDescriptorsFromWybleContext,
  behaviourBiasesFromAnchorDescriptor,
  preferredCellFamiliesForAnchor,
  type AnchorDescriptor,
} from './tritonicAnchorDescriptor';
import {
  applyTritonicBehaviourBiases,
  biasSteeredStartCellSort,
  nudgeTimelineForBehaviourBiases,
  resolveTritonicBehaviourBiases,
  type TritonicBehaviourBiases,
} from './tritonicBehaviourBiases';
import { projectedStrandMidisFromCells } from './tritonicStrands';
import { tritonicDiagnosticsReceiptFields } from './tritonicDiagnostics';
import { buildTritonicMonitorSnapshot } from './tritonicMonitorSnapshot';
import {
  applyWayneBehaviour,
  type WayneBehaviourOptions,
} from './tritonicBehaviourLayer';
import {
  checksumFromTritonicPhrases,
  floatCellAboveAnchor,
  resolveWayneBehaviourForRealisation,
  type TritonicRealisationMode,
  type VaultAnchoredTritonicResult,
} from './tritonicRealisation';
import {
  advanceTritonicState,
  createTritonicStateMachine,
  type TritonicStateMachine,
} from './tritonicStateMachine';
import { scheduleTritonicTimeline } from './tritonicTimeline';
import { getVoiceLeadingCandidates } from './tritonicVoiceLeading';

const DEFAULT_WYBLE_TRITONIC_MODE: TritonicRealisationMode = 'ecm';
const WYBLE_PHRASE_BARS = 2;

export type WybleTritonicRealisationReceipt = {
  anchorDescriptorCount: number;
  meanCellTension: number;
  phraseCommitCount: number;
  unresolvedCarryRate: number;
};

export function isWybleMusicContext(ctx: MusicContext): boolean {
  return ctx.provenance?.sourceEngineId === 'wyble' || ctx.presetId === 'wyble_etude';
}

function modeCellPool(cells: TritonicCell[], mode: TritonicRealisationMode): TritonicCell[] {
  if (mode !== 'ecm') return cells;
  const preferred = cells.filter(
    (c) => c.family === 'suspended' || c.family === 'shorter_floating',
  );
  return preferred.length > 0 ? preferred : cells;
}

function anchorSteeredPool(
  pool: TritonicCell[],
  descriptor: AnchorDescriptor,
): TritonicCell[] {
  const preferred = preferredCellFamiliesForAnchor(descriptor);
  const filtered = pool.filter((c) => preferred.includes(c.family));
  return filtered.length > 0 ? filtered : pool;
}

function pickStartCell(
  pool: TritonicCell[],
  descriptor: AnchorDescriptor,
  biases: TritonicBehaviourBiases,
): TritonicCell {
  const steered = anchorSteeredPool(pool, descriptor);
  return biasSteeredStartCellSort(steered, (a, b) => a.tension - b.tension, biases)[0]!;
}

function pickNextCellAtPhraseCommit(
  from: TritonicCell,
  pool: TritonicCell[],
  descriptor: AnchorDescriptor,
  options: WayneBehaviourOptions,
  biases: TritonicBehaviourBiases,
  state: TritonicStateMachine,
): TritonicCell {
  const steered = anchorSteeredPool(pool, descriptor);
  const candidates = getVoiceLeadingCandidates(from, steered);
  if (candidates.length === 0) return from;
  const ranked = applyWayneBehaviour(candidates, options);
  const biasRanked = applyTritonicBehaviourBiases(ranked, biases, state);
  return biasRanked[0]?.to ?? from;
}

function unresolvedCarryRate(state: TritonicStateMachine, barCount: number): number {
  if (barCount <= 0) return 0;
  return Math.min(1, state.unresolvedTones.length / Math.max(1, barCount));
}

export function realiseTritonicFromWyble(
  wybleCtx: MusicContext,
  options?: {
    mode?: TritonicRealisationMode;
    behaviourOptions?: WayneBehaviourOptions;
    tritonicBiases?: Partial<TritonicBehaviourBiases>;
    phraseBars?: number;
  },
): VaultAnchoredTritonicResult & { receiptMetrics: WybleTritonicRealisationReceipt } {
  if (!isWybleMusicContext(wybleCtx)) {
    throw new Error('realiseTritonicFromWyble requires a Wyble MusicContext source');
  }

  const anchorBars = harmonyBarsFromMusicContext(wybleCtx);
  if (anchorBars.length === 0) {
    throw new Error('Wyble MusicContext has no harmony bars to anchor');
  }

  const descriptors = anchorDescriptorsFromWybleContext(wybleCtx);
  const mode = options?.mode ?? DEFAULT_WYBLE_TRITONIC_MODE;
  const behaviour = resolveWayneBehaviourForRealisation(
    mode,
    options?.behaviourOptions ?? {
      oddityScore: 0.35,
      delayedResolution: true,
      melodyPriority: false,
    },
  );
  const baseBiases = resolveTritonicBehaviourBiases(options?.tritonicBiases);
  const phraseBars = options?.phraseBars ?? WYBLE_PHRASE_BARS;
  const pool = modeCellPool(buildTritonicDictionary().cells, mode);

  const floatingCells: TritonicCell[] = [];
  let phraseCommitCount = 0;
  let state = createTritonicStateMachine();
  let current = pickStartCell(pool, descriptors[0]!, behaviourBiasesFromAnchorDescriptor(descriptors[0]!, baseBiases));
  phraseCommitCount++;

  for (let i = 0; i < anchorBars.length; i++) {
    const descriptor = descriptors[i]!;
    const barBiases = behaviourBiasesFromAnchorDescriptor(descriptor, baseBiases);

    if (i > 0 && i % phraseBars === 0) {
      current = pickNextCellAtPhraseCommit(current, pool, descriptor, behaviour, barBiases, state);
      phraseCommitCount++;
    }

    floatingCells.push(floatCellAboveAnchor(current, anchorBars[i]!));
    const midis = projectedStrandMidisFromCells(floatingCells);
    state = advanceTritonicState({
      state,
      cell: current,
      midi: midis[midis.length - 1]!,
      prevMidi: midis.length >= 2 ? midis[midis.length - 2] : undefined,
      anchor: anchorBars[i]!,
      sampleIndex: i,
      behaviourBiases: barBiases,
    });
  }

  const meanCellTension =
    floatingCells.reduce((sum, c) => sum + c.tension, 0) / Math.max(1, floatingCells.length);
  const receiptMetrics: WybleTritonicRealisationReceipt = {
    anchorDescriptorCount: descriptors.length,
    meanCellTension,
    phraseCommitCount,
    unresolvedCarryRate: unresolvedCarryRate(state, anchorBars.length),
  };

  const phrases = [floatingCells];
  const barBiasesFinal = behaviourBiasesFromAnchorDescriptor(
    descriptors[descriptors.length - 1]!,
    baseBiases,
  );
  return {
    phrases,
    mode,
    checksum: checksumFromTritonicPhrases(phrases),
    anchorBars,
    anchorChecksum: wybleCtx.harmony.checksum,
    timeline: nudgeTimelineForBehaviourBiases(
      scheduleTritonicTimeline(floatingCells, mode, {
        barCount: anchorBars.length,
        vaultAnchored: true,
      }),
      barBiasesFinal,
    ),
    receiptMetrics,
  };
}

/** Wyble anchors LOCK + Tritonic float; harmony.bars unchanged after normalisation. */
export function buildMusicContextFromWybleTritonic(
  wybleCtx: MusicContext,
  tritonicBiases?: Partial<TritonicBehaviourBiases>,
): MusicContext {
  const result = realiseTritonicFromWyble(wybleCtx, { tritonicBiases });
  const harmonyBars = result.anchorBars.map(normalizeChordSymbol);
  const harmonyChecksum = computeMusicContextChecksum(harmonyBars);
  if (harmonyChecksum !== result.anchorChecksum) {
    throw new Error('Wyble anchor checksum mismatch after normalisation');
  }
  if (harmonyChecksum !== wybleCtx.harmony.checksum) {
    throw new Error('Wyble anchor checksum drift from source MusicContext');
  }

  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: harmonyChecksum,
    source: wybleCtx.harmony.source,
  };

  const cells = result.phrases.flat();
  const diagnosticFields = tritonicDiagnosticsReceiptFields({
    cells,
    timeline: result.timeline,
    anchorBars: result.anchorBars,
    strandMidis: projectedStrandMidisFromCells(cells),
    behaviourBiases: tritonicBiases,
  });
  const monitorSnapshot = buildTritonicMonitorSnapshot({
    timeline: result.timeline,
    cells,
    anchorBars: result.anchorBars,
    phraseState: diagnosticFields.phraseState,
    diagnostics: {
      unresolvedToneCount: diagnosticFields.unresolvedToneCount,
      contourVariety: diagnosticFields.contourVariety,
      cadenceStrength: diagnosticFields.cadenceStrength,
      rhythmicOffsetDistribution: diagnosticFields.rhythmicOffsetDistribution,
    },
    mode: result.mode,
    phraseCount: 1,
    behaviourBiases: tritonicBiases,
  });

  return {
    ...wybleCtx,
    presetId: 'wyble_tritonic',
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'wyble_tritonic',
      capturedAt: Date.now(),
      sourceRunId: wybleCtx.provenance?.sourceRunId,
    },
    receipts: [
      ...wybleCtx.receipts,
      {
        engine: 'wyble_tritonic',
        kind: 'wyble_tritonic_realisation_complete',
        payload: {
          mode: result.mode,
          anchorChecksum: result.anchorChecksum,
          floatingChecksum: result.checksum,
          barCount: harmonyBars.length,
          ...result.receiptMetrics,
          unresolvedToneCount: diagnosticFields.unresolvedToneCount,
          contourVariety: diagnosticFields.contourVariety,
          cadenceStrength: diagnosticFields.cadenceStrength,
          rhythmicOffsetDistribution: diagnosticFields.rhythmicOffsetDistribution,
          phraseState: diagnosticFields.phraseState,
          monitorSnapshot,
        },
      },
    ],
  };
}
