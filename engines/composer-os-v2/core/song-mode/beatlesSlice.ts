/**
 * Beatles song-mode slice — three eras (Merseybeat → Rubber Soul → Abbey Road).
 * Design: tiered harmony vocabulary + named devices; runtime pool IDs match `SONGWRITER_CHORD_POOLS` in `songModeBuilder.ts`.
 */

import type {
  BeatlesContextMode,
  BeatlesFormTemplateId,
  BeatlesMelodicLens,
  CompositionContext,
  GenerationMetadata,
} from '../compositionContext';
import type { MelodyBehaviourPlan } from './melodyBehaviourPlanner';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

/** Pool keys registered under `SONGWRITER_CHORD_POOLS` for `songwriterId === 'beatles'`. */
export type BeatlesChordPoolId =
  | 'beatles_merseybeat_1962'
  | 'beatles_rubber_soul_1965'
  | 'beatles_abbey_road_1968';

export const BEATLES_CONTEXTS = {
  /** Early Beatles / rock’n’roll scaffold — diatonic major + blues IV7/I7, secondary dominants, borrowed iv / bVII / bVI touches. */
  merseybeat_1962: 'merseybeat_1962',
  /** Modal/colour era — flat-side primaries (bIII, bVI, bVII), iv, Mixolydian loops, V-of-ish resolutions. */
  rubber_soul_1965: 'rubber_soul_1965',
  /** Studio-era flat-side system — chromatic mediants, double-plagal, co-tonic centres (relative major/minor, bIII poles). */
  abbey_road_1968: 'abbey_road_1968',
} as const;

/** Formal / harmonic devices surfaced to planners (`melodyBehaviourPlanner`, pairing hints). */
export const beatlesDevices = {
  d1: 'aaba_form',
  d2: 'flat_side_modal',
  d3: 'co_tonic_switch',
  d4: 'chromatic_mediant',
  d5: 'suite_form',
} as const;

export type BeatlesDeviceId = keyof typeof beatlesDevices;

/** Style surface nudges vs neutral scaffold (see `planMelodyBehaviour`). */
export const beatlesStyleSurface = {
  harmonyDensityBias: 0.08,
  syncopationBias: -0.06,
  rhythmicSpaceBias: 0.12,
  cadenceSoftnessBias: 0.22,
} as const;

/** Roman-style chord pools per era (analytical; concrete rows live in `songModeBuilder`). */
export const beatlesChordPoolSpec = {
  merseybeat_1962: {
    primary: ['I', 'ii', 'ii7', 'IV', 'V', 'V7', 'vi', 'I7', 'IV7'],
    secondaryAndBorrowed: ['II7', 'iv', 'bVII', 'bVI'],
    notes: 'Blues IV7/I7; secondary II7; occasional minor iv and flat-side borrowed.',
  },
  rubber_soul_1965: {
    extendsEra: 'merseybeat_1962',
    addedPrimaries: ['bIII', 'bVI', 'bVII'],
    cycles: ['I', 'bVII', 'IV'],
    resolutions: ['II', 'bII'],
    notes: 'Flat-side as structural; Mixolydian I–bVII–IV; II / bII colour resolutions.',
  },
  abbey_road_1968: {
    system: 'flat_side_full',
    mediants: ['I→bIII', 'I→bVI'],
    doublePlagal: ['I', 'bVII', 'IV'],
    coTonic: ['vi', 'VI', 'bIII'],
    notes: 'Chromatic mediants, double-plagal, co-tonic switching as local tonics.',
  },
} as const;

/**
 * Beatles major-key harmonic grammar (research BT_HARM_01–13) — receipt prefix **`bt:harmNN_*`**.
 * Analysis assumes **major-key Roman degrees** relative to {@link inferBeatlesAnalysisTonicPc}.
 */
export const beatlesHarmonicGrammarTags = {
  harm01_bIII_primary_borrowed: 'bt:harm01_bIII_primary_borrowed',
  harm02_bVII_mixolydian_cadence: 'bt:harm02_bVII_mixolydian_cadence',
  harm03_double_plagal_bVI_bVII_I: 'bt:harm03_double_plagal_bVI_bVII_I',
  harm04_iv_minor_tension: 'bt:harm04_iv_minor_tension',
  harm05_modal_palette_five_chords: 'bt:harm05_modal_palette_five_chords',
  harm06_plagal_IV_I: 'bt:harm06_plagal_IV_I',
  harm06_plagal_iv_I: 'bt:harm06_plagal_iv_I',
  harm07_bridge_modulation_minor_third_up: 'bt:harm07_bridge_modulation_minor_third_up',
  harm08_pivot_I_to_IV_flatward: 'bt:harm08_pivot_I_to_IV_flatward',
  harm09_lydian_plagal_II_IV_I: 'bt:harm09_lydian_plagal_II_IV_I',
  harm09_bIII_IV_I_variant: 'bt:harm09_bIII_IV_I_variant',
  harm10_dim7_passing_chromatic: 'bt:harm10_dim7_passing_chromatic',
  harm11_aug_ascending_passing: 'bt:harm11_aug_ascending_passing',
  harm12_dom7sharp9_late_period: 'bt:harm12_dom7sharp9_late_period',
  harm13_sustained_chord_six_plus_bars: 'bt:harm13_sustained_chord_six_plus_bars',
  /** Bridge first harmony off tonic (BT_FORM_03 / BT_FP_03). */
  harm_bridge_first_off_tonic: 'bt:harm_bridge_first_off_tonic',
  /** Bridge exits on dominant (V) — retransition cue (BT_FORM_03 / BT_FP_03). */
  harm_bridge_dominant_retransition: 'bt:harm_bridge_dominant_retransition',
} as const;

const ROOT_AT_START = /^([A-G](?:#|b)?)/i;

export type BeatlesChordAnalysis = {
  rootPc: number;
  degreePc: number;
  hasMinorThird: boolean;
  hasMajorTriadShell: boolean;
  hasDiminishedSeventh: boolean;
  hasAugmented: boolean;
  hasDominantSevenSharpNine: boolean;
};

export function chordRootPcFromSymbol(symbol: string): number | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  if (/^tonic_wash$/i.test(hp.trim())) return undefined;
  const m = hp.trim().match(ROOT_AT_START);
  return m?.[1] ? noteNameToPitchClass(m[1]) : undefined;
}

/** Harmony flags for Beatles grammar — reads harmonic part only (slash chords OK). */
export function analyzeBeatlesChordSymbol(symbol: string, tonicPc: number): BeatlesChordAnalysis | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart.trim();
  if (!hp || /^tonic_wash$/i.test(hp)) return undefined;
  const rm = hp.match(ROOT_AT_START);
  const rootName = rm?.[1];
  const rootPc = rootName ? noteNameToPitchClass(rootName) : undefined;
  if (rootPc === undefined || !rootName) return undefined;
  const rest = hp.slice(rootName.length).toLowerCase();
  const hasMinorThird =
    /^(m|min|dim|ø|°)/.test(rest) || /m7|m9|m11|m13|min/.test(rest);
  const hasDiminishedSeventh = /dim|ø|°|\bo7\b|\bdim7\b/i.test(hp);
  const hasAugmented = /\baug\b/i.test(hp) || /^\+$/i.test(rest.trim()) || /\(#5\)/i.test(hp);
  const hasDominantSevenSharpNine = /7\s*#9|7#9|13\s*#9/i.test(hp);
  const hasMajorTriadShell =
    !hasMinorThird &&
    !hasDiminishedSeventh &&
    !hasAugmented &&
    !/^sus/.test(rest) &&
    (!/\b7\b|\b9\b|\b11\b|\b13\b/.test(rest) || /^maj/.test(rest));
  const degreePc = (rootPc - tonicPc + 12) % 12;
  return {
    rootPc,
    degreePc,
    hasMinorThird,
    hasMajorTriadShell,
    hasDiminishedSeventh,
    hasAugmented,
    hasDominantSevenSharpNine,
  };
}

/** Tonal centre for Roman analysis — key receipt if already present, else first chord root, else C. */
export function inferBeatlesAnalysisTonicPc(context: CompositionContext, bars: readonly string[]): number {
  const ks = context.generationMetadata?.keySignatureReceipt;
  if (ks && ks.exportMode === 'major' && ks.inferredMode === 'major') {
    return ks.inferredTonicPc;
  }
  const first = bars[0]?.trim();
  const pc = first ? chordRootPcFromSymbol(first) : undefined;
  return pc ?? 0;
}

function degreeTag(pc: number): string {
  const map: Record<number, string> = {
    0: 'I',
    1: 'bII',
    2: 'II',
    3: 'bIII',
    4: 'III',
    5: 'IV',
    6: 'bV',
    7: 'V',
    8: 'bVI',
    9: 'VI',
    10: 'bVII',
    11: 'VII',
  };
  return map[pc] ?? `d${pc}`;
}

export function applyBeatlesHarmonicGrammarReceipts(
  context: CompositionContext,
  bars: readonly string[],
  ctxMode: BeatlesContextMode
): string[] {
  const receipts: string[] = [];
  const tonicPc = inferBeatlesAnalysisTonicPc(context, bars);
  const analyses: Array<BeatlesChordAnalysis | undefined> = bars.map((b) =>
    analyzeBeatlesChordSymbol(b, tonicPc)
  );

  const n = bars.length;
  const barNum = (i: number) => i + 1;

  // BT_HARM_01 — bIII major as primary borrowed (co-occur with I / IV / V / bVII).
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a || a.degreePc !== 3 || a.hasMinorThird) continue;
    let neighborStructural = false;
    for (let j = Math.max(0, i - 1); j <= Math.min(n - 1, i + 1); j++) {
      const o = analyses[j];
      if (!o || o.hasMinorThird) continue;
      if (o.degreePc === 0 || o.degreePc === 5 || o.degreePc === 7 || o.degreePc === 10) neighborStructural = true;
    }
    if (neighborStructural) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm01_bIII_primary_borrowed}@${degreeTag(3)}@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_02 — bVII → I (Mixolydian cadence, penultimate bVII).
  for (let i = 0; i < n - 1; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    if (!a0 || !a1) continue;
    if (a0.degreePc === 10 && !a0.hasMinorThird && a1.degreePc === 0) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm02_bVII_mixolydian_cadence}@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_03 — bVI–bVII–I double plagal.
  for (let i = 0; i < n - 2; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    const a2 = analyses[i + 2];
    if (!a0 || !a1 || !a2) continue;
    if (
      a0.degreePc === 8 &&
      !a0.hasMinorThird &&
      a1.degreePc === 10 &&
      !a1.hasMinorThird &&
      a2.degreePc === 0
    ) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm03_double_plagal_bVI_bVII_I}@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_04 — iv minor → I or V.
  for (let i = 0; i < n - 1; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    if (!a0 || !a1) continue;
    if (a0.degreePc === 5 && a0.hasMinorThird && a1.degreePc === 0 && !a1.hasMinorThird) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm04_iv_minor_tension}@to_I@bar${barNum(i)}`);
      break;
    }
    if (a0.degreePc === 5 && a0.hasMinorThird && a1.degreePc === 7) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm04_iv_minor_tension}@to_V@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_05 — five-chord modal system I–bIII–IV–V–bVII (major triads on minor pentatonic roots).
  let modalHits = 0;
  for (let i = 0; i < n; i++) {
    const a = analyses[i];
    if (!a || a.hasMinorThird) continue;
    if ([0, 3, 5, 7, 10].includes(a.degreePc)) modalHits++;
  }
  if (n > 0 && modalHits / n >= 0.55) {
    receipts.push(`${beatlesHarmonicGrammarTags.harm05_modal_palette_five_chords}@density=${(modalHits / n).toFixed(2)}`);
  }

  // BT_HARM_06 — plagal IV–I / iv–I.
  for (let i = 0; i < n - 1; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    if (!a0 || !a1) continue;
    if (a0.degreePc === 5 && !a0.hasMinorThird && a1.degreePc === 0) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm06_plagal_IV_I}@bar${barNum(i)}`);
      break;
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    if (!a0 || !a1) continue;
    if (a0.degreePc === 5 && a0.hasMinorThird && a1.degreePc === 0 && a1.hasMajorTriadShell) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm06_plagal_iv_I}@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_07 — bridge locally a minor third above verse (first chord roots).
  const sections = context.form?.sections ?? [];
  const verseSec = sections.find((s) => /verse/i.test(s.label));
  const bridgeSec = sections.find((s) => /bridge|^B$/i.test(s.label));
  if (verseSec && bridgeSec) {
    const vBar = verseSec.startBar;
    const bBar = bridgeSec.startBar;
    if (vBar >= 1 && vBar <= n && bBar >= 1 && bBar <= n) {
      const vr = analyses[vBar - 1]?.rootPc;
      const br = analyses[bBar - 1]?.rootPc;
      if (vr !== undefined && br !== undefined && (br - vr + 12) % 12 === 3) {
        receipts.push(
          `${beatlesHarmonicGrammarTags.harm07_bridge_modulation_minor_third_up}@verse@${vBar}_bridge@${bBar}`
        );
      }
    }
  }

  // BT_HARM_08 — pivot: I then IV (same chord as V of flatward goal — Harrison/Lennon slide).
  for (let i = 0; i < n - 1; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    if (!a0 || !a1) continue;
    if (a0.degreePc === 0 && !a0.hasMinorThird && a1.degreePc === 5 && !a1.hasMinorThird) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm08_pivot_I_to_IV_flatward}@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_09 — II–IV–I (Lydian plagal) or bIII–IV–I.
  for (let i = 0; i < n - 2; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    const a2 = analyses[i + 2];
    if (!a0 || !a1 || !a2) continue;
    if (a0.degreePc === 2 && !a0.hasMinorThird && a1.degreePc === 5 && !a1.hasMinorThird && a2.degreePc === 0) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm09_lydian_plagal_II_IV_I}@bar${barNum(i)}`);
      break;
    }
  }
  for (let i = 0; i < n - 2; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    const a2 = analyses[i + 2];
    if (!a0 || !a1 || !a2) continue;
    if (a0.degreePc === 3 && !a0.hasMinorThird && a1.degreePc === 5 && !a1.hasMinorThird && a2.degreePc === 0) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm09_bIII_IV_I_variant}@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_10 — dim7 chromatic passing between roots m2/M2 apart.
  for (let i = 1; i < n - 1; i++) {
    const prev = analyses[i - 1];
    const mid = analyses[i];
    const next = analyses[i + 1];
    if (!prev || !mid || !next || !mid.hasDiminishedSeventh) continue;
    const d0 = Math.min(Math.abs(mid.rootPc - prev.rootPc), 12 - Math.abs(mid.rootPc - prev.rootPc));
    const d1 = Math.min(Math.abs(next.rootPc - mid.rootPc), 12 - Math.abs(next.rootPc - mid.rootPc));
    if (d0 <= 2 && d1 <= 2) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm10_dim7_passing_chromatic}@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_11 — augmented ascending passing I → aug → IV.
  for (let i = 0; i < n - 2; i++) {
    const a0 = analyses[i];
    const a1 = analyses[i + 1];
    const a2 = analyses[i + 2];
    if (!a0 || !a1 || !a2) continue;
    if (
      a0.degreePc === 0 &&
      !a0.hasMinorThird &&
      a1.hasAugmented &&
      a2.degreePc === 5 &&
      !a2.hasMinorThird
    ) {
      receipts.push(`${beatlesHarmonicGrammarTags.harm11_aug_ascending_passing}@bar${barNum(i)}`);
      break;
    }
  }

  // BT_HARM_12 — 7#9 colour (late period gate).
  if (ctxMode !== 'merseybeat_1962') {
    for (let i = 0; i < n; i++) {
      const a = analyses[i];
      if (a?.hasDominantSevenSharpNine) {
        receipts.push(`${beatlesHarmonicGrammarTags.harm12_dom7sharp9_late_period}@${ctxMode}@bar${barNum(i)}`);
        break;
      }
    }
  }

  // BT_HARM_13 — sustained single chord (6+ bars) as metric displacement cue (bar spine = one chord/bar default).
  let runStart = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || bars[i]?.trim() !== bars[i - 1]?.trim()) {
      const runLen = i - runStart;
      if (runLen >= 6) {
        receipts.push(`${beatlesHarmonicGrammarTags.harm13_sustained_chord_six_plus_bars}@${runLen}b@bar${runStart + 1}`);
      }
      runStart = i;
    }
  }

  // Bridge posture — first bar off-tonic; last bar dominant (BT_FORM_03, BT_FP_03 formal fingerprint).
  const sectionsForm = context.form?.sections ?? [];
  for (const sec of sectionsForm) {
    if (!/bridge/i.test(sec.label)) continue;
    const lo = sec.startBar;
    const hi = sec.startBar + sec.length - 1;
    if (lo >= 1 && lo <= n) {
      const fa = analyses[lo - 1];
      if (fa && fa.degreePc !== 0) {
        receipts.push(
          `${beatlesHarmonicGrammarTags.harm_bridge_first_off_tonic}@${degreeTag(fa.degreePc)}@bar${lo}`
        );
      }
    }
    if (hi >= 1 && hi <= n) {
      const la = analyses[hi - 1];
      if (la && la.degreePc === 7) {
        receipts.push(`${beatlesHarmonicGrammarTags.harm_bridge_dominant_retransition}@bar${hi}`);
      }
    }
    break;
  }

  return receipts;
}

/**
 * Beatles voice-leading / texture grammar (BT_VL_01–06) — receipt prefix **`bt:vlNN_*`**.
 */
export const beatlesVoiceLeadingGrammarTags = {
  vl01_minor_inner_line_chromatic_prototype: 'bt:vl01_minor_inner_line_chromatic_prototype',
  vl02_thirds_sixths_close_vocal_harmony: 'bt:vl02_thirds_sixths_close_vocal_harmony',
  vl03_bass_root_motion_era: 'bt:vl03_bass_root_motion_era',
  vl04_pedal_four_plus: 'bt:vl04_pedal_four_plus',
  vl04_pedal_section_boundary_release: 'bt:vl04_pedal_section_boundary_release',
  vl05_blue_note_clash_colour: 'bt:vl05_blue_note_clash_colour',
  vl06_SRDC_phrase_grid: 'bt:vl06_SRDC_phrase_grid',
} as const;

/**
 * Beatles rhythm / metric grammar (BT_RHYTHM_01–04) — receipt prefix **`bt:rhythmNN_*`**.
 */
export const beatlesRhythmGrammarTags = {
  rhythm01_early_straight_rock: 'bt:rhythm01_early_straight_rock',
  rhythm02_middle_syncopation_form_edges: 'bt:rhythm02_middle_syncopation_form_edges',
  rhythm03_late_odd_meter_relax: 'bt:rhythm03_late_odd_meter_relax',
  rhythm04_hold_then_double_harmonic_rhythm: 'bt:rhythm04_hold_then_double_harmonic_rhythm',
} as const;

/** BT_RHYTHM_04 — long pedal then faster chord rhythm (e.g. 6+ bar hold → bar-wise changes). */
export function applyBeatlesRhythmGrammarReceipts(bars: readonly string[]): string[] {
  const receipts: string[] = [];
  const n = bars.length;
  let runStart = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || bars[i]?.trim() !== bars[i - 1]?.trim()) {
      const runLen = i - runStart;
      if (runLen >= 6 && i < n && i + 1 < n) {
        const holdSym = bars[i - 1]?.trim();
        const nextSym = bars[i]?.trim();
        const afterSym = bars[i + 1]?.trim();
        if (holdSym && nextSym && afterSym && holdSym !== nextSym && nextSym !== afterSym) {
          receipts.push(
            `${beatlesRhythmGrammarTags.rhythm04_hold_then_double_harmonic_rhythm}@${runLen}b_hold@breakBar${i + 1}`
          );
          break;
        }
      }
      runStart = i;
    }
  }
  return receipts;
}

/** Beatles macro-form grammar (BT_FORM_01–07) — receipt prefix **`bt:formNN_*`**. */
export const beatlesFormGrammarTags = {
  form01_primary_VVBrV: 'bt:form01_primary_VVBrV_template',
  form02_secondary_verse_chorus: 'bt:form02_secondary_verse_chorus',
  form03_bridge_off_tonic_retransition: 'bt:form03_bridge_off_tonic_retransition',
  form04_verse_SRDC_subgrid: 'bt:form04_verse_SRDC_subgrid',
  form05_collage_late: 'bt:form05_collage_through_composed_late',
  form06_pivot_transition: 'bt:form06_pivot_section_transition',
  form07_period_mode_switch: 'bt:form07_period_mode_switch',
} as const;

export function applyBeatlesFormGrammarReceipts(
  context: CompositionContext,
  bars: readonly string[],
  ctxMode: BeatlesContextMode,
  harmonicReceipts: readonly string[]
): string[] {
  const receipts: string[] = [];
  if (bars.length >= 8) {
    receipts.push(`${beatlesFormGrammarTags.form04_verse_SRDC_subgrid}@bars_2+2+2+2`);
  }
  if (ctxMode === 'abbey_road_1968') {
    receipts.push(beatlesFormGrammarTags.form05_collage_late);
  }
  receipts.push(`${beatlesFormGrammarTags.form07_period_mode_switch}@${ctxMode}`);
  if (harmonicReceipts.some((r) => r.includes('harm07'))) {
    receipts.push(`${beatlesFormGrammarTags.form03_bridge_off_tonic_retransition}@aligned`);
  }
  if (harmonicReceipts.some((r) => r.includes('harm08'))) {
    receipts.push(beatlesFormGrammarTags.form06_pivot_transition);
  }
  void context;
  return receipts;
}

/** Beatles harmonic/melodic/formal research fingerprints (BT_FP_01–04) — **`bt:fpNN_*`**. */
export const beatlesFingerprintTags = {
  fp01_full_harmonic: 'bt:fp01_full_harmonic_fingerprint',
  fp02_full_melodic: 'bt:fp02_full_melodic_fingerprint',
  fp03_full_formal: 'bt:fp03_full_formal_fingerprint',
  fp04_writer_blended: 'bt:fp04_writer_mode_blended_default',
  fp04_writer_lennon: 'bt:fp04_writer_mode_lennon_mixolydian_bVII_stepwise',
  fp04_writer_mccartney: 'bt:fp04_writer_mode_mccartney_chromatic_borrowed_arpeggiated',
  fp04_writer_neutral: 'bt:fp04_writer_mode_neutral',
} as const;

/** BT_FP_01 — full when bIII + double plagal + iv tension + five-chord modal all appear in harmonic grammar. */
export function applyBeatlesHarmonicFingerprintReceipts(harmonicReceipts: readonly string[]): string[] {
  const has = (id: string) => harmonicReceipts.some((r) => r.includes(id));
  const c1 = has('harm01');
  const c2 = has('harm03');
  const c3 = has('harm04');
  const c4 = has('harm05');
  const out: string[] = [];
  if (c1) out.push('bt:fp01_component_bIII_primary_borrowed');
  if (c2) out.push('bt:fp01_component_double_plagal_bVI_bVII_I');
  if (c3) out.push('bt:fp01_component_iv_minor_tension');
  if (c4) out.push('bt:fp01_component_modal_five_chord_palette');
  if (c1 && c2 && c3 && c4) out.push(beatlesFingerprintTags.fp01_full_harmonic);
  return out;
}

/** BT_FP_03 — formal fingerprint vs macro form + SRDC + bridge harmony receipts. */
export function applyBeatlesFormalFingerprintReceipts(
  genMeta: GenerationMetadata,
  context: CompositionContext,
  formReceipts: readonly string[],
  harmonicReceipts: readonly string[]
): string[] {
  const tmpl = genMeta.beatlesFormTemplate as BeatlesFormTemplateId | undefined;
  const secs = context.form?.sections ?? [];
  const kinds = secs.map((s) => s.label.split('_')[0] ?? '');
  const vvbrvInfer =
    kinds.length === 4 &&
    kinds[0] === 'verse' &&
    kinds[1] === 'verse' &&
    kinds[2] === 'bridge' &&
    kinds[3] === 'verse';
  const vvbrv = tmpl === 'vv_br_v' || vvbrvInfer;

  const verseSecs = secs.filter((s) => s.label.startsWith('verse'));
  const versesEight = verseSecs.length > 0 && verseSecs.every((s) => s.length === 8);
  const hasSRDC = formReceipts.some((r) => r.includes('form04'));
  const offTonicBr = harmonicReceipts.some((r) => r.includes('harm_bridge_first_off_tonic'));
  const domRet = harmonicReceipts.some((r) => r.includes('harm_bridge_dominant_retransition'));

  const out: string[] = [];
  if (vvbrv) out.push('bt:fp03_component_VVBrV_macro_form');
  if (versesEight && hasSRDC) out.push('bt:fp03_component_SRDC_eight_bar_verse_grid');
  if (offTonicBr) out.push('bt:fp03_component_bridge_off_tonic_entry');
  if (domRet) out.push('bt:fp03_component_bridge_dominant_retransition_exit');
  if (vvbrv && versesEight && hasSRDC && offTonicBr && domRet) {
    out.push(beatlesFingerprintTags.fp03_full_formal);
  }
  return out;
}

/** BT_FP_02 — melodic fingerprint from planned devices + contour (Song Mode compile). */
export function applyBeatlesMelodicFingerprintReceipts(plan: MelodyBehaviourPlan): string[] {
  const dev = plan.devices;
  const hasD = (sub: string) => dev.some((x) => x.includes(sub));
  const srdcArch =
    hasD('mel01_SRDC') && plan.contourProfile === 'arch' && (plan.phraseLength >= 8 || hasD('bt:mel01'));
  const stepwise = plan.intervalTendency === 'stepwise';
  const blue = hasD('blue_note') || hasD('vl05');
  const srChord = hasD('vl06_SRDC');
  const nctD = hasD('beatles_fp02_NCT_departure_D');

  const out: string[] = [];
  if (srdcArch) out.push('bt:fp02_component_SRDC_arch_phrase');
  if (stepwise) out.push('bt:fp02_component_stepwise_dominance');
  if (blue) out.push('bt:fp02_component_blue_note_clash_colour');
  if (srChord) out.push('bt:fp02_component_chord_tones_SR_grid');
  if (nctD) out.push('bt:fp02_component_NCT_at_departure');
  if (srdcArch && stepwise && blue && srChord && nctD) {
    out.push(beatlesFingerprintTags.fp02_full_melodic);
  }
  return out;
}

/** BT_FP_04 — writer-mode fingerprint line for manifests. */
export function applyBeatlesWriterModeFingerprintReceipts(lens: BeatlesMelodicLens): string[] {
  switch (lens) {
    case 'lennon':
      return [beatlesFingerprintTags.fp04_writer_lennon];
    case 'mccartney':
      return [beatlesFingerprintTags.fp04_writer_mccartney];
    case 'blended':
      return [beatlesFingerprintTags.fp04_writer_blended];
    default:
      return [beatlesFingerprintTags.fp04_writer_neutral];
  }
}

/** Same-root minor lineage — BT_VL_01 prototype Am→Am(maj7)→Am7→Am6. */
export function beatlesMinorChordKind(symbol: string): 'triad' | 'mmaj7' | 'm7' | 'm6' | null {
  const hpRaw = parseChordSymbol(symbol).harmonyPart.trim();
  if (!hpRaw || /^tonic_wash$/i.test(hpRaw)) return null;
  const rm = hpRaw.match(ROOT_AT_START);
  const rootName = rm?.[1];
  if (!rootName) return null;
  const compact = hpRaw.replace(/\s/g, '');
  const tail = hpRaw.slice(rootName.length).toLowerCase();
  if (/dim|ø|°|m7b5|half|ø7/i.test(compact)) return null;
  if (/^maj|^Δ|^\+|^sus|^aug/i.test(tail)) return null;

  if (/m\(maj7\)|mmaj7|min\(maj7\)|m\(M7\)|mΔ/i.test(compact)) return 'mmaj7';
  if (/m6|min6/i.test(compact)) return 'm6';
  if ((/m7|min7/i.test(compact) || /^[a-g][#b]?-7\b/i.test(compact)) && !/maj7/i.test(compact)) return 'm7';

  const bareMinorTriad =
    /^m(in)?$/i.test(tail) ||
    /^-$/.test(tail) ||
    (/^m(?![0-9])/i.test(tail) && !/\d/.test(tail) && !/\(/.test(tail));
  if (bareMinorTriad) return 'triad';

  return null;
}

function pedalEndsAtSectionBoundary(context: CompositionContext, lastBar1Based: number): boolean {
  for (const sec of context.form?.sections ?? []) {
    const end = sec.startBar + sec.length - 1;
    if (end === lastBar1Based) return true;
  }
  return false;
}

export function applyBeatlesVoiceLeadingGrammarReceipts(
  context: CompositionContext,
  bars: readonly string[],
  _ctxMode: BeatlesContextMode
): string[] {
  const receipts: string[] = [];
  const n = bars.length;

  // BT_VL_01 — chromatic inner line prototype (same minor root: triad → m(maj7) → m7 → m6).
  for (let i = 0; i <= n - 4; i++) {
    const r0 = chordRootPcFromSymbol(bars[i] ?? '');
    const r1 = chordRootPcFromSymbol(bars[i + 1] ?? '');
    const r2 = chordRootPcFromSymbol(bars[i + 2] ?? '');
    const r3 = chordRootPcFromSymbol(bars[i + 3] ?? '');
    if (r0 === undefined || r0 !== r1 || r0 !== r2 || r0 !== r3) continue;
    const k0 = beatlesMinorChordKind(bars[i] ?? '');
    const k1 = beatlesMinorChordKind(bars[i + 1] ?? '');
    const k2 = beatlesMinorChordKind(bars[i + 2] ?? '');
    const k3 = beatlesMinorChordKind(bars[i + 3] ?? '');
    if (k0 === 'triad' && k1 === 'mmaj7' && k2 === 'm7' && k3 === 'm6') {
      receipts.push(`${beatlesVoiceLeadingGrammarTags.vl01_minor_inner_line_chromatic_prototype}@bar${i + 1}`);
      break;
    }
  }

  // BT_VL_04 — extended pedal (4+ bars); subsection release at section end.
  let runStart = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || bars[i]?.trim() !== bars[i - 1]?.trim()) {
      const runLen = i - runStart;
      if (runLen >= 4) {
        const lastBar1Based = i;
        receipts.push(`${beatlesVoiceLeadingGrammarTags.vl04_pedal_four_plus}@${runLen}b@endBar${lastBar1Based}`);
        if (pedalEndsAtSectionBoundary(context, lastBar1Based)) {
          receipts.push(
            `${beatlesVoiceLeadingGrammarTags.vl04_pedal_section_boundary_release}@endBar${lastBar1Based}`
          );
        }
      }
      runStart = i;
    }
  }

  // BT_VL_06 — eight-bar phrase grid (S/R bars 1–4, D 5–6, C 7–8) — planning hint when form long enough.
  if (n >= 8) {
    receipts.push(`${beatlesVoiceLeadingGrammarTags.vl06_SRDC_phrase_grid}@bars=1-8`);
  }

  return receipts;
}

const TIER_TO_POOL: readonly BeatlesChordPoolId[] = [
  'beatles_merseybeat_1962',
  'beatles_rubber_soul_1965',
  'beatles_abbey_road_1968',
];

export function resolveBeatlesChordPoolId(seed: number): BeatlesChordPoolId {
  const tier = Math.abs(seed) % 3;
  return TIER_TO_POOL[tier]!;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function sectionLabelForBar(bar: number, context: CompositionContext): string {
  const s = context.form.sections.find((sec) => bar >= sec.startBar && bar < sec.startBar + sec.length);
  return s?.label ?? 'A';
}

/** Receipt passes — tags **`bt:*`** aligned with {@link beatlesDevices}. */
function applyBeatlesDeviceReceiptPasses(
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: BeatlesContextMode
): void {
  const tags =
    ctx === 'merseybeat_1962'
      ? (['bt:d1_aaba_form', 'bt:d2_flat_side_modal'] as const)
      : ctx === 'rubber_soul_1965'
        ? (['bt:d2_flat_side_modal', 'bt:d4_chromatic_mediant'] as const)
        : (['bt:d3_co_tonic_switch', 'bt:d5_suite_form', 'bt:d4_chromatic_mediant'] as const);
  for (let b = 1; b <= tb; b++) {
    if (seededUnit(seed, b, 664101) < 0.11) {
      receipts.push(`${tags[b % tags.length]!}@bar${b}`);
    }
    if (sectionLabelForBar(b, context) === 'B' && seededUnit(seed, b, 664102) < 0.25) {
      receipts.push(`bt:d1_aaba_form@sectionB@bar${b}`);
    }
  }
}

export function isSongwriterBeatles(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'beatles' } {
  return genMeta?.songwriterStyleId === 'beatles';
}

export interface BeatlesHarmonyAccumulator {
  barsConsidered: number;
  functionalColourTouches: number;
  borrowedColourTouches: number;
}

export function createBeatlesHarmonyAccumulator(): BeatlesHarmonyAccumulator {
  return {
    barsConsidered: 0,
    functionalColourTouches: 0,
    borrowedColourTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BeatlesHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/7|9|11|13|maj|m7|dim|aug|sus|add/.test(t)) acc.functionalColourTouches++;
  if (/eb|bb|ab|gb|db|fm\b|gm\b|dm\b|am\b|bm\b|cm\b/i.test(c)) acc.borrowedColourTouches++;
}

export function accumulateBeatlesHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BeatlesHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

/** @deprecated — use resolveBarSymbol */
export function precomputeBeatlesEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const btCtx: BeatlesContextMode = genMeta.beatlesContext ?? 'merseybeat_1962';
  genMeta.beatlesContext = btCtx;

  const receipts: string[] = [];
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(resolveBarSymbol(context, b).symbol);
  }
  applyBeatlesDeviceReceiptPasses(seed, receipts, tb, context, btCtx);

  const grammarReceipts = applyBeatlesHarmonicGrammarReceipts(context, out, btCtx);
  genMeta.beatlesHarmonicGrammarReceipts = grammarReceipts;

  const vlHarmony = applyBeatlesVoiceLeadingGrammarReceipts(context, out, btCtx);
  genMeta.beatlesVoiceLeadingGrammarReceipts = [...(genMeta.beatlesVoiceLeadingGrammarReceipts ?? []), ...vlHarmony];

  const rhythmHarmony = applyBeatlesRhythmGrammarReceipts(out);
  genMeta.beatlesRhythmGrammarReceipts = [...(genMeta.beatlesRhythmGrammarReceipts ?? []), ...rhythmHarmony];

  const formHarmony = applyBeatlesFormGrammarReceipts(context, out, btCtx, grammarReceipts);
  genMeta.beatlesFormGrammarReceipts = [...(genMeta.beatlesFormGrammarReceipts ?? []), ...formHarmony];

  const fpHarm = applyBeatlesHarmonicFingerprintReceipts(grammarReceipts);
  const fpForm = applyBeatlesFormalFingerprintReceipts(genMeta, context, formHarmony, grammarReceipts);
  genMeta.beatlesFingerprintReceipts = [...(genMeta.beatlesFingerprintReceipts ?? []), ...fpHarm, ...fpForm];

  genMeta.beatlesEffectiveHarmonyBars = out;
  genMeta.beatlesDeviceReceipts = receipts;
}

export function finalizeBeatlesMetadata(metadata: GenerationMetadata, acc: BeatlesHarmonyAccumulator): void {
  const flat = [...(metadata.beatlesDeviceReceipts ?? [])];
  const harm = [...(metadata.beatlesHarmonicGrammarReceipts ?? [])];
  const vl = [...(metadata.beatlesVoiceLeadingGrammarReceipts ?? [])];
  const rhythm = [...(metadata.beatlesRhythmGrammarReceipts ?? [])];
  const form = [...(metadata.beatlesFormGrammarReceipts ?? [])];
  const fp = [...(metadata.beatlesFingerprintReceipts ?? [])];
  const d = {
    songwriterId: 'beatles' as const,
    barsConsidered: acc.barsConsidered,
    functionalColourTouches: acc.functionalColourTouches,
    borrowedColourTouches: acc.borrowedColourTouches,
    deviceReceipts: flat.length ? flat : undefined,
    harmonicGrammarReceipts: harm.length ? harm : undefined,
    voiceLeadingGrammarReceipts: vl.length ? vl : undefined,
    rhythmGrammarReceipts: rhythm.length ? rhythm : undefined,
    formGrammarReceipts: form.length ? form : undefined,
    fingerprintReceipts: fp.length ? fp : undefined,
  } as const;
  const receipt = [
    `Beatles (slice): functional≈${acc.functionalColourTouches}`,
    `borrowed≈${acc.borrowedColourTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
    harm.length ? `grammar=${harm.join(';')}` : '',
    vl.length ? `vl=${vl.join(';')}` : '',
    rhythm.length ? `rhythm=${rhythm.join(';')}` : '',
    form.length ? `form=${form.join(';')}` : '',
    fp.length ? `fp=${fp.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.beatlesDiagnostics = { ...d };
  metadata.beatlesSliceReceipt = receipt;
}

export const beatlesSlice = {
  id: 'beatles' as const,
  contexts: BEATLES_CONTEXTS,
  devices: beatlesDevices,
  harmonicGrammar: beatlesHarmonicGrammarTags,
  voiceLeadingGrammar: beatlesVoiceLeadingGrammarTags,
  rhythmGrammar: beatlesRhythmGrammarTags,
  formGrammar: beatlesFormGrammarTags,
  fingerprint: beatlesFingerprintTags,
  styleSurface: beatlesStyleSurface,
  chordPoolSpec: beatlesChordPoolSpec,
  resolveChordPoolId: resolveBeatlesChordPoolId,
} as const;
