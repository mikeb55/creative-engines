/**
 * Erik Satie — SQ Harmonic Voice fingerprint receipts (ES_*).
 * Gymnopédies · Gnossiennes · furniture music · parallel planing stasis.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const ES_BASE = [
  // ---- POLICY (8) ----
  'ES_POLICY_01 — harmonicRhythm slow: minChordDurationBars>=4; allowMidBarChange=false; SQ σ=19.',
  'ES_POLICY_02 — bassPolicy pedal-or-static: tonic/modal pedal or root; no walking melodic bass.',
  'ES_POLICY_03 — voicingPolicy parallel planing allowed; narrow spread 12–18 st; forbidParallelFifths=false.',
  'ES_POLICY_04 — melodicPolicy stepwise periodic cells; maxLeapSemitones=4; deadpan contour.',
  'ES_POLICY_05 — rhythmPolicy slow pulse; antiMetric=false; no swing; no groove backbeat.',
  'ES_POLICY_06 — repairPolicy resolveParallels=false: parallel thirds/sixths/fifths by design.',
  'ES_POLICY_07 — formPolicy stasis / furniture arc; noTeleologicalDevelopment; stasisSurface=true.',
  'ES_POLICY_08 — suppressFunctionalResolution=true; dominantResolutionPenalty high; sqVrbProfileId=satie.',
  // ---- HARM (6) ----
  'ES_HARM_01 — plain triads default sonority: triad_skeleton root/first inversion.',
  'ES_HARM_02 — added-note surface: add9_add6_add11_surface stable colour without functional prep.',
  'ES_HARM_03 — parallel planing of maj7/maj6 blocks; parallel_color_shift whole-stack steps.',
  'ES_HARM_04 — modal centres: modal_aeolian/dorian/phrygian/mixolydian; no tonal hierarchy driver.',
  'ES_HARM_05 — unresolved dominant colour: dom7 as colour; unresolvedDominantEnabled; low V→I probability.',
  'ES_HARM_06 — pandiatonic surface: pandiatonic_chord stacks; tonal_centre_without_V_I closure.',
  // ---- VL (5) ----
  'ES_VL_01 — stepwise motion default; preferredIntervalSets [1,2,3,4].',
  'ES_VL_02 — parallel thirds/sixths by design; parallelThirdSixthBonus high on GCE path.',
  'ES_VL_03 — maxLeap 4 semitones; no leading-tone climax grammar.',
  'ES_VL_04 — voice crossing optional; naive salon voice-leading permitted.',
  'ES_VL_05 — pedal bass independence; tonic_pedal under planed upper blocks.',
  // ---- MEL (4) ----
  'ES_MEL_01 — deadpan periodic cells; phraseCellBars 2–4; looping_cell_no_cadence.',
  'ES_MEL_02 — no development or climax; noTeleologicalDevelopment; ironic detachment.',
  'ES_MEL_03 — static repetition as aesthetic; ostinatoPhraseEndingCredit high.',
  'ES_MEL_04 — ironic detachment in contour; ironicStyleSwitchEnabled at slice level.',
  // ---- FORM (4) ----
  'ES_FORM_01 — furniture music stasis; furnitureModeEnabled; arbitrary module concat.',
  'ES_FORM_02 — no arc / no climax; sectionRecallEnforced=false; non-teleological.',
  'ES_FORM_03 — atmospheric non-development; wallToWallPhrasePenalty low.',
  'ES_FORM_04 — gnossienne barless feel: loose 16-unit grid at slice; barred default antiMetric=false.',
  // ---- WORK (5) ----
  'ES_WORK_GYMNOPEDIE_01 — Gymnopédie No.1: slow triad planing, add9 surface, pedal bass.',
  'ES_WORK_GYMNOPEDIE_02 — Gymnopédie No.2: modal harmony, unresolved dominants, sparse texture.',
  'ES_WORK_GNOSSIENNE_01 — Gnossienne No.1: barless modal deadpan; Phrygian-flavoured colour.',
  'ES_WORK_GNOSSIENNES_01 — Trois Gnossiennes: suppressed resolution, pedal bass, planed blocks.',
  'ES_WORK_VEXATIONS_01 — Vexations: extreme stasis, harmonic ambiguity, obsessive loop.',
  // ---- DIFF (3) ----
  'ES_DIFF_VS_GLASS_01 — vs Glass: periodic deadpan cells not additive registral accumulation.',
  'ES_DIFF_VS_RAVEL_01 — vs Ravel: deadpan salon stasis not impressionist chromatic colour.',
  'ES_DIFF_VS_BADALAMENTI_01 — vs Badalamenti: ironic furniture not noir atmospheric jazz cushion.',
] as const;

export const SATIE_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'ES',
  'Erik Satie SQ',
  ES_BASE,
  35,
);
