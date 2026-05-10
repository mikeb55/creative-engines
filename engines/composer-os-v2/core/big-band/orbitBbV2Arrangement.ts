/**
 * Orbit big band V2 — Schneider/Evans-adjacent pacing: dynamics arc, dropouts, B-section bloom.
 * Gated by {@link BuildBigBandScoreModelInput.bigBandArrangementProfile} === `orbit_v2`.
 */

/** 1-based bar → MusicXML dynamics token (emitter maps to &lt;dynamics&gt;). */
export function orbitBbV2DynamicsMarkings(): Record<number, string> {
  return {
    1: 'pp',
    5: 'mp',
    9: 'mf',
    13: 'mf',
    18: 'f',
    21: 'ff',
    25: 'fff',
    29: 'pp',
  };
}

/** Ensemble velocity contour 24–118 by bar (before per-part spread). */
export function orbitBbV2ContourVelocity(bar: number): number {
  if (bar <= 4) return 34 + bar * 3;
  if (bar <= 12) return 46 + (bar - 5) * 3;
  if (bar <= 20) return 58 + Math.floor((bar - 13) * 2.5);
  if (bar <= 28) return 76 + (bar - 21) * 3;
  return 38 + (32 - bar) * 4;
}

export function orbitBbV2WindVelocity(bar: number, slot: 0 | 1 | 2 | 3): number {
  let v = orbitBbV2ContourVelocity(bar);
  if (slot === 2) v += 10;
  if (slot === 3) v -= 8;
  if (slot === 1) v -= 4;
  return Math.max(22, Math.min(118, Math.round(v)));
}

/** Full-measure rest for winds/brass — asymmetric schedule (more silence than V1). */
export function orbitBbV2WindDropout(bar: number, slot: number): boolean {
  if (bar === 2 && slot >= 0 && slot <= 3) return true;
  if (bar === 7 && (slot === 2 || slot === 3)) return true;
  if (bar === 11 && (slot === 0 || slot === 1)) return true;
  if (bar === 16 && (slot === 2 || slot === 3)) return true;
  if (bar === 24 && (slot === 0 || slot === 1)) return true;
  return false;
}

/** Brass tacet — yields sax-led colour (no tutti padding). */
export function orbitBbV2BrassTacet(bar: number): boolean {
  return bar === 5 || bar === 9 || bar === 15 || bar === 22;
}

/** Sax tacet — brass-only hits / pads without sax unison wash. */
export function orbitBbV2SaxTacet(bar: number): boolean {
  return bar === 6 || bar === 12 || bar === 26;
}

export function orbitBbV2PianoDropout(bar: number): boolean {
  return bar === 2 || bar === 31;
}

/** Bass register contrast — lower anchor in intro/out + B bloom. */
export function orbitBbV2BassAnchor(bar: number, midi: number): number {
  if (bar >= 21 && bar <= 28) return midi - 6;
  if (bar <= 4 || bar >= 29) return midi - 4;
  return midi;
}

/** Register bloom on B section: trumpet brighter, trombone anchor lower. */
export function orbitBbV2BloomAdjustPitch(bar: number, slot: 2 | 3, pitch: number): number {
  if (bar >= 21 && bar <= 28) {
    if (slot === 2) return pitch + 6;
    if (slot === 3) return pitch - 8;
  }
  return pitch;
}

/** Prefer single sustained attack per bar (fewer hits than half-half default). */
export function orbitBbV2PreferWholeBarSustain(bar: number, slot: number): boolean {
  if (bar <= 4 || bar >= 29) return true;
  if (bar >= 21 && bar <= 28) return bar % 2 === 0;
  return (bar + slot) % 3 !== 0;
}

/** Extra brass punctuation in B — expands late (still fewer simultaneous layers than constant tutti). */
export function orbitBbV2MergeBrassBeats(bar: number, prev: number[] | undefined): number[] {
  if (bar >= 21 && bar <= 28) {
    const base = prev ?? [];
    if (bar <= 24) return [...new Set([...base, 0])].sort((a, b) => a - b);
    return [...new Set([...base, 0, 2])].sort((a, b) => a - b);
  }
  return prev ?? [];
}

/** Cymbal colour shift at primary section boundaries + B mid arc. */
export function orbitBbV2ForceDrumTransition(bar: number): boolean {
  return bar === 4 || bar === 12 || bar === 20 || bar === 28 || bar === 24;
}
