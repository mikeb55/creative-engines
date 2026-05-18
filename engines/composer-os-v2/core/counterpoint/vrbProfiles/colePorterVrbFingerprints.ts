/**
 * Cole Porter — SQ Harmonic Voice fingerprint receipts (CP_*).
 * Songbook chromatic functionalism; AABA; chromatic bass descent.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const CP_BASE = [
  // ---- POLICY (8) ----
  'CP_POLICY_01 — harmonicRhythm 1–2 bars; allowMidBarChange on passing chords; SQ σ=25.',
  'CP_POLICY_02 — bassPolicy chromatic-descent-or-root: semitone descent chains + cadential root.',
  'CP_POLICY_03 — voicingPolicy close–moderate spread 14–20 st; chromatic inner voice colour.',
  'CP_POLICY_04 — melodicPolicy speech-elegant contour; maxLeapSemitones=14; sequential ascent patterns.',
  'CP_POLICY_05 — rhythmPolicy antiMetric=false; swingFeel=false; refined songbook pulse.',
  'CP_POLICY_06 — repairPolicy resolveParallels=true: classical contrary motion at cadence.',
  'CP_POLICY_07 — formPolicy AABA + bridge contrast; sectionRecallEnforced; clear cadential arrival.',
  'CP_POLICY_08 — functional resolution enabled; suppressFunctionalResolution=false; sqVrbProfileId=cole_porter.',
  // ---- HARM (6) ----
  'CP_HARM_01 — chromatic_mediants + chromatic_median_shift as primary colour pivots.',
  'CP_HARM_02 — secondary_dominant chains; applied dominants into bridge regions.',
  'CP_HARM_03 — dim passing: vii_half_dim7 / ii_half_dim7 stitching semitone bass steps.',
  'CP_HARM_04 — major/minor mixture: parallel-major/minor flip on shared tonic_pc.',
  'CP_HARM_05 — neapolitan_phrygian_color borrowed predominant fingerprint.',
  'CP_HARM_06 — dom7alt surface + add9_add6_add11_surface maj6/maj7 finish colours.',
  // ---- VL (5) ----
  'CP_VL_01 — chromatic stepwise bass descent between functional pillars.',
  'CP_VL_02 — rhetorical melodic leaps (7ths/9ths) as punctuation; scalar fill after.',
  'CP_VL_03 — halfStepApproachCredit: chromatic approach notes to chord tones.',
  'CP_VL_04 — inner voice jazz-extension colour under speech-led melody.',
  'CP_VL_05 — cadential contrary motion; guideToneVoiceLeading at dominants.',
  // ---- MEL (4) ----
  'CP_MEL_01 — speech-contour arch; lyric-led periodic phrasing.',
  'CP_MEL_02 — Night and Day sequential ascent model over prolonged tonic colour.',
  'CP_MEL_03 — chromatic approach notes to resolution targets.',
  'CP_MEL_04 — clear periodic phrasing every 4–8 bars; authenticCadenceCredit high.',
  // ---- FORM (4) ----
  'CP_FORM_01 — AABA structure default; aaba-or-extended-refrain narrativeArc.',
  'CP_FORM_02 — bridge contrast via chromatic mediant or deceptive motion.',
  'CP_FORM_03 — chromatic colour as tension device before cadential release.',
  'CP_FORM_04 — clear cadential arrival; dominantResolutionPenalty low.',
  // ---- WORK (5) ----
  'CP_WORK_NIGHT_AND_DAY_01 — Night and Day: sequential ascent + chromatic descent bass.',
  'CP_WORK_I_GOT_YOU_01 — I Got You Under My Skin: chromatic mediants, long melodic arch.',
  'CP_WORK_ANYTHING_GOES_01 — Anything Goes: functional harmony, comic clarity.',
  'CP_WORK_EVERY_TIME_01 — Every Time We Say Goodbye: major/minor mixture, chromatic VL.',
  'CP_WORK_BEGIN_BEGUINE_01 — Begin the Beguine: long through-composed sequential development.',
  // ---- DIFF (3) ----
  'CP_DIFF_VS_GERSHWIN_01 — vs Gershwin: elegant chromatic songbook vs concert bravura.',
  'CP_DIFF_VS_GOLDSMITH_01 — vs Goldsmith: AABA song form vs film suite doubly-open cells.',
  'CP_DIFF_VS_BADALAMENTI_01 — vs Badalamenti: urbane wit vs noir atmospheric cushion.',
] as const;

export const COLE_PORTER_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'CP',
  'Cole Porter SQ',
  CP_BASE,
  35,
);
