/**
 * V104p2 — Tritonic melody generation: voice-led cell chain → singable motif + MusicContext.
 * V104p3 — Three strands + timeline rhythm.
 * Always-on — no feature flag.
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import {
  computeMusicContextChecksum,
  coreMotifToMusicContextMotif,
} from '../music-context/musicContextAdapters';
import type { MusicContext } from '../music-context/musicContextTypes';
import type { CoreMotif } from '../motif/motifEngineTypes';
import {
  realiseTritonic,
  realisationToMusicContext,
  type TritonicRealisationContext,
} from './tritonicRealisation';
import {
  extractSingableMelodyMidis,
  extractTritonicStrands,
  projectedStrandMidisFromCells,
} from './tritonicStrands';
import { tritonicDiagnosticsReceiptFields } from './tritonicDiagnostics';
import { buildTritonicMonitorSnapshot } from './tritonicMonitorSnapshot';

export { extractSingableMelodyMidis } from './tritonicStrands';

export function melodyMidisToCoreMotif(
  midis: readonly number[],
  rhythm?: { startBeat: number; duration: number }[],
): CoreMotif {
  const intervalPattern = midis.slice(1).map((m, i) => midis[i + 1]! - midis[i]!);
  const contourPattern = intervalPattern.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0));
  return {
    id: 'tritonic-melody-0',
    intervalPattern,
    rhythmPattern:
      rhythm ??
      midis.map((_, i) => ({ startBeat: i, duration: 1 })),
    contourPattern,
    roleTags: ['guide-tone'],
    registerTags: ['mid'],
  };
}

export type TritonicMelodyParams = {
  bpm?: number;
  seed?: number;
};

/**
 * Realise tritonic cells → harmony + three-strand motif (singer-safe export).
 * harmony.bars via normalizeChordSymbol; checksum after normalisation.
 */
export function buildMusicContextFromTritonicMelody(
  ctx: TritonicRealisationContext,
  key: PitchClass,
  params?: TritonicMelodyParams,
): MusicContext {
  const result = realiseTritonic(ctx);
  const cells = result.phrases.flat();
  const base = realisationToMusicContext(result, key);
  const strands = extractTritonicStrands(result.timeline, cells);

  const harmonyBars = base.harmony.bars.map((s) => s);
  const harmonyChecksum = computeMusicContextChecksum(harmonyBars);

  const singerMidis = strands.singerSafeMotif.map((n) => n.midi);
  const singerRhythm = strands.singerSafeMotif.map((n) => ({
    startBeat: (n.bar - 1) * 4 + (n.beat - 1),
    duration: n.duration,
  }));
  const coreMotif = melodyMidisToCoreMotif(singerMidis, singerRhythm);
  const motif = coreMotifToMusicContextMotif(coreMotif, 'tritonic');
  motif.anchorMidi = singerMidis[0];
  motif.seedPitches = [...singerMidis];

  const diagnosticFields = tritonicDiagnosticsReceiptFields({
    cells,
    timeline: result.timeline,
    harmonyBars,
    strandMidis: projectedStrandMidisFromCells(cells),
    behaviourBiases: ctx.behaviourBiases,
  });

  const monitorSnapshot = buildTritonicMonitorSnapshot({
    timeline: result.timeline,
    cells,
    harmonyBars,
    phraseState: diagnosticFields.phraseState,
    diagnostics: {
      unresolvedToneCount: diagnosticFields.unresolvedToneCount,
      contourVariety: diagnosticFields.contourVariety,
      cadenceStrength: diagnosticFields.cadenceStrength,
      rhythmicOffsetDistribution: diagnosticFields.rhythmicOffsetDistribution,
    },
    mode: result.mode,
    phraseCount: result.mode === 'sq' ? 2 : 1,
    behaviourBiases: ctx.behaviourBiases,
  });

  return {
    ...base,
    seed: params?.seed ?? 0,
    presetId: `tritonic_melody_${result.mode}`,
    bpm: params?.bpm ?? base.bpm,
    totalBars: harmonyBars.length,
    harmony: {
      bars: harmonyBars,
      checksum: harmonyChecksum,
      source: 'generated',
    },
    motif,
    receipts: [
      {
        engine: 'tritonic',
        kind: 'tritonic_melody_complete',
        payload: {
          mode: result.mode,
          cellCount: cells.length,
          noteCount: singerMidis.length,
          harmonyChecksum,
          melodyChecksum: computeMusicContextChecksum(singerMidis.map(String)),
          floatingChecksum: result.checksum,
          timelineEventCount: result.timeline.length,
          strandLengths: {
            voicingTop: strands.voicingTop.length,
            projectedStrand: strands.projectedStrand.length,
            singerSafeMotif: strands.singerSafeMotif.length,
          },
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
