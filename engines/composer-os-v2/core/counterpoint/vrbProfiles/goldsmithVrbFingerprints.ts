/**
 * Jerry Goldsmith — VoiceRuleBundle fingerprint receipts.
 *
 * Chinatown / Planet of the Apes / Patton grammar.
 * JG_* receipts encode doubly-open cells + volatile register arc.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const JG_BASE = [
  'JG_POLICY_01 — voiceId=jerry_goldsmith: doubly_open_cell_development; dramatically_volatile_wide_arc register policy.',
  'JG_POLICY_02 — harmonicRhythm: 4–6 bar cells; modalEndingsValid; chromaticMediantCredit in GCE.',
  'JG_POLICY_03 — contrapuntalLinePolicy: moderate independence; dynamic line roles; staggered_entry.',
  'JG_POLICY_04 — sqVrbProfileId=goldsmith; bestBbStyle=schneider; dom7alt + chromatic_median vocabulary.',
  'JG_HARM_01 — post-tonal chromatic spine; cluster-adjacent added_note_color; aug9 + dom7alt.',
  'JG_HARM_02 — sequentialAscentCredit; inconclusiveEndingCredit; modal cadence without V→I teleology.',
  'JG_VL_01 — angular contrary motion; register leaps between phrases; resolveParallels=false.',
  'JG_VL_02 — inner voices chromatic against volatile bass motion.',
  'JG_MEL_01 — atonal-inflected fragmented motifs; goldsmithSignatureIntervalBlend.',
  'JG_MEL_02 — maxLeapSemitones wide; doubly-open phrase endings.',
  'JG_FORM_01 — through-composed unstable arc; sectionRecallEnforced but non-periodic.',
  'JG_TEX_01 — action-orchestral density; no collective improv.',
  'JG_WORK_CHINATOWN_01 — Chinatown: noir trumpet + unstable harmonic cells; jazz-adjacent but not swing.',
  'JG_WORK_APES_01 — Planet of the Apes: avant-garde percussion + horn clusters; primate motif cells.',
  'JG_WORK_PATTON_01 — Patton: martial fanfare fragments + wide brass arcs.',
  'JG_DIFF_HERRMANN_01 — vs Herrmann: more angular register volatility; less ostinato-string fixation.',
  'JG_DIFF_WILLIAMS_01 — vs Williams: less tonal heroic cadence; more chromatic-mediant instability.',
  'JG_DIFF_GOLDSMITH_02 — vs Morricone: no folk pedal lyricism; more doubly-open harmonic cells.',
  'JG_RHY_01 — rhythmicIndependenceRequired=true; ostinatoPhraseEndingCredit moderate.',
] as const;

export const GOLDSMITH_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'JG',
  'Jerry Goldsmith film',
  JG_BASE,
  40,
);
