/**
 * BB101 120-bar big-band arrangement — NOLA arc (curiosity → celebration).
 * Mirrors Orbit V2 event architecture with BB101-specific bar zones.
 */

import * as v2 from './orbitBbV2Arrangement';

export type Bb101Zone =
  | 'curiosity'
  | 'momentum'
  | 'confidence'
  | 'reflection'
  | 'anticipation'
  | 'celebration';

export type Bb101GceCriterion =
  | 'harmonic_narrative'
  | 'motivic_development'
  | 'brass_architecture'
  | 'register_architecture'
  | 'shout_quality'
  | 'rhythmic_identity'
  | 'sectional_contrast'
  | 'dropout_events';

export interface Bb101GceFixState {
  applied: Bb101GceCriterion[];
}

export function createBb101GceFixState(applied: Bb101GceCriterion[] = []): Bb101GceFixState {
  return { applied: [...applied] };
}

export function hasBb101GceFix(state: Bb101GceFixState | undefined, id: Bb101GceCriterion): boolean {
  return state?.applied.includes(id) ?? false;
}

function inRange(bar: number, start: number, end: number): boolean {
  return bar >= start && bar <= end;
}

export function bb101Zone(bar: number): Bb101Zone {
  if (bar <= 16) return 'curiosity';
  if (bar <= 40) return 'momentum';
  if (bar <= 64) return 'confidence';
  if (bar <= 80) return 'reflection';
  if (bar <= 104) return 'anticipation';
  return 'celebration';
}

export function bb101EnergyTier(bar: number): number {
  const z = bb101Zone(bar);
  switch (z) {
    case 'curiosity':
      return bar <= 8 ? 1 : 2;
    case 'momentum':
      return bar <= 28 ? 2 : 3;
    case 'confidence':
      return bar <= 52 ? 3 : 4;
    case 'reflection':
      return 2;
    case 'anticipation': {
      const t = (bar - 81) / 23;
      return 3 + Math.min(2, Math.floor(t * 3));
    }
    case 'celebration':
      return 5;
    default:
      return 3;
  }
}

export function bb101EnsembleDropout(bar: number): boolean {
  if (bar === 16 || bar === 17) return true;
  if (bar === 40 || bar === 41) return true;
  if (bar === 64 || bar === 65) return true;
  if (bar === 80 || bar === 81) return true;
  if (inRange(bar, 65, 68)) return true;
  if (inRange(bar, 81, 84)) return true;
  return false;
}

export function bb101RhythmSectionOnly(bar: number): boolean {
  if (bb101EnsembleDropout(bar)) return true;
  if (inRange(bar, 65, 68)) return true;
  if (inRange(bar, 81, 84)) return true;
  return false;
}

export function bb101BassPianoExposed(bar: number): boolean {
  return inRange(bar, 9, 12) || inRange(bar, 73, 76);
}

export function bb101SaxSoliWindow(bar: number, gce?: Bb101GceFixState): boolean {
  if (inRange(bar, 21, 24)) return true;
  if (inRange(bar, 37, 40)) return true;
  if (inRange(bar, 53, 56)) return true;
  if (inRange(bar, 69, 72)) return true;
  if (inRange(bar, 97, 100)) return true;
  if (inRange(bar, 109, 112)) return true;
  return false;
}

export function bb101BrassOnlyWindow(bar: number): boolean {
  if (inRange(bar, 18, 21)) return true;
  if (inRange(bar, 57, 60)) return true;
  return false;
}

export function bb101SaxOnlyWindow(bar: number): boolean {
  if (inRange(bar, 26, 29)) return true;
  if (inRange(bar, 73, 76)) return true;
  return false;
}

export function bb101DynamicsMarkings(gce?: Bb101GceFixState): Record<number, string> {
  const base = v2.orbitBbV2DynamicsMarkings();
  const out: Record<number, string> = { ...base };
  const mark = (bar: number, dyn: string) => {
    out[bar] = dyn;
  };
  mark(1, 'pp');
  mark(17, 'mp');
  mark(41, 'mf');
  mark(49, 'f');
  mark(65, 'mp');
  mark(73, 'mf');
  mark(81, 'f');
  mark(97, 'ff');
  mark(105, 'fff');
  mark(117, 'ffff');
  if (hasBb101GceFix(gce, 'register_architecture')) {
    mark(88, 'mf');
    mark(104, 'ff');
  }
  return out;
}

export function bb101ContourVelocity(bar: number, gce?: Bb101GceFixState): number {
  if (bar <= 32) {
    const v = v2.orbitBbV2ContourVelocity(bar);
    if (bar <= 32) return v;
  }
  const tier = bb101EnergyTier(bar);
  const zone = bb101Zone(bar);
  let base: number;
  switch (zone) {
    case 'curiosity':
      base = 28 + tier * 8;
      break;
    case 'momentum':
      base = 42 + tier * 10;
      break;
    case 'confidence':
      base = 52 + tier * 12;
      break;
    case 'reflection':
      base = 36 + tier * 6;
      break;
    case 'anticipation':
      base = 48 + (bar - 81) * 2 + tier * 4;
      break;
    case 'celebration':
      base = 78 + (bar - 105) * 4;
      break;
    default:
      base = 50;
  }
  if (hasBb101GceFix(gce, 'register_architecture') && zone === 'anticipation') {
    base += Math.floor((bar - 81) / 8) * 3;
  }
  return Math.max(22, Math.min(118, Math.round(base)));
}

export function bb101WindVelocity(bar: number, slot: 0 | 1 | 2 | 3, gce?: Bb101GceFixState): number {
  const z = bb101Zone(bar);
  let v = bb101ContourVelocity(bar, gce);
  if (slot === 2) v += z === 'celebration' ? 14 : 8;
  if (slot === 3) v -= 6;
  if (slot === 1) v -= 4;
  if (hasBb101GceFix(gce, 'brass_architecture') && slot === 2 && inRange(bar, 81, 120)) {
    v += 6;
  }
  if (hasBb101GceFix(gce, 'motivic_development') && slot <= 1 && bb101SaxSoliWindow(bar, gce)) {
    v += 5;
  }
  if (hasBb101GceFix(gce, 'shout_quality') && z === 'celebration') {
    v += 8;
  }
  return Math.max(22, Math.min(118, Math.round(v)));
}

export function bb101WindDropout(bar: number, slot: number, gce?: Bb101GceFixState): boolean {
  if (v2.orbitBbV2WindDropout(bar, slot)) return true;
  if (bb101RhythmSectionOnly(bar)) return true;
  if (bb101BassPianoExposed(bar)) return true;
  if (hasBb101GceFix(gce, 'dropout_events') && (bar === 48 || bar === 56 || bar === 72)) return true;
  return false;
}

export function bb101BrassTacet(bar: number, gce?: Bb101GceFixState): boolean {
  if (v2.orbitBbV2BrassTacet(bar)) return true;
  if (bb101SaxSoliWindow(bar, gce)) return true;
  if (bb101SaxOnlyWindow(bar)) return true;
  const z = bb101Zone(bar);
  if (z === 'curiosity') return bar % 4 !== 0;
  if (z === 'reflection' && !inRange(bar, 77, 80)) return true;
  if (bb101BassPianoExposed(bar)) return true;
  if (bb101RhythmSectionOnly(bar)) return true;
  if (hasBb101GceFix(gce, 'sectional_contrast') && bar % 5 === 0 && z !== 'celebration') return true;
  return false;
}

export function bb101SaxTacet(bar: number, gce?: Bb101GceFixState): boolean {
  if (v2.orbitBbV2SaxTacet(bar)) return true;
  if (bb101BrassOnlyWindow(bar)) return true;
  if (bb101BassPianoExposed(bar)) return true;
  if (bb101RhythmSectionOnly(bar)) return true;
  const z = bb101Zone(bar);
  if (z === 'confidence' && bar % 6 === 0) return true;
  if (hasBb101GceFix(gce, 'shout_quality') && inRange(bar, 105, 108)) return false;
  return false;
}

export function bb101PianoDropout(bar: number, gce?: Bb101GceFixState): boolean {
  if (v2.orbitBbV2PianoDropout(bar)) return true;
  if (bar <= 16 && bar % 2 === 0) return true;
  if (bb101RhythmSectionOnly(bar)) return false;
  if (bb101BassPianoExposed(bar)) return false;
  if (hasBb101GceFix(gce, 'rhythmic_identity') && bar <= 40 && bar % 3 === 0) return true;
  return false;
}

export function bb101BassAnchor(bar: number, midi: number, gce?: Bb101GceFixState): number {
  let m = v2.orbitBbV2BassAnchor(bar, midi);
  const z = bb101Zone(bar);
  if (z === 'curiosity' || z === 'reflection') m -= 2;
  if (z === 'celebration') m -= 4;
  if (hasBb101GceFix(gce, 'harmonic_narrative') && bb101BassPianoExposed(bar)) m -= 2;
  if (hasBb101GceFix(gce, 'register_architecture')) m -= 8;
  const cap = hasBb101GceFix(gce, 'register_architecture') ? 48 : 52;
  return Math.max(28, Math.min(cap, m));
}

export function bb101BloomAdjustPitch(
  bar: number,
  slot: 2 | 3,
  pitch: number,
  gce?: Bb101GceFixState
): number {
  let p = v2.orbitBbV2BloomAdjustPitch(bar, slot, pitch);
  const z = bb101Zone(bar);
  if (slot === 2 && bar < 81) {
    p = Math.min(p, 78);
  }
  if (slot === 2 && (z === 'anticipation' || z === 'celebration')) {
    const lift = z === 'celebration' ? 8 + (bar - 105) : 4 + Math.floor((bar - 81) / 4);
    p += Math.max(0, lift);
  }
  if (slot === 3 && z === 'celebration' && inRange(bar, 105, 120)) {
    p -= 4;
  }
  if (hasBb101GceFix(gce, 'brass_architecture') && slot === 2 && z === 'celebration') {
    p += 5;
  }
  if (hasBb101GceFix(gce, 'register_architecture') && slot === 2 && bar < 81) {
    p = Math.min(p, 72);
  }
  if (hasBb101GceFix(gce, 'shout_quality') && slot === 2 && z === 'celebration') {
    p += 4;
  }
  return p;
}

export function bb101PreferWholeBarSustain(bar: number, slot: number, gce?: Bb101GceFixState): boolean {
  if (v2.orbitBbV2PreferWholeBarSustain(bar, slot)) return true;
  const z = bb101Zone(bar);
  if (z === 'curiosity' || z === 'reflection') return true;
  if (bb101SaxSoliWindow(bar, gce) && slot <= 1) return true;
  return (bar + slot) % 4 === 0;
}

const BB101_SHOUT_OFFSETS = [0, -1, -2, -3, -5] as const;

export function bb101ShoutPitchOffset(bar: number): number {
  if (!inRange(bar, 105, 120)) return 0;
  const idx = (bar - 105) % BB101_SHOUT_OFFSETS.length;
  return BB101_SHOUT_OFFSETS[idx] ?? 0;
}

export function bb101MergeBrassBeats(
  bar: number,
  prev: number[] | undefined,
  gce?: Bb101GceFixState
): number[] {
  const base = v2.orbitBbV2MergeBrassBeats(bar, prev);
  const z = bb101Zone(bar);
  if (z === 'momentum' && bar >= 17) {
    return [...new Set([...base, bar % 2 === 0 ? 2 : 0])].sort((a, b) => a - b);
  }
  if (z === 'confidence' && bar >= 41) {
    return [...new Set([...base, 0, 2])].sort((a, b) => a - b);
  }
  if (z === 'anticipation' && bar >= 81) {
    return [...new Set([...base, 0, 1.5, 2])].sort((a, b) => a - b);
  }
  if (z === 'celebration') {
    if (inRange(bar, 105, 108)) return [0, 2];
    if (inRange(bar, 109, 112)) return [0];
    if (inRange(bar, 113, 116)) return [0, 1, 2, 3];
    if (inRange(bar, 117, 120)) return [0, 3];
  }
  if (hasBb101GceFix(gce, 'shout_quality') && z === 'celebration') {
    return [...new Set([...(base ?? []), 0, 2, 3])].sort((a, b) => a - b);
  }
  return base;
}

export function bb101MergeShoutBeats(
  bar: number,
  prev: number[] | undefined,
  gce?: Bb101GceFixState
): number[] | undefined {
  if (!inRange(bar, 105, 120)) return prev;
  if (bb101Zone(bar) !== 'celebration') return prev;
  if (inRange(bar, 105, 108)) return [0, 2];
  if (inRange(bar, 109, 112)) return [0, 2];
  if (inRange(bar, 113, 116)) return [0, 1, 2, 3];
  if (inRange(bar, 117, 119)) return [0, 2, 3];
  if (bar === 120) return [0, 3];
  if (hasBb101GceFix(gce, 'shout_quality')) return [0, 1, 2, 3];
  return prev;
}

export function bb101ForceDrumTransition(bar: number, gce?: Bb101GceFixState): boolean {
  if (v2.orbitBbV2ForceDrumTransition(bar)) return true;
  if ([8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 116].includes(bar)) return true;
  if (hasBb101GceFix(gce, 'rhythmic_identity') && bar % 8 === 0) return true;
  return false;
}

export function bb101DrumArticulation(bar: number): 'brushes' | 'sticks' | 'auto' {
  if (bar <= 16) return 'brushes';
  if (bar >= 105) return 'sticks';
  if (bar >= 81) return 'sticks';
  if (bar >= 17) return 'sticks';
  return 'auto';
}

export function bb101DrumIntensity(bar: number): 'sparse' | 'standard' | 'driving' | undefined {
  if (bar <= 16) return 'sparse';
  if (inRange(bar, 65, 80)) return 'sparse';
  if (bar >= 105) return 'driving';
  if (bar >= 81) return 'driving';
  return undefined;
}

export function bb101CupMuteVelocityReduction(bar: number, slot: number): number {
  if (slot !== 2) return 0;
  if (inRange(bar, 17, 40)) return 12;
  return 0;
}

export function bb101TenorHarmonyMidi(altoMidi: number): number {
  return altoMidi - 4;
}

export function bb101TromboneShoutCounter(bar: number, trumpetMidi: number): number {
  if (!inRange(bar, 105, 120)) return trumpetMidi - 12;
  const off = BB101_SHOUT_OFFSETS[(bar - 105) % BB101_SHOUT_OFFSETS.length] ?? 0;
  return trumpetMidi - 7 + off;
}
