/**
 * String Quartet MusicContext — role assignment, texture, voice-leading solver, diagnostics (V105p1).
 */

import {
  chordTonesForChordSymbol,
  noteNameToPitchClass,
  parseChordSymbol,
} from '../harmony/chordSymbolAnalysis';
import { mulberry32 } from '../remix/vaultSeedMix';
import { buildTritonicDictionary, type TritonicCell } from '../tritonic/tritonicCell';
import { floatCellAboveAnchor } from '../tritonic/tritonicRealisation';
import { projectedStrandMidisFromCells } from '../tritonic/tritonicStrands';
import type { QuartetInstrument } from './stringQuartetTypes';
import type {
  StringQuartetCelloRole,
  StringQuartetPartLeapStats,
  StringQuartetRealisationDiagnostics,
  StringQuartetRoleAssignment,
  StringQuartetTritonicColour,
  StringQuartetTextureArchetype,
  StringQuartetViolaRole,
  StringQuartetViolin1Role,
  StringQuartetViolin2Role,
} from './stringQuartetMusicContextTypes';

const PART_ORDER: readonly QuartetInstrument[] = ['violin_1', 'violin_2', 'viola', 'cello'];

/** Hard range constraints (MIDI) — V105p1 spec. */
export const SQ_MC_MIDI_BOUNDS: Record<QuartetInstrument, readonly [number, number]> = {
  violin_1: [55, 103],
  violin_2: [55, 99],
  viola: [48, 91],
  cello: [36, 76],
};

const CELLO_ROLES: readonly StringQuartetCelloRole[] = ['root_motion', 'pedal', 'bass_counterline'];
const VIOLA_ROLES: readonly StringQuartetViolaRole[] = ['hinge_voice', 'thirds_sevenths', 'modal_colour'];
const V2_ROLES: readonly StringQuartetViolin2Role[] = [
  'bridge_voice',
  'harmonic_completion',
  'rhythmic_glue',
];
const V1_ROLES: readonly StringQuartetViolin1Role[] = ['melody', 'upper_extension', 'tritonic_float_target'];

const TEXTURE_NOTE_DURATION: Record<StringQuartetTextureArchetype, number> = {
  chorale: 4,
  arco_melody_accompaniment: 2,
  pad_suspension: 4,
  pizzicato_pulse: 0.5,
  tremolo_wash: 4,
  contrapuntal_weave: 1,
  duet_support: 2,
};

export type StringQuartetRealisedBar = {
  barIndex: number;
  midis: Record<QuartetInstrument, number>;
  durationBeats: number;
};

function clampMidi(midi: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(midi)));
}

function pickRole<T extends string>(roles: readonly T[], seed: number, salt: number): T {
  return roles[Math.abs((seed + salt) % roles.length)]!;
}

/** Layer 1 — one role per instrument per generation (seed-steered). */
export function assignStringQuartetRoles(seed: number): StringQuartetRoleAssignment {
  return {
    cello: pickRole(CELLO_ROLES, seed, 11),
    viola: pickRole(VIOLA_ROLES, seed, 23),
    violin_2: pickRole(V2_ROLES, seed, 37),
    violin_1: pickRole(V1_ROLES, seed, 53),
  };
}

export function tritonicFloatEnabled(
  texture: StringQuartetTextureArchetype,
  colour: StringQuartetTritonicColour = 'subtle',
): boolean {
  if (colour === 'none') return false;
  if (texture === 'chorale') return false;
  return texture === 'pad_suspension' || texture === 'contrapuntal_weave';
}

function innerFloatPart(seed: number): 'violin_2' | 'viola' {
  return seed % 2 === 0 ? 'violin_2' : 'viola';
}

function pcToMidiInRange(pc: number, lo: number, hi: number, preferOctave: number): number {
  let midi = preferOctave * 12 + ((pc % 12) + 12) % 12;
  while (midi < lo) midi += 12;
  while (midi > hi) midi -= 12;
  return clampMidi(midi, lo, hi);
}

function rootPcFromSymbol(symbol: string): number {
  const parsed = parseChordSymbol(symbol);
  const m = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  const pc = m?.[1] ? noteNameToPitchClass(m[1]) : undefined;
  return pc ?? 0;
}

function chordTonePcs(symbol: string): number[] {
  const tones = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
  const pcs = [tones.root, tones.third, tones.fifth, tones.seventh].map((m) => ((m % 12) + 12) % 12);
  return [...new Set(pcs)];
}

function snapToNearestPc(midi: number, pcs: number[], lo: number, hi: number): number {
  let best = clampMidi(midi, lo, hi);
  let bestDist = Infinity;
  for (const pc of pcs) {
    for (let o = 2; o <= 8; o++) {
      const candidate = clampMidi(o * 12 + pc, lo, hi);
      const dist = Math.abs(candidate - midi);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best;
}

function violatesCelloAboveViola(midis: Record<QuartetInstrument, number>, duration: number): boolean {
  if (duration < 2) return false;
  return midis.cello > midis.viola;
}

function violatesTextureDuration(texture: StringQuartetTextureArchetype, duration: number): boolean {
  const expected = TEXTURE_NOTE_DURATION[texture];
  if (texture === 'pizzicato_pulse') return duration > 1;
  if (texture === 'tremolo_wash' || texture === 'chorale' || texture === 'pad_suspension') {
    return duration < 2;
  }
  return Math.abs(duration - expected) > expected;
}

function applyTritonicFloatToBar(
  symbol: string,
  midis: Record<QuartetInstrument, number>,
  innerPart: 'violin_2' | 'viola',
  cells: TritonicCell[],
  barIndex: number,
  seed: number,
): Record<QuartetInstrument, number> {
  const cell = cells[(barIndex + seed) % cells.length]!;
  const floated = floatCellAboveAnchor(cell, symbol);
  const strand = projectedStrandMidisFromCells([floated]);
  const top = strand[strand.length - 1] ?? midis.violin_1;
  const inner = strand[Math.max(0, strand.length - 2)] ?? midis[innerPart];
  const out = { ...midis };
  const [v1Lo, v1Hi] = SQ_MC_MIDI_BOUNDS.violin_1;
  const [innerLo, innerHi] = SQ_MC_MIDI_BOUNDS[innerPart];
  out.violin_1 = clampMidi(top, v1Lo, v1Hi);
  out[innerPart] = clampMidi(inner, innerLo, innerHi);
  return out;
}

/** Layer 3 — deterministic voice-leading solver with hard reject + soft scoring inputs. */
export function solveStringQuartetVoiceLeading(params: {
  harmonyBars: readonly string[];
  seed: number;
  texture: StringQuartetTextureArchetype;
  roles: StringQuartetRoleAssignment;
  tritonicColour?: StringQuartetTritonicColour;
}): StringQuartetRealisedBar[] {
  const { harmonyBars, seed, texture, roles, tritonicColour = 'subtle' } = params;
  const rng = mulberry32(seed >>> 0);
  const cells = buildTritonicDictionary().cells;
  const floatEnabled = tritonicFloatEnabled(texture, tritonicColour);
  const floatInner = innerFloatPart(seed);
  const duration = TEXTURE_NOTE_DURATION[texture];
  const bars: StringQuartetRealisedBar[] = [];
  const prev: Record<QuartetInstrument, number | undefined> = {
    violin_1: undefined,
    violin_2: undefined,
    viola: undefined,
    cello: undefined,
  };

  for (let i = 0; i < harmonyBars.length; i++) {
    const symbol = harmonyBars[i]!;
    const tonePcs = chordTonePcs(symbol);
    const rootPc = rootPcFromSymbol(symbol);

    let vcMidi = pcToMidiInRange(rootPc, SQ_MC_MIDI_BOUNDS.cello[0], SQ_MC_MIDI_BOUNDS.cello[1], 3);
    if (roles.cello === 'pedal' && prev.cello !== undefined) {
      vcMidi = prev.cello;
    } else if (roles.cello === 'bass_counterline' && prev.cello !== undefined) {
      vcMidi = clampMidi(prev.cello + (rng() > 0.5 ? 2 : -2), ...SQ_MC_MIDI_BOUNDS.cello);
    }

    const thirdPc = tonePcs.find((pc) => pc === (rootPc + 4) % 12 || pc === (rootPc + 3) % 12) ?? tonePcs[1] ?? ((rootPc + 4) % 12);
    const seventhPc = tonePcs.find((pc) => pc !== rootPc && pc !== thirdPc) ?? ((rootPc + 10) % 12);
    const vaTargetPc = roles.viola === 'thirds_sevenths' ? thirdPc : seventhPc;
    let vaMidi = pcToMidiInRange(vaTargetPc, SQ_MC_MIDI_BOUNDS.viola[0], SQ_MC_MIDI_BOUNDS.viola[1], 4);

    const v2Pc = tonePcs[(i + 1) % tonePcs.length] ?? fifthPc(rootPc, tonePcs);
    let v2Midi = pcToMidiInRange(v2Pc, SQ_MC_MIDI_BOUNDS.violin_2[0], SQ_MC_MIDI_BOUNDS.violin_2[1], 5);
    if (prev.violin_2 !== undefined && roles.violin_2 === 'rhythmic_glue') {
      v2Midi = clampMidi(prev.violin_2 + (rng() > 0.6 ? 1 : 0), ...SQ_MC_MIDI_BOUNDS.violin_2);
    }

    let v1Midi = pcToMidiInRange(
      tonePcs[tonePcs.length - 1] ?? ((rootPc + 7) % 12),
      SQ_MC_MIDI_BOUNDS.violin_1[0],
      SQ_MC_MIDI_BOUNDS.violin_1[1],
      6,
    );
    if (prev.violin_1 !== undefined) {
      const stepTarget = clampMidi(prev.violin_1 + (rng() > 0.5 ? 2 : -1), ...SQ_MC_MIDI_BOUNDS.violin_1);
      v1Midi = roles.violin_1 === 'melody' ? stepTarget : snapToNearestPc(v1Midi, tonePcs, ...SQ_MC_MIDI_BOUNDS.violin_1);
    }

    let midis: Record<QuartetInstrument, number> = {
      violin_1: v1Midi,
      violin_2: v2Midi,
      viola: vaMidi,
      cello: vcMidi,
    };

    if (floatEnabled) {
      midis = applyTritonicFloatToBar(symbol, midis, floatInner, cells, i, seed);
    }

    if (violatesCelloAboveViola(midis, duration)) {
      midis.cello = clampMidi(midis.viola - 3, ...SQ_MC_MIDI_BOUNDS.cello);
    }

    const safeDuration = violatesTextureDuration(texture, duration)
      ? texture === 'pizzicato_pulse'
        ? 0.5
        : 2
      : duration;

    for (const part of PART_ORDER) {
      const [lo, hi] = SQ_MC_MIDI_BOUNDS[part];
      midis[part] = clampMidi(midis[part], lo, hi);
      prev[part] = midis[part];
    }

    bars.push({ barIndex: i + 1, midis, durationBeats: safeDuration });
  }

  return bars;
}

function fifthPc(rootPc: number, tonePcs: number[]): number {
  return tonePcs[2] ?? ((rootPc + 7) % 12);
}

function intervalClass(a: number, b: number): number {
  return Math.abs(a - b) % 12;
}

function isSimilarMotion(dA: number, dB: number): boolean {
  if (dA === 0 || dB === 0) return false;
  return dA * dB > 0;
}

function countOuterParallels(bars: StringQuartetRealisedBar[]): number {
  let count = 0;
  for (let i = 0; i < bars.length - 1; i++) {
    const a = bars[i]!.midis;
    const b = bars[i + 1]!.midis;
    const hi0 = a.violin_1;
    const lo0 = a.cello;
    const hi1 = b.violin_1;
    const lo1 = b.cello;
    const dHi = hi1 - hi0;
    const dLo = lo1 - lo0;
    if (
      (intervalClass(hi0, lo0) === 7 && intervalClass(hi1, lo1) === 7 && isSimilarMotion(dHi, dLo)) ||
      (intervalClass(hi0, lo0) === 0 && intervalClass(hi1, lo1) === 0 && isSimilarMotion(dHi, dLo))
    ) {
      count++;
    }
  }
  return count;
}

function meanLeapForPart(bars: StringQuartetRealisedBar[], part: QuartetInstrument): number {
  if (bars.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < bars.length; i++) {
    sum += Math.abs(bars[i]!.midis[part] - bars[i - 1]!.midis[part]);
  }
  return sum / (bars.length - 1);
}

function smoothnessForPart(bars: StringQuartetRealisedBar[], part: QuartetInstrument): number {
  if (bars.length < 2) return 1;
  let steps = 0;
  for (let i = 1; i < bars.length; i++) {
    const leap = Math.abs(bars[i]!.midis[part] - bars[i - 1]!.midis[part]);
    if (leap <= 2) steps++;
  }
  return steps / (bars.length - 1);
}

function partStats(
  bars: StringQuartetRealisedBar[],
  fn: (bars: StringQuartetRealisedBar[], part: QuartetInstrument) => number,
): StringQuartetPartLeapStats {
  return {
    violin_1: fn(bars, 'violin_1'),
    violin_2: fn(bars, 'violin_2'),
    viola: fn(bars, 'viola'),
    cello: fn(bars, 'cello'),
  };
}

/** Layer 4 — diagnostic receipt fields from realised bars. */
export function computeStringQuartetRealisationDiagnostics(
  bars: StringQuartetRealisedBar[],
  harmonyBars: readonly string[],
): StringQuartetRealisationDiagnostics {
  let voiceCrossingCount = 0;
  let lowRegisterCrowdingCount = 0;
  for (const bar of bars) {
    if (bar.durationBeats >= 2 && bar.midis.cello > bar.midis.viola) voiceCrossingCount++;
    if (bar.midis.viola - bar.midis.cello <= 3 && bar.midis.cello < 60) lowRegisterCrowdingCount++;
  }

  const outerVoiceParallelsCount = countOuterParallels(bars);

  const meanLeapPerPart = partStats(bars, meanLeapForPart);
  const lineSmoothnessScore = partStats(bars, smoothnessForPart);

  const spread =
    bars.reduce((acc, b) => {
      const vals = PART_ORDER.map((p) => b.midis[p]);
      return acc + (Math.max(...vals) - Math.min(...vals));
    }, 0) / Math.max(1, bars.length);
  const registralBalanceScore = Math.min(1, spread / 24);

  let covered = 0;
  for (let i = 0; i < bars.length; i++) {
    const pcs = chordTonePcs(harmonyBars[i] ?? '');
    const sounding = PART_ORDER.map((p) => bars[i]!.midis[p] % 12);
    const hits = pcs.filter((pc) => sounding.includes(pc)).length;
    covered += hits / Math.max(1, pcs.length);
  }
  const harmonicCompletenessScore = covered / Math.max(1, bars.length);

  const durations = bars.map((b) => b.durationBeats);
  const durationMode = durations[0] ?? 1;
  const stable = durations.filter((d) => d === durationMode).length;
  const textureStabilityScore = stable / Math.max(1, durations.length);

  return {
    voiceCrossingCount,
    lowRegisterCrowdingCount,
    outerVoiceParallelsCount,
    meanLeapPerPart,
    lineSmoothnessScore,
    registralBalanceScore,
    harmonicCompletenessScore,
    textureStabilityScore,
  };
}
