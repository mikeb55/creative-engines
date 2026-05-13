/**
 * Bacharach — theatre-pop / studio-orchestra Song Mode / duo golden-path **harmony** slice.
 * Chromatic side-doors, lush tertian extensions (avoid bare triads), deceptive cadences, descending slash bass,
 * parallel-minor mixture touches — receipts `ba:*`.
 *
 * Melodic chromatic / cadential-ambiguity nudges remain in `generateGoldenPathDuoScore.applyBacharachGuitarBarPasses`.
 * No `core/style-modules/bacharach/` package exists; this slice owns symbol-level harmony for `bacharach` primary.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

/** Bacharach jazz-pop harmonic grammar BB_HARM_01–10 — receipt prefix **`bb:harmNN_*`**. */
export const bacharachHarmonicGrammarTags = {
  harm01_maj9_tonic_opening: 'bb:harm01_maj9_tonic_opening',
  harm02_sus4_dom7_resolution: 'bb:harm02_sus4_to_dom7_resolution',
  harm03_ii_V_I_jazz_cadence: 'bb:harm03_ii_Vsus_V_I_jazz_cadence',
  harm04_bVI_maj7_deceptive: 'bb:harm04_bVI_maj7_section_colour',
  harm05_iv_minor_tension: 'bb:harm05_iv_minor_subdominant',
  harm06_secondary_dominant_borrowed: 'bb:harm06_secondary_dominant_borrowed',
  harm07_iii_characteristic: 'bb:harm07_iii_in_progression',
  harm08_II_major_surprise: 'bb:harm08_II_major_quality_surprise',
  harm09_modal_ambiguity_lydian_colour: 'bb:harm09_modal_ambiguity_lydian_colour',
  harm10_dim7_passing_chromatic: 'bb:harm10_dim7_passing_chromatic',
} as const;

/** Bacharach voice-leading / studio orchestration grammar BB_VL_01–05 — **`bb:vlNN_*`**. */
export const bacharachVoiceLeadingGrammarTags = {
  vl01_maj9_spread: 'bb:vl01_maj9_spread_voicing',
  vl02_brass_close_warm: 'bb:vl02_brass_close_warm_flugelhorn_bias',
  vl03_chromatic_inner_pedal: 'bb:vl03_desc_chromatic_inner_or_pedal',
  vl04_strings_dual_role: 'bb:vl04_strings_pad_or_countermelody',
  vl05_twin_piano_split: 'bb:vl05_twin_piano_register_split',
} as const;

/** Bacharach rhythm / metric grammar BB_RHYTHM_01–05 — **`bb:rhythmNN_*`**. */
export const bacharachRhythmGrammarTags = {
  rhythm01_mixed_meter: 'bb:rhythm01_mixed_meter_fingerprint',
  rhythm02_asymmetric_3_5: 'bb:rhythm02_asymmetric_phrase_3_or_5',
  rhythm03_verse_shaker_chorus_ride: 'bb:rhythm03_verse_shaker_chorus_ride_boundary',
  rhythm04_melody_first_stress: 'bb:rhythm04_melody_first_lyric_stress_override',
  rhythm05_jazz_syncopation: 'bb:rhythm05_syncopated_jazz_pop_structural',
} as const;

/** Bacharach macro-form grammar BB_FORM_01–05 — **`bb:formNN_*`**. */
export const bacharachFormGrammarTags = {
  form01_intro_four_bars: 'bb:form01_intro_four_bars',
  form01_two_verses_before_chorus: 'bb:form01_two_verses_before_first_chorus',
  form01_close_on_verse: 'bb:form01_close_on_verse_not_chorus',
  form01_long_arc: 'bb:form01_extended_pop_arc_sections',
  form02_asymmetric_sections: 'bb:form02_asymmetric_section_or_phrase_lengths',
  form03_boundary_harmonic: 'bb:form03_section_boundary_harmonic_pivot',
  form03_boundary_rhythmic: 'bb:form03_section_boundary_meter_shift',
  form03_boundary_textural: 'bb:form03_section_boundary_texture_shift',
  form04_bridge_modal_bluesy: 'bb:form04_bridge_modal_bluesy_variation',
  form05_brass_chorus_feature: 'bb:form05_brass_melodic_feature_chorus_staging',
} as const;

/** Bacharach studio orchestration grammar BB_ORCH_01–05 — **`bb:orchNN_*`**. */
export const bacharachOrchestrationGrammarTags = {
  orch01_core_ensemble: 'bb:orch01_core_strings_flugel_horns_twin_piano_timpani',
  orch02_flugel_primary: 'bb:orch02_flugelhorn_primary_trumpet_climax_only',
  orch03_strings_pad_arco: 'bb:orch03_strings_arco_pad_winds_double_colour',
  orch04_verse_chorus_rhythm: 'bb:orch04_verse_light_chorus_kit_twin_piano_staging',
  orch05_vocal_primary: 'bb:orch05_vocal_primary_solo_orchestral_texture',
} as const;

/** Bacharach composite fingerprints BB_FP_01–03 — **`bb:fpNN_*`** (full match vs parallel grammar bundles). */
export const bacharachFingerprintTags = {
  fp01_full_rhythmic: 'bb:fp01_full_bacharach_rhythmic_fingerprint',
  fp02_full_harmonic: 'bb:fp02_full_bacharach_harmonic_fingerprint',
  fp03_full_orchestral: 'bb:fp03_full_bacharach_orchestral_fingerprint',
} as const;

function isSongModeFamilyPreset(presetId: string): boolean {
  return presetId === 'song_mode' || presetId.startsWith('song_mode_');
}

type BachHarmAnalysis = {
  rootPc: number;
  degreePc: number;
  hp: string;
  tl: string;
  hasMinorThird: boolean;
  hasSus4: boolean;
  hasDom7: boolean;
  hasMaj7: boolean;
  hasMaj9: boolean;
  hasSixNine: boolean;
  hasDim7: boolean;
};

function analyzeBachHarmonySymbol(symbol: string, tonicPc: number): BachHarmAnalysis | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart.trim();
  if (!hp || /^tonic_wash$/i.test(hp)) return undefined;
  const m = hp.match(ROOT_AT_START);
  const rootName = m?.[1];
  if (!rootName) return undefined;
  const rootPc = noteNameToPitchClass(rootName);
  if (rootPc === undefined) return undefined;
  const degreePc = (rootPc - tonicPc + 12) % 12;
  const tl = hp.toLowerCase();
  const rest = hp.slice(rootName.length).toLowerCase();
  const hasMinorThird =
    /^m(?!aj)|min/.test(rest.replace(/\s/g, '')) ||
    (/^m[^a-z]/i.test(rest) && !/maj/i.test(rest));
  const hasSus4 = /sus4|sus\b/i.test(tl);
  const compact = hp.replace(/\s/g, '');
  const hasDim7 = /dim|ø|°|o7|dim7/i.test(compact);
  const hasDom7 =
    !hasDim7 &&
    !/maj7|mmaj7|Δ/.test(tl) &&
    (/[^a-z]7([^a-z]|$)|\b7\(|\b9([^a-z]|$)|\b13/i.test(compact) || /^[a-g][#b]?7([^a-z]|$)/i.test(compact));
  const hasMaj7 = /maj7|mmaj7|Δ|maj\s*7/i.test(tl);
  const hasMaj9 =
    /maj9|maj\(13\)|maj9\(13\)|maj7\(13\)|m\(maj9\)/i.test(compact) ||
    /\bmaj9\b/i.test(tl);
  const hasSixNine = /6\/9|69\b/i.test(compact);
  return {
    rootPc,
    degreePc,
    hp,
    tl,
    hasMinorThird,
    hasSus4,
    hasDom7,
    hasMaj7,
    hasMaj9,
    hasSixNine,
    hasDim7,
  };
}

/**
 * BB_HARM_01–10 — scan effective harmony bars for Bacharach jazz-pop grammar receipts.
 */
export function applyBacharachHarmonicGrammarReceipts(
  context: CompositionContext,
  bars: readonly string[],
  tonicPcIn: number | undefined,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): string[] {
  const tonicPc =
    tonicPcIn ?? harmonyRootPc(bars[0] ?? '') ?? harmonyRootPc(resolveBarSymbol(context, 1).symbol);
  if (tonicPc === undefined) return [];

  const receipts: string[] = [];
  const n = bars.length;
  const analyses: Array<BachHarmAnalysis | undefined> = bars.map((b) => analyzeBachHarmonySymbol(b, tonicPc));
  const barNum = (i: number) => i + 1;
  const phraseFinalAt = (i: number): boolean =>
    i >= 0 && i < positions.length && positions[i] === 'phraseFinal';

  // BB_HARM_01 — maj9 / maj9(13) / 6·9 tonic opening (not bare maj7 / triad as grammar headline).
  const a0 = analyses[0];
  if (
    a0 &&
    a0.degreePc === 0 &&
    !a0.hasMinorThird &&
    (a0.hasMaj9 || a0.hasSixNine || /maj\(13\)|maj9\(13\)/i.test(a0.hp))
  ) {
    receipts.push(`${bacharachHarmonicGrammarTags.harm01_maj9_tonic_opening}@bar1`);
  }

  // BB_HARM_02 — same dominant root: sus4 → dom7 (not direct sus → I).
  for (let i = 0; i < n - 1; i++) {
    const c0 = analyses[i];
    const c1 = analyses[i + 1];
    if (!c0 || !c1) continue;
    if (c0.rootPc !== c1.rootPc) continue;
    if (c0.hasSus4 && c1.hasDom7 && !c1.hasSus4) {
      receipts.push(`${bacharachHarmonicGrammarTags.harm02_sus4_dom7_resolution}@bar${barNum(i)}`);
      break;
    }
  }

  // BB_HARM_03 — ii7 → V7sus → V7 → Imaj7 prototype window.
  for (let i = 0; i < n - 3; i++) {
    const q = analyses.slice(i, i + 4);
    if (q.some((x) => !x)) continue;
    const [d0, d1, d2, d3] = q as [BachHarmAnalysis, BachHarmAnalysis, BachHarmAnalysis, BachHarmAnalysis];
    if (d0.degreePc !== 2 || d0.hasMinorThird === false) continue;
    if (!/m7|min7|-7/i.test(d0.hp)) continue;
    if (d1.degreePc !== 7 || !d1.hasSus4) continue;
    if (d2.degreePc !== 7 || d2.rootPc !== d1.rootPc || d2.hasSus4) continue;
    if (!d2.hasDom7) continue;
    if (d3.degreePc !== 0 || d3.hasMinorThird) continue;
    if (!d3.hasMaj7 && !d3.hasMaj9 && !d3.hasSixNine) continue;
    receipts.push(`${bacharachHarmonicGrammarTags.harm03_ii_V_I_jazz_cadence}@bar${barNum(i)}`);
    break;
  }

  // BB_HARM_04 — bVI maj7 colour at phrase conclusion (deceptive / studio ending).
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a || !phraseFinalAt(i)) continue;
    if (a.degreePc === 8 && !a.hasMinorThird && (a.hasMaj7 || a.hasMaj9)) {
      receipts.push(`${bacharachHarmonicGrammarTags.harm04_bVI_maj7_deceptive}@bar${barNum(i)}`);
      break;
    }
  }

  // BB_HARM_05 — iv minor → I or V (minor subdominant tension).
  for (let i = 0; i < n - 1; i++) {
    const u = analyses[i];
    const v = analyses[i + 1];
    if (!u || !v) continue;
    if (u.degreePc !== 5 || !u.hasMinorThird) continue;
    if (v.degreePc !== 0 && v.degreePc !== 7) continue;
    receipts.push(`${bacharachHarmonicGrammarTags.harm05_iv_minor_tension}@bar${barNum(i)}`);
    break;
  }

  // BB_HARM_06 — vi min7 → II7 secondary dominant (borrowed chromatic complex).
  for (let i = 0; i < n - 1; i++) {
    const u = analyses[i];
    const v = analyses[i + 1];
    if (!u || !v) continue;
    if (u.degreePc !== 9 || !u.hasMinorThird) continue;
    if (!/m7|min7|-7/i.test(u.hp)) continue;
    if (v.degreePc !== 2 || !v.hasDom7 || v.hasSus4) continue;
    receipts.push(`${bacharachHarmonicGrammarTags.harm06_secondary_dominant_borrowed}@bar${barNum(i)}`);
    break;
  }

  // BB_HARM_07 — iii chord in progression (characteristic rare degree).
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a) continue;
    if (a.degreePc === 4 && a.hasMinorThird) {
      receipts.push(`${bacharachHarmonicGrammarTags.harm07_iii_characteristic}@bar${barNum(i)}`);
      break;
    }
  }

  // BB_HARM_08 — ii → II major surprise (major quality on 2nd degree).
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a) continue;
    if (a.degreePc === 2 && !a.hasMinorThird && !a.hasSus4 && (hasMajorTriadShell(a.hp) || a.hasMaj7)) {
      receipts.push(`${bacharachHarmonicGrammarTags.harm08_II_major_surprise}@bar${barNum(i)}`);
      break;
    }
  }

  // BB_HARM_09 — Lydian / colour ambiguity (#11, #4) or bVII → I juxtaposition.
  let harm09 = false;
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a) continue;
    if (/#11|#4\b|add#11|maj7\s*\(\s*#11/i.test(a.hp)) {
      receipts.push(`${bacharachHarmonicGrammarTags.harm09_modal_ambiguity_lydian_colour}@sharp11@bar${barNum(i)}`);
      harm09 = true;
      break;
    }
  }
  if (!harm09) {
    for (let i = 0; i < n - 1; i++) {
      const u = analyses[i];
      const v = analyses[i + 1];
      if (!u || !v) continue;
      if (u.degreePc === 10 && !u.hasMinorThird && v.degreePc === 0 && !v.hasMinorThird) {
        receipts.push(`${bacharachHarmonicGrammarTags.harm09_modal_ambiguity_lydian_colour}@bVII_to_I@bar${barNum(i)}`);
        break;
      }
    }
  }

  // BB_HARM_10 — dim7 chromatic passing (roots semitone / whole-tone neighbours).
  for (let i = 1; i < n - 1; i++) {
    const prev = analyses[i - 1];
    const mid = analyses[i];
    const next = analyses[i + 1];
    if (!prev || !mid || !next || !mid.hasDim7) continue;
    const d0 = Math.min(Math.abs(mid.rootPc - prev.rootPc), 12 - Math.abs(mid.rootPc - prev.rootPc));
    const d1 = Math.min(Math.abs(next.rootPc - mid.rootPc), 12 - Math.abs(next.rootPc - mid.rootPc));
    if (d0 <= 2 && d1 <= 2) {
      receipts.push(`${bacharachHarmonicGrammarTags.harm10_dim7_passing_chromatic}@bar${barNum(i)}`);
      break;
    }
  }

  void context;
  return receipts;
}

/**
 * BB_VL_01–05 — maj9 spread policy, brass/string surfaces, chromatic inner-line / pedal heuristics, twin piano song-mode hint.
 */
export function applyBacharachVoiceLeadingGrammarReceipts(
  context: CompositionContext,
  bars: readonly string[],
  tonicPcIn: number | undefined
): string[] {
  const tonicPc =
    tonicPcIn ?? harmonyRootPc(bars[0] ?? '') ?? harmonyRootPc(resolveBarSymbol(context, 1).symbol);
  if (tonicPc === undefined) return [];

  const receipts: string[] = [];
  const n = bars.length;

  // BB_VL_01 — maj9 chords → spread voicing default (close reserved for brass elsewhere).
  for (let i = 0; i < n; i++) {
    const a = analyzeBachHarmonySymbol(bars[i]!, tonicPc);
    if (a && !a.hasMinorThird && a.hasMaj9) {
      receipts.push(`${bacharachVoiceLeadingGrammarTags.vl01_maj9_spread}@bar${i + 1}`);
      break;
    }
  }

  // BB_VL_02 — brass: close warm voicing bias (big-band instrument surface).
  const uiIg = context.generationMetadata.uiInstrumentGroup;
  if (uiIg === 'big_band') {
    receipts.push(bacharachVoiceLeadingGrammarTags.vl02_brass_close_warm);
  }

  // BB_VL_03 — stepwise chromatic inner motion OR pedal (roots / slash bass descend by semitone; or 4+ bar pedal).
  let vl03 = false;
  for (let i = 0; i <= n - 3; i++) {
    const r0 = harmonyRootPc(bars[i] ?? '');
    const r1 = harmonyRootPc(bars[i + 1] ?? '');
    const r2 = harmonyRootPc(bars[i + 2] ?? '');
    if (r0 === undefined || r1 === undefined || r2 === undefined) continue;
    const d0 = (r0 - r1 + 12) % 12;
    const d1 = (r1 - r2 + 12) % 12;
    if (d0 === 1 && d1 === 1) {
      receipts.push(`${bacharachVoiceLeadingGrammarTags.vl03_chromatic_inner_pedal}@chromatic_roots@bar${i + 1}`);
      vl03 = true;
      break;
    }
  }
  if (!vl03) {
    for (let i = 0; i <= n - 3; i++) {
      const b0 = parseChordSymbol(bars[i] ?? '').slashBassPc;
      const b1 = parseChordSymbol(bars[i + 1] ?? '').slashBassPc;
      const b2 = parseChordSymbol(bars[i + 2] ?? '').slashBassPc;
      if (b0 === undefined || b1 === undefined || b2 === undefined) continue;
      const d0 = (b0 - b1 + 12) % 12;
      const d1 = (b1 - b2 + 12) % 12;
      if (d0 === 1 && d1 === 1) {
        receipts.push(`${bacharachVoiceLeadingGrammarTags.vl03_chromatic_inner_pedal}@chromatic_slash_bass@bar${i + 1}`);
        vl03 = true;
        break;
      }
    }
  }
  if (!vl03) {
    let runStart = 0;
    for (let i = 1; i <= n; i++) {
      if (i === n || bars[i]?.trim() !== bars[i - 1]?.trim()) {
        const runLen = i - runStart;
        if (runLen >= 4) {
          receipts.push(`${bacharachVoiceLeadingGrammarTags.vl03_chromatic_inner_pedal}@pedal${runLen}b@endBar${i}`);
          vl03 = true;
          break;
        }
        runStart = i;
      }
    }
  }

  // BB_VL_04 — strings: pad vs countermelody dual role (string quartet surface).
  if (uiIg === 'string_quartet') {
    receipts.push(bacharachVoiceLeadingGrammarTags.vl04_strings_dual_role);
  }

  // BB_VL_05 — twin piano register separation (song-mode theatre-pop staging default).
  if (isSongModeFamilyPreset(context.presetId)) {
    receipts.push(bacharachVoiceLeadingGrammarTags.vl05_twin_piano_split);
  }

  return receipts;
}

function hasMajorTriadShell(hp: string): boolean {
  const tl = hp.toLowerCase();
  if (/maj7|m7|dim|ø|sus|add|6\/9|maj9/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).trim();
  return rest === '' || /^major$/i.test(rest);
}

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

/** Weighted phrase lengths: 3-bar 25%, 4-bar 20%, 5-bar 25%, 7-bar 20%, 10-bar 8%, 14-bar 2%. */
function bacharachPhraseLength(seed: number, phraseIndex: number): number {
  const u = seededUnit(seed, phraseIndex, 991011);
  if (u < 0.25) return 3;
  if (u < 0.45) return 4;
  if (u < 0.7) return 5;
  if (u < 0.9) return 7;
  if (u < 0.98) return 10;
  return 14;
}

/**
 * Phrase role per bar using variable-length phrases (seeded). Same layout pattern as {@link computeEcmPhrasePositions}.
 */
export function computeBacharachPhrasePositions(
  totalBars: number,
  seed: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = bacharachPhraseLength(seed, phraseIdx);
    const end = Math.min(bar + len - 1, totalBars);
    const span = end - bar + 1;
    for (let i = 0; i < span; i++) {
      const globalBar = bar + i;
      if (span <= 1) {
        out.push('phraseFinal');
      } else if (globalBar === bar) {
        out.push('phraseStart');
      } else if (globalBar === end) {
        out.push('phraseFinal');
      } else {
        out.push('phraseMiddle');
      }
    }
    bar = end + 1;
    phraseIdx++;
  }
  while (out.length < totalBars) out.push('phraseMiddle');
  return out.slice(0, totalBars);
}

/** Phrase spans (bars) matching {@link computeBacharachPhrasePositions}. */
function collectBacharachPhraseLengths(totalBars: number, seed: number): number[] {
  const lengths: number[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = bacharachPhraseLength(seed, phraseIdx);
    const end = Math.min(bar + len - 1, totalBars);
    const span = end - bar + 1;
    lengths.push(span);
    bar = end + 1;
    phraseIdx++;
  }
  return lengths;
}

function mergedBarMeterMap(context: CompositionContext): BarMeterMap | undefined {
  const a = context.barMeterMap;
  const b = context.generationMetadata.barMeterMap;
  if (!a && !b) return undefined;
  return { ...(b ?? {}), ...(a ?? {}) };
}

function hasVerseAndChorusSections(context: CompositionContext): boolean {
  let verse = false;
  let chorus = false;
  for (const sec of context.form.sections) {
    const lab = sec.label.toLowerCase();
    if (/\bverse\b|^v\.|^v$/i.test(lab)) verse = true;
    if (/\bchorus\b|\brefrain\b/i.test(lab)) chorus = true;
  }
  return verse && chorus;
}

/**
 * BB_RHYTHM_01–05 — mixed meter; 3/5-bar phrase weights; verse vs chorus percussion hint; melody-first stress; jazz syncopation posture.
 */
export function applyBacharachRhythmGrammarReceipts(
  context: CompositionContext,
  totalBars: number,
  seed: number
): string[] {
  const receipts: string[] = [];
  if (totalBars < 1) return receipts;

  const mm = mergedBarMeterMap(context);
  const sigs = new Set<string>();
  for (let b = 1; b <= totalBars; b++) {
    const m = mm?.[b];
    const num = m?.numerator ?? 4;
    const den = m?.denominator ?? 4;
    sigs.add(`${num}/${den}`);
  }
  if (sigs.size >= 2) {
    receipts.push(bacharachRhythmGrammarTags.rhythm01_mixed_meter);
  }

  const phraseLens = collectBacharachPhraseLengths(totalBars, seed);
  if (phraseLens.some((L) => L === 3 || L === 5)) {
    receipts.push(bacharachRhythmGrammarTags.rhythm02_asymmetric_3_5);
  }

  if (hasVerseAndChorusSections(context)) {
    receipts.push(bacharachRhythmGrammarTags.rhythm03_verse_shaker_chorus_ride);
  }

  receipts.push(bacharachRhythmGrammarTags.rhythm04_melody_first_stress);
  receipts.push(bacharachRhythmGrammarTags.rhythm05_jazz_syncopation);

  return receipts;
}

function bacharachSectionRole(label: string): 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'instrumental' | 'other' {
  const lab = label.toLowerCase().trim();
  if (/\bintro\b|^in$/i.test(lab)) return 'intro';
  if (/\bverse\b|^v\d|^v\.|^v$/i.test(lab)) return 'verse';
  if (/\bchorus\b|\brefrain\b|^ch\d|^ch\.|^c$/i.test(lab)) return 'chorus';
  if (/\bbridge\b|\bbrk\b/i.test(lab)) return 'bridge';
  if (/\boutro\b|\bending\b|\btag\b|\bcoda\b|\bfade\b/i.test(lab)) return 'outro';
  if (/\bsolo\b|\binstrumental\b/i.test(lab)) return 'instrumental';
  return 'other';
}

function sortedFormSections(context: CompositionContext): Array<{ label: string; startBar: number; length: number }> {
  return [...context.form.sections].sort((a, b) => a.startBar - b.startBar);
}

/**
 * BB_FORM_01–05 — section labels + arcs; asymmetric lengths vs phrase grid; boundary signals from parallel grammar; bridge vs brass staging.
 */
export function applyBacharachFormGrammarReceipts(
  context: CompositionContext,
  totalBars: number,
  seed: number,
  harmonicGrammarReceipts: readonly string[],
  rhythmGrammarReceipts: readonly string[],
  vlGrammarReceipts: readonly string[],
  sliceDeviceReceipts: readonly string[]
): string[] {
  const receipts: string[] = [];
  const secs = sortedFormSections(context);
  if (secs.length === 0) return receipts;

  const first = secs[0]!;
  if (bacharachSectionRole(first.label) === 'intro' && first.length === 4) {
    receipts.push(bacharachFormGrammarTags.form01_intro_four_bars);
  }

  let versesBeforeChorus = 0;
  let sawChorus = false;
  for (const s of secs) {
    const r = bacharachSectionRole(s.label);
    if (r === 'chorus') {
      sawChorus = true;
      break;
    }
    if (r === 'verse') versesBeforeChorus++;
  }
  if (sawChorus && versesBeforeChorus >= 2) {
    receipts.push(bacharachFormGrammarTags.form01_two_verses_before_chorus);
  }

  const last = secs[secs.length - 1]!;
  if (bacharachSectionRole(last.label) === 'verse') {
    receipts.push(bacharachFormGrammarTags.form01_close_on_verse);
  }

  if (totalBars >= 32 && secs.length >= 4) {
    receipts.push(bacharachFormGrammarTags.form01_long_arc);
  }

  const secLens = secs.map((s) => s.length);
  const phraseLens = collectBacharachPhraseLengths(totalBars, seed);
  const asymmetricPhrase = phraseLens.some((L) => L === 3 || L === 5 || L === 7 || L >= 10);
  const asymmetricSection =
    secLens.some((L) => L !== 8) || (secLens.length >= 2 && new Set(secLens).size >= 2);
  if (asymmetricPhrase || asymmetricSection) {
    receipts.push(bacharachFormGrammarTags.form02_asymmetric_sections);
  }

  const harmPivot =
    harmonicGrammarReceipts.some((r) => /harm04|harm05|harm06|harm09|harm10/i.test(r)) ||
    sliceDeviceReceipts.some((r) => /ba:chromatic_side|ba:mixture|ba:deceptive/i.test(r));
  const rhythmPivot = rhythmGrammarReceipts.some((r) => r.includes('rhythm01'));
  const texturePivot = vlGrammarReceipts.some((r) => r.includes('vl02') || r.includes('vl04'));
  if (harmPivot) receipts.push(bacharachFormGrammarTags.form03_boundary_harmonic);
  if (rhythmPivot) receipts.push(bacharachFormGrammarTags.form03_boundary_rhythmic);
  if (texturePivot) receipts.push(bacharachFormGrammarTags.form03_boundary_textural);

  const hasBridge = secs.some((s) => bacharachSectionRole(s.label) === 'bridge');
  const bridgeColourHarm =
    harmonicGrammarReceipts.some((r) => /harm04|harm05|harm09|harm07/i.test(r)) ||
    sliceDeviceReceipts.some((r) => /ba:mixture/i.test(r));
  if (hasBridge && bridgeColourHarm) {
    receipts.push(bacharachFormGrammarTags.form04_bridge_modal_bluesy);
  }

  const uiIg = context.generationMetadata.uiInstrumentGroup;
  const chorusSurface =
    secs.some((s) => bacharachSectionRole(s.label) === 'chorus') ||
    (totalBars >= 16 && secs.some((s) => /^b$/i.test(s.label.trim())));
  if (uiIg === 'big_band' && chorusSurface) {
    receipts.push(bacharachFormGrammarTags.form05_brass_chorus_feature);
  }

  return receipts;
}

/**
 * BB_ORCH_01–05 — theatre-pop studio orchestration receipts (ensemble default, brass/strings/rhythm/vocal hierarchy).
 */
export function applyBacharachOrchestrationGrammarReceipts(
  context: CompositionContext,
  totalBars: number,
  rhythmGrammarReceipts: readonly string[],
  vlGrammarReceipts: readonly string[]
): string[] {
  const receipts: string[] = [];
  const meta = context.generationMetadata;

  receipts.push(bacharachOrchestrationGrammarTags.orch01_core_ensemble);
  receipts.push(bacharachOrchestrationGrammarTags.orch02_flugel_primary);
  receipts.push(bacharachOrchestrationGrammarTags.orch03_strings_pad_arco);

  const verseChorusRhythm = rhythmGrammarReceipts.some((r) => r.includes('rhythm03'));
  const twinPiano = vlGrammarReceipts.some((r) => r.includes('vl05'));
  if (hasVerseAndChorusSections(context) || verseChorusRhythm || twinPiano) {
    receipts.push(bacharachOrchestrationGrammarTags.orch04_verse_chorus_rhythm);
  }

  const vocalPrimary =
    isSongModeFamilyPreset(context.presetId) ||
    meta.songModeHookFirstIdentity === true ||
    totalBars >= 16;
  if (vocalPrimary) {
    receipts.push(bacharachOrchestrationGrammarTags.orch05_vocal_primary);
  }

  return receipts;
}

function grammarHas(rs: readonly string[], idFragment: string): boolean {
  return rs.some((r) => r.includes(idFragment));
}

/**
 * BB_FP_01–03 — full fingerprints when required parallel receipts co-occur (rhythm / harmony / orch+VL stacks).
 */
export function applyBacharachFingerprintReceipts(
  harmonicGrammarReceipts: readonly string[],
  rhythmGrammarReceipts: readonly string[],
  vlGrammarReceipts: readonly string[],
  orchGrammarReceipts: readonly string[]
): string[] {
  const out: string[] = [];

  if (
    grammarHas(rhythmGrammarReceipts, 'rhythm01') &&
    grammarHas(rhythmGrammarReceipts, 'rhythm02') &&
    grammarHas(rhythmGrammarReceipts, 'rhythm04') &&
    grammarHas(rhythmGrammarReceipts, 'rhythm05')
  ) {
    out.push(bacharachFingerprintTags.fp01_full_rhythmic);
  }

  if (
    grammarHas(harmonicGrammarReceipts, 'harm01') &&
    grammarHas(harmonicGrammarReceipts, 'harm02') &&
    grammarHas(harmonicGrammarReceipts, 'harm03') &&
    grammarHas(harmonicGrammarReceipts, 'harm04') &&
    grammarHas(harmonicGrammarReceipts, 'harm05')
  ) {
    out.push(bacharachFingerprintTags.fp02_full_harmonic);
  }

  if (
    grammarHas(orchGrammarReceipts, 'orch02') &&
    grammarHas(orchGrammarReceipts, 'orch03') &&
    grammarHas(orchGrammarReceipts, 'orch05') &&
    grammarHas(vlGrammarReceipts, 'vl04') &&
    grammarHas(vlGrammarReceipts, 'vl05')
  ) {
    out.push(bacharachFingerprintTags.fp03_full_orchestral);
  }

  return out;
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
}

export function isSongwriterBacharach(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'bacharach' } {
  return genMeta?.songwriterStyleId === 'bacharach';
}

export interface BacharachHarmonyAccumulator {
  barsConsidered: number;
  chromaticSideTouches: number;
  extensionTouches: number;
  deceptiveTouches: number;
  slashBassTouches: number;
}

export function createBacharachHarmonyAccumulator(): BacharachHarmonyAccumulator {
  return {
    barsConsidered: 0,
    chromaticSideTouches: 0,
    extensionTouches: 0,
    deceptiveTouches: 0,
    slashBassTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BacharachHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/maj9|add9|maj7|m9|m11|\b6\/9\b/.test(t)) acc.extensionTouches++;
  if (/\//.test(c)) acc.slashBassTouches++;
  if (/^[a-g][#b]?[^\/]*$/i.test(hp.replace(/\s/g, '')) && !/[79]|maj|min|m7|sus|dim/.test(t)) {
    /* bare-ish — counted elsewhere */
  }
}

export function accumulateBacharachHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BacharachHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface BacharachAntiElaborationGuards {
  clusterVoicingReduced: number;
  denseAlterationReduced: number;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

/** Lush but clean: avoid dense cluster spellings; target ≤4 functional chord tones in symbols. */
function sanitizeLushClean(symbol: string, guards: BacharachAntiElaborationGuards): string {
  let s = symbol.trim();
  if (!s) return s;
  const hp = parseChordSymbol(s).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = slashTail(s);

  if (/add11|#11.*13|13.*\(.*#11|maj9\(.*#11|\(13.*11\)/.test(tl)) {
    guards.clusterVoicingReduced++;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) return s;
    const tail = hp.slice(root!.length).replace(/\s/g, '');
    if (/m(?!aj)/.test(tail)) return `${root}m9${slash}`;
    return `${root}maj9${slash}`;
  }

  if (/\balt\b|7\(.*alt|7\(.*b13.*#9/.test(tl)) {
    guards.denseAlterationReduced++;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) return s;
    return `${root}7b9${slash}`;
  }

  return s;
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

/** Dominant or broad major triad / maj colour (for bVII9 connector eligibility). */
function isBvii9EligibleChord(symbol: string): boolean {
  if (looksPlainDominantSeventh(symbol)) return true;
  if (isMinorishSymbol(symbol)) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/dim|ø|aug|sus/.test(tl)) return false;
  return true;
}

function isMinorishSymbol(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj|Δ|sus|dim|ø|aug/.test(tl)) return false;
  return /\bm(?!aj)|min|m7|m9|m11|m6\b/.test(tl) || /^[a-g][#b]?m([^a]|$)/i.test(parseChordSymbol(symbol).harmonyPart.replace(/\s/g, ''));
}

/** Bare triads / plain major → rich extensions (maj9 / add9 / m9). */
function enrichBareTertian(symbol: string, guards: BacharachAntiElaborationGuards): string {
  let s = symbol.trim();
  if (!s) return s;
  const hp = parseChordSymbol(s).harmonyPart;
  const slash = slashTail(s);
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return sanitizeLushClean(s, guards);
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/[79]|maj|sus|dim|ø|add|6\/9|11|13|m7|m9/.test(rest)) return sanitizeLushClean(s, guards);
  if (rest === '' || /^major$/i.test(rest)) {
    return sanitizeLushClean(`${root}maj9${slash}`, guards);
  }
  if (/^m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    return sanitizeLushClean(`${root}m9${slash}`, guards);
  }
  return sanitizeLushClean(s, guards);
}

/** bVII9 chromatic connector (e.g. Bb9 in C major) — phrase-middle bars. */
function applyBvii9ConnectorPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  const bviiPc = (tonicPc + 10 + 12) % 12;
  const bviiName = pitchClassToSharpName(bviiPc);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 991095) >= 0.28) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (!isBvii9EligibleChord(sym)) continue;
    out[b - 1] = `${bviiName}9`;
    receipts.push(`ba:bvii9_connector@bar${b}`);
  }
}

/** Phrase-final tonic major → maj9 or 6/9 (upper-structure landing colour). */
function applySoftExtensionLandingPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    const sym = out[b - 1]!;
    const r = harmonyRootPc(sym);
    if (r !== tonicPc) continue;
    if (isMinorishSymbol(sym)) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/sus/.test(tl)) continue;
    if (/maj9|6\/9/.test(tl)) continue;
    const slash = slashTail(sym);
    const rootName = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!rootName) continue;
    const use69 = seededUnit(seed, b, 991096) < 0.42;
    out[b - 1] = use69 ? `${rootName}6/9${slash}` : `${rootName}maj9${slash}`;
    receipts.push(`ba:soft_ext_landing@bar${b}`);
  }
}

/** Mid-phrase chromatic side-door: neighbour root with tertian spelling. */
function applyChromaticSideDoorPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 991101) >= 0.22) continue;
    const sym = out[b - 1]!;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const dir = seededUnit(seed, b, 991102) < 0.5 ? 1 : -1;
    const newPc = (r + dir + 12) % 12;
    const slash = slashTail(sym);
    const minor = isMinorishSymbol(sym);
    out[b - 1] = minor
      ? `${pitchClassToSharpName(newPc)}m7${slash}`
      : `${pitchClassToSharpName(newPc)}maj7${slash}`;
    receipts.push(`ba:chromatic_side@bar${b}`);
  }
}

/** Descending chromatic bass via slash (walk-down colour). */
function applyDescendingSlashPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) === 'phraseFinal') continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (seededUnit(seed, b, 991201) >= 0.26) continue;
    const root = harmonyRootPc(sym);
    if (root === undefined) continue;
    const bassPc = (root + 11 + 12) % 12;
    const bassName = pitchClassToSharpName(bassPc);
    const rootName = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!rootName) continue;
    const tail = parseChordSymbol(sym).harmonyPart.slice(rootName.length);
    out[b - 1] = `${rootName}${tail}/${bassName}`;
    receipts.push(`ba:desc_bass@bar${b}`);
  }
}

/** Deceptive cadence: dominant → unexpected resolution (vi or IV) on phrase-final tonic arrival. */
function applyDeceptiveCadencePass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  const viPc = (tonicPc + 9) % 12;
  const ivPc = (tonicPc + 5) % 12;
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    const prev = out[b - 2]!;
    const cur = out[b - 1]!;
    if (!looksPlainDominantSeventh(prev)) continue;
    if (harmonyRootPc(cur) !== tonicPc) continue;
    if (seededUnit(seed, b, 991301) >= 0.34) continue;
    const useVi = seededUnit(seed, b, 991302) < 0.52;
    out[b - 1] = useVi ? `${pitchClassToSharpName(viPc)}m7` : `${pitchClassToSharpName(ivPc)}maj7`;
    receipts.push(`ba:deceptive@bar${b}`);
  }
}

/** Parallel-minor mixture colour (e.g. bVI maj7) mid-phrase. */
function applyMixtureBorrowPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  const bViPc = (tonicPc + 8) % 12;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 991401) >= 0.14) continue;
    const sym = out[b - 1]!;
    if (harmonyRootPc(sym) !== tonicPc) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/m(?!aj)|min/.test(tl)) continue;
    out[b - 1] = `${pitchClassToSharpName(bViPc)}maj7`;
    receipts.push(`ba:mixture_bVI@bar${b}`);
  }
}

/** Counter-melody hint: inner-voice slash (chordal 3rd in bass) on selected phrase starts. */
function applyInnerVoiceSlashPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseStart') continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (seededUnit(seed, b, 991501) >= 0.18) continue;
    const root = harmonyRootPc(sym);
    if (root === undefined) continue;
    const thirdPc = (root + 4) % 12;
    const hp = parseChordSymbol(sym).harmonyPart;
    const m = hp.match(ROOT_AT_START);
    if (!m?.[1]) continue;
    const rootName = m[1];
    const tail = hp.slice(rootName.length);
    out[b - 1] = `${rootName}${tail}/${pitchClassToSharpName(thirdPc)}`;
    receipts.push(`ba:inner_slash@bar${b}`);
  }
}

/**
 * Precompute effective one chord per bar after Bacharach slice devices (primary `bacharach` only).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeBacharachEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: BacharachAntiElaborationGuards = {
    clusterVoicingReduced: 0,
    denseAlterationReduced: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = enrichBareTertian(resolveBarSymbol(context, b).symbol, guards);
    sym = sanitizeLushClean(sym, guards);
    raw.push(sym);
  }

  const out = [...raw];
  const positions = computeBacharachPhrasePositions(tb, seed);

  applyChromaticSideDoorPass(out, seed, receipts, tb, context, positions);
  applyDescendingSlashPass(out, seed, receipts, tb, context, positions);
  applyBvii9ConnectorPass(out, tonicPc, seed, receipts, tb, context, positions);
  applyDeceptiveCadencePass(out, tonicPc, seed, receipts, tb, context, positions);
  applyMixtureBorrowPass(out, tonicPc, seed, receipts, tb, context, positions);
  applyInnerVoiceSlashPass(out, seed, receipts, tb, context, positions);
  applySoftExtensionLandingPass(out, tonicPc, seed, receipts, tb, context, positions);

  const grammarReceipts = applyBacharachHarmonicGrammarReceipts(context, out, tonicPc, positions);
  const vlReceipts = applyBacharachVoiceLeadingGrammarReceipts(context, out, tonicPc);
  const rhythmReceipts = applyBacharachRhythmGrammarReceipts(context, tb, seed);
  const formReceipts = applyBacharachFormGrammarReceipts(
    context,
    tb,
    seed,
    grammarReceipts,
    rhythmReceipts,
    vlReceipts,
    receipts
  );
  const orchReceipts = applyBacharachOrchestrationGrammarReceipts(context, tb, rhythmReceipts, vlReceipts);
  const fpReceipts = applyBacharachFingerprintReceipts(
    grammarReceipts,
    rhythmReceipts,
    vlReceipts,
    orchReceipts
  );

  genMeta.bacharachEffectiveHarmonyBars = out;
  genMeta.bacharachDeviceReceipts = receipts;
  genMeta.bacharachHarmonicGrammarReceipts = grammarReceipts.length ? grammarReceipts : undefined;
  genMeta.bacharachVoiceLeadingGrammarReceipts = vlReceipts.length ? vlReceipts : undefined;
  genMeta.bacharachRhythmGrammarReceipts = rhythmReceipts.length ? rhythmReceipts : undefined;
  genMeta.bacharachFormGrammarReceipts = formReceipts.length ? formReceipts : undefined;
  genMeta.bacharachOrchestrationGrammarReceipts = orchReceipts.length ? orchReceipts : undefined;
  genMeta.bacharachFingerprintReceipts = fpReceipts.length ? fpReceipts : undefined;
  genMeta.bacharachAntiElaborationGuards = guards;
}

export function finalizeBacharachMetadata(metadata: GenerationMetadata, acc: BacharachHarmonyAccumulator): void {
  const flat = [...(metadata.bacharachDeviceReceipts ?? [])];
  const grammarFlat = [...(metadata.bacharachHarmonicGrammarReceipts ?? [])];
  const vlFlat = [...(metadata.bacharachVoiceLeadingGrammarReceipts ?? [])];
  const rhythmFlat = [...(metadata.bacharachRhythmGrammarReceipts ?? [])];
  const formFlat = [...(metadata.bacharachFormGrammarReceipts ?? [])];
  const orchFlat = [...(metadata.bacharachOrchestrationGrammarReceipts ?? [])];
  const fpFlat = [...(metadata.bacharachFingerprintReceipts ?? [])];
  const g = metadata.bacharachAntiElaborationGuards ?? {
    clusterVoicingReduced: 0,
    denseAlterationReduced: 0,
  };
  const guardTotal = g.clusterVoicingReduced + g.denseAlterationReduced;
  const chromaticN = flat.filter((r) => r.includes('ba:chromatic_side')).length;
  const deceptiveN = flat.filter((r) => r.includes('ba:deceptive')).length;
  const descBassN = flat.filter((r) => r.includes('ba:desc_bass')).length;
  const d = {
    songwriterId: 'bacharach' as const,
    barsConsidered: acc.barsConsidered,
    chromaticSideTouches: chromaticN,
    extensionTouches: acc.extensionTouches,
    deceptiveTouches: deceptiveN,
    slashBassTouches: Math.max(acc.slashBassTouches, descBassN + flat.filter((r) => r.includes('ba:inner_slash')).length),
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
    harmonicGrammarReceipts: grammarFlat.length ? grammarFlat : undefined,
    voiceLeadingGrammarReceipts: vlFlat.length ? vlFlat : undefined,
    rhythmGrammarReceipts: rhythmFlat.length ? rhythmFlat : undefined,
    formGrammarReceipts: formFlat.length ? formFlat : undefined,
    orchestrationGrammarReceipts: orchFlat.length ? orchFlat : undefined,
    fingerprintReceipts: fpFlat.length ? fpFlat : undefined,
  } as const;
  const receipt = [
    `Bacharach (theatre-pop harmony slice): chrom≈${chromaticN}`,
    `ext≈${acc.extensionTouches}`,
    `dec≈${deceptiveN}`,
    `slash≈${d.slashBassTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    grammarFlat.length ? `grammar=${grammarFlat.join(';')}` : '',
    vlFlat.length ? `vl=${vlFlat.join(';')}` : '',
    rhythmFlat.length ? `rhythm=${rhythmFlat.join(';')}` : '',
    formFlat.length ? `form=${formFlat.join(';')}` : '',
    orchFlat.length ? `orch=${orchFlat.join(';')}` : '',
    fpFlat.length ? `fp=${fpFlat.join(';')}` : '',
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.bacharachDiagnostics = { ...d };
  metadata.bacharachSliceReceipt = receipt;
}
