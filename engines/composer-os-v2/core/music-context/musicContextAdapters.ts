/**
 * MusicContext adapters — checksum, motif mapping, harmony validation, modulation attach.
 */

import { computeHarmonyChecksum } from '../harmony/harmonyContext';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { ModulationPlan } from '../modulation/modulationPlanTypes';
import type { MusicContext, MusicContextMotif } from './musicContextTypes';

/** Deterministic harmony checksum for MusicContext (delegates to harmonyContext). */
export function computeMusicContextChecksum(bars: readonly string[]): string {
  return computeHarmonyChecksum(bars);
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
