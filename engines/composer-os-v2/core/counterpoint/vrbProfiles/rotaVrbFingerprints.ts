/**
 * Nino Rota — VoiceRuleBundle fingerprint receipts.
 *
 * The Godfather / Fellini / Amarcord grammar.
 * NR_* receipts encode periodic tonal + waltz-influenced lyricism.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const NR_BASE = [
  'NR_POLICY_01 — voiceId=nino_rota: strict_periodic_tonal_cadence; lyrical_soprano_arch_mid_centrist.',
  'NR_POLICY_02 — harmonicRhythm: 4–8 bars; phrasePeriodBars=8; authenticCadenceCredit=0.22.',
  'NR_POLICY_03 — contrapuntalLinePolicy: low independence; motivic_echo; resolveByStep=true.',
  'NR_POLICY_04 — sqVrbProfileId=rota; bestBbStyle=schneider; triad_skeleton + chromatic_median vocabulary.',
  'NR_HARM_01 — functional tonal harmony with waltz-influenced bass; modal colour on chromatic_median moves.',
  'NR_HARM_02 — parallel_color_shift + added_note_color; clean secondary_dominant approach.',
  'NR_VL_01 — clean voice-leading; comic bounce in inner voices; wallToWallPhrasePenalty.',
  'NR_VL_02 — parallel thirds/sixths bonus; parallel fifths allowed sparingly.',
  'NR_MEL_01 — memorable singable arches; dance inflection; rotaSignatureIntervalBlend.',
  'NR_FORM_01 — periodic clear phrase structure every 4–8 bars; sectionRecallEnforced.',
  'NR_TEX_01 — operetta / circus colour; mid-register centrist ensemble.',
  'NR_WORK_GODFATHER_01 — The Godfather: waltz-influenced main theme; minor-key nobility.',
  'NR_WORK_FELLINI_01 — Fellini circus: comic bounce + chromatic mediant colour shifts.',
  'NR_WORK_AMARCORD_01 — Amarcord: nostalgic periodic melody; strict tonal cadence closures.',
  'NR_DIFF_MORRICONE_01 — vs Morricone: more periodic cadence; less sustained pedal ambiguity.',
  'NR_DIFF_WILLIAMS_01 — vs Williams: less epic fanfare scale; more intimate comic-operetta.',
  'NR_DIFF_HERRMANN_01 — vs Herrmann: tonal periodic not thriller cluster; no tritone ostinato default.',
  'NR_RHY_01 — phraseGrammarMode=strict_periodic_tonal_cadence; pulse steady 4/4.',
] as const;

export const ROTA_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'NR',
  'Nino Rota film',
  NR_BASE,
  40,
);
