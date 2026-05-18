/**
 * Melody V2 — four-quarter register envelope (soft bias on effectiveLow/effectiveHigh).
 */

const REGISTER_SHIFT_SEMITONES = 4;

export type RegisterArcQuarter = 'low_mid' | 'mid' | 'mid_high' | 'resolution';

export function registerArcQuarterForBar(bar: number, totalBars: number): RegisterArcQuarter {
  const tb = Math.max(1, totalBars);
  const q = Math.ceil((bar / tb) * 4);
  if (q <= 1) return 'low_mid';
  if (q === 2) return 'mid';
  if (q === 3) return 'mid_high';
  return 'resolution';
}

export function registerArcTargetMidi(quarter: RegisterArcQuarter): { center: number; spread: number } {
  switch (quarter) {
    case 'low_mid':
      return { center: 60, spread: 6 };
    case 'mid':
      return { center: 64, spread: 6 };
    case 'mid_high':
      return { center: 68, spread: 6 };
    case 'resolution':
      return { center: 62, spread: 6 };
  }
}

/** Soft ±4 st bias toward quarter target without overriding phraseIntentBias inner shape. */
export function applyGlobalRegisterArc(
  bar: number,
  totalBars: number,
  effectiveLow: number,
  effectiveHigh: number,
): [number, number] {
  const quarter = registerArcQuarterForBar(bar, totalBars);
  const target = registerArcTargetMidi(quarter);
  const mid = (effectiveLow + effectiveHigh) / 2;
  const delta = target.center - mid;
  const shift = Math.max(-REGISTER_SHIFT_SEMITONES, Math.min(REGISTER_SHIFT_SEMITONES, delta * 0.35));
  const low = Math.max(28, Math.round(effectiveLow + shift));
  const high = Math.min(96, Math.round(effectiveHigh + shift));
  return low < high ? [low, high] : [effectiveLow, effectiveHigh];
}

export function registerArcQuarterCenterQ1(totalBars: number): number {
  return registerArcTargetMidi(registerArcQuarterForBar(1, totalBars)).center;
}

export function registerArcQuarterCenterQ3(totalBars: number): number {
  const tb = Math.max(1, totalBars);
  const barQ3 = Math.min(tb, Math.ceil(tb * 0.75));
  return registerArcTargetMidi(registerArcQuarterForBar(barQ3, tb)).center;
}
