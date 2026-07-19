/**
 * Per-bar chord-derived pitch field for riff melody and bass (when USE_PITCH_FIELD_NOTE_SELECTION).
 */

import { USE_PITCH_FIELD_NOTE_SELECTION } from '../counterpoint/engineFeatureFlags';
import { chordTonesForChordSymbol, noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { IntervalWeight, PitchClass, ResolvedPitchField } from '../harmony/pitchFieldSpineTypes';
import type { LedZeppelinStyleMode, RiffIntervalWeightMap, RiffProfile } from '../composer/riffProfileTypes';
import type { RiffStyleId } from './riffTypes';

function pcFromMidi(midi: number): PitchClass {
  return (((midi % 12) + 12) % 12) as PitchClass;
}

/**
 * Directed pitch-class interval semitones for each {@link RiffIntervalWeightMap} key.
 * Must stay in lockstep with receipt parser keys in `riffReceiptCompiler.parseIntervalWeightsFromBody`.
 */
export const RIFF_INTERVAL_WEIGHT_SEMITONES: Record<keyof RiffIntervalWeightMap, number> = {
  m2: 1,
  M2: 2,
  m3: 3,
  M3: 4,
  P4: 5,
  tritone: 6,
  P5: 7,
  M6: 9,
};

/**
 * Map profile `intervalWeights` → `ResolvedPitchField.preferredIntervals`.
 * Only defined keys become entries; missing keys are pass-through (factor 1.0) at pick time.
 */
export function preferredIntervalsFromIntervalWeights(
  weights: RiffIntervalWeightMap | undefined
): IntervalWeight[] {
  if (!weights) return [];
  const out: IntervalWeight[] = [];
  for (const key of Object.keys(RIFF_INTERVAL_WEIGHT_SEMITONES) as Array<keyof RiffIntervalWeightMap>) {
    const w = weights[key];
    if (typeof w !== 'number' || !Number.isFinite(w)) continue;
    out.push({ semitones: RIFF_INTERVAL_WEIGHT_SEMITONES[key], weight: w });
  }
  return out;
}

function styleRegister(style: RiffStyleId): { low: number; high: number } {
  switch (style) {
    case 'metheny':
      return { low: 55, high: 76 };
    case 'scofield':
      return { low: 52, high: 74 };
    case 'funk':
      return { low: 50, high: 72 };
    default:
      return { low: 52, high: 75 };
  }
}

/** Extension pitch classes implied by lead-sheet suffix (per chord, not a static scale pool). */
function extensionPcsForHarmony(harmonyPart: string, rootPc: number): PitchClass[] {
  const s = harmonyPart.toLowerCase();
  const out: PitchClass[] = [];
  const add = (semi: number) => {
    const pc = ((rootPc + semi) % 12) as PitchClass;
    if (!out.includes(pc)) out.push(pc);
  };
  if (/sus4|9sus4/.test(s)) add(5);
  if (/sus2/.test(s)) add(2);
  if (/#11/.test(s)) add(6);
  if (/\b11\b/.test(s) && !/#11/.test(s)) add(5);
  if (/9/.test(s) && !/sus/.test(s)) add(2);
  if (/13/.test(s)) add(9);
  if (/add9/.test(s)) add(2);
  if (/6/.test(s) && !/16/.test(s)) add(9);
  return out;
}

export type RiffVoicingClass =
  | 'power5'
  | 'dom_close_379'
  | 'maj7_spread_upper'
  | 'sus_no_third'
  | 'open_drone_dyad'
  | 'pedal_dyad'
  | 'generic_chord_tones';

/** Map chord symbol → guitar voicing class (no silent Am7 fallback). */
export function voicingClassForChordSymbol(chordSymbol: string): RiffVoicingClass {
  const parsed = parseChordSymbol(chordSymbol);
  const h = parsed.harmonyPart.toLowerCase();
  if (/power|5\b|no3|sus2.*power/.test(h)) return 'power5';
  if (/9sus4|sus4|sus2|sus\b/.test(h)) return 'sus_no_third';
  if (/maj7#11|maj7.*#11|Δ#11/.test(h)) return 'maj7_spread_upper';
  if (/add9/.test(h) && !/maj/.test(h)) return 'dom_close_379';
  if (/m9|min9/.test(h)) return 'dom_close_379';
  if (/dom13|13\b|dom9|7#9|7b9|7alt/.test(h) && !/maj/.test(h)) return 'dom_close_379';
  if (/[a-g](#|b)?9$/i.test(h) && !/sus|maj|add|m9|min9/.test(h)) return 'dom_close_379';
  if (/maj7|maj9|Δ/.test(h)) return 'maj7_spread_upper';
  return 'generic_chord_tones';
}

function voicingWeights(
  voicing: RiffVoicingClass,
  styleMode?: LedZeppelinStyleMode
): { root: number; third: number; fifth: number; seventh: number; ext: number } {
  if (styleMode === 'epic_modal_heavy' || voicing === 'pedal_dyad') {
    return { root: 1.0, third: 0.5, fifth: 0.95, seventh: 0.55, ext: 0.88 };
  }
  if (styleMode === 'folk_modal' || voicing === 'open_drone_dyad') {
    return { root: 1.0, third: 0.45, fifth: 0.9, seventh: 0.5, ext: 0.7 };
  }
  switch (voicing) {
    case 'power5':
      return { root: 1.0, third: 0.15, fifth: 0.95, seventh: 0.35, ext: 0.2 };
    case 'sus_no_third':
      return { root: 1.0, third: 0.2, fifth: 0.9, seventh: 0.75, ext: 0.82 };
    case 'dom_close_379':
      return { root: 0.75, third: 0.92, fifth: 0.55, seventh: 0.95, ext: 0.9 };
    case 'maj7_spread_upper':
      return { root: 0.7, third: 0.88, fifth: 0.65, seventh: 0.92, ext: 0.95 };
    default:
      return { root: 1.0, third: 0.9, fifth: 0.85, seventh: 0.88, ext: 0.78 };
  }
}

/**
 * Led Zeppelin style mode per bar: chord complexity + register heuristic.
 */
export function resolveStyleModeForBar(
  vrbId: string | undefined,
  chordSymbol: string,
  barIndex: number
): LedZeppelinStyleMode | undefined {
  if (!vrbId || !/led_zeppelin|jimmy_page|zeppelin|page/.test(vrbId)) return undefined;
  const v = voicingClassForChordSymbol(chordSymbol);
  const h = parseChordSymbol(chordSymbol).harmonyPart.toLowerCase();
  if (v === 'maj7_spread_upper' || /pedal|kashmir|achilles/i.test(chordSymbol)) return 'epic_modal_heavy';
  if (v === 'sus_no_third' || /sus2|folk|bron|over_the_hills/i.test(h)) {
    return 'folk_modal';
  }
  if (/dom13|9sus4|m9|add9|#11/.test(h)) return barIndex % 2 === 0 ? 'blues_rock' : 'epic_modal_heavy';
  return 'blues_rock';
}

function bassExtensionPcs(harmonyPart: string, rootPc: number): PitchClass[] {
  return extensionPcsForHarmony(harmonyPart, rootPc);
}

/**
 * Bass pitch field: chord root + extensions per bar; honors compiled bassContourPolicy.
 */
export function bassRiffPitchFieldForBar(
  chordSymbol: string,
  barIndex: number,
  vrbProfile?: RiffProfile
): ResolvedPitchField {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const parsed = parseChordSymbol(chordSymbol);
  const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  const rootPc = rm ? (noteNameToPitchClass(rm[1]!) ?? 0) : 0;
  const contour = vrbProfile?.bassContourPolicy;

  const allowed: Array<{ pc: PitchClass; weight: number }> = [];
  const push = (midi: number, weight: number) => {
    const pc = pcFromMidi(midi);
    if (!allowed.some((e) => e.pc === pc)) allowed.push({ pc, weight });
  };

  push(tones.root, 1.0);
  push(tones.fifth, 0.82);
  push(tones.third, 0.78);
  push(tones.seventh, 0.85);
  for (const ext of bassExtensionPcs(parsed.harmonyPart, rootPc)) {
    const midi = 36 + ext;
    push(midi, 0.72);
  }

  if (contour?.octaveJumpEveryBars && (barIndex + 1) % contour.octaveJumpEveryBars === 0) {
    push(tones.root + 12, 0.65);
  }
  if (contour?.melodicCounterpart) {
    push(tones.third, 0.9);
  }

  return {
    allowedPcs: allowed,
    preferredIntervals: preferredIntervalsFromIntervalWeights(vrbProfile?.intervalWeights),
    registerCenterMidi: 40,
    registerSpread: 10,
    regionId: `riff_bass_${parsed.display}_b${barIndex}`,
  };
}

/**
 * Voicing-aware guitar pitch field; style mode overrides for Page / Led VRB.
 */
export function guitarRiffPitchFieldForBar(
  chordSymbol: string,
  style: RiffStyleId,
  vrbProfile?: RiffProfile,
  styleMode?: LedZeppelinStyleMode
): ResolvedPitchField {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const parsed = parseChordSymbol(chordSymbol);
  const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  const rootPc = rm ? (noteNameToPitchClass(rm[1]!) ?? 0) : 0;

  let voicing = voicingClassForChordSymbol(chordSymbol);
  if (styleMode === 'epic_modal_heavy') voicing = 'pedal_dyad';
  if (styleMode === 'folk_modal') voicing = 'open_drone_dyad';

  const w = voicingWeights(voicing, styleMode);
  const allowed: Array<{ pc: PitchClass; weight: number }> = [];
  const push = (midi: number, weight: number) => {
    const pc = pcFromMidi(midi);
    if (!allowed.some((e) => e.pc === pc)) allowed.push({ pc, weight });
  };

  push(tones.root, w.root);
  push(tones.third, w.third);
  push(tones.fifth, w.fifth);
  push(tones.seventh, w.seventh);
  for (const ext of extensionPcsForHarmony(parsed.harmonyPart, rootPc)) {
    if (!allowed.some((e) => e.pc === ext)) allowed.push({ pc: ext, weight: w.ext });
  }

  if (voicing === 'pedal_dyad' && vrbProfile?.pedalPoint?.enabled) {
    push(tones.root, 1.0);
    push(tones.fifth, 0.92);
  }

  const { low, high } = styleRegister(style);
  return {
    allowedPcs: allowed,
    preferredIntervals: preferredIntervalsFromIntervalWeights(vrbProfile?.intervalWeights),
    registerCenterMidi: Math.floor((low + high) / 2),
    registerSpread: Math.max(4, Math.floor((high - low) / 2)),
    regionId: `riff_gtr_${voicing}_${parsed.display}`,
  };
}

/**
 * Build a resolved pitch field for one bar from the chord symbol (extensions + chord tones).
 */
export function pitchFieldFromChords(chord: string, style: RiffStyleId): ResolvedPitchField {
  return guitarRiffPitchFieldForBar(chord, style);
}

export function riffPitchFieldForBar(
  chord: string,
  style: RiffStyleId,
  vrbProfile?: RiffProfile,
  vrbId?: string,
  barIndex?: number
): ResolvedPitchField | undefined {
  if (!USE_PITCH_FIELD_NOTE_SELECTION) return undefined;
  const styleMode =
    vrbId && barIndex !== undefined ? resolveStyleModeForBar(vrbId, chord, barIndex) : undefined;
  return guitarRiffPitchFieldForBar(chord, style, vrbProfile, styleMode);
}
