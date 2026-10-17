/**
 * String Quartet — Bartók-style Bulgarian aksak additive rhythm engine (diagnostic receipts + policy).
 * Internal model: subgroup vectors on a fast micro-pulse grid (16th or 8th), not “generic odd meter”.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { BarMeterMap } from './barMeterTypes';
import { getAccentSlots } from './oddMeterEngine';
import type { MeasureModel, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { createNote, createRest } from '../score-model/scoreEventBuilder';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';

export type BartokBulgarianAksakPulseBase = '16th' | '8th';

/** Canonical additive cells (B1 = Bartók textbook exemplar). */
export type BartokBulgarianAksakCellId = 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6';

export type BartokBulgarianAksakAccentLayer = 'metric' | 'melodic';

export type BartokBulgarianAksakVoiceRole =
  | 'metric_declarer'
  | 'offset_support'
  | 'cross_accent'
  | 'cello_rhythmic';

export type BartokBulgarianAksakCelloMode =
  | 'repeated_anchor'
  | 'pedal_plus_puncture'
  | 'active_counterline';

export type BartokBulgarianAksakPatternTransition = 'common_tail' | 'pivot_bar' | 'phrase_compression';

export interface BartokBulgarianAksakRhythmEnginePolicy {
  rhythmEngineId: 'bartok_bulgarian_aksak';
  label: "Bartók / Bulgarian Aksak";
  pulseBase: BartokBulgarianAksakPulseBase;
  /** Default subgroup packet (Bartók exemplar 4+2+3). */
  subgroupVector: readonly [number, number, number];
  cellLibrary: readonly BartokBulgarianAksakCellId[];
  accentLayers: { metric: true; melodic: true };
  voiceRoles: Record<'A' | 'B' | 'C' | 'D', BartokBulgarianAksakVoiceRole>;
  minPatternStabilityBars: number;
  maxPatternStabilityBars: number;
  patternTransitionTypes: readonly BartokBulgarianAksakPatternTransition[];
  formalRole: 'high_energy_contrast_zone';
  /** Pulse always present (additive metric); not gesture-only free time. */
  antiMetric: boolean;
  harmonicRhythmAlignment: 'optional_aligned_or_misaligned';
  /** Motoric tempo band for 16th pulses (MM), surface feel. */
  tempoSixteenthMmMin: number;
  tempoSixteenthMmMax: number;
}

export const BARTOK_BULGARIAN_AKSAK_DEFAULT_POLICY: BartokBulgarianAksakRhythmEnginePolicy = {
  rhythmEngineId: 'bartok_bulgarian_aksak',
  label: 'Bartók / Bulgarian Aksak',
  pulseBase: '16th',
  subgroupVector: [4, 2, 3],
  cellLibrary: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'],
  accentLayers: { metric: true, melodic: true },
  voiceRoles: {
    A: 'metric_declarer',
    B: 'offset_support',
    C: 'cross_accent',
    D: 'cello_rhythmic',
  },
  minPatternStabilityBars: 2,
  maxPatternStabilityBars: 6,
  patternTransitionTypes: ['common_tail', 'pivot_bar', 'phrase_compression'],
  formalRole: 'high_energy_contrast_zone',
  antiMetric: false,
  harmonicRhythmAlignment: 'optional_aligned_or_misaligned',
  tempoSixteenthMmMin: 300,
  tempoSixteenthMmMax: 400,
};

/** Cell specs: vector, pulse base, total pulses per bar. */
export const BARTOK_BULGARIAN_AKSAK_CELL_SPECS: Record<
  BartokBulgarianAksakCellId,
  { vector: readonly number[]; pulseBase: '16th' | '8th'; totalPulses: number }
> = {
  B1: { vector: [4, 2, 3], pulseBase: '16th', totalPulses: 9 },
  B2: { vector: [3, 2, 3], pulseBase: '8th', totalPulses: 8 },
  B3: { vector: [2, 2, 3], pulseBase: '8th', totalPulses: 7 },
  B4: { vector: [2, 3], pulseBase: '8th', totalPulses: 5 },
  B5: { vector: [3, 2], pulseBase: '8th', totalPulses: 5 },
  B6: { vector: [3, 2, 2, 3], pulseBase: '8th', totalPulses: 10 },
};

/**
 * Fingerprint receipts for SQ aksak engine (additive packet grammar, layered accents, voice roles).
 * Prefix: BG_RHYTHM_*
 */
export const BARTOK_BULGARIAN_AKSAK_RHYTHM_RECEIPTS: readonly string[] = [
  'BG_RHYTHM_POLICY_01:rhythmEngineId=bartok_bulgarian_aksak',
  'BG_RHYTHM_POLICY_02:pulse_base_default=16th_fast_micro_grid',
  'BG_RHYTHM_POLICY_03:subgroup_vector_primary=[4,2,3]_B1_default',
  'BG_RHYTHM_POLICY_04:notation_rendering_decoupled_from_internal_pulse_store',
  'BG_RHYTHM_CELL_B1:vector_4+2+3_pulses_9_textbook_exemplar',
  'BG_RHYTHM_CELL_B2:vector_3+2+3_pulses_8',
  'BG_RHYTHM_CELL_B3:vector_2+2+3_pulses_7',
  'BG_RHYTHM_CELL_B4:vector_2+3_pulses_5_inversional_partner_B5',
  'BG_RHYTHM_CELL_B5:vector_3+2_pulses_5_inversional_partner_B4',
  'BG_RHYTHM_CELL_B6:vector_3+2+2+3_pulses_10_chained_expansion',
  'BG_RHYTHM_PACKET_01:long_short_packet_identity_not_even_beat_count',
  'BG_RHYTHM_PACKET_02:unequal_ordering_repeated_within_section',
  'BG_RHYTHM_PACKET_03:fast_pulse_embodied_body_feel',
  'BG_RHYTHM_TEMPO_01:sixteenth_mm_band_300_400_motoric_surface',
  'BG_RHYTHM_ACCENT_01:metric_layer_strongest_bar_onset',
  'BG_RHYTHM_ACCENT_02:metric_secondary_largest_internal_subgroup_break',
  'BG_RHYTHM_ACCENT_03:melodic_layer_independent_of_metric',
  'BG_RHYTHM_ACCENT_04:melodic_anticipation_last_pulse_prior_subgroup',
  'BG_RHYTHM_ACCENT_05:melodic_delayed_arrival_second_pulse_long_subgroup',
  'BG_RHYTHM_ACCENT_06:cross_accent_sforzando_registral_peak_vs_metric',
  'BG_RHYTHM_ACCENT_07:four_bar_span_upper_voice_melodic_displacement_required',
  'BG_RHYTHM_ACCENT_08:forbid_all_voices_subgroup_start_unison_extended',
  'BG_RHYTHM_ACCENT_09:hierarchical_dynamic_not_equal_every_subgroup',
  'BG_RHYTHM_VOICE_A:metric_declarer_short_dry_motoric_detaché',
  'BG_RHYTHM_VOICE_B:parallel_offset_support_subgroup_or_pulse_before',
  'BG_RHYTHM_VOICE_C:cross_accent_ostinato_slurred_crossing_blur_boundary',
  'BG_RHYTHM_VOICE_D1:cello_repeated_anchor_selected_subgroup_first_pulses',
  'BG_RHYTHM_VOICE_D2:cello_pedal_plus_puncture_sustain_then_punctuate',
  'BG_RHYTHM_VOICE_D3:cello_active_counterline_additive_confirm_not_root_pad',
  'BG_RHYTHM_VOICE_RULE:max_two_voices_full_coincidence_subgroup_starts_gt2bars_forbidden',
  'BG_RHYTHM_ARTIC_01:default_short_dry_motoric_detaché_adjacent_martelé',
  'BG_RHYTHM_ARTIC_02:martelé_primary_subgroup_starts_selective',
  'BG_RHYTHM_ARTIC_03:slurred_crossing_phrase_override_subgroup',
  'BG_RHYTHM_ARTIC_04:texture_contrast_muted_pizz_sharp_detached_scherzo_finale',
  'BG_RHYTHM_STAB_01:min_stability_bars_2_max_6_before_mutation',
  'BG_RHYTHM_STAB_02:legal_transition_common_tail_preserve_final_packet',
  'BG_RHYTHM_STAB_03:legal_transition_pivot_bar_voice_prepares_one_bar_early',
  'BG_RHYTHM_STAB_04:legal_transition_phrase_compression_long_packet_minus_one_pulse',
  'BG_RHYTHM_STAB_05:forbid_random_odd_bar_jumps_unrelated_patterns',
  'BG_RHYTHM_FORM_01:role_high_energy_contrast_scherzo_finale_climax',
  'BG_RHYTHM_FORM_02:entrance_abrupt_or_post_decompression_corridor',
  'BG_RHYTHM_EXIT_01:reduce_attack_density_first',
  'BG_RHYTHM_EXIT_02:collapse_subgroup_accents_second',
  'BG_RHYTHM_EXIT_03:long_slurs_sustain_replace_additive_beaming_third',
  'BG_RHYTHM_EXIT_04:subdivision_residue_one_voice_while_others_regularize_fourth',
  'BG_RHYTHM_HARM_01:harmonic_change_may_align_or_misalign_subgroup_boundary',
  'BG_RHYTHM_HARM_02:do_not_force_harmonic_rhythm_to_additive_grouping',
  'BG_RHYTHM_DIFF_01:vs_rebetiko_first_class_subgroup_vector_not_phrase_ornament_groove_only',
  'BG_RHYTHM_DIFF_02:vs_generic_odd_meter_requires_packet_identity_not_beat_count_only',
  'BG_RHYTHM_DIFF_03:vs_stravinsky_stable_additive_section_not_random_bar_length_blocks',
  'BG_RHYTHM_DIFF_04:vs_free_proportional_pulse_state_steady_countable_micro_pulse',
  'BG_RHYTHM_ERR_01:avoid_four_voices_identical_continuous_square',
  'BG_RHYTHM_ERR_02:avoid_broad_legato_ignoring_subdivision',
  'BG_RHYTHM_ERR_03:avoid_equal_mechanical_subgroup_accents',
  'BG_RHYTHM_ERR_04:avoid_lush_padding_neutralizing_rhythmic_bite',
  'BG_RHYTHM_ERR_05:avoid_pattern_flip_every_bar_without_body_register',
];

export function mergeBartokBulgarianAksakSqRhythmIntoMetadata(meta: GenerationMetadata): GenerationMetadata {
  return {
    ...meta,
    sqRhythmEngineId: 'bartok_bulgarian_aksak',
    sqRhythmEngineReceipts: BARTOK_BULGARIAN_AKSAK_RHYTHM_RECEIPTS,
  };
}

/** One sixteenth of a quarter in the existing score model. */
export const BARTOK_B1_PULSE_QUARTERS = 0.25;

export const BARTOK_B1_METER = { numerator: 9, denominator: 16 } as const;

export interface BartokB1VoiceReceipt {
  partId: string;
  voice: number;
  bar: number;
  /** Sixteenth pulses of sounding attacks, after tie coalescing when confirmed. */
  attackPulses: number[];
}

export interface BartokB1NativeReceipt {
  status: 'applied' | 'refused';
  cellId: 'B1';
  pulseBase: '16th';
  vector: readonly [4, 2, 3];
  totalPulses: 9;
  meter: { numerator: 9; denominator: 16 };
  bars: number[];
  reason?: string;
  /** Attacks written before the duo seal. */
  realised: BartokB1VoiceReceipt[];
  /** True only when sealed events still have those sounding attacks. */
  survivedFinalisation: boolean;
}

const GUITAR_LOW = 52;
const GUITAR_HIGH = 84;
const BASS_LOW = 28;
const BASS_HIGH = 55;

function foldMidi(midi: number, low: number, high: number, fallback: number): number {
  if (!Number.isFinite(midi)) return fallback;
  let m = Math.round(midi);
  while (m < low) m += 12;
  while (m > high) m -= 12;
  return m < low || m > high ? fallback : m;
}

function rootPc(symbol: string | undefined): number {
  const match = (symbol ?? 'C').match(/^([A-G])([#b])?/);
  if (!match) return 0;
  const letter = 'CDEFGAB'.indexOf(match[1]!);
  const base = [0, 2, 4, 5, 7, 9, 11][letter] ?? 0;
  if (match[2] === '#') return (base + 1) % 12;
  if (match[2] === 'b') return (base + 11) % 12;
  return base;
}

function placed(pc: number, low: number, high: number, center: number): number {
  let midi = low + ((pc - (low % 12) + 12) % 12);
  while (midi + 12 <= high && Math.abs(midi + 12 - center) < Math.abs(midi - center)) midi += 12;
  return foldMidi(midi, low, high, center);
}

function voicePitches(measure: MeasureModel, voice: number): number[] {
  return measure.events
    .filter((event): event is NoteEvent => event.kind === 'note' && (event.voice ?? 1) === voice)
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((event) => event.pitch);
}

function pickPitch(pitches: number[], index: number, fallback: number, low: number, high: number): number {
  const raw = pitches.length === 0 ? fallback : pitches[Math.min(index, pitches.length - 1)]!;
  return foldMidi(raw, low, high, fallback);
}

function bartokB1BassLine(
  bar: number,
  pitches: number[],
  fallback: number,
  motif: string | undefined,
): { events: ScoreEvent[]; attacks: number[] } {
  const q = BARTOK_B1_PULSE_QUARTERS;
  const first = pickPitch(pitches, 0, fallback, BASS_LOW, BASS_HIGH);
  const second = foldMidi(pickPitch(pitches, 1, fallback, BASS_LOW, BASS_HIGH) + ((bar % 5) - 2), BASS_LOW, BASS_HIGH, first);
  const kind = bar % 3;
  if (kind === 1) {
    return {
      attacks: [4, 6],
      events: [createRest(0, 4 * q, 1), createNote(first, 4 * q, 2 * q, 1, motif), createNote(second, 6 * q, 3 * q, 1, motif)],
    };
  }
  if (kind === 2) {
    return {
      attacks: [3, 7],
      events: [createRest(0, 3 * q, 1), createNote(first, 3 * q, 4 * q, 1, motif), createNote(second, 7 * q, 2 * q, 1, motif)],
    };
  }
  return {
    attacks: [2, 5],
    events: [createRest(0, 2 * q, 1), createNote(first, 2 * q, 3 * q, 1, motif), createNote(second, 5 * q, 4 * q, 1, motif)],
  };
}

function motifOf(measure: MeasureModel): string | undefined {
  const note = measure.events.find((event) => event.kind === 'note');
  return note && note.kind === 'note' ? note.motifRef : undefined;
}

export function bartokB1AttackPulses(events: MeasureModel['events'], voice: number): number[] {
  const sorted = events
    .filter((event) => (event.voice ?? 1) === voice)
    .sort((a, b) => a.startBeat - b.startBeat);
  const attacks: number[] = [];
  let openPitch: number | null = null;
  let openEnd = -1;
  for (const event of sorted) {
    if (event.kind === 'rest') {
      openPitch = null;
      openEnd = -1;
      continue;
    }
    if (event.kind !== 'note') continue;
    const tie = event.notation?.tie;
    const continues =
      (tie === 'stop' || tie === 'continue') &&
      openPitch === event.pitch &&
      Math.abs(event.startBeat - openEnd) < 1e-4;
    const pulse = Math.round(event.startBeat / BARTOK_B1_PULSE_QUARTERS);
    if (!continues) attacks.push(pulse);
    openPitch = event.pitch;
    openEnd = event.startBeat + event.duration;
  }
  return attacks;
}

function samePulses(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((pulse, index) => pulse === b[index]);
}

/**
 * Opt-in B1. Flag off returns undefined and does not read the score.
 * Refusal leaves notes and the meter map untouched.
 */
export function applyBartokB1NativeAksak(
  score: ScoreModel,
  context: CompositionContext,
): BartokB1NativeReceipt | undefined {
  if (context.generationMetadata?.bartokB1Aksak !== true) return undefined;
  const cell = BARTOK_BULGARIAN_AKSAK_CELL_SPECS.B1;
  const vector = cell.vector as readonly [number, number, number];
  const base = {
    cellId: 'B1' as const,
    pulseBase: '16th' as const,
    vector: [4, 2, 3] as const,
    totalPulses: 9,
    meter: { numerator: 9 as const, denominator: 16 as const },
    realised: [] as BartokB1VoiceReceipt[],
    survivedFinalisation: false,
  };
  const refuse = (reason: string, bars: number[] = []): BartokB1NativeReceipt => {
    const receipt: BartokB1NativeReceipt = { ...base, status: 'refused', bars, reason };
    context.generationMetadata = { ...context.generationMetadata, bartokB1Receipt: receipt };
    return receipt;
  };
  if (vector[0] !== 4 || vector[1] !== 2 || vector[2] !== 3 || cell.pulseBase !== '16th' || cell.totalPulses !== 9) {
    return refuse('B1 cell is not 4+2+3 sixteenths');
  }
  const styleId = (context.generationMetadata?.songwriterStyleId ?? '').trim().toLowerCase();
  const songBartok = styleId === 'bartok' || styleId === 'bela_bartok' || styleId === 'bela';
  if (!songBartok) return refuse(`songwriter ${styleId || 'none'} is not bartok`);
  if (!isGuitarBassDuoFamily(context.presetId)) return refuse('B1 native path is Song Mode duo only');
  const requested = context.generationMetadata?.bartokB1Bars ?? [];
  const bars = [...new Set(requested.map((bar) => Math.round(bar)))].filter((bar) => bar >= 1).sort((a, b) => a - b);
  if (bars.length === 0) return refuse('no B1 bars selected');
  const barCount = score.parts[0]?.measures.length ?? 0;
  if (bars.some((bar) => bar > barCount)) return refuse('B1 bar is outside the score', bars);
  if ((context.generationMetadata?.songModeLeadSheetMelodyAnchors?.length ?? 0) > 0) {
    return refuse('source-locked lead-sheet notes', bars);
  }
  const identityLocked = new Set(context.generationMetadata?.identityLockedBars ?? []);
  if (bars.some((bar) => identityLocked.has(bar))) return refuse('identity-locked bar', bars);
  if (context.generationMetadata?.asymmetricRhythmRequest) return refuse('asymmetric meter already owns the bar', bars);
  const prior: BarMeterMap = {
    ...(context.barMeterMap ?? {}),
    ...(context.generationMetadata?.barMeterMap ?? {}),
  };
  for (const bar of bars) {
    const existing = prior[bar];
    if (existing && (existing.numerator !== 9 || existing.denominator !== 16)) {
      return refuse(`bar ${bar} meter ${existing.numerator}/${existing.denominator} conflicts with 9/16`, bars);
    }
  }
  const guitar = score.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return refuse('guitar and bass parts are missing', bars);

  const starts = getAccentSlots(cell.vector);
  if (starts.join(',') !== '0,4,6') return refuse('B1 group starts are not 0,4,6', bars);
  for (const bar of bars) {
    if (!guitar.measures.some((measure) => measure.index === bar)) return refuse(`bar ${bar} is missing a part`, bars);
    if (!bass.measures.some((measure) => measure.index === bar)) return refuse(`bar ${bar} is missing a part`, bars);
  }
  const nextMap: BarMeterMap = { ...prior };
  const realised: BartokB1VoiceReceipt[] = [];
  for (const bar of bars) {
    nextMap[bar] = { numerator: 9, denominator: 16 };
    const gm = guitar.measures.find((measure) => measure.index === bar)!;
    const bm = bass.measures.find((measure) => measure.index === bar)!;
    const chord = gm.chord ?? bm.chord;
    const gFallback = placed(rootPc(chord), GUITAR_LOW, GUITAR_HIGH, 64);
    const bFallback = placed(rootPc(chord), BASS_LOW, BASS_HIGH, 40);
    const gPitches = voicePitches(gm, 1);
    const bPitches = voicePitches(bm, 1);
    const gMotif = motifOf(gm);
    const bMotif = motifOf(bm);
    const bassLine = bartokB1BassLine(bar, bPitches, bFallback, bMotif);
    const guitarEvents = starts.map((pulse, index) =>
      createNote(
        pickPitch(gPitches, index, gFallback, GUITAR_LOW, GUITAR_HIGH),
        pulse * BARTOK_B1_PULSE_QUARTERS,
        cell.vector[index]! * BARTOK_B1_PULSE_QUARTERS,
        1,
        gMotif,
      ),
    );
    const extraVoices = [
      ...new Set(
        gm.events
          .map((event) => event.voice ?? 1)
          .filter((voice) => voice !== 1),
      ),
    ].sort((a, b) => a - b);
    for (const voice of extraVoices) {
      const pitches = voicePitches(gm, voice);
      const pitch = pickPitch(pitches, 0, gFallback, GUITAR_LOW, GUITAR_HIGH);
      guitarEvents.push(
        createRest(0, 4 * BARTOK_B1_PULSE_QUARTERS, voice),
        createNote(pitch, 4 * BARTOK_B1_PULSE_QUARTERS, 2 * BARTOK_B1_PULSE_QUARTERS, voice, gMotif),
        createRest(6 * BARTOK_B1_PULSE_QUARTERS, 3 * BARTOK_B1_PULSE_QUARTERS, voice),
      );
    }
    gm.events = guitarEvents;
    gm.measureBeatSpanQuarters = 2.25;
    gm.b1PulsePreserve = true;
    bm.events = bassLine.events;
    bm.measureBeatSpanQuarters = 2.25;
    bm.b1PulsePreserve = true;
    realised.push(
      { partId: guitar.id, voice: 1, bar, attackPulses: [0, 4, 6] },
      { partId: bass.id, voice: 1, bar, attackPulses: bassLine.attacks },
      ...extraVoices.map((voice) => ({ partId: guitar.id, voice, bar, attackPulses: [4] })),
    );
  }
  context.barMeterMap = nextMap;
  score.barMeterMap = nextMap;
  const receipt: BartokB1NativeReceipt = {
    ...base,
    status: 'applied',
    bars,
    realised,
  };
  context.generationMetadata = {
    ...context.generationMetadata,
    barMeterMap: nextMap,
    bartokB1Receipt: receipt,
  };
  return receipt;
}

export function confirmBartokB1Finalisation(score: ScoreModel, receipt: BartokB1NativeReceipt): BartokB1NativeReceipt {
  if (receipt.status !== 'applied') return receipt;
  const guitar = score.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass');
  let ok = guitar !== undefined && bass !== undefined;
  for (const row of receipt.realised) {
    const part = row.partId === bass?.id ? bass : guitar;
    const measure = part?.measures.find((item) => item.index === row.bar);
    const attacks = measure ? bartokB1AttackPulses(measure.events, row.voice) : [];
    if (!measure?.b1PulsePreserve || !samePulses(attacks, row.attackPulses)) ok = false;
  }
  return { ...receipt, survivedFinalisation: ok };
}
