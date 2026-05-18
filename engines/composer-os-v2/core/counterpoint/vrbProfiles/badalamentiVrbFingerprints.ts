/**
 * Angelo Badalamenti — VoiceRuleBundle fingerprint receipts.
 *
 * Twin Peaks / Blue Velvet / Mulholland Drive grammar.
 * AB_* receipts encode through-composed noir arch + three-tier texture.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const AB_BASE = [
  'AB_POLICY_01 — voiceId=angelo_badalamenti: through_composed_arch_no_cadence; badalamentiThreeTierTexture on bundle (Vln I / inner jazz / Vc pedal).',
  'AB_POLICY_02 — harmonicRhythm: 1–16 bars; slow chromatic descent; allowMidBarChange=false.',
  'AB_POLICY_03 — contrapuntalLinePolicy: moderate independence; lyrical_arch; asymmetric_cell_non_resolving.',
  'AB_POLICY_04 — sqVrbProfileId=badalamenti; bestBbStyle=schneider; dark modal + dom9/11/13 vocabulary.',
  'AB_HARM_01 — dark modal surfaces: aeolian/dorian/phrygian + chromatic_median moves.',
  'AB_HARM_02 — suspended resolutions; lydian_IV colour; bass_drone_fifth pedal.',
  'AB_VL_01 — slow chromatic descent in inner voices; jazz extension cushion between melody and pedal.',
  'AB_VL_02 — resolveParallels=false; semitone approach into chord tones.',
  'AB_MEL_01 — haunting chromatic lines; noir inflection; maxLeapSemitones=10.',
  'AB_FORM_01 — through-composed atmospheric; no periodic cadence closure.',
  'AB_TEX_01 — three-tier: melodyLine=vln_i_lead; innerVoices=chromatic_jazz_extensions; bassLine=pedal_anchor.',
  'AB_WORK_TWINPEAKS_01 — Twin Peaks: iconic dark jazz theme; slow bass pedal + reverb space.',
  'AB_WORK_BLUEVELVET_01 — Blue Velvet: noir ballad chromatic descent; suspended dominant colour.',
  'AB_WORK_MULHOLLAND_01 — Mulholland Drive: dream-logic through-composed; unstable cadential avoidance.',
  'AB_DIFF_MORRICONE_01 — vs Morricone: darker chromatic noir; less folk-western lyricism.',
  'AB_DIFF_HERRMANN_01 — vs Herrmann: less angular tritone cluster; more jazz-extension cushion.',
  'AB_DIFF_WILLIAMS_01 — vs Williams: no heroic fanfare; atmospheric through-composed.',
  'AB_RHY_01 — antiMetric=false; soft pulse under ambient texture.',
] as const;

export const BADALAMENTI_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'AB',
  'Angelo Badalamenti film',
  AB_BASE,
  40,
);
