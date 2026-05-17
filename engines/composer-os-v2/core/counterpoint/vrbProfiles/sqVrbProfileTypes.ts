import type { ContrapuntalLinePolicy } from '../../composer/voiceRuleBundle';
import type { SqToBbStyleProfileId } from '../sqToBbWorkflowTypes';

/** SQ→BB contrapuntal independence tier (Herrmann = low, Ravel = moderate, Bartók = high). */
export type SqVrbIndependenceLevel = 'low' | 'moderate' | 'high';

/** SQ→BB imitation grammar. */
export type SqVrbImitationStyle =
  | 'motivic_echo'
  | 'strict_interval_cycle'
  | 'staggered_entry'
  | 'climactic_synthesis'
  | 'leitmotif_development';

/** SQ→BB soprano register posture for GCE + line policy metadata. */
export type SqVrbRegisterPolicy =
  | 'comfortable_with_climax_leaps'
  | 'wide_registral_contrast'
  | 'extreme_registers'
  | 'lyrical_arch'
  | 'heroic_arch_with_fanfare_leaps';

/** SQ→BB phrase surface grammar. */
export type SqVrbPhraseArticulation =
  | 'periodic_cadential'
  | 'continuous_motor_rhythm'
  | 'ostinato_cell_based'
  | 'folk_modal_suspended'
  | 'romantic_periodic_cadential';

/** Extended contrapuntal policy — SQ Harmonic Voice picker VRBs only. */
export interface SqContrapuntalLinePolicy extends ContrapuntalLinePolicy {
  vrbId: string;
  independenceLevel: SqVrbIndependenceLevel;
  imitationStyle: SqVrbImitationStyle;
  registerPolicy: SqVrbRegisterPolicy;
  phraseArticulation: SqVrbPhraseArticulation;
}

/** Stable extended-dominant / modal color symbols for harmony + GCE (not passing-only). */
export type SqVrbChordVocabularyTag =
  | 'dom7'
  | 'dom9'
  | 'dom11'
  | 'dom13'
  | 'dom7alt'
  | 'aug9'
  | 'aug11'
  | 'ii_half_dim7'
  | 'vii_half_dim7'
  | 'octatonic_whole_half'
  | 'octatonic_half_whole'
  | 'added_note_color'
  | 'parallel_color_shift'
  | 'poly_triad_minor_second'
  | 'poly_triad_tritone'
  | 'tritone_dyad_anchor'
  | 'cluster_color_high_register'
  | 'chromatic_median_shift'
  | 'leitmotif_polytriad'
  | 'modal_aeolian'
  | 'modal_dorian'
  | 'modal_phrygian'
  | 'modal_mixolydian'
  | 'chromatic_median_bIII'
  | 'chromatic_median_bVI'
  | 'chromatic_median_bII'
  | 'aeolian_cadence_bVI_bVII_i'
  | 'spaghetti_half_cadence_bIII_V'
  | 'triad_skeleton'
  | 'add9_add6_add11_surface'
  | 'dominant_pedal'
  | 'tonic_pedal'
  | 'bass_drone_fifth'
  | 'chromatic_mediants'
  | 'lydian_IV'
  | 'quartal_fanfare'
  | 'modal_interchange_bVII'
  | 'secondary_dominant'
  | 'neapolitan_phrygian_color'
  | 'pandiatonic_chord';

/** GCE phrase-grammar mode for SQ Harmonic Voice profiles. */
export type SqVrbGcePhraseGrammarMode =
  | 'periodic_cadential'
  | 'ostinato_cell'
  | 'folk_modal_suspended'
  | 'romantic_periodic_cadential';

/** Per-VRB GCE Melodic Identity / Phrase Grammar tweaks (SQ→BB path). */
export interface SqVrbGceScorerAdjustments {
  /** Per-meso soprano σ ceiling (semitones); Bartók default path uses 24. */
  registerCohesionStdevCeilingSt: number;
  motifRecurrenceWeight: number;
  intervalEconomyWeight: number;
  registerCohesionWeight: number;
  /** Reward motivic cells in meso quantizer spans (Ravel 2–4 bars; Herrmann shorter). */
  phraseCellBarsMin: number;
  phraseCellBarsMax: number;
  /** Reward N-bar phrase multiples (0 = skip periodic multiple bonus). */
  phrasePeriodBars: number;
  /** Cyclic return credit when first/last meso share motivic interval shape. */
  cyclicMotifReturnBoost: number;
  /** Phrase Grammar scoring path. */
  phraseGrammarMode?: SqVrbGcePhraseGrammarMode;
  /** MI motif recurrence hard-fail floor (default 0.35). */
  motifRecurrenceHardFailMin?: number;
  /** Blend Herrmann semitone / tritone / minor-third interval signature into MI. */
  herrmannSignatureIntervalBlend?: number;
  /** PG: credit ostinato loop closures without classical cadence. */
  ostinatoPhraseEndingCredit?: number;
  /** PG: weak cadence tags still count as closed phrase. */
  dissonantClosureCredit?: number;
  /** MI: blend folk-modal stepwise / fourth / fifth signature. */
  morriconeSignatureIntervalBlend?: number;
  /** PG: long arch phrases (bars). */
  longPhraseBarsMin?: number;
  /** PG: inconclusive / suspended endings valid. */
  inconclusiveEndingCredit?: number;
  /** PG: modal cadences (♭VI–♭VII–i, ♭III–V) count as closure. */
  modalCadenceCredit?: number;
  /** MI: blend heroic P4/P5/M3 + stepwise signature; penalize semitone/tritone obsession. */
  williamsSignatureIntervalBlend?: number;
  /** PG: authentic / strong cadence closure credit. */
  authenticCadenceCredit?: number;
}

/** SQ Harmonic Voice profile — contrapuntal policy + BB translation hints. */
export interface SqVrbProfile {
  vrbId: string;
  contrapuntalLinePolicy: SqContrapuntalLinePolicy;
  chordVocabulary: readonly SqVrbChordVocabularyTag[];
  bestBbStyle: SqToBbStyleProfileId;
  secondaryBbStyle: SqToBbStyleProfileId;
  cautionBbStyle: SqToBbStyleProfileId;
  gceScorerAdjustments: SqVrbGceScorerAdjustments;
  /** Late-style modal pedal / Spanish dance — not default quartet behavior. */
  lateStyleAvailable?: boolean;
  /** Herrmann: thriller vs romantic harmonic surface. */
  herrmannRomanticModeAvailable?: boolean;
  /** Morricone — sustained pedal valid up to N bars without penalty. */
  pedalPointValidBars?: number;
  /** Morricone — western vs romantic period surface. */
  morriconeRomanticModeAvailable?: boolean;
}
