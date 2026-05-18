/**
 * Hans Zimmer — VoiceRuleBundle fingerprint receipts.
 *
 * Inception / Interstellar / Gladiator grammar.
 * HZ_* receipts encode ostinato accumulative arc + passacaglia sub-mode.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const HZ_BASE = [
  'HZ_POLICY_01 — voiceId=hans_zimmer: repeating_ostinato_no_cadence; dynamically_wide_arc_accumulative; passacagliaMode default on bundle.',
  'HZ_POLICY_02 — harmonicRhythm: 1–8+ bars; minChordDurationBars=1; layered power harmony.',
  'HZ_POLICY_03 — contrapuntalLinePolicy: low independence; parallel octaves allowed; fixed line roles.',
  'HZ_POLICY_04 — sqVrbProfileId=zimmer; zimmerPassacagliaSubMode documented; bestBbStyle=schneider.',
  'HZ_HARM_01 — modal static beds + chromatic swell; power-chord and sus overlays.',
  'HZ_HARM_02 — additiveLayeringCredit; wallToWallPhrasePenalty=0; inconclusive endings valid.',
  'HZ_VL_01 — layered ostinato; bass drone under upper cells.',
  'HZ_VL_02 — minimal voice-leading motion inside ostinato loops.',
  'HZ_MEL_01 — simple iconic cells; registral build over time; contour pattern-loop.',
  'HZ_FORM_01 — accumulative arch; climax engineering via density not cadence.',
  'HZ_TEX_01 — hybrid orchestral + synth planning; BRAAAM-adjacent low register.',
  'HZ_WORK_INCEPTION_01 — Inception: BRAAAM low-register impact + ticking ostinato cells.',
  'HZ_WORK_INTERSTELLAR_01 — Interstellar: organ pedal + wide accumulative string swell.',
  'HZ_WORK_GLADIATOR_01 — Gladiator: vocal-orchestral ostinato + modal power harmony.',
  'HZ_DIFF_GLASS_01 — vs Glass (film): more dynamic registral arc; less strict interval-cycle stasis.',
  'HZ_DIFF_WILLIAMS_01 — vs Williams: less thematic leitmotif development; more ostinato accumulation.',
  'HZ_DIFF_HERRMANN_01 — vs Herrmann: power ostinato not string-cluster thriller; broader parallel octaves.',
  'HZ_RHY_01 — rhythmicIndependenceRequired=false; repeating ostinato phrase grammar.',
] as const;

export const ZIMMER_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'HZ',
  'Hans Zimmer film',
  HZ_BASE,
  40,
);
