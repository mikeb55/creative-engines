/**
 * Orbit 120-bar BB — `orbit_28_v2` profile.
 * Layers 6-zone event architecture ON TOP of {@link orbitBbV2Arrangement} (bars 1–32 delegate to V2 base).
 */

import * as v2 from './orbitBbV2Arrangement';

export type Orbit28V2Zone =
  | 'sparse_open'
  | 'development'
  | 'first_ensemble'
  | 'contrast'
  | 'build'
  | 'shout';

/** GCE loop targeted fix ids (Pass 3). */
export type Orbit28V2GceCriterion =
  | 'dynamic_arc'
  | 'sectional_contrast'
  | 'dropout_events'
  | 'shout_quality'
  | 'brass_architecture'
  | 'sax_writing'
  | 'rhythm_breathing'
  | 'human_playability';

export interface Orbit28V2GceFixState {
  applied: Orbit28V2GceCriterion[];
}

export function createOrbit28V2GceFixState(applied: Orbit28V2GceCriterion[] = []): Orbit28V2GceFixState {
  return { applied: [...applied] };
}

export function hasGceFix(state: Orbit28V2GceFixState | undefined, id: Orbit28V2GceCriterion): boolean {
  return state?.applied.includes(id) ?? false;
}

export function orbit28V2Zone(bar: number): Orbit28V2Zone {
  if (bar <= 16) return 'sparse_open';
  if (bar <= 40) return 'development';
  if (bar <= 64) return 'first_ensemble';
  if (bar <= 88) return 'contrast';
  if (bar <= 104) return 'build';
  return 'shout';
}

/** Energy tier 1–5 for diagnostics / GCE. */
export function orbit28V2EnergyTier(bar: number): number {
  const z = orbit28V2Zone(bar);
  switch (z) {
    case 'sparse_open':
      return bar <= 8 ? 1 : 2;
    case 'development':
      return bar <= 28 ? 2 : 3;
    case 'first_ensemble':
      return bar <= 52 ? 3 : 4;
    case 'contrast':
      return 2 + (bar >= 73 ? 1 : 0);
    case 'build': {
      const t = (bar - 89) / 15;
      return 3 + Math.min(2, Math.floor(t * 3));
    }
    case 'shout':
      return 5;
    default:
      return 3;
  }
}

function inRange(bar: number, start: number, end: number): boolean {
  return bar >= start && bar <= end;
}

/** All four wind slots rest — rhythm section only. */
export function orbit28V2EnsembleDropout(bar: number): boolean {
  if (bar === 32 || bar === 33) return true;
  if (bar === 40 || bar === 41) return true;
  if (bar === 60 || bar === 61) return true;
  if (bar === 88 || bar === 89) return true;
  if (inRange(bar, 65, 68)) return true;
  if (inRange(bar, 81, 84)) return true;
  return false;
}

/** Rhythm-section-only window (horns tacet). */
export function orbit28V2RhythmSectionOnly(bar: number): boolean {
  if (orbit28V2EnsembleDropout(bar)) return true;
  if (inRange(bar, 65, 68)) return true;
  if (inRange(bar, 81, 84)) return true;
  return false;
}

/** Bass + piano exposed — winds/brass tacet. */
export function orbit28V2BassPianoExposed(bar: number): boolean {
  return inRange(bar, 73, 76) || inRange(bar, 9, 12);
}

/** Sax soli texture — tenor harmonizes under alto lead (melody preserved on alto). */
export function orbit28V2SaxSoliWindow(bar: number): boolean {
  if (inRange(bar, 21, 24)) return true;
  if (inRange(bar, 45, 48)) return true;
  if (inRange(bar, 109, 112)) return true;
  if (inRange(bar, 53, 56)) return true;
  return false;
}

/** Brass-only (saxes tacet). */
export function orbit28V2BrassOnlyWindow(bar: number): boolean {
  if (inRange(bar, 18, 21)) return true;
  if (inRange(bar, 57, 60)) return true;
  return false;
}

/** Sax-only (brass tacet). */
export function orbit28V2SaxOnlyWindow(bar: number): boolean {
  if (inRange(bar, 26, 29)) return true;
  if (inRange(bar, 77, 80)) return true;
  return false;
}

export function orbitBbV28V2DynamicsMarkings(
  gce?: Orbit28V2GceFixState
): Record<number, string> {
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
  mark(89, 'f');
  mark(97, 'ff');
  mark(105, 'fff');
  mark(117, 'ffff');

  if (hasGceFix(gce, 'dynamic_arc')) {
    mark(5, 'pp');
    mark(33, 'p');
    mark(61, 'mf');
    mark(88, 'mp');
    mark(104, 'ff');
    mark(120, 'ffff');
  }

  return out;
}

export function orbitBbV28V2ContourVelocity(bar: number, gce?: Orbit28V2GceFixState): number {
  if (bar <= 32) {
    const v = v2.orbitBbV2ContourVelocity(bar);
    if (bar <= 32) return v;
  }

  const tier = orbit28V2EnergyTier(bar);
  const zone = orbit28V2Zone(bar);
  let base: number;
  switch (zone) {
    case 'sparse_open':
      base = 28 + tier * 8;
      break;
    case 'development':
      base = 42 + tier * 10;
      break;
    case 'first_ensemble':
      base = 52 + tier * 12;
      break;
    case 'contrast':
      base = 38 + tier * 10;
      break;
    case 'build':
      base = 48 + (bar - 89) * 3 + tier * 4;
      break;
    case 'shout':
      base = 78 + (bar - 105) * 4;
      break;
    default:
      base = 50;
  }

  if (hasGceFix(gce, 'dynamic_arc') && zone === 'build') {
    base += (bar - 89) * 2;
  }

  return Math.max(22, Math.min(118, Math.round(base)));
}

export function orbitBbV28V2WindVelocity(
  bar: number,
  slot: 0 | 1 | 2 | 3,
  gce?: Orbit28V2GceFixState
): number {
  let v = orbitBbV28V2ContourVelocity(bar, gce);
  if (slot === 2) v += orbit28V2Zone(bar) === 'shout' ? 14 : 8;
  if (slot === 3) v -= 6;
  if (slot === 1) v -= 4;
  if (hasGceFix(gce, 'brass_architecture') && slot === 2 && inRange(bar, 89, 120)) {
    v += 6;
  }
  if (hasGceFix(gce, 'sax_writing') && slot <= 1 && orbit28V2SaxSoliWindow(bar)) {
    v += 5;
  }
  return Math.max(22, Math.min(118, Math.round(v)));
}

export function orbitBbV28V2WindDropout(
  bar: number,
  slot: number,
  gce?: Orbit28V2GceFixState
): boolean {
  if (v2.orbitBbV2WindDropout(bar, slot)) return true;
  if (orbit28V2RhythmSectionOnly(bar)) return true;
  if (orbit28V2BassPianoExposed(bar)) return true;
  if (hasGceFix(gce, 'dropout_events') && (bar === 48 || bar === 56 || bar === 72)) return true;
  return false;
}

export function orbitBbV28V2BrassTacet(bar: number, gce?: Orbit28V2GceFixState): boolean {
  if (v2.orbitBbV2BrassTacet(bar)) return true;
  if (orbit28V2SaxSoliWindow(bar)) return true;
  if (orbit28V2SaxOnlyWindow(bar)) return true;
  const z = orbit28V2Zone(bar);
  if (z === 'sparse_open') {
    return bar % 4 !== 0;
  }
  if (z === 'contrast' && !inRange(bar, 85, 88)) return true;
  if (orbit28V2BassPianoExposed(bar)) return true;
  if (orbit28V2RhythmSectionOnly(bar)) return true;
  if (hasGceFix(gce, 'sectional_contrast') && bar % 5 === 0 && z !== 'shout') return true;
  return false;
}

export function orbitBbV28V2SaxTacet(bar: number, gce?: Orbit28V2GceFixState): boolean {
  if (v2.orbitBbV2SaxTacet(bar)) return true;
  if (orbit28V2BrassOnlyWindow(bar)) return true;
  if (orbit28V2BassPianoExposed(bar)) return true;
  if (orbit28V2RhythmSectionOnly(bar)) return true;
  const z = orbit28V2Zone(bar);
  if (z === 'development' && bar % 6 === 0) return true;
  if (hasGceFix(gce, 'sax_writing') && inRange(bar, 33, 36)) return false;
  if (hasGceFix(gce, 'shout_quality') && inRange(bar, 105, 108)) return true;
  return false;
}

export function orbitBbV28V2PianoDropout(bar: number, gce?: Orbit28V2GceFixState): boolean {
  if (v2.orbitBbV2PianoDropout(bar)) return true;
  if (bar <= 16 && bar % 2 === 0) return true;
  if (orbit28V2RhythmSectionOnly(bar)) return false;
  if (orbit28V2BassPianoExposed(bar)) return false;
  if (hasGceFix(gce, 'rhythm_breathing') && bar <= 40 && bar % 3 === 0) return true;
  return false;
}

export function orbitBbV28V2BassAnchor(bar: number, midi: number, gce?: Orbit28V2GceFixState): number {
  let m = v2.orbitBbV2BassAnchor(bar, midi);
  const z = orbit28V2Zone(bar);
  if (z === 'sparse_open' || z === 'contrast') m -= 2;
  if (z === 'shout') m -= 4;
  if (hasGceFix(gce, 'rhythm_breathing') && orbit28V2BassPianoExposed(bar)) m -= 2;
  return m;
}

/** Written G5 ≈ MIDI 79 — reserve high trumpet peaks for build/shout only. */
export function orbitBbV28V2BloomAdjustPitch(
  bar: number,
  slot: 2 | 3,
  pitch: number,
  gce?: Orbit28V2GceFixState
): number {
  let p = v2.orbitBbV2BloomAdjustPitch(bar, slot, pitch);
  const z = orbit28V2Zone(bar);

  if (slot === 2 && bar < 89) {
    p = Math.min(p, 78);
  }
  if (slot === 2 && (z === 'build' || z === 'shout')) {
    const lift = z === 'shout' ? 8 + (bar - 105) : 4 + Math.floor((bar - 89) / 4);
    p += Math.max(0, lift);
  }
  if (slot === 3 && z === 'shout' && inRange(bar, 105, 120)) {
    p -= 4;
  }
  if (hasGceFix(gce, 'brass_architecture') && slot === 3 && z === 'shout') {
    p -= 3;
  }
  if (hasGceFix(gce, 'brass_architecture') && slot === 2 && z === 'shout') {
    p += 3;
  }
  if (hasGceFix(gce, 'human_playability') && slot === 2) {
    p = Math.min(p, 84);
  }
  return p;
}

export function orbitBbV28V2PreferWholeBarSustain(
  bar: number,
  slot: number,
  gce?: Orbit28V2GceFixState
): boolean {
  if (v2.orbitBbV2PreferWholeBarSustain(bar, slot)) return true;
  const z = orbit28V2Zone(bar);
  if (z === 'sparse_open' || z === 'contrast') return true;
  if (orbit28V2SaxSoliWindow(bar) && slot <= 1) return true;
  if (hasGceFix(gce, 'human_playability') && slot <= 3) return (bar + slot) % 2 === 0;
  return (bar + slot) % 4 === 0;
}

/** Orbit chromatic descent F→E→Eb→Db→B — semitone offsets for shout windows. */
const ORBIT_SHOUT_DESCENT_OFFSETS = [0, -1, -2, -3, -5] as const;

export function orbitBbV28V2ShoutPitchOffset(bar: number): number {
  if (!inRange(bar, 105, 120)) return 0;
  const idx = (bar - 105) % ORBIT_SHOUT_DESCENT_OFFSETS.length;
  return ORBIT_SHOUT_DESCENT_OFFSETS[idx] ?? 0;
}

export function orbitBbV28V2MergeBrassBeats(
  bar: number,
  prev: number[] | undefined,
  gce?: Orbit28V2GceFixState
): number[] {
  const base = v2.orbitBbV2MergeBrassBeats(bar, prev);
  const z = orbit28V2Zone(bar);

  if (z === 'development' && bar >= 17) {
    return [...new Set([...base, bar % 2 === 0 ? 2 : 0])].sort((a, b) => a - b);
  }
  if (z === 'first_ensemble' && bar >= 41) {
    return [...new Set([...base, 0, 2])].sort((a, b) => a - b);
  }
  if (z === 'build' && bar >= 89) {
    return [...new Set([...base, 0, 1.5, 2])].sort((a, b) => a - b);
  }
  if (z === 'shout') {
    if (inRange(bar, 105, 108)) return [0, 2];
    if (inRange(bar, 109, 112)) return [0];
    if (inRange(bar, 113, 116)) return [0, 1, 2, 3];
    if (inRange(bar, 117, 120)) return [0, 3];
  }
  if (hasGceFix(gce, 'shout_quality') && z === 'shout') {
    return [...new Set([...(base ?? []), 0, 2, 3])].sort((a, b) => a - b);
  }
  return base;
}

export function orbitBbV28V2MergeShoutBeats(
  bar: number,
  prev: number[] | undefined,
  gce?: Orbit28V2GceFixState
): number[] | undefined {
  if (!inRange(bar, 105, 120)) return prev;
  const z = orbit28V2Zone(bar);
  if (z !== 'shout') return prev;

  if (inRange(bar, 105, 108)) return [0, 2];
  if (inRange(bar, 109, 112)) return [0, 2];
  if (inRange(bar, 113, 116)) return [0, 1, 2, 3];
  if (inRange(bar, 117, 119)) return [0, 2, 3];
  if (bar === 120) return [0, 3];
  if (hasGceFix(gce, 'shout_quality')) return [0, 1, 2, 3];
  return prev;
}

export function orbitBbV28V2ForceDrumTransition(bar: number, gce?: Orbit28V2GceFixState): boolean {
  if (v2.orbitBbV2ForceDrumTransition(bar)) return true;
  if ([16, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 116].includes(bar)) return true;
  if (hasGceFix(gce, 'rhythm_breathing') && bar % 8 === 0) return true;
  return false;
}

/** Drum articulation override for 120-bar arc. */
export function orbitBbV28V2DrumArticulation(
  bar: number
): 'brushes' | 'sticks' | 'auto' {
  if (bar <= 16) return 'brushes';
  if (bar >= 105) return 'sticks';
  if (bar >= 89) return 'sticks';
  if (bar >= 17) return 'sticks';
  return 'auto';
}

/** Per-bar drum intensity tier. */
export function orbitBbV28V2DrumIntensity(bar: number): 'sparse' | 'standard' | 'driving' | undefined {
  if (bar <= 16) return 'sparse';
  if (bar >= 105) return 'driving';
  if (bar >= 89) return 'driving';
  return undefined;
}

/** Cup-mute colour — lower trumpet velocity in development. */
export function orbitBbV28V2CupMuteVelocityReduction(bar: number, slot: number): number {
  if (slot !== 2) return 0;
  if (inRange(bar, 17, 40)) return 12;
  return 0;
}

/** Tenor harmonizes a major 3rd below alto during sax soli windows. */
export function orbitBbV28V2TenorHarmonyMidi(altoMidi: number): number {
  return altoMidi - 4;
}

/** Trombone counterline under trumpet in shout — stepwise offset. */
export function orbitBbV28V2TromboneShoutCounter(bar: number, trumpetMidi: number): number {
  if (!inRange(bar, 105, 120)) return trumpetMidi - 12;
  const off = ORBIT_SHOUT_DESCENT_OFFSETS[(bar - 105) % ORBIT_SHOUT_DESCENT_OFFSETS.length] ?? 0;
  return trumpetMidi - 7 + off;
}
