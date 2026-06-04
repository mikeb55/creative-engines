/**
 * BB101 — locked 120-bar harmonic narrative (Bb / New Orleans functional map).
 * 24-bar cycle × 5; simplified reflection window (bars 65–80).
 */

const BB101_CYCLE_24 = [
  'Bb6',
  'Bb6',
  'Eb7',
  'F7',
  'Bbmaj7',
  'Gm7',
  'Cm7',
  'F7',
  'Bbmaj7',
  'Bb7',
  'Eb7',
  'Ab7',
  'Db7',
  'Gbmaj7',
  'F7',
  'Bb6',
  'Cm7',
  'Dm7',
  'G7',
  'Cm7',
  'F7',
  'Bbmaj7',
  'F7',
  'Bb6',
] as const;

/** Reflection — fewer changes, more pedal. */
const BB101_REFLECTION_16 = [
  'Bb6',
  'Bb6',
  'F7',
  'F7',
  'Bbmaj7',
  'Bbmaj7',
  'Eb7',
  'Eb7',
  'Bb6',
  'Bb6',
  'Cm7',
  'F7',
  'Bbmaj7',
  'Bbmaj7',
  'F7',
  'Bb6',
] as const;

/** Anticipation build — dominant chain toward V. */
const BB101_BUILD_24 = [
  'Cm7',
  'F7',
  'Bb7',
  'Bb7',
  'Eb7',
  'Ab7',
  'Db7',
  'Gb7',
  'B7',
  'F7',
  'Bb7',
  'Bb7',
  'Cm7',
  'Cm7',
  'F7',
  'F7',
  'Dm7',
  'G7',
  'Cm7',
  'F7',
  'Bb7',
  'Bb7',
  'F7',
  'Bb7',
] as const;

/** Shout + release tag. */
const BB101_SHOUT_16 = [
  'Bb',
  'Bb',
  'Eb7',
  'F7',
  'Bb',
  'Bb7',
  'Eb7',
  'F7',
  'Bb',
  'Bb',
  'F7',
  'Bb7',
  'Bb',
  'Bb',
  'F7',
  'Bb',
] as const;

export function buildBb101ChordBars(): string[] {
  const bars: string[] = [];
  for (let i = 0; i < 5; i++) {
    for (const c of BB101_CYCLE_24) bars.push(c);
  }
  for (let i = 0; i < 16; i++) bars[64 + i] = BB101_REFLECTION_16[i]!;
  for (let i = 0; i < 24; i++) bars[80 + i] = BB101_BUILD_24[i]!;
  for (let i = 0; i < 16; i++) bars[104 + i] = BB101_SHOUT_16[i]!;
  return bars;
}

export function buildBb101ChordProgressionText(): string {
  return buildBb101ChordBars().join(' | ');
}
