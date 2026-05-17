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
  | 'heroic_arch_with_fanfare_leaps'
  | 'lyrical_soprano_arch_mid_centrist'
  | 'dramatically_volatile_wide_arc'
  | 'mid_register_additive_expansion'
  | 'dynamically_wide_arc_accumulative'
  | 'systematic_bass_to_soprano_expansion'
  | 'mid_register_chromatic_inner_compression'
  | 'low_biased_extreme_punctuation_spikes';

/** SQ→BB phrase surface grammar. */
export type SqVrbPhraseArticulation =
  | 'periodic_cadential'
  | 'continuous_motor_rhythm'
  | 'ostinato_cell_based'
  | 'folk_modal_suspended'
  | 'romantic_periodic_cadential'
  | 'strict_periodic_tonal_cadence'
  | 'doubly_open_cell_development'
  | 'looping_cell_no_cadence'
  | 'repeating_ostinato_no_cadence'
  | 'ground_iterations_progressive_entry'
  | 'through_composed_arch_no_cadence'
  | 'asymmetric_cell_non_resolving';

/** Badalamenti three-tier texture — melody / chromatic inner cushion / bass pedal. */
export interface SqBadalamentiThreeTierTexture {
  melodyLine: 'vln_i_lead';
  innerVoices: 'chromatic_jazz_extensions';
  bassLine: 'pedal_anchor';
}

/** Zimmer passacaglia sub-profile (ground bass + progressive entry; not a separate vrbId). */
export interface SqZimmerPassacagliaSubMode {
  independenceLevel: SqVrbIndependenceLevel;
  registerPolicy: SqVrbRegisterPolicy;
  phraseArticulation: SqVrbPhraseArticulation;
  gceRegisterCohesionStdevCeilingSt: number;
}

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
  | 'romantic_periodic_cadential'
  | 'strict_periodic_tonal_cadence'
  | 'doubly_open_cell_development'
  | 'looping_cell_no_cadence'
  | 'repeating_ostinato_no_cadence'
  | 'through_composed_arch_no_cadence'
  | 'asymmetric_cell_non_resolving';

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
  /** MI: blend verismo stepwise + chromatic-neighbour + mediant color. */
  rotaSignatureIntervalBlend?: number;
  /** MI: credit parallel 3rds/6ths in contour (Vln II/Vla doubling proxy). */
  parallelThirdSixthBonus?: number;
  /** PG: penalize wall-to-wall spans without articulated cadence joints. */
  wallToWallPhrasePenalty?: number;
  /** MI: blend Goldsmith sequential ascent + chromatic-mediant + jazz color. */
  goldsmithSignatureIntervalBlend?: number;
  /** PG: modal / chromatic-mediant non-tonic endings valid. */
  modalEndingsValid?: boolean;
  /** MI: credit rising sequential pitch ascent (σ soft warning above soft ceiling). */
  sequentialAscentCredit?: number;
  /** PG: chromatic-mediant third-relations as closure color. */
  chromaticMediantCredit?: number;
  /** MI/PG: σ soft-penalty floor only above this (Goldsmith sequential ascent). */
  registerCohesionSoftCeilingSt?: number;
  /** MI: blend Glass narrow-step pattern-loop signature. */
  glassSignatureIntervalBlend?: number;
  /** MI: blend Zimmer ostinato step / ascending Shepard-tone signature. */
  zimmerSignatureIntervalBlend?: number;
  /** PG/MI: ♭VI submediant colour chord credit. */
  subMediantColorCredit?: number;
  /** PG: 2-bar chord-change counts as phrase boundary. */
  chordTransitionAsBoundary?: boolean;
  /** PG: suppress wall-to-wall penalty (continuous arpeggiation valid). */
  wallToWallPhrasePenalty?: number;
  /** PG: credit additive density increase across phrase repetitions. */
  additiveLayeringCredit?: number;
  /** MI/PG: single modal centre — no modulation penalty. */
  singleTonalCentre?: boolean;
  /** MI: blend Badalamenti cool-jazz modal stepwise + extension colour. */
  badalamentiSignatureIntervalBlend?: number;
  /** PG: coda dissolution return to dark intro = phrase boundary. */
  codaDissolutionCredit?: number;
  /** PG/MI: jazz extension voicing colour (m7, maj9, add9, Lydian ♯11). */
  jazzExtensionCredit?: number;
  /** PG: sustained bass pedal through chord changes valid. */
  bassPedalCredit?: number;
  /** PG/MI: Miles Davis modal / Kind of Blue sparse field. */
  coolJazzModalCredit?: number;
  /** MI: blend DSCH semitone / minor-third / tritone signature. */
  shostakovichSignatureIntervalBlend?: number;
  /** PG/MI: structural tritone at phrase boundary (recapitulation axis). */
  tritoneAxisCredit?: number;
  /** PG/MI: major/minor third-relation harmonic motion. */
  thirdRelationCredit?: number;
  /** MI: ic1/ic2 approach to resolution (not diatonic step penalty). */
  halfStepApproachCredit?: number;
  /** PG: cello pedal / passacaglia ground while upper voices develop. */
  passacagliaPedalCredit?: number;
  /** PG: stretto motivic saturation over long spans without closure. */
  strettoMotifSaturationCredit?: number;
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
  /** Zimmer — passacaglia ground-bass sub-mode (documented; not a separate vrbId). */
  zimmerPassacagliaSubMode?: SqZimmerPassacagliaSubMode;
  /** Badalamenti — Vln I melody / inner jazz cushion / Vc pedal (documented). */
  badalamentiThreeTierTexture?: SqBadalamentiThreeTierTexture;
}
