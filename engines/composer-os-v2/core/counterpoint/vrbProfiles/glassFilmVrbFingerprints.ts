/**
 * Philip Glass (film) — VoiceRuleBundle fingerprint receipts.
 *
 * Koyaanisqatsi / The Hours / Mishima grammar.
 * PG_* receipts encode looping-cell additive film grammar (not reich_glass minimalist alias).
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const PG_BASE = [
  'PG_POLICY_01 — voiceId=philip_glass_screen: looping_cell_no_cadence; mid_register_additive_expansion; tight register σ (18 st).',
  'PG_POLICY_02 — harmonicRhythm: 2–4 bar cells; modalEndingsValid; authenticCadenceCredit=0; singleTonalCentre.',
  'PG_POLICY_03 — contrapuntalLinePolicy: low independence; strict_interval_cycle; parallel octaves allowed.',
  'PG_POLICY_04 — sqVrbProfileId=glass; distinct from philip_glass→reich_glass; bestBbStyle=schneider.',
  'PG_HARM_01 — diatonic modal stasis: aeolian/dorian/phrygian surfaces; triad_skeleton + add9_add6_add11_surface.',
  'PG_HARM_02 — additive pattern shifts; chordTransitionAsBoundary; inconclusiveEndingCredit.',
  'PG_VL_01 — minimal inner voice motion; repetition over resolution.',
  'PG_VL_02 — tonic_pedal under arpeggiated upper layers.',
  'PG_MEL_01 — arpeggiated cells; registral loops; glassSignatureIntervalBlend.',
  'PG_MEL_02 — maxLeap restricted by forbiddenIntervals [8,9,10,11] in dissonance profile.',
  'PG_FORM_01 — additive accumulation; gradual phase shift; no cadential period closure.',
  'PG_TEX_01 — ensemble layering credit; wallToWallPhrasePenalty=0 on profile.',
  'PG_WORK_KOYAANISQATSI_01 — Koyaanisqatsi: motor additive arpeggiation + registral expansion cycles.',
  'PG_WORK_HOURS_01 — The Hours: intimate piano-string loops; modal stasis with subtle shift.',
  'PG_WORK_MISHIMA_01 — Mishima: strict interval cycles + Japanese-minimalist restraint.',
  'PG_DIFF_REICH_GLASS_01 — vs reich_glass: more narrative film arc; less pure process-phase subject.',
  'PG_DIFF_ZIMMER_01 — vs Zimmer: less power-chord ostinato swell; more additive arpeggio cells.',
  'PG_DIFF_WILLIAMS_01 — vs Williams: no leitmotif heroic cadence; looping not thematic development.',
  'PG_RHY_01 — rhythmicIndependenceRequired=false; ostinatoPhraseEndingCredit high.',
] as const;

export const GLASS_FILM_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'PG',
  'Philip Glass film',
  PG_BASE,
  40,
);
