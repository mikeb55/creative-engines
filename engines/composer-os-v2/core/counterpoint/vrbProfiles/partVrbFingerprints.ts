/**

 * Arvo Pärt — SQ Harmonic Voice fingerprint receipts (AP_*).

 * Tintinnabuli · modal diatonic · pedal bass · silence as structure.

 */



import { fillReceipts } from '../../composer/fillVrbReceipts';



const AP_BASE = [

  // ---- POLICY (6) ----

  'AP_POLICY_01 — harmonicRhythm slow: minChordDurationBars>=4; allowMidBarChange=false; SQ σ=16.',

  'AP_POLICY_02 — bassPolicy pedal-or-drone: tonic pedal / bass drone fifth under tintinnabuli T-voice.',

  'AP_POLICY_03 — parallelMotionPolicy allow: parallel fifths/octaves/unisons valid in M+T texture.',

  'AP_POLICY_04 — suppressFunctionalResolution=true; no functional V–I cadence grammar.',

  'AP_POLICY_05 — silenceAsStructureEnabled: rests and unison–triad collapse mark phrase boundaries.',

  'AP_POLICY_06 — phraseArticulation non_resolving: modal endings; inconclusiveEndingCredit high.',

  // ---- HARM (5) ----

  'AP_HARM_01 — modal_tonic_triad default sonority: diatonic triad on single tonal centre.',

  'AP_HARM_02 — modal_open_fifth colour: hollow parallel fifths and open triad spacing.',

  'AP_HARM_03 — bass_drone_fifth / tonic_pedal: sustained bass anchor through slow HR.',

  'AP_HARM_04 — pandiatonic_chord surface: white-note field without chromatic functional driver.',

  'AP_HARM_05 — no dominant seventh: dom7 excluded; authenticCadencePenalty high on GCE path.',

  // ---- VL (4) ----

  'AP_VL_01 — M-voice stepwise-diatonic: preferredIntervalSets [1,2,5,7]; lyrical soprano arch.',

  'AP_VL_02 — maxLeapSemitones=3: near-stepwise melody tighter than Glass additive loops.',

  'AP_VL_03 — open fifth cadence: preferredIntervals [0,5,7,12]; parallel fifth arrivals valid.',

  'AP_VL_04 — unison arrivals valid: ic0 in preferredIntervals; M+T unison collapse at boundaries.',
  'AP_T_VOICE_01 — T-voice pitch set strictly {tonic, mediant, dominant}; mechanical tintinnabuli shadow of M.',

  // ---- FORM (4) ----

  'AP_FORM_01 — single tonal centre throughout: singleTonalCentre=true; no modulation driver.',

  'AP_FORM_02 — no modulation: modal field fixed; third-relation colour only within centre.',

  'AP_FORM_03 — additive duration extension: phrase cells lengthen by repetition not development.',

  'AP_FORM_04 — silence punctuation: silenceBoundaryCredit high; phrase joints at rest windows.',

  // ---- WORK (6) ----

  'AP_WORK_SPIEGEL_01 — Spiegel im Spiegel: M+T two-voice; open fifth pedal; sustained tonal centre.',
  'AP_WORK_SPIEGEL_IM_SPIEGEL — Spiegel im Spiegel: M palindrome + arpeggiated T; 1_above halo default.',

  'AP_WORK_FRATRES — Fratres: modal variation set; bass drone; rhythmic displacement of T-voice.',

  'AP_WORK_FUR_ALINA — Für Alina: minimal piano; stepwise M; triadic T; silence as phrase punctuation.',

  'AP_WORK_TABULA_RASA — Tabula Rasa: string orchestra sustained pads; strict tintinnabuli grammar.',

  'AP_WORK_SPIEGEL_VARIANT — Spiegel im Spiegel (variant): whole-bar chord HR; arpeggiated T-voice.',

  'AP_WORK_PASSIO — Passio: choral tintinnabuli; strict modal; Gregorian influence on M-voice.',

  // ---- DIFF (3) ----

  'AP_DIFF_RG_01 — vs Reich/Glass: forbid phase_shift and additive_growth as structural subject; silence + M/T pair logic.',
  'AP_DIFF_VS_GLASS_01 — vs Glass: tintinnabuli M+T algorithm not additive registral process; single centre not cycling.',

  'AP_DIFF_VS_SATIE_01 — vs Satie: spiritual austerity not ironic detachment; open fifths not parallel planing blocks.',

  'AP_DIFF_VS_WEBERN_01 — vs Webern: modal diatonic stasis not chromatic serial fragmentation; σ=16 not σ=40.',

] as const;



export const ARVO_PART_VRB_FINGERPRINT_RECEIPTS = fillReceipts(

  'AP',

  'Arvo Pärt SQ',

  AP_BASE,

  30,

);


