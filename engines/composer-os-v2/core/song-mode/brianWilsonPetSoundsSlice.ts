/**
 * Brian Wilson — Pet Sounds era (1964–67) Song Mode / duo golden-path slice.
 * Named harmonic devices + light guitar melody shaping (progressive register / pickups).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent } from '../score-model/scoreModelTypes';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { planMelodyBehaviour } from './melodyBehaviourPlanner';

export interface BrianWilsonHarmonyAccumulator {
  barsConsidered: number;
  chromaticBassTransitions: number;
  halfDiminishedTouches: number;
  augmentedTouches: number;
  diminishedSeventhTouches: number;
}

export function createBrianWilsonHarmonyAccumulator(): BrianWilsonHarmonyAccumulator {
  return {
    barsConsidered: 0,
    chromaticBassTransitions: 0,
    halfDiminishedTouches: 0,
    augmentedTouches: 0,
    diminishedSeventhTouches: 0,
  };
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

function rootPcFromHarmonyPart(harmonyPart: string): number | undefined {
  const m = harmonyPart.trim().match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

/** Prefer slash bass PC; else chord root PC. */
export function bassPitchClassForChordSymbol(symbol: string): number | undefined {
  const p = parseChordSymbol(symbol);
  if (p.slashBassPc !== undefined) return p.slashBassPc;
  return rootPcFromHarmonyPart(p.harmonyPart);
}

export function accumulateBrianWilsonHarmonyDiagnostics(
  previousChord: string | undefined,
  currentChord: string,
  acc: BrianWilsonHarmonyAccumulator
): void {
  const cur = currentChord.trim();
  if (!cur) return;
  acc.barsConsidered++;

  const h = parseChordSymbol(cur).harmonyPart;
  const hl = h.toLowerCase();

  if (hl.includes('m7b5') || hl.includes('ø') || hl.includes('half-dim')) {
    acc.halfDiminishedTouches++;
  } else if (hl.includes('dim7') || hl.includes('°') || (/\bdim\b/i.test(h) && !hl.includes('maj'))) {
    acc.diminishedSeventhTouches++;
  }
  if (hl.includes('aug') || /^[a-g][#b]?\+(?=\(|\/|$)/i.test(h.trim())) {
    acc.augmentedTouches++;
  }

  if (!previousChord?.trim()) return;
  const prevPc = bassPitchClassForChordSymbol(previousChord);
  const curPc = bassPitchClassForChordSymbol(currentChord);
  if (prevPc === undefined || curPc === undefined) return;
  const step = (curPc - prevPc + 12) % 12;
  if (step === 1 || step === 11) {
    acc.chromaticBassTransitions++;
  }
}

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function melodySurfaceAllowsDimPass(seed: number, bar: number): boolean {
  let s = (seed ^ bar * 1103515245 ^ 77101 * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff < 0.72;
}

export interface BrianWilsonPetSoundsDeviceReceipts {
  deviceReceipts: string[];
}

export interface BrianWilsonHarmonicDeviceState {
  /** Bar indices (1-based) already forced to Pet Sounds modal-mixture i7. */
  modalMixtureBar3Fired: Set<number>;
}

export function createBrianWilsonHarmonicDeviceState(): BrianWilsonHarmonicDeviceState {
  return { modalMixtureBar3Fired: new Set() };
}

/** Letter / named sections → coarse roles for Pet Sounds devices. */
export function coarseSectionRoleFromBar(bar: number, context: CompositionContext): 'verse' | 'chorus' | 'bridge' | 'other' {
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  const label = sec?.label ?? 'A';
  const L = label.trim().toLowerCase();
  if (L.startsWith('verse')) return 'verse';
  if (L.startsWith('chorus')) return 'chorus';
  if (L.startsWith('bridge')) return 'bridge';
  const u = label.trim().toUpperCase();
  if (u === 'A' || /^A_\d+$/i.test(label.trim())) return 'verse';
  if (u === 'B' || /^B_\d+$/i.test(label.trim())) return 'chorus';
  if (u === 'C' || /^C_\d+$/i.test(label.trim())) return 'bridge';
  return 'other';
}

function isVerseLikeSectionRole(role: 'verse' | 'chorus' | 'bridge' | 'other'): boolean {
  return role === 'verse';
}

function formSectionMetaAtBar(
  bar: number,
  context: CompositionContext
): { label: string; startBar: number } | undefined {
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  if (!sec) return undefined;
  return { label: sec.label, startBar: sec.startBar };
}

function isSectionBoundaryBar(bar: number, context: CompositionContext): boolean {
  if (bar <= 1) return false;
  const cur = formSectionMetaAtBar(bar, context);
  const prev = formSectionMetaAtBar(bar - 1, context);
  if (!cur || !prev) return false;
  return cur.startBar === bar && (cur.label !== prev.label || cur.startBar !== prev.startBar);
}

function isVerseToPeakTransition(bar: number, context: CompositionContext): boolean {
  if (!isSectionBoundaryBar(bar, context)) return false;
  const prevRole = coarseSectionRoleFromBar(bar - 1, context);
  const curRole = coarseSectionRoleFromBar(bar, context);
  const fromVerse = prevRole === 'verse';
  const toPeak = curRole === 'chorus' || curRole === 'bridge';
  return fromVerse && toPeak;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function harmonyLooksMinorOrHalfDim(symbol: string): boolean {
  const h = parseChordSymbol(symbol).harmonyPart;
  const t = h.toLowerCase();
  if (/maj7|maj9|maj6|Δ|ma7|add|sus/.test(t)) return false;
  if (/^([a-g][#b]?)m(?!aj)/i.test(h) || /\bm(in)?(7|9|11|13)\b/i.test(t)) return true;
  if (/ø|m7b5|half-dim|dim/.test(t)) return true;
  return false;
}

export function inferTonicPitchClassFromBar1(context: CompositionContext): number | undefined {
  const tb = context.form.totalBars;
  if (tb < 1) return undefined;
  return harmonyRootPc(resolveBarSymbol(context, 1).symbol);
}

/** Brian Wilson Pet Sounds harmonic grammar BW_HARM_01–10 — receipt prefix **`bw:harmNN_*`**. */
export const brianWilsonHarmonicGrammarTags = {
  harm01_slash_third_fifth_bass: 'bw:harm01_slash_third_or_fifth_bass',
  harm02_half_dim_ubiquity: 'bw:harm02_half_diminished_ubiquity',
  harm03_aug_dominant: 'bw:harm03_augmented_dominant_tension',
  harm04_chromatic_bass_descent: 'bw:harm04_chromatic_bass_descent_engine',
  harm05_iio_V7b9_i: 'bw:harm05_iio_V7b9_minor_i_pop',
  harm06_nondiatonic_opening: 'bw:harm06_non_diatonic_first_chord',
  harm07_borrowed_circle_sub: 'bw:harm07_relative_minor_substitution_chain',
  harm08_bvii7_to_I: 'bw:harm08_bvii7_to_I_resolution',
  harm09_ballad_density_gate: 'bw:harm09_ballad_dense_vs_uptempo_simple',
  harm10_bridge_mod_chromatic: 'bw:harm10_bridge_modulation_chromatic',
} as const;

/** Brian Wilson voice-leading / texture grammar BW_VL_01–06 — **`bw:vlNN_*`**. */
export const brianWilsonVoiceLeadingGrammarTags = {
  vl01_thirds_to_clusters: 'bw:vl01_vocal_harmony_thirds_to_clusters',
  vl02_chromatic_inner_descent: 'bw:vl02_chromatic_inner_voice_descent_half_dim',
  vl03_bass_chord_tones: 'bw:vl03_bass_avoids_root_chord_tone_motion',
  vl04_pedal_upper_motion: 'bw:vl04_sustained_pedal_moving_upper_voices',
  vl05_tic_tac_double_bass: 'bw:vl05_tic_tac_bass_doubling_staging',
  vl06_choral_instrument_blend: 'bw:vl06_voices_instruments_choral_layers',
} as const;

/** Brian Wilson melodic grammar BW_MEL_01–05 — **`bw:melNN_*`**. */
export const brianWilsonMelodicGrammarTags = {
  mel01_fragmented_verse: 'bw:mel01_fragmented_verse_rests_structural',
  mel02_verse_up_chorus_down: 'bw:mel02_verse_ascend_chorus_descend_sigh',
  mel03_nct_emotional_peak: 'bw:mel03_appoggiatura_emotional_peak_over_colour',
  mel04_lead_straight: 'bw:mel04_lead_straight_selective_swells',
  mel05_bg_chromatic_stacks: 'bw:mel05_background_chromatic_stack_layers',
} as const;

/** Brian Wilson rhythm grammar BW_RHYTHM_01–04 — **`bw:rhythmNN_*`**. */
export const brianWilsonRhythmGrammarTags = {
  rhythm01_uptempo_walking_syncopated_bass: 'bw:rhythm01_uptempo_walking_swing_syncopation',
  rhythm02_ballad_sustained_fragmented: 'bw:rhythm02_ballad_sustain_fragment_ensemble_ritard',
  rhythm03_harm_rhythm_expressive: 'bw:rhythm03_harmonic_rhythm_mirrors_emotion',
  rhythm04_collective_ritard_markers: 'bw:rhythm04_structural_collective_ritard_hint',
} as const;

/** Brian Wilson orchestration grammar BW_ORCH_01–05 — **`bw:orchNN_*`**. */
export const brianWilsonOrchestrationGrammarTags = {
  orch01_unconventional_timbral_colour: 'bw:orch01_structural_nonstandard_timbral_layers',
  orch02_horn_strings_hammond_keyboard_split: 'bw:orch02_core_colour_register_split',
  orch03_wall_layered_doubling: 'bw:orch03_wall_layer_sparse_double_lead_primary',
  orch04_modular_section_splicing: 'bw:orch04_modular_tracking_through_compose',
  orch05_wrecking_crew_precision_section: 'bw:orch05_session_precision_rhythm_section',
} as const;

/** Brian Wilson composite fingerprints BW_FP_01–03 — **`bw:fpNN_*`** (parallel bundle alignment). */
export const brianWilsonFingerprintTags = {
  fp01_full_harmonic: 'bw:fp01_full_wilson_harmonic_fingerprint',
  fp02_full_melodic_emotional: 'bw:fp02_full_wilson_melodic_emotional_fingerprint',
  fp03_full_studio: 'bw:fp03_full_wilson_studio_fingerprint',
} as const;

function bwGrammarHas(rs: readonly string[], idFragment: string): boolean {
  return rs.some((r) => r.includes(idFragment));
}

/**
 * BW_FP_01–03 — full fingerprints when required parallel grammar rows co-occur (harmonic / melodic / studio stacks).
 */
export function applyBrianWilsonFingerprintReceipts(
  harmonicGrammarReceipts: readonly string[],
  melodicGrammarReceipts: readonly string[],
  rhythmGrammarReceipts: readonly string[],
  orchGrammarReceipts: readonly string[],
  vlGrammarReceipts: readonly string[]
): string[] {
  const out: string[] = [];

  if (
    bwGrammarHas(harmonicGrammarReceipts, 'harm01') &&
    bwGrammarHas(harmonicGrammarReceipts, 'harm02') &&
    bwGrammarHas(harmonicGrammarReceipts, 'harm03') &&
    bwGrammarHas(harmonicGrammarReceipts, 'harm04')
  ) {
    out.push(brianWilsonFingerprintTags.fp01_full_harmonic);
  }

  if (
    bwGrammarHas(melodicGrammarReceipts, 'mel01') &&
    bwGrammarHas(melodicGrammarReceipts, 'mel02') &&
    bwGrammarHas(melodicGrammarReceipts, 'mel03') &&
    bwGrammarHas(melodicGrammarReceipts, 'mel04') &&
    bwGrammarHas(melodicGrammarReceipts, 'mel05')
  ) {
    out.push(brianWilsonFingerprintTags.fp02_full_melodic_emotional);
  }

  if (
    bwGrammarHas(orchGrammarReceipts, 'orch01') &&
    bwGrammarHas(orchGrammarReceipts, 'orch03') &&
    bwGrammarHas(orchGrammarReceipts, 'orch04') &&
    bwGrammarHas(vlGrammarReceipts, 'vl05') &&
    bwGrammarHas(rhythmGrammarReceipts, 'rhythm04')
  ) {
    out.push(brianWilsonFingerprintTags.fp03_full_studio);
  }

  return out;
}

function isSongModeFamilyPreset(presetId: string): boolean {
  return presetId === 'song_mode' || presetId.startsWith('song_mode_');
}

type WilsonHarmAnalysis = {
  rootPc: number;
  bassPc: number;
  degreePc: number;
  hp: string;
  hasSlash: boolean;
  bassNotChordRoot: boolean;
  bassThirdOrFifth: boolean;
  hasHalfDim: boolean;
  hasAugDominant: boolean;
  hasDom7b9: boolean;
  hasMinorSeventh: boolean;
  isMinorTonicColour: boolean;
};

function analyzeWilsonHarmonySymbol(symbol: string, tonicPc: number): WilsonHarmAnalysis | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart.trim();
  if (!hp || /^tonic_wash$/i.test(hp)) return undefined;
  const rootPc = harmonyRootPc(symbol);
  if (rootPc === undefined) return undefined;
  const bassPc = bassPitchClassForChordSymbol(symbol) ?? rootPc;
  const degreePc = (rootPc - tonicPc + 12) % 12;
  const tl = hp.toLowerCase();
  const compact = hp.replace(/\s/g, '');
  const hasSlash = symbol.includes('/');
  const bassNotChordRoot = hasSlash && bassPc !== rootPc;
  const bassIv = (bassPc - rootPc + 12) % 12;
  const bassThirdOrFifth = bassNotChordRoot && (bassIv === 3 || bassIv === 4 || bassIv === 7);
  const hasHalfDim =
    /ø|m7b5|half-dim|halfdim/i.test(compact) || (/m7b5/i.test(tl) && !/maj/i.test(tl));
  const hasAugDominant =
    (degreePc === 7 || degreePc === 2) &&
    (/aug|\+|7\+|\+7|7\(.*\+|7aug/i.test(compact) || /aug|\+/.test(tl)) &&
    (/7|9|11|13|b9|#9/i.test(compact) || /\b7\b/i.test(tl));
  const hasDom7b9 =
    (degreePc === 7 || degreePc === 2) && (/b9|♭9|-9|7b9/i.test(compact) || /7alt/i.test(tl));
  const hasMinorSeventh = /\bm7\b|-7\b|min7/i.test(tl) || /^[a-g][#b]?-7/i.test(compact);
  const isMinorTonicColour =
    degreePc === 0 && (/^m(?!aj)|min/i.test(tl) || (/m7/i.test(tl) && !/maj/i.test(tl)));

  return {
    rootPc,
    bassPc,
    degreePc,
    hp,
    hasSlash,
    bassNotChordRoot,
    bassThirdOrFifth,
    hasHalfDim,
    hasAugDominant,
    hasDom7b9,
    hasMinorSeventh,
    isMinorTonicColour,
  };
}

function diatonicMajorDegreeSet(): Set<number> {
  return new Set([0, 2, 4, 5, 7, 9, 11]);
}

/**
 * BW_HARM_01–10 — scan effective harmony bars for Pet Sounds-era grammar receipts.
 */
export function applyBrianWilsonHarmonicGrammarReceipts(
  context: CompositionContext,
  bars: readonly string[],
  tonicPcIn: number | undefined
): string[] {
  const tonicPc = tonicPcIn ?? inferTonicPitchClassFromBar1(context);
  if (tonicPc === undefined) return [];

  const receipts: string[] = [];
  const n = bars.length;
  const analyses: Array<WilsonHarmAnalysis | undefined> = bars.map((b) =>
    analyzeWilsonHarmonySymbol(b, tonicPc)
  );

  // BW_HARM_01 — slash bass deferring root; 3rd / 5th in bass (Carol Kaye lineage).
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a?.bassThirdOrFifth) continue;
    receipts.push(`${brianWilsonHarmonicGrammarTags.harm01_slash_third_fifth_bass}@bar${i + 1}`);
    break;
  }

  // BW_HARM_02 — half-diminished colour as vocabulary, not exotic.
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a?.hasHalfDim) continue;
    receipts.push(`${brianWilsonHarmonicGrammarTags.harm02_half_dim_ubiquity}@bar${i + 1}`);
    break;
  }

  // BW_HARM_03 — augmented dominant colour (not tonic aug).
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a?.hasAugDominant) continue;
    receipts.push(`${brianWilsonHarmonicGrammarTags.harm03_aug_dominant}@bar${i + 1}`);
    break;
  }

  // BW_HARM_04 — chromatic descending bass line (≥3 semitone-down steps).
  let descRun = 0;
  for (let i = 1; i < n; i++) {
    const b0 = analyses[i - 1]?.bassPc;
    const b1 = analyses[i]?.bassPc;
    if (b0 === undefined || b1 === undefined) continue;
    const step = (b0 - b1 + 12) % 12;
    if (step === 1) {
      descRun++;
      if (descRun >= 2) {
        receipts.push(`${brianWilsonHarmonicGrammarTags.harm04_chromatic_bass_descent}@bar${i + 1}`);
        break;
      }
    } else {
      descRun = 0;
    }
  }

  // BW_HARM_05 — iiø → V7b9 → i(minor) window.
  for (let i = 0; i <= n - 3; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    const a2 = analyses[i + 2];
    if (!a0 || !a1 || !a2) continue;
    if (a0.degreePc !== 2 || !a0.hasHalfDim) continue;
    if (a1.degreePc !== 7) continue;
    if (!a1.hasDom7b9 && !a1.hasAugDominant) continue;
    if (!a2.isMinorTonicColour) continue;
    receipts.push(`${brianWilsonHarmonicGrammarTags.harm05_iio_V7b9_i}@bar${i + 1}`);
    break;
  }

  // BW_HARM_06 — opening chord off tonic centre (non-diatonic root or slash surprise).
  const a0 = analyses[0];
  if (a0) {
    const dia = diatonicMajorDegreeSet();
    const rootOff =
      !dia.has(a0.degreePc) ||
      (a0.hasSlash && a0.bassNotChordRoot && !dia.has((a0.bassPc - tonicPc + 12) % 12));
    if (rootOff) {
      receipts.push(brianWilsonHarmonicGrammarTags.harm06_nondiatonic_opening);
    }
  }

  // BW_HARM_07 — borrowed minor-seventh substitution colour (iii / vi proxy chain).
  let subChain = 0;
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a) continue;
    if ((a.degreePc === 4 || a.degreePc === 9) && a.hasMinorSeventh) {
      subChain++;
      if (subChain >= 2) {
        receipts.push(brianWilsonHarmonicGrammarTags.harm07_borrowed_circle_sub);
        break;
      }
    }
  }

  // BW_HARM_08 — ♭VII7 → I (major) colour move.
  for (let i = 0; i < n - 1; i++) {
    const u = analyses[i];
    const v = analyses[i + 1];
    if (!u || !v) continue;
    if (u.degreePc !== 10 || !u.hasMinorSeventh) continue;
    if (v.degreePc !== 0 || v.isMinorTonicColour) continue;
    receipts.push(`${brianWilsonHarmonicGrammarTags.harm08_bvii7_to_I}@bar${i + 1}`);
    break;
  }

  // BW_HARM_09 — ballad vs uptempo harmonic density hint (`harmonyDensityBias` when present).
  const bias = context.generationMetadata.harmonyDensityBias;
  if (typeof bias === 'number') {
    if (bias >= 0.52) {
      receipts.push(`${brianWilsonHarmonicGrammarTags.harm09_ballad_density_gate}@ballad_dense`);
    } else if (bias <= 0.38) {
      receipts.push(`${brianWilsonHarmonicGrammarTags.harm09_ballad_density_gate}@uptempo_selective`);
    }
  }

  // BW_HARM_10 — bridge modulation / chromatic return hints.
  const hints = context.generationMetadata.brianWilsonSectionModulationHints ?? [];
  const bridgeBars = new Set<number>();
  for (const sec of context.form.sections) {
    if (/\bbridge\b/i.test(sec.label)) {
      for (let b = sec.startBar; b < sec.startBar + sec.length; b++) bridgeBars.add(b);
    }
  }
  let chromInBridge = false;
  for (let i = 1; i < n; i++) {
    if (!bridgeBars.has(i + 1)) continue;
    const b0 = analyses[i - 1]?.bassPc;
    const b1 = analyses[i]?.bassPc;
    if (b0 === undefined || b1 === undefined) continue;
    const step = (b0 - b1 + 12) % 12;
    if (step === 1 || step === 11) {
      chromInBridge = true;
      break;
    }
  }
  if (hints.length > 0 || chromInBridge) {
    receipts.push(brianWilsonHarmonicGrammarTags.harm10_bridge_mod_chromatic);
  }

  return receipts;
}

/**
 * BW_VL_01–06 — Pet Sounds voice-leading / ensemble texture receipts (vocal spelling, bass motion, pedal, doubling).
 */
export function applyBrianWilsonVoiceLeadingGrammarReceipts(
  context: CompositionContext,
  bars: readonly string[],
  tonicPcIn: number | undefined
): string[] {
  const tonicPc = tonicPcIn ?? inferTonicPitchClassFromBar1(context);
  if (tonicPc === undefined) return [];

  const receipts: string[] = [];
  const n = bars.length;
  const analyses: Array<WilsonHarmAnalysis | undefined> = bars.map((b) =>
    analyzeWilsonHarmonySymbol(b, tonicPc)
  );

  receipts.push(brianWilsonVoiceLeadingGrammarTags.vl01_thirds_to_clusters);

  for (let i = 1; i < n; i++) {
    const prevB = analyses[i - 1]?.bassPc;
    const curB = analyses[i]?.bassPc;
    if (prevB === undefined || curB === undefined) continue;
    const descStep = (prevB - curB + 12) % 12 === 1;
    const hdNear = analyses[i]?.hasHalfDim || analyses[i - 1]?.hasHalfDim;
    if (descStep && hdNear) {
      receipts.push(`${brianWilsonVoiceLeadingGrammarTags.vl02_chromatic_inner_descent}@bar${i + 1}`);
      break;
    }
  }

  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a?.bassNotChordRoot) continue;
    receipts.push(`${brianWilsonVoiceLeadingGrammarTags.vl03_bass_chord_tones}@bar${i + 1}`);
    break;
  }

  let p = 0;
  while (p < n) {
    const bassAnchor = analyses[p]?.bassPc;
    if (bassAnchor === undefined) {
      p++;
      continue;
    }
    let q = p;
    while (q < n && analyses[q]?.bassPc === bassAnchor) q++;
    const span = q - p;
    if (span >= 2) {
      const roots = new Set<number>();
      for (let k = p; k < q; k++) {
        const r = analyses[k]?.rootPc;
        if (r !== undefined) roots.add(r);
      }
      if (roots.size >= 2) {
        receipts.push(`${brianWilsonVoiceLeadingGrammarTags.vl04_pedal_upper_motion}@bar${p + 1}`);
        break;
      }
    }
    p = q > p ? q : p + 1;
  }

  if (isGuitarBassDuoFamily(context.presetId)) {
    receipts.push(brianWilsonVoiceLeadingGrammarTags.vl05_tic_tac_double_bass);
  }

  if (isSongModeFamilyPreset(context.presetId) || context.form.totalBars >= 16) {
    receipts.push(brianWilsonVoiceLeadingGrammarTags.vl06_choral_instrument_blend);
  }

  return receipts;
}

function bwFormHasVerseAndChorusSurfaces(context: CompositionContext): boolean {
  let verseish = false;
  let chorusish = false;
  for (const sec of context.form.sections) {
    const role = coarseSectionRoleFromBar(sec.startBar, context);
    if (role === 'verse') verseish = true;
    if (role === 'chorus') chorusish = true;
  }
  return verseish && chorusish;
}

/**
 * BW_MEL_01–05 — Pet Sounds melodic planning receipts (`planMelodyBehaviour` + form / harmonic proxies).
 */
export function applyBrianWilsonMelodicGrammarReceipts(
  context: CompositionContext,
  harmonicGrammarReceipts: readonly string[],
  vlGrammarReceipts: readonly string[]
): string[] {
  const plan = planMelodyBehaviour(context.seed, 'brian_wilson');
  const receipts: string[] = [];

  if (plan.phraseAsymmetryTendency >= 0.55) {
    receipts.push(brianWilsonMelodicGrammarTags.mel01_fragmented_verse);
  }

  if (plan.contourProfile === 'arch' && bwFormHasVerseAndChorusSurfaces(context)) {
    receipts.push(brianWilsonMelodicGrammarTags.mel02_verse_up_chorus_down);
  }

  const harmColour =
    harmonicGrammarReceipts.some((r) => r.includes('harm02')) ||
    harmonicGrammarReceipts.some((r) => r.includes('harm03'));
  if (plan.devices.includes('appoggiatura') || harmColour) {
    receipts.push(brianWilsonMelodicGrammarTags.mel03_nct_emotional_peak);
  }

  if (plan.intervalTendency === 'stepwise') {
    receipts.push(brianWilsonMelodicGrammarTags.mel04_lead_straight);
  }

  const layeredBg =
    vlGrammarReceipts.some((r) => r.includes('vl06')) ||
    (plan.devices.includes('sequential_expansion') && plan.devices.includes('suspension'));
  if (layeredBg) {
    receipts.push(brianWilsonMelodicGrammarTags.mel05_bg_chromatic_stacks);
  }

  return receipts;
}

function wilsonHarmonicRootDiversityRatio(bars: readonly string[]): number {
  const roots = new Set<number>();
  for (const sym of bars) {
    const r = harmonyRootPc(sym);
    if (r !== undefined) roots.add(r);
  }
  return bars.length ? roots.size / bars.length : 0;
}

function wilsonMaxSameChordRootRun(bars: readonly string[]): number {
  if (bars.length === 0) return 0;
  let max = 1;
  let run = 1;
  let prev = harmonyRootPc(bars[0]!);
  for (let i = 1; i < bars.length; i++) {
    const cur = harmonyRootPc(bars[i]!);
    if (prev !== undefined && cur !== undefined && cur === prev) {
      run++;
      if (run > max) max = run;
    } else {
      run = 1;
    }
    prev = cur;
  }
  return max;
}

function collectBrianWilsonStructuralRitardHints(context: CompositionContext): number[] {
  const tb = context.form.totalBars;
  if (tb < 16) return [];
  const hints: number[] = [];
  for (let b = 2; b <= tb; b++) {
    if (!isSectionBoundaryBar(b, context)) continue;
    const prev = coarseSectionRoleFromBar(b - 1, context);
    const cur = coarseSectionRoleFromBar(b, context);
    if ((prev === 'verse' && cur === 'chorus') || (prev === 'chorus' && cur === 'bridge')) {
      hints.push(b);
    }
  }
  return hints.slice(0, 8);
}

export type BrianWilsonRhythmGrammarResult = {
  receipts: string[];
  /** Optional booth-style collective ritard cue bars (section pivots); not exported to MusicXML by default. */
  structuralRitardHints?: number[];
};

/**
 * BW_RHYTHM_01–04 — uptempo walking/swing bass posture; ballad sustain + fragmentation; expressive harmonic rhythm; structural ritard hints.
 */
export function applyBrianWilsonRhythmGrammarReceipts(
  context: CompositionContext,
  effectiveBars: readonly string[],
  harmonicGrammarReceipts: readonly string[],
  vlGrammarReceipts: readonly string[],
  melodicGrammarReceipts: readonly string[]
): BrianWilsonRhythmGrammarResult {
  const receipts: string[] = [];
  const bias = context.generationMetadata.harmonyDensityBias;
  const feel = context.feel;

  const uptempoSelective =
    harmonicGrammarReceipts.some((r) => r.includes('@uptempo_selective')) ||
    bias === undefined ||
    (typeof bias === 'number' && bias <= 0.48);
  if (
    feel.mode === 'swing' &&
    uptempoSelective &&
    isGuitarBassDuoFamily(context.presetId) &&
    feel.syncopationDensity !== 'low'
  ) {
    receipts.push(brianWilsonRhythmGrammarTags.rhythm01_uptempo_walking_syncopated_bass);
  }

  const balladDense =
    (typeof bias === 'number' && bias >= 0.52) ||
    harmonicGrammarReceipts.some((r) => r.includes('@ballad_dense'));
  const plan = planMelodyBehaviour(context.seed, 'brian_wilson');
  const fragmentedCue =
    melodicGrammarReceipts.some((r) => r.includes('mel01')) ||
    plan.phraseAsymmetryTendency >= 0.55 ||
    plan.rhythmicSubdivision === 'whole_bar';
  if (balladDense && fragmentedCue) {
    receipts.push(brianWilsonRhythmGrammarTags.rhythm02_ballad_sustained_fragmented);
  }

  const div = wilsonHarmonicRootDiversityRatio(effectiveBars);
  const maxRootRun = wilsonMaxSameChordRootRun(effectiveBars);
  const wanderingProxy =
    harmonicGrammarReceipts.some((r) => /harm04|harm06|harm07/i.test(r)) || div >= 0.19;
  const stableProxy =
    harmonicGrammarReceipts.some((r) => r.includes('harm08')) ||
    vlGrammarReceipts.some((r) => r.includes('vl04')) ||
    maxRootRun >= 2;
  if (wanderingProxy && stableProxy) {
    receipts.push(brianWilsonRhythmGrammarTags.rhythm03_harm_rhythm_expressive);
  }

  const ritardHints = collectBrianWilsonStructuralRitardHints(context);
  if (ritardHints.length > 0) {
    receipts.push(
      `${brianWilsonRhythmGrammarTags.rhythm04_collective_ritard_markers}@bars=${ritardHints.join(',')}`
    );
  }

  return {
    receipts,
    structuralRitardHints: ritardHints.length ? ritardHints : undefined,
  };
}

export type BrianWilsonOrchGrammarResult = {
  receipts: string[];
  /**
   * Formal generator hint: section-wise assembly / splices (modular tracking posture).
   * Does not change export alone — signals Pet Sounds studio compound-form workflow.
   */
  formalThroughComposeAssembly?: boolean;
};

/**
 * BW_ORCH_01–05 — Pet Sounds studio orchestration receipts (timbral layers, colour cores, Wrecking Crew rhythm stack).
 */
export function applyBrianWilsonOrchestrationGrammarReceipts(
  context: CompositionContext,
  harmonicGrammarReceipts: readonly string[],
  rhythmGrammarReceipts: readonly string[],
  vlGrammarReceipts: readonly string[],
  melodicGrammarReceipts: readonly string[],
  sectionModulationHints: readonly { atBar: number }[]
): BrianWilsonOrchGrammarResult {
  const receipts: string[] = [];
  const tb = context.form.totalBars;
  const meta = context.generationMetadata;

  const colourStack =
    melodicGrammarReceipts.some((r) => r.includes('mel05')) ||
    (harmonicGrammarReceipts.some((r) => /harm02|harm03|harm06/i.test(r)) &&
      vlGrammarReceipts.some((r) => r.includes('vl06')));
  if (colourStack) {
    receipts.push(brianWilsonOrchestrationGrammarTags.orch01_unconventional_timbral_colour);
  }

  if (
    vlGrammarReceipts.some((r) => r.includes('vl01')) &&
    vlGrammarReceipts.some((r) => r.includes('vl06')) &&
    (isSongModeFamilyPreset(context.presetId) || tb >= 16 || meta.songModeHookFirstIdentity === true)
  ) {
    receipts.push(brianWilsonOrchestrationGrammarTags.orch02_horn_strings_hammond_keyboard_split);
  }

  if (
    melodicGrammarReceipts.some((r) => r.includes('mel05')) &&
    vlGrammarReceipts.some((r) => r.includes('vl06')) &&
    (melodicGrammarReceipts.some((r) => r.includes('mel04')) || rhythmGrammarReceipts.some((r) => r.includes('rhythm03')))
  ) {
    receipts.push(brianWilsonOrchestrationGrammarTags.orch03_wall_layered_doubling);
  }

  const modularProxy =
    sectionModulationHints.length > 0 ||
    context.form.sections.length >= 3 ||
    (meta.macroFormPlan?.sections.length ?? 0) >= 3;
  let formalThroughComposeAssembly: boolean | undefined;
  if (modularProxy && tb >= 8) {
    receipts.push(brianWilsonOrchestrationGrammarTags.orch04_modular_section_splicing);
    formalThroughComposeAssembly = true;
  }

  if (
    isGuitarBassDuoFamily(context.presetId) &&
    rhythmGrammarReceipts.some((r) => r.includes('rhythm01')) &&
    vlGrammarReceipts.some((r) => r.includes('vl05'))
  ) {
    receipts.push(brianWilsonOrchestrationGrammarTags.orch05_wrecking_crew_precision_section);
  }

  return {
    receipts,
    formalThroughComposeAssembly,
  };
}

/** Device 1 — Chromatic ascending bass: insert ø7 over the raised bass step. */
export function bwDevice1ChromaticBassHalfDim7(params: {
  bar: number;
  prevChord: string | undefined;
  chord: string;
  seed: number;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, prevChord, chord, seed, receipts } = params;
  if (!prevChord?.trim()) return chord;
  const prevPc = bassPitchClassForChordSymbol(prevChord);
  const curPc = bassPitchClassForChordSymbol(chord);
  if (prevPc === undefined || curPc === undefined) return chord;
  const up = (curPc - prevPc + 12) % 12;
  if (up !== 1) return chord;
  if (!melodySurfaceAllowsDimPass(seed, bar)) return chord;
  const bassName = pitchClassToSharpName(curPc);
  const next = `${bassName}m7b5`;
  if (normalizeToken(chord) === normalizeToken(next)) return chord;
  receipts.deviceReceipts.push(`bw:device1:chromatic_bass_dim7@bar${bar}`);
  return next;
}

function normalizeToken(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** Device 2 — Inverted dominant: avoid root-position V; use V/3 or V/5. */
export function bwDevice2InvertedDominant(params: {
  bar: number;
  chord: string;
  nextChord: string | undefined;
  tonicPc: number | undefined;
  seed: number;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, chord, nextChord, tonicPc, seed, receipts } = params;
  if (tonicPc === undefined) return chord;
  const p = parseChordSymbol(chord);
  if (p.slashBassPc !== undefined) return chord;
  const h = p.harmonyPart.trim();
  const rm = h.match(ROOT_AT_START);
  if (!rm?.[1]) return chord;
  const rootPc = noteNameToPitchClass(rm[1]);
  if (rootPc === undefined) return chord;
  const vPc = (tonicPc + 7) % 12;
  if (rootPc !== vPc) return chord;
  const rest = h.slice(rm[1].length).toLowerCase();
  if (/^m(?!aj)/.test(rest) || /dim|ø|m7b5/.test(rest)) return chord;

  let landCadence = false;
  if (nextChord?.trim()) {
    const nextRoot = harmonyRootPc(nextChord);
    if (nextRoot === tonicPc && !harmonyLooksMinorOrHalfDim(nextChord)) landCadence = true;
  }
  if (!landCadence && seededUnit(seed, bar, 88401) > 0.55) return chord;

  const thirdPc = (rootPc + 4) % 12;
  const fifthPcFromRoot = (rootPc + 7) % 12;
  const bassPc = seededUnit(seed, bar, 88402) < 0.5 ? thirdPc : fifthPcFromRoot;
  const slash = pitchClassToSharpName(bassPc);
  const out = `${h}/${slash}`;
  receipts.deviceReceipts.push(`bw:device2:inverted_v@bar${bar}`);
  return out;
}

/** Device 3 — bVII as primary subdominant in verse-like sections: IV major → ♭VII major. */
export function bwDevice3FlatSevenSubdominant(params: {
  bar: number;
  sectionRole: ReturnType<typeof coarseSectionRoleFromBar>;
  chord: string;
  tonicPc: number | undefined;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, sectionRole, chord, tonicPc, receipts } = params;
  if (!isVerseLikeSectionRole(sectionRole) || tonicPc === undefined) return chord;
  const p = parseChordSymbol(chord);
  if (p.slashBassPc !== undefined) return chord;
  const rootPc = harmonyRootPc(chord);
  if (rootPc === undefined) return chord;
  const ivPc = (tonicPc + 5) % 12;
  if (rootPc !== ivPc) return chord;
  if (harmonyLooksMinorOrHalfDim(chord)) return chord;
  const bViiPc = (tonicPc + 10) % 12;
  const name = pitchClassToSharpName(bViiPc);
  const out = `${name}maj7`;
  receipts.deviceReceipts.push(`bw:device3:bvii_subdominant@bar${bar}`);
  return out;
}

/** Device 4 — Two bars tonic major → next bar i7 (modal mixture). */
export function bwDevice4TonicMinorSevenMixture(params: {
  bar: number;
  rawChordThisBar: string;
  rawChordTwoBack: string | undefined;
  rawChordOneBack: string | undefined;
  tonicPc: number | undefined;
  state: BrianWilsonHarmonicDeviceState;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, rawChordThisBar, rawChordTwoBack, rawChordOneBack, tonicPc, state, receipts } = params;
  if (tonicPc === undefined || !rawChordTwoBack?.trim() || !rawChordOneBack?.trim()) return rawChordThisBar;
  if (!isTonicMajorSymbol(rawChordTwoBack, tonicPc) || !isTonicMajorSymbol(rawChordOneBack, tonicPc)) {
    return rawChordThisBar;
  }
  if (state.modalMixtureBar3Fired.has(bar)) return rawChordThisBar;
  const tonicName = pitchClassToSharpName(tonicPc);
  const out = `${tonicName}m7`;
  state.modalMixtureBar3Fired.add(bar);
  receipts.deviceReceipts.push(`bw:device4:modal_mixture_i7@bar${bar}`);
  return out;
}

function isTonicMajorSymbol(symbol: string, tonicPc: number): boolean {
  const root = harmonyRootPc(symbol);
  if (root !== tonicPc) return false;
  return !harmonyLooksMinorOrHalfDim(symbol);
}

/** Device 5 — Semitone down at verse → chorus/bridge boundary (first bar of new section). */
export function bwDevice5SemitoneSectionModulation(params: {
  bar: number;
  context: CompositionMetadataWrite;
  chord: string;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
}): string {
  const { bar, context, chord, receipts } = params;
  if (!isVerseToPeakTransition(bar, context.compositionContext)) return chord;
  const out = transposeChordSymbolDownSemitone(chord);
  if (normalizeToken(out) === normalizeToken(chord)) return chord;
  context.appendModulationHint({
    atBar: bar,
    semitoneDelta: -1 as const,
    fromRole: 'verse',
    toRole: coarseSectionRoleFromBar(bar, context.compositionContext),
  });
  receipts.deviceReceipts.push(`bw:device5:semitone_mod_down@bar${bar}`);
  return out;
}

export interface CompositionMetadataWrite {
  compositionContext: CompositionContext;
  appendModulationHint(h: {
    atBar: number;
    semitoneDelta: -1;
    fromRole: 'verse';
    toRole: 'chorus' | 'bridge' | 'verse' | 'other';
  }): void;
}

function transposeChordSymbolDownSemitone(symbol: string): string {
  const p = parseChordSymbol(symbol);
  const h = p.harmonyPart.trim();
  const rm = h.match(ROOT_AT_START);
  if (!rm?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(rm[1]);
  if (rootPc === undefined) return symbol;
  const newPc = (rootPc + 11) % 12;
  const newRoot = pitchClassToSharpName(newPc);
  const rest = h.slice(rm[1].length);
  const harmony = `${newRoot}${rest}`;
  if (p.slashBassPc === undefined) return harmony;
  const slashName = pitchClassToSharpName((p.slashBassPc + 11) % 12);
  return `${harmony}/${slashName}`;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

/** Apply devices 1–5 in order for one bar (5 only at eligible section boundaries). */
export function applyBrianWilsonPetSoundsHarmonicDevicesForBar(params: {
  bar: number;
  context: CompositionContext;
  tonicPc: number | undefined;
  rawChord: string;
  rawPrevChord: string | undefined;
  rawNextChord: string | undefined;
  seed: number;
  state: BrianWilsonHarmonicDeviceState;
  receipts: BrianWilsonPetSoundsDeviceReceipts;
  metaWrite: CompositionMetadataWrite;
}): string {
  const {
    bar,
    context,
    tonicPc,
    rawChord,
    rawPrevChord,
    rawNextChord,
    seed,
    state,
    receipts,
    metaWrite,
  } = params;
  const sectionRole = coarseSectionRoleFromBar(bar, context);
  const rawTwoBack = bar >= 3 ? resolveBarSymbol(context, bar - 2).symbol : undefined;
  const rawOneBack = bar >= 2 ? resolveBarSymbol(context, bar - 1).symbol : undefined;

  let chord = rawChord;
  chord = bwDevice1ChromaticBassHalfDim7({ bar, prevChord: rawPrevChord, chord, seed, receipts });
  chord = bwDevice2InvertedDominant({ bar, chord, nextChord: rawNextChord, tonicPc, seed, receipts });
  chord = bwDevice3FlatSevenSubdominant({ bar, sectionRole, chord, tonicPc, receipts });
  chord = bwDevice4TonicMinorSevenMixture({
    bar,
    rawChordThisBar: chord,
    rawChordTwoBack: rawTwoBack,
    rawChordOneBack: rawOneBack,
    tonicPc,
    state,
    receipts,
  });
  chord = bwDevice5SemitoneSectionModulation({ bar, context: metaWrite, chord, receipts });
  return chord;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Pet Sounds devices untouched.
 */
function chordLooksTonicFamily(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  return false;
}

/** Piece-final tonic: maj7 (Pet Sounds vocabulary; passes finalBarTension tonic-family). */
function spellWilsonTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj7`,
    receipt: `bw:final_tonic_cadence@bar${bar}`,
  };
}

function forceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const { symbol, receipt } = spellWilsonTonicCadence(totalBars, tonicPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

function enforceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || chordLooksTonicFamily(sym)) return;
  const { symbol, receipt } = spellWilsonTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

/** Precompute full-form effective harmony when Brian Wilson + duo golden path. */
/** @deprecated — use resolveBarSymbol */
export function precomputeBrianWilsonEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const receipts: BrianWilsonPetSoundsDeviceReceipts = { deviceReceipts: [] };
  const state = createBrianWilsonHarmonicDeviceState();
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const hints: Array<{
    atBar: number;
    semitoneDelta: -1;
    fromRole: 'verse';
    toRole: 'chorus' | 'bridge' | 'verse' | 'other';
  }> = [];
  const metaWrite: CompositionMetadataWrite = {
    compositionContext: context,
    appendModulationHint(h) {
      hints.push(h);
    },
  };
  const seed = context.seed;
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const raw = resolveBarSymbol(context, b).symbol;
    const prev = b > 1 ? resolveBarSymbol(context, b - 1).symbol : undefined;
    const next = b < tb ? resolveBarSymbol(context, b + 1).symbol : undefined;
    const effective = applyBrianWilsonPetSoundsHarmonicDevicesForBar({
      bar: b,
      context,
      tonicPc,
      rawChord: raw,
      rawPrevChord: prev,
      rawNextChord: next,
      seed,
      state,
      receipts,
      metaWrite,
    });
    out.push(effective);
  }

  /* Piece-final only: force tonic-family + safety net (Wayne fBT pattern; mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts.deviceReceipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts.deviceReceipts, context);

  genMeta.brianWilsonEffectiveHarmonyBars = out;
  genMeta.brianWilsonSectionModulationHints = hints;
  genMeta.brianWilsonPetSoundsDeviceReceipts = receipts.deviceReceipts;

  const grammarReceipts = applyBrianWilsonHarmonicGrammarReceipts(context, out, tonicPc);
  genMeta.brianWilsonHarmonicGrammarReceipts = grammarReceipts.length ? grammarReceipts : undefined;
  const vlReceipts = applyBrianWilsonVoiceLeadingGrammarReceipts(context, out, tonicPc);
  genMeta.brianWilsonVoiceLeadingGrammarReceipts = vlReceipts.length ? vlReceipts : undefined;
  const melReceipts = applyBrianWilsonMelodicGrammarReceipts(context, grammarReceipts, vlReceipts);
  genMeta.brianWilsonMelodicGrammarReceipts = melReceipts.length ? melReceipts : undefined;

  const rhythmResult = applyBrianWilsonRhythmGrammarReceipts(
    context,
    out,
    grammarReceipts,
    vlReceipts,
    melReceipts
  );
  genMeta.brianWilsonRhythmGrammarReceipts = rhythmResult.receipts.length ? rhythmResult.receipts : undefined;
  genMeta.brianWilsonStructuralRitardHints = rhythmResult.structuralRitardHints;

  const orchResult = applyBrianWilsonOrchestrationGrammarReceipts(
    context,
    grammarReceipts,
    rhythmResult.receipts,
    vlReceipts,
    melReceipts,
    hints
  );
  genMeta.brianWilsonOrchestrationGrammarReceipts = orchResult.receipts.length ? orchResult.receipts : undefined;
  if (orchResult.formalThroughComposeAssembly) {
    genMeta.brianWilsonFormalThroughComposeAssembly = true;
  }

  const fpReceipts = applyBrianWilsonFingerprintReceipts(
    grammarReceipts,
    melReceipts,
    rhythmResult.receipts,
    orchResult.receipts,
    vlReceipts
  );
  genMeta.brianWilsonFingerprintReceipts = fpReceipts.length ? fpReceipts : undefined;
}

export function resolveBrianWilsonEffectiveChordForBar(
  bar: number,
  context: CompositionContext,
  genMeta: GenerationMetadata & Record<string, unknown>
): string {
  const tb = context.form.totalBars;
  const eff = genMeta.brianWilsonEffectiveHarmonyBars as string[] | undefined;
  if (eff && eff.length === tb && bar >= 1 && bar <= tb) return eff[bar - 1]!;
  return resolveBarSymbol(context, bar).symbol;
}

function clampPitch(p: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, p));
}

/**
 * Guitar voice-1 shaping: progressive upward expansion over the form, pickup entries,
 * mild arch emphasis (lift mid-phrase notes slightly).
 */
export function applyBrianWilsonGuitarBarPasses(
  m: MeasureModel,
  bar: number,
  seed: number,
  low: number,
  high: number,
  phrasePhase: number
): void {
  const expansion = Math.min(3, Math.floor((bar - 1) / 7));
  const archLift =
    phrasePhase === 3 || phrasePhase === 4 ? 1 : phrasePhase === 5 ? 2 : 0;

  const v1 = m.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);

  if (v1.length === 0) return;

  const first = v1[0];
  if (
    first &&
    Math.abs(first.startBeat) < 1e-4 &&
    seededUnit(seed, bar, 88301) < 0.34
  ) {
    first.startBeat = 0.25;
  }

  let i = 0;
  for (const e of v1) {
    let p = e.pitch;
    if (expansion > 0 && seededUnit(seed, bar, 88320 + i) < 0.48) {
      p = clampPitch(p + expansion, low, high);
    }
    if (archLift > 0 && i === Math.floor(v1.length / 2) && seededUnit(seed, bar, 88340 + i) < 0.55) {
      p = clampPitch(p + archLift, low, high);
    }
    e.pitch = p;
    i++;
  }
}

export function finalizeBrianWilsonPetSoundsMetadata(
  metadata: GenerationMetadata,
  acc: BrianWilsonHarmonyAccumulator,
  extraReceipts?: string[]
): void {
  const deviceList = [...(extraReceipts ?? []), ...(metadata.brianWilsonPetSoundsDeviceReceipts ?? [])];
  const grammarFlat = [...(metadata.brianWilsonHarmonicGrammarReceipts ?? [])];
  const vlFlat = [...(metadata.brianWilsonVoiceLeadingGrammarReceipts ?? [])];
  const melFlat = [...(metadata.brianWilsonMelodicGrammarReceipts ?? [])];
  const rhythmFlat = [...(metadata.brianWilsonRhythmGrammarReceipts ?? [])];
  const orchFlat = [...(metadata.brianWilsonOrchestrationGrammarReceipts ?? [])];
  const fpFlat = [...(metadata.brianWilsonFingerprintReceipts ?? [])];
  const d = {
    songwriterId: 'brian_wilson',
    barsConsidered: acc.barsConsidered,
    chromaticBassTransitions: acc.chromaticBassTransitions,
    halfDiminishedTouches: acc.halfDiminishedTouches,
    augmentedTouches: acc.augmentedTouches,
    diminishedSeventhTouches: acc.diminishedSeventhTouches,
    deviceReceipts: deviceList.length ? deviceList : undefined,
    harmonicGrammarReceipts: grammarFlat.length ? grammarFlat : undefined,
    voiceLeadingGrammarReceipts: vlFlat.length ? vlFlat : undefined,
    melodicGrammarReceipts: melFlat.length ? melFlat : undefined,
    rhythmGrammarReceipts: rhythmFlat.length ? rhythmFlat : undefined,
    orchestrationGrammarReceipts: orchFlat.length ? orchFlat : undefined,
    fingerprintReceipts: fpFlat.length ? fpFlat : undefined,
  } as const;
  const receipt = [
    `Brian Wilson (Pet Sounds slice): bass chromatic steps≈${acc.chromaticBassTransitions}`,
    `ø7=${acc.halfDiminishedTouches}`,
    `aug=${acc.augmentedTouches}`,
    `dim7=${acc.diminishedSeventhTouches}`,
    `bars=${acc.barsConsidered}`,
    grammarFlat.length ? `grammar=${grammarFlat.join(';')}` : '',
    vlFlat.length ? `vl=${vlFlat.join(';')}` : '',
    melFlat.length ? `mel=${melFlat.join(';')}` : '',
    rhythmFlat.length ? `rhythm=${rhythmFlat.join(';')}` : '',
    orchFlat.length ? `orch=${orchFlat.join(';')}` : '',
    fpFlat.length ? `fp=${fpFlat.join(';')}` : '',
    deviceList.length ? `devices=${deviceList.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.brianWilsonPetSoundsDiagnostics = { ...d };
  metadata.brianWilsonPetSoundsSliceReceipt = receipt;
}
