/**
 * Radiohead — OK Computer / Kid A / Amnesiac / Hail to the Thief era Song Mode / duo golden-path slice.
 * Modal Phrygian colour, borrowed harmony, delayed tonic — layered on locked harmony.
 *
 * Harmonic spec cross-ref: {@link RADIOHEAD_HARM_RULE_REGISTRY} (RH_HARM_01–RH_HARM_10).
 * Melodic spec: {@link RADIOHEAD_MEL_RULE_REGISTRY} (RH_MEL_01–RH_MEL_05) → **`melodyBehaviourPlanner`**.
 * Rhythm spec: {@link RADIOHEAD_RHYTHM_RULE_REGISTRY} (RH_RHYTHM_01–RH_RHYTHM_06).
 * Orchestration spec: {@link RADIOHEAD_ORCH_RULE_REGISTRY} (RH_ORCH_01–RH_ORCH_05).
 * Fingerprints: {@link RADIOHEAD_FP_RULE_REGISTRY} (RH_FP_01–RH_FP_03).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import {
  collectRadioheadMelodicGrammarReceipts,
  planMelodyBehaviour,
  type RadioheadMelodyPlanOptions,
} from './melodyBehaviourPlanner';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { coarseSectionRoleFromBar, inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import type { BarMeterMap } from '../rhythm/barMeterTypes';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

/** RH_HARM_06 — Paranoid Android modal verse (functional modal; no V–i target). */
export const RADIOHEAD_PARANOID_ANDROID_VERSE_PROTOTYPE = [
  'Cm',
  'Eb',
  'F',
  'Eb',
  'Gm',
  'Bb',
  'A7sus4',
] as const;

/** RH_HARM_07 — chromatic non-functional chorus chain (voice-leading only; optional pool wiring). */
export const RADIOHEAD_CHROMATIC_NONFUNCTIONAL_CHORUS_PROTOTYPE = [
  'Gm',
  'Dm9',
  'E',
  'Am',
  'G#',
  'C',
  'D',
] as const;

/** RH_HARM_* → where behaviour lives (audit / handbook). */
export const RADIOHEAD_HARM_RULE_REGISTRY: Readonly<Record<string, string>> = {
  RH_HARM_01: 'radioheadHarmonicPeriod + primarySystem; device weights by era',
  RH_HARM_02: 'minor-leaning pools + guitarModalPreference phrygian_aeolian',
  RH_HARM_03: 'device5 absent tonic / sectional centricity',
  RH_HARM_04: 'rhApplyHarm04ChromaticMediant',
  RH_HARM_05: 'sus2/sus4 preserved in rhStripAvoidListColours',
  RH_HARM_06: 'RADIOHEAD_PARANOID_ANDROID_VERSE_PROTOTYPE',
  RH_HARM_07: 'RADIOHEAD_CHROMATIC_NONFUNCTIONAL_CHORUS_PROTOTYPE',
  RH_HARM_08: 'fast ii–V–I modulation — optional future flag (Pyramid Song)',
  RH_HARM_09: 'device1 slash pedals — bass-led slash',
  RH_HARM_10: 'borrowed modal scan + device4 borrowed iv',
};

/** RH_VL_* → implementation (audit). */
export const RADIOHEAD_VL_RULE_REGISTRY: Readonly<Record<string, string>> = {
  RH_VL_01: 'voiceLeadingSolver parallel fifth/octave penalty off when bundle.voiceId===radiohead; VoiceRuleBundle.repairPolicy.resolveParallels false',
  RH_VL_02: 'rh:vl02 when chromatic_insertion or harm04 receipts',
  RH_VL_03: 'rh:vl03 when device1 phrygian slash pedal fires',
  RH_VL_04: 'VoiceRuleBundle orchestrationPolicy.fingerprintReceipts + rh:vl04 policy tag',
  RH_VL_05: 'VoiceRuleBundle fingerprint + rh:vl05 policy tag',
  RH_VL_06: 'VoiceRuleBundle bass melodic-counterline + rh:vl06 policy tag',
};

/** RH_MEL_* → implementation (`melodyBehaviourPlanner.ts` applyRadioheadMelodicEncoding). */
export const RADIOHEAD_MEL_RULE_REGISTRY: Readonly<Record<string, string>> = {
  RH_MEL_01: 'stepwise + wideLeapPeakPerPhrase + rh:mel01; diminished subset via modal/chromatic devices pool',
  RH_MEL_02: 'high repetitionVsVariationBias + rh:mel02 narrow-range obsessive centre',
  RH_MEL_03: 'rh:mel03 chromatic clash approved vs modal harmony',
  RH_MEL_04: 'rh:mel04 falsetto break at phrase boundary (manifest hook)',
  RH_MEL_05: 'radioheadMelodicContext acoustic|electronic + rhythmicSubdivision split',
};

/** RH_RHYTHM_* → implementation (receipts + era flags; meter tooling reads `barMeterMap`). */
export const RADIOHEAD_RHYTHM_RULE_REGISTRY: Readonly<Record<string, string>> = {
  RH_RHYTHM_01: 'radioheadRhythmEarlyPeriodBackbeat + suppress odd-meter options when harmonic period early',
  RH_RHYTHM_02: 'radioheadRhythmAsymmetricFeaturesEligible when middle/late; rh:rhythm02',
  RH_RHYTHM_03: 'rh:rhythm03 when barMeterMap multi-signature / non-4/4 or seeded placeholder',
  RH_RHYTHM_04: 'rh:rhythm04 guitar poly vs 4/4 drums when middle/late + seed gate',
  RH_RHYTHM_05: 'rh:rhythm05 electronic ostinato layer (melodicContext electronic or seed)',
  RH_RHYTHM_06: 'rh:rhythm06 bass offbeat interlock policy (pairs RH_VL_06)',
};

/** Pattern tags **`rh:rhythmNN_*`** — Radiohead rhythm grammar (RH_RHYTHM). */
export const radioheadRhythmGrammarTags = {
  rhythm01_backbeat: 'rh:rhythm01_standard_backbeat_early',
  rhythm02_odd_meters: 'rh:rhythm02_odd_asymmetric_meters_enabled',
  rhythm03_mutation: 'rh:rhythm03_meter_change_within_song',
  rhythm04_poly: 'rh:rhythm04_guitar_polyrhythm_vs_drums',
  rhythm05_ostinato: 'rh:rhythm05_electronic_ostinato_independent_layer',
  rhythm06_bass_sync: 'rh:rhythm06_bass_offbeat_interlock',
} as const;

function meterSignatureKey(m: { numerator: number; denominator: number }): string {
  return `${m.numerator}/${m.denominator}`;
}

export function collectRadioheadRhythmGrammarReceipts(params: {
  period: RadioheadHarmonicPeriod | undefined;
  seed: number;
  barMeterMap?: BarMeterMap;
  melodicContext?: 'acoustic' | 'electronic';
}): string[] {
  const out: string[] = [];
  const { period, seed, barMeterMap, melodicContext } = params;
  const middleLate = period === 'middle' || period === 'late';

  if (period === 'early') {
    out.push(`${radioheadRhythmGrammarTags.rhythm01_backbeat}@suppress_odd_meter_options`);
  }

  if (middleLate) {
    out.push(`${radioheadRhythmGrammarTags.rhythm02_odd_meters}@middle_or_late_period`);
    if (seededUnit(seed, 1, 66201) < 0.7) {
      out.push(`${radioheadRhythmGrammarTags.rhythm04_poly}@eligible`);
    }
  }

  if (barMeterMap && Object.keys(barMeterMap).length > 0) {
    const vals = Object.values(barMeterMap);
    const uniq = new Set(vals.map(meterSignatureKey));
    const nonFourFour = vals.some((m) => !(m.numerator === 4 && m.denominator === 4));
    if (uniq.size > 1 || nonFourFour) {
      out.push(`${radioheadRhythmGrammarTags.rhythm03_mutation}@barMeterMap`);
    }
  } else if (middleLate && seededUnit(seed, 2, 66202) < 0.28) {
    out.push(`${radioheadRhythmGrammarTags.rhythm03_mutation}@policy_placeholder`);
  }

  if (melodicContext === 'electronic') {
    out.push(`${radioheadRhythmGrammarTags.rhythm05_ostinato}@electronic_melodic_layer`);
  } else if (middleLate && seededUnit(seed, 4, 66204) < 0.38) {
    out.push(`${radioheadRhythmGrammarTags.rhythm05_ostinato}@independent_layer_option`);
  }

  out.push(`${radioheadRhythmGrammarTags.rhythm06_bass_sync}@policy`);

  return out;
}

/** RH_ORCH_* — period palette + texture options (manifest / future scorer hooks). */
export const RADIOHEAD_ORCH_RULE_REGISTRY: Readonly<Record<string, string>> = {
  RH_ORCH_01: 'radioheadOrchestrationPalette early|middle|late gates instrumentation',
  RH_ORCH_02: 'rh:orch02 col legno strings-as-percussion (Burn the Witch ref)',
  RH_ORCH_03: 'rh:orch03 electronic/acoustic structural layering',
  RH_ORCH_04: 'rh:orch04 killswitch stutter amplitude-mod climax gate',
  RH_ORCH_05: 'radioheadMicrotonalGuitarEligible + rh:orch05 microtonal optional',
};

export type RadioheadOrchestrationPalette = 'core_band' | 'core_plus_electronics' | 'strings_plus_electronics';

/** Pattern tags **`rh:orchNN_*`** — Radiohead orchestration grammar (RH_ORCH). */
export const radioheadOrchestrationGrammarTags = {
  orch01_early: 'rh:orch01_palette_core_guitar_bass_drums_keys',
  orch01_middle: 'rh:orch01_palette_core_plus_electronics_samplers',
  orch01_late: 'rh:orch01_palette_strings_orchestra_plus_electronics',
  orch02_col_legno_percussion: 'rh:orch02_strings_as_percussion_col_legno',
  orch03_layering: 'rh:orch03_electronic_acoustic_structural_layering',
  orch04_killswitch: 'rh:orch04_killswitch_guitar_stutter',
  orch05_microtonal: 'rh:orch05_microtonal_guitar_optional',
  orch_sul_ponticello: 'rh:orch_greenwood_sul_ponticello',
  orch_harmonics_climax: 'rh:orch_natural_harmonics_at_climax',
  orch_microtonal_cluster: 'rh:orch_microtonal_cluster_field',
} as const;

export function radioheadOrchestrationPaletteForPeriod(period: RadioheadHarmonicPeriod | undefined): RadioheadOrchestrationPalette {
  switch (period) {
    case 'early':
      return 'core_band';
    case 'middle':
      return 'core_plus_electronics';
    case 'late':
      return 'strings_plus_electronics';
    default:
      return 'core_band';
  }
}

export function collectRadioheadOrchestrationGrammarReceipts(params: {
  period: RadioheadHarmonicPeriod | undefined;
  seed: number;
  melodicContext?: 'acoustic' | 'electronic';
}): string[] {
  const out: string[] = [];
  const { period, seed, melodicContext } = params;
  if (period === 'early') {
    out.push(`${radioheadOrchestrationGrammarTags.orch01_early}@period_early`);
  } else if (period === 'middle') {
    out.push(`${radioheadOrchestrationGrammarTags.orch01_middle}@period_middle`);
  } else if (period === 'late') {
    out.push(`${radioheadOrchestrationGrammarTags.orch01_late}@period_late`);
  }

  if (period === 'late' || (period === 'middle' && seededUnit(seed, 3, 77301) < 0.45)) {
    out.push(`${radioheadOrchestrationGrammarTags.orch02_col_legno_percussion}@rhythmic_string_layer`);
  }

  if (melodicContext === 'electronic' || period === 'middle' || period === 'late') {
    out.push(`${radioheadOrchestrationGrammarTags.orch03_layering}@structural_contrast`);
  }

  if (seededUnit(seed, 7, 77307) < 0.35) {
    out.push(`${radioheadOrchestrationGrammarTags.orch04_killswitch}@tension_climax_window`);
  }

  const microEligible = seededUnit(seed, 9, 77309) < 0.42;
  if (microEligible) {
    out.push(`${radioheadOrchestrationGrammarTags.orch05_microtonal}@eligible`);
  }

  if (period === 'late' || (period === 'middle' && seededUnit(seed, 11, 77311) < 0.5)) {
    out.push(`${radioheadOrchestrationGrammarTags.orch_sul_ponticello}@harsh_timbre`);
  }
  if (period === 'late' && seededUnit(seed, 13, 77313) < 0.55) {
    out.push(`${radioheadOrchestrationGrammarTags.orch_harmonics_climax}@treble_texture`);
  }
  if (microEligible && period === 'late') {
    out.push(`${radioheadOrchestrationGrammarTags.orch_microtonal_cluster}@climax_field`);
  }

  return out;
}

/** RH_FP_* — composite fingerprints (Paranoid Android / Wall of Eyes / 15 Step / Burn the Witch). */
export const RADIOHEAD_FP_RULE_REGISTRY: Readonly<Record<string, string>> = {
  RH_FP_01: 'collectRadioheadHarmonicFingerprintReceipts — mediant + absent tonic + sus + modal minor',
  RH_FP_02: 'collectRadioheadRhythmicFingerprintReceipts — odd meter + meter mutation + poly + ostinato',
  RH_FP_03: 'collectRadioheadOrchestralFingerprintReceipts — col legno + sul pont + harmonics + micro cluster + Colin bass',
};

export const radioheadFingerprintTags = {
  fp01_component_mediant: 'rh:fp01_component_chromatic_mediant',
  fp01_component_absent_tonic: 'rh:fp01_component_absent_tonic_sections',
  fp01_component_sus: 'rh:fp01_component_unresolved_suspended',
  fp01_component_modal_minor: 'rh:fp01_component_modal_minor_bias',
  fp01_full: 'rh:fp01_full_harmonic_fingerprint',
  fp02_component_odd: 'rh:fp02_component_odd_meter',
  fp02_component_subvert: 'rh:fp02_component_backbeat_subversion',
  fp02_component_poly: 'rh:fp02_component_guitar_polyrhythm_vs_drums',
  fp02_component_ostinato: 'rh:fp02_component_electronic_ostinato_layer',
  fp02_full: 'rh:fp02_full_rhythmic_fingerprint',
  fp03_component_col_legno: 'rh:fp03_component_col_legno_strings_percussion',
  fp03_component_sul_pont: 'rh:fp03_component_sul_ponticello',
  fp03_component_harmonics: 'rh:fp03_component_string_harmonics_climax',
  fp03_component_micro_cluster: 'rh:fp03_component_microtonal_clusters',
  fp03_component_colin: 'rh:fp03_component_colin_bass_dual_melody_interlock',
  fp03_full: 'rh:fp03_full_orchestral_fingerprint',
} as const;

function effectiveBarsHaveUnresolvedSus(symbols: readonly string[] | undefined): boolean {
  if (!symbols?.length) return false;
  return symbols.some((s) => /\bsus[24]?\b|sus4|sus2|7sus4/i.test(s.trim()));
}

export function collectRadioheadHarmonicFingerprintReceipts(params: {
  deviceReceipts: readonly string[];
  effectiveHarmonyBars?: readonly string[];
  acc: RadioheadHarmonyAccumulator;
  primarySystem: RadioheadHarmonicPrimarySystem | undefined;
  period: RadioheadHarmonicPeriod | undefined;
}): string[] {
  const { deviceReceipts, effectiveHarmonyBars, acc, primarySystem, period } = params;
  const out: string[] = [];
  const c1 = deviceReceipts.some((r) => r.includes('harm04'));
  const c2 = deviceReceipts.some((r) => r.includes('device5:absent_tonic'));
  const c3 = effectiveBarsHaveUnresolvedSus(effectiveHarmonyBars);
  const bars = Math.max(1, acc.barsConsidered);
  const minorRate = acc.minorTriadTouches / bars;
  const c4 =
    primarySystem === 'functional_modal' ||
    primarySystem === 'contrapuntal_keyboard' ||
    minorRate >= 0.28 ||
    acc.borrowedModalTouches >= 2 ||
    period === 'middle' ||
    period === 'late';

  if (c1) out.push(radioheadFingerprintTags.fp01_component_mediant);
  if (c2) out.push(radioheadFingerprintTags.fp01_component_absent_tonic);
  if (c3) out.push(radioheadFingerprintTags.fp01_component_sus);
  if (c4) out.push(radioheadFingerprintTags.fp01_component_modal_minor);
  if (c1 && c2 && c3 && c4) out.push(radioheadFingerprintTags.fp01_full);
  return out;
}

function barMeterHasOddMeterSignature(map: BarMeterMap | undefined): boolean {
  if (!map || !Object.keys(map).length) return false;
  for (const m of Object.values(map)) {
    const { numerator: n, denominator: d } = m;
    if (n === 5 && d === 4) return true;
    if (n === 7 && (d === 8 || d === 4)) return true;
    if (n === 6 && d === 8) return true;
    if (n === 9 && d === 8) return true;
  }
  return false;
}

export function collectRadioheadRhythmicFingerprintReceipts(params: {
  rhythmGrammarReceipts: readonly string[];
  barMeterMap?: BarMeterMap;
}): string[] {
  const { rhythmGrammarReceipts, barMeterMap } = params;
  const out: string[] = [];
  const has = (sub: string) => rhythmGrammarReceipts.some((r) => r.includes(sub));
  const c1 = barMeterHasOddMeterSignature(barMeterMap) || has('rhythm02_odd');
  const c2 = has('rhythm03_mutation');
  const c3 = has('rhythm04_poly');
  const c4 = has('rhythm05_ostinato');

  if (c1) out.push(radioheadFingerprintTags.fp02_component_odd);
  if (c2) out.push(radioheadFingerprintTags.fp02_component_subvert);
  if (c3) out.push(radioheadFingerprintTags.fp02_component_poly);
  if (c4) out.push(radioheadFingerprintTags.fp02_component_ostinato);
  if (c1 && c2 && c3 && c4) out.push(radioheadFingerprintTags.fp02_full);
  return out;
}

export function collectRadioheadOrchestralFingerprintReceipts(params: {
  orchestrationGrammarReceipts: readonly string[];
  voiceLeadingGrammarReceipts: readonly string[];
}): string[] {
  const { orchestrationGrammarReceipts, voiceLeadingGrammarReceipts } = params;
  const out: string[] = [];
  const ohas = (sub: string) => orchestrationGrammarReceipts.some((r) => r.includes(sub));
  const vhas = (sub: string) => voiceLeadingGrammarReceipts.some((r) => r.includes(sub));

  const c1 = ohas('orch02_strings_as_percussion');
  const c2 = ohas('greenwood_sul_ponticello') || ohas('sul_ponticello');
  const c3 = ohas('harmonics_at_climax') || ohas('natural_harmonics');
  const c4 = ohas('microtonal_cluster');
  const c5 = vhas('vl06_colin_bass_dual_melody');

  if (c1) out.push(radioheadFingerprintTags.fp03_component_col_legno);
  if (c2) out.push(radioheadFingerprintTags.fp03_component_sul_pont);
  if (c3) out.push(radioheadFingerprintTags.fp03_component_harmonics);
  if (c4) out.push(radioheadFingerprintTags.fp03_component_micro_cluster);
  if (c5) out.push(radioheadFingerprintTags.fp03_component_colin);
  if (c1 && c2 && c3 && c4 && c5) out.push(radioheadFingerprintTags.fp03_full);
  return out;
}

/** Pattern tags **`rh:vlNN_*`** — Radiohead voice-leading / texture (RH_VL). */
export const radioheadVoiceLeadingGrammarTags = {
  vl01_parallel_motion_permitted: 'rh:vl01_parallel_motion_permitted',
  vl02_chromatic_inner_lines: 'rh:vl02_chromatic_inner_lines',
  vl03_static_pedal_upper_change: 'rh:vl03_static_pedal_upper_change',
  vl04_greenwood_extended_techniques: 'rh:vl04_greenwood_extended_techniques',
  vl05_string_register_roles: 'rh:vl05_string_register_roles',
  vl06_colin_bass_dual_melody: 'rh:vl06_colin_bass_dual_melody',
} as const;

export function collectRadioheadVoiceLeadingGrammarReceipts(deviceReceipts: readonly string[]): string[] {
  const out: string[] = [];
  out.push(`${radioheadVoiceLeadingGrammarTags.vl01_parallel_motion_permitted}@policy`);
  out.push(`${radioheadVoiceLeadingGrammarTags.vl04_greenwood_extended_techniques}@policy`);
  out.push(`${radioheadVoiceLeadingGrammarTags.vl05_string_register_roles}@policy`);
  out.push(`${radioheadVoiceLeadingGrammarTags.vl06_colin_bass_dual_melody}@policy`);
  if (deviceReceipts.some((r) => r.includes('harm04') || r.includes('chromatic_insertion'))) {
    out.push(`${radioheadVoiceLeadingGrammarTags.vl02_chromatic_inner_lines}@harmonic_chain`);
  }
  if (deviceReceipts.some((r) => r.includes('phrygian_pedal'))) {
    out.push(`${radioheadVoiceLeadingGrammarTags.vl03_static_pedal_upper_change}@slash_pedal`);
  }
  return out;
}

export type RadioheadHarmonicPeriod = 'early' | 'middle' | 'late';
export type RadioheadHarmonicPrimarySystem =
  | 'functional_tonal'
  | 'functional_modal'
  | 'contrapuntal_keyboard';

export function radioheadHarmonicPeriodFromSeed(seed: number): RadioheadHarmonicPeriod {
  const u = seededUnit(seed, 0, 77001);
  if (u < 1 / 3) return 'early';
  if (u < 2 / 3) return 'middle';
  return 'late';
}

export function radioheadHarmonicPrimarySystemForPeriod(
  period: RadioheadHarmonicPeriod
): RadioheadHarmonicPrimarySystem {
  switch (period) {
    case 'early':
      return 'functional_tonal';
    case 'middle':
      return 'functional_modal';
    case 'late':
      return 'contrapuntal_keyboard';
  }
}

function device5AbsentTonicSkipThreshold(period: RadioheadHarmonicPeriod): number {
  switch (period) {
    case 'early':
      return 0.88;
    case 'middle':
      return 0.78;
    case 'late':
      return 0.72;
  }
}

function device1PhrygianSkipThreshold(period: RadioheadHarmonicPeriod): number {
  switch (period) {
    case 'early':
      return 0.88;
    case 'middle':
      return 0.72;
    case 'late':
      return 0.62;
  }
}

function harm04MediantSkipThreshold(period: RadioheadHarmonicPeriod): number {
  switch (period) {
    case 'early':
      return 0.94;
    case 'middle':
      return 0.88;
    case 'late':
      return 0.84;
  }
}

function device3ChromaticInsertionSkipThreshold(period: RadioheadHarmonicPeriod): number {
  switch (period) {
    case 'early':
      return 0.62;
    case 'middle':
      return 0.55;
    case 'late':
      return 0.48;
  }
}

function looksLikeMajorTriadOrMaj7(symbol: string): boolean {
  const t = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(t)) return false;
  return true;
}

function looksLikeIvMajorSubdominant(symbol: string, tonicPc: number): boolean {
  const r = harmonyRootPc(symbol);
  if (r !== (tonicPc + 5) % 12) return false;
  const t = symbol.toLowerCase();
  if (/m(?!aj)|dim/.test(t)) return false;
  return true;
}

export interface RadioheadHarmonyAccumulator {
  barsConsidered: number;
  maj7Touches: number;
  minorTriadTouches: number;
  borrowedModalTouches: number;
  slashPedalTouches: number;
}

export function createRadioheadHarmonyAccumulator(): RadioheadHarmonyAccumulator {
  return {
    barsConsidered: 0,
    maj7Touches: 0,
    minorTriadTouches: 0,
    borrowedModalTouches: 0,
    slashPedalTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: RadioheadHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = c.toLowerCase();
  if (/\bmaj7\b|maj9|Δ/.test(t)) acc.maj7Touches++;
  if (/^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(c).harmonyPart) || /\bm\b/.test(t)) acc.minorTriadTouches++;
  if (/\/[a-g]/i.test(c)) acc.slashPedalTouches++;
  if (/dbmaj7|eb6|bii|biii|bvi|bvii/i.test(t) || t.includes('biii')) acc.borrowedModalTouches++;
}

export function accumulateRadioheadHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: RadioheadHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface RadioheadDeviceReceipts {
  deviceReceipts: string[];
}

/**
 * Hygiene: dominant-colour stripping — keep maj7/m7 core vocabulary.
 * RH_HARM_05: sus2/sus4 are never stripped here (suspension as destination, not prep for resolution).
 */
export function rhStripAvoidListColours(out: string[]): void {
  for (let i = 0; i < out.length; i++) {
    let s = out[i]!.trim();
    const hp = parseChordSymbol(s).harmonyPart;
    const tl = hp.toLowerCase();
    if ((/\b7\b|9|11|13|alt|°|ø/.test(tl) || /7/.test(tl)) && !/maj7|m7|mmaj7|dim7|sus/.test(tl)) {
      const r = harmonyRootPc(s);
      if (r !== undefined) {
        const base = pitchClassToSharpName(r);
        const rest = hp.replace(ROOT_AT_START, '').replace(/7|9|11|13|alt|\(.*?\)/gi, '');
        const slash = s.includes('/') ? s.slice(s.indexOf('/')) : '';
        out[i] = `${base}${rest.replace(/^[-]?7.*$/i, '')}${slash}`.replace(/([^/]+)$/, (_, m: string) =>
          m.replace(/7$/i, '')
        );
        const simp = parseChordSymbol(out[i]!).harmonyPart;
        const nm = simp.match(ROOT_AT_START);
        const rootNm = nm?.[1];
        if (rootNm) {
          const rr = noteNameToPitchClass(rootNm);
          const tail = simp.slice(rootNm.length).replace(/7$|9$|11$|13$/i, '');
          if (rr !== undefined) {
            out[i] = `${pitchClassToSharpName(rr)}${tail}${slash}`;
          }
        }
      }
    }
  }
}

/** Device 5 — Absent tonic at verse opens: withhold clear tonic triad for first four bars (modal borrow). RH_HARM_03. */
export function rhApplyDevice5AbsentTonic(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
  period: RadioheadHarmonicPeriod;
}): void {
  const { context, tonicPc, out, receipts, seed, period } = params;
  if (tonicPc === undefined) return;
  const skipThreshold = device5AbsentTonicSkipThreshold(period);
  const bar1Chord = resolveBarSymbol(context, 1).symbol;
  const keyMinor = (() => {
    const t = bar1Chord.toLowerCase();
    return /^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(bar1Chord).harmonyPart) || /\bm(in)?\b/.test(t);
  })();

  for (const sec of context.form.sections) {
    if (coarseSectionRoleFromBar(sec.startBar, context) !== 'verse') continue;
    const end = Math.min(sec.startBar + 3, out.length);
    for (let b = sec.startBar; b <= end; b++) {
      const i = b - 1;
      const raw = out[i]!;
      const r = harmonyRootPc(raw);
      if (r !== tonicPc) continue;
      if (seededUnit(seed, b, 94105) > skipThreshold) continue;
      if (keyMinor) {
        const bIII = pitchClassToSharpName((tonicPc + 3) % 12);
        out[i] = `${bIII}maj7`;
      } else {
        const vi = pitchClassToSharpName((tonicPc + 9) % 12);
        out[i] = `${vi}m`;
      }
      receipts.deviceReceipts.push(`rh:device5:absent_tonic@bar${b}`);
    }
  }
}

/** Device 1 — Phrygian pedal colours on verse, phrase beats 1–2 (b % 4 === 1 or 2). RH_HARM_09 slash bass. */
export function rhApplyDevice1PhrygianPedal(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
  period: RadioheadHarmonicPeriod;
}): void {
  const { context, tonicPc, out, receipts, seed, period } = params;
  if (tonicPc === undefined) return;
  const skipThreshold = device1PhrygianSkipThreshold(period);
  const tonicName = pitchClassToSharpName(tonicPc);
  const bII = pitchClassToSharpName((tonicPc + 1) % 12);

  for (let b = 1; b <= out.length; b++) {
    if (coarseSectionRoleFromBar(b, context) !== 'verse') continue;
    const m = b % 4;
    if (m !== 1 && m !== 2) continue;
    if (seededUnit(seed, b, 94101) > skipThreshold) continue;
    const i = b - 1;
    if (m === 1) {
      out[i] = `${tonicName}maj7/${tonicName}`;
      receipts.deviceReceipts.push(`rh:device1:phrygian_pedal@bar${b}`);
    } else {
      out[i] = `${bII}maj7/${tonicName}`;
      receipts.deviceReceipts.push(`rh:device1:phrygian_pedal@bar${b}`);
    }
  }
}

/** Device 4 — Borrowed iv at emotional peak (b % 8 === 0) in major key. */
export function rhApplyDevice4BorrowedIv(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
}): void {
  const { context, tonicPc, out, receipts, seed } = params;
  if (tonicPc === undefined) return;
  const bar1Chord = resolveBarSymbol(context, 1).symbol;
  const keyMinor =
    /^([a-g][#b]?)m(?!aj)/i.test(parseChordSymbol(bar1Chord).harmonyPart) ||
    bar1Chord.toLowerCase().includes('m');
  if (keyMinor) return;

  for (let b = 1; b <= out.length; b++) {
    if (b % 8 !== 0) continue;
    if (seededUnit(seed, b, 94104) > 0.85) continue;
    const i = b - 1;
    const chord = out[i]!;
    if (!looksLikeIvMajorSubdominant(chord, tonicPc)) continue;
    const ivPc = (tonicPc + 5) % 12;
    const name = pitchClassToSharpName(ivPc);
    out[i] = `${name}m`;
    receipts.deviceReceipts.push(`rh:device4:borrowed_iv@bar${b}`);
  }
}

/** Device 3 — Chromatic insertion a semitone above tonic root; once per 8-bar cycle. */
export function rhApplyDevice3ChromaticInsertion(params: {
  context: CompositionContext;
  tonicPc: number | undefined;
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
  period: RadioheadHarmonicPeriod;
}): void {
  const { tonicPc, out, receipts, seed, period } = params;
  if (tonicPc === undefined) return;
  const chromSkipThreshold = device3ChromaticInsertionSkipThreshold(period);
  const tb = out.length;
  const chromPc = (tonicPc + 1) % 12;
  const chromName = pitchClassToSharpName(chromPc);

  for (let phrase = 0; phrase * 8 < tb; phrase++) {
    const start = phrase * 8 + 1;
    const end = Math.min((phrase + 1) * 8, tb);
    let pick = start;
    let u = seededUnit(seed, phrase + 700, 94103);
    pick = start + Math.floor(u * (end - start + 1));
    if (pick > end) pick = end;
    if (pick < 1 || pick > tb) continue;
    if (seededUnit(seed, phrase, 94106) > chromSkipThreshold) continue;
    const i = pick - 1;
    out[i] = `${chromName}`;
    receipts.deviceReceipts.push(`rh:device3:chromatic_insertion@bar${pick}`);
  }
}

/** Device 2 — Parallel maj/min: two bars same-root major → following two bars same-root minor (4-bar units). */
export function rhApplyDevice2ParallelAlternation(params: {
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
}): void {
  const { out, receipts, seed } = params;
  const tb = out.length;
  for (let start = 1; start <= tb - 3; start += 4) {
    const b4 = start + 3;
    if (b4 % 8 === 0) continue;
    const b1 = start;
    const b2 = start + 1;
    const b3 = start + 2;
    const i0 = b1 - 1;
    const i1 = b2 - 1;
    const i2 = b3 - 1;
    const i3 = b4 - 1;
    const r0 = harmonyRootPc(out[i0]!);
    const r1 = harmonyRootPc(out[i1]!);
    if (r0 === undefined || r1 === undefined || r0 !== r1) continue;
    if (!looksLikeMajorTriadOrMaj7(out[i0]!) || !looksLikeMajorTriadOrMaj7(out[i1]!)) continue;
    if (seededUnit(seed, start, 94102) > 0.68) continue;
    const name = pitchClassToSharpName(r0);
    out[i2] = `${name}m`;
    out[i3] = `${name}m`;
    receipts.deviceReceipts.push(`rh:device2:parallel_alternation@bar${b3}`);
  }
}

/**
 * RH_HARM_04 — Chromatic mediant with shared third: major chord → minor chord one semitone above (e.g. Bb → Bm).
 */
export function rhApplyHarm04ChromaticMediant(params: {
  out: string[];
  receipts: RadioheadDeviceReceipts;
  seed: number;
  period: RadioheadHarmonicPeriod;
}): void {
  const { out, receipts, seed, period } = params;
  const skipThreshold = harm04MediantSkipThreshold(period);
  const tb = out.length;
  for (let i = 0; i < tb - 1; i++) {
    const barNext = i + 2;
    if (seededUnit(seed, barNext, 94107) > skipThreshold) continue;
    const cur = out[i]!;
    if (!looksLikeMajorTriadOrMaj7(cur)) continue;
    const r = harmonyRootPc(cur);
    if (r === undefined) continue;
    const upperPc = (r + 1) % 12;
    const upperName = pitchClassToSharpName(upperPc);
    out[i + 1] = `${upperName}m`;
    receipts.deviceReceipts.push(`rh:harm04:chromatic_mediant@bar${barNext}`);
  }
}

/** @deprecated — use resolveBarSymbol */
export function precomputeRadioheadEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const receipts: RadioheadDeviceReceipts = { deviceReceipts: [] };
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const seed = context.seed;
  const period = radioheadHarmonicPeriodFromSeed(seed);
  const primarySystem = radioheadHarmonicPrimarySystemForPeriod(period);
  genMeta.radioheadHarmonicPeriod = period;
  genMeta.radioheadHarmonicPrimarySystem = primarySystem;

  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(resolveBarSymbol(context, b).symbol);
  }

  rhApplyDevice5AbsentTonic({ context, tonicPc, out, receipts, seed, period });
  rhApplyDevice1PhrygianPedal({ context, tonicPc, out, receipts, seed, period });
  rhApplyDevice4BorrowedIv({ context, tonicPc, out, receipts, seed });
  rhApplyDevice3ChromaticInsertion({ context, tonicPc, out, receipts, seed, period });
  rhApplyDevice2ParallelAlternation({ out, receipts, seed });
  rhApplyHarm04ChromaticMediant({ out, receipts, seed, period });
  rhStripAvoidListColours(out);

  genMeta.radioheadEffectiveHarmonyBars = out;
  genMeta.radioheadDeviceReceipts = receipts.deviceReceipts;
}

export function finalizeRadioheadMetadata(
  metadata: GenerationMetadata,
  acc: RadioheadHarmonyAccumulator,
  seed: number
): void {
  const flat = [...(metadata.radioheadDeviceReceipts ?? [])];
  const vlFlat = collectRadioheadVoiceLeadingGrammarReceipts(flat);
  const rhMelOpts: RadioheadMelodyPlanOptions | undefined =
    metadata.radioheadMelodicContext === 'acoustic' || metadata.radioheadMelodicContext === 'electronic'
      ? { melodicContext: metadata.radioheadMelodicContext }
      : undefined;
  const melPlan = planMelodyBehaviour(seed, 'radiohead', undefined, rhMelOpts);
  const melFlat = collectRadioheadMelodicGrammarReceipts(melPlan);
  metadata.radioheadMelodicContext = melPlan.radioheadMelodicContext;
  metadata.radioheadMelodicGrammarReceipts = melFlat.length ? melFlat : undefined;

  const period = metadata.radioheadHarmonicPeriod;
  const primarySystem = metadata.radioheadHarmonicPrimarySystem;
  const middleLate = period === 'middle' || period === 'late';
  const rhythmFlat = collectRadioheadRhythmGrammarReceipts({
    period,
    seed,
    barMeterMap: metadata.barMeterMap,
    melodicContext: melPlan.radioheadMelodicContext,
  });
  metadata.radioheadRhythmGrammarReceipts = rhythmFlat.length ? rhythmFlat : undefined;
  metadata.radioheadRhythmEarlyPeriodBackbeat = period === 'early';
  metadata.radioheadRhythmAsymmetricFeaturesEligible = middleLate;

  const orchFlat = collectRadioheadOrchestrationGrammarReceipts({
    period,
    seed,
    melodicContext: melPlan.radioheadMelodicContext,
  });
  metadata.radioheadOrchestrationGrammarReceipts = orchFlat.length ? orchFlat : undefined;
  metadata.radioheadOrchestrationPalette = radioheadOrchestrationPaletteForPeriod(period);
  metadata.radioheadMicrotonalGuitarEligible =
    orchFlat.some((r) => r.startsWith(radioheadOrchestrationGrammarTags.orch05_microtonal)) || false;

  const fpHarmFlat = collectRadioheadHarmonicFingerprintReceipts({
    deviceReceipts: flat,
    effectiveHarmonyBars: metadata.radioheadEffectiveHarmonyBars,
    acc,
    primarySystem,
    period,
  });
  const fpRhythmFlat = collectRadioheadRhythmicFingerprintReceipts({
    rhythmGrammarReceipts: rhythmFlat,
    barMeterMap: metadata.barMeterMap,
  });
  const fpOrchFlat = collectRadioheadOrchestralFingerprintReceipts({
    orchestrationGrammarReceipts: orchFlat,
    voiceLeadingGrammarReceipts: vlFlat,
  });
  const fpAll = [...fpHarmFlat, ...fpRhythmFlat, ...fpOrchFlat];
  metadata.radioheadFingerprintReceipts = fpAll.length ? fpAll : undefined;

  const d = {
    songwriterId: 'radiohead' as const,
    barsConsidered: acc.barsConsidered,
    maj7Touches: acc.maj7Touches,
    minorTriadTouches: acc.minorTriadTouches,
    borrowedModalTouches: acc.borrowedModalTouches,
    slashPedalTouches: acc.slashPedalTouches,
    harmonicPeriod: period,
    harmonicPrimarySystem: primarySystem,
    voiceLeadingGrammarReceipts: vlFlat.length ? vlFlat : undefined,
    melodicGrammarReceipts: melFlat.length ? melFlat : undefined,
    rhythmGrammarReceipts: rhythmFlat.length ? rhythmFlat : undefined,
    orchestrationGrammarReceipts: orchFlat.length ? orchFlat : undefined,
    radioheadMelodicContext: melPlan.radioheadMelodicContext,
    fingerprintReceipts: fpAll.length ? fpAll : undefined,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Radiohead (OK Computer–era slice) era=${period ?? '?'} sys=${primarySystem ?? '?'}: maj7≈${acc.maj7Touches}`,
    `m≈${acc.minorTriadTouches}`,
    `borrowed/modal≈${acc.borrowedModalTouches}`,
    `slash≈${acc.slashPedalTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.radioheadDiagnostics = { ...d };
  metadata.radioheadVoiceLeadingGrammarReceipts = vlFlat.length ? vlFlat : undefined;
  metadata.radioheadSliceReceipt = receipt;
}
