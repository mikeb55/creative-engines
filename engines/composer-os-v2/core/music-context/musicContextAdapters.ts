/**
 * MusicContext adapters — checksum, motif mapping, harmony validation, modulation attach.
 */

import { computeHarmonyChecksum } from '../harmony/harmonyContext';
import { noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { ModulationPlan } from '../modulation/modulationPlanTypes';
import type { MusicContext, MusicContextHarmony, MusicContextMotif } from './musicContextTypes';
import type { RiffGeneratorParams } from '../riff-generator/riffTypes';

/** Deterministic harmony checksum for MusicContext (delegates to harmonyContext). */
export function computeMusicContextChecksum(bars: readonly string[]): string {
  return computeHarmonyChecksum(bars);
}

/** Pitch class 0–11 from key root letter (C→0, F#→6, Bb→10). */
export function keyPcFromRoot(root: string): number {
  return noteNameToPitchClass(root) ?? 0;
}

export function coreMotifToMusicContextMotif(
  motif: CoreMotif,
  producer: MusicContextMotif['producer']
): MusicContextMotif {
  return {
    id: motif.id || `${producer}-0`,
    intervalPattern: [...motif.intervalPattern],
    rhythmPattern: motif.rhythmPattern.map((r) => ({ startBeat: r.startBeat, duration: r.duration })),
    contourPattern: [...motif.contourPattern],
    anchorMidi: undefined,
    seedPitches: undefined,
    producer,
  };
}

/** LOSSY CONVERSION — not reversible. */
export function motifToSeedPitches(motif: MusicContextMotif, keyPc: number): [number, number] {
  const upperMidi = motif.anchorMidi ?? keyPc + 60;
  const lowerMidi = upperMidi - (motif.intervalPattern[0] ?? 7);
  return [upperMidi, lowerMidi];
}

export function harmonyBarsFromMusicContext(ctx: MusicContext): string[] {
  const recomputed = computeMusicContextChecksum(ctx.harmony.bars);
  if (recomputed !== ctx.harmony.checksum) {
    throw new Error('MusicContext harmony checksum mismatch');
  }
  return [...ctx.harmony.bars];
}

export function attachModulationToContext(ctx: MusicContext, plan: ModulationPlan): MusicContext {
  return {
    ...ctx,
    modulation: plan,
  };
}

/** MusicContext snapshot for successful riff generation (V90a). */
export function buildRiffGeneratorMusicContext(
  params: Pick<RiffGeneratorParams, 'seed' | 'bars' | 'style' | 'bpm' | 'chordSymbols'>,
  coreMotif?: CoreMotif
): MusicContext {
  const harmonyBars = params.chordSymbols ?? [];
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'user',
  };
  return {
    schemaVersion: '1.0',
    seed: params.seed ?? 0,
    presetId: 'riff_generator',
    key: { root: params.style ?? 'C', mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm: params.bpm ?? 120,
    totalBars: params.bars ?? 4,
    harmony,
    motif: coreMotif ? coreMotifToMusicContextMotif(coreMotif, 'riff') : undefined,
    receipts: [
      {
        engine: 'riff',
        kind: 'riff_generator_complete',
        payload: { seed: params.seed, bars: params.bars },
      },
    ],
  };
}
