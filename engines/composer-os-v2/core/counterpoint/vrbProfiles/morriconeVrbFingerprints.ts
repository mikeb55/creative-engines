/**
 * Ennio Morricone — VoiceRuleBundle fingerprint receipts.
 *
 * The Good the Bad and the Ugly / Cinema Paradiso / Once Upon a Time grammar.
 * EM_* receipts encode pedal + lyrical soprano arch.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const EM_BASE = [
  'EM_POLICY_01 — voiceId=morricone: pedalPointValidBars; lyrical_soprano_arch; folk_modal_suspended phrase articulation.',
  'EM_POLICY_02 — harmonicRhythm max extended by pedal length; morriconeRomanticModeAvailable for legato arcs.',
  'EM_POLICY_03 — contrapuntalLinePolicy: low–moderate independence; motivic_echo; registerPolicy lyrical_arch.',
  'EM_POLICY_04 — sqVrbProfileId=morricone; bestBbStyle=schneider; modal + tonal hybrid vocabulary.',
  'EM_HARM_01 — modal folk colour + functional tonal resolutions; suspended dominants may not resolve.',
  'EM_HARM_02 — tonic_pedal + added_note_color; long pedal under shifting upper harmony.',
  'EM_VL_01 — pedal bass + moving upper voices; inner voice stepwise colour.',
  'EM_VL_02 — parallel fifths allowed; octaves forbidden; folk suspension chains.',
  'EM_MEL_01 — long arching diatonic lines; maxLeapSemitones=12; folk inflection in preferredIntervalSets.',
  'EM_FORM_01 — through-composed with recall; sectionRecallEnforced; suite narrative default.',
  'EM_TEX_01 — sparse western / vocalise texture; whistle and solo instrument planning metadata.',
  'EM_WORK_GBU_01 — The Good the Bad and the Ugly: iconic two-note motif + harmonic sting; dry percussion space.',
  'EM_WORK_PARADISO_01 — Cinema Paradiso: nostalgic lyrical theme; romantic mode pedal float.',
  'EM_WORK_ONCE_01 — Once Upon a Time in the West: sustained opening motif; wide registral bloom.',
  'EM_DIFF_ROTA_01 — vs Rota: less comic waltz periodicity; more pedal float and folk suspension.',
  'EM_DIFF_BADALAMENTI_01 — vs Badalamenti: less dark noir chromatic descent; more open folk lyricism.',
  'EM_DIFF_WILLIAMS_01 — vs Williams: less heroic fanfare; more modal float and whistle-like top.',
  'EM_RHY_01 — antiMetric=false; pulse soft but present; not ostinato-thriller density.',
] as const;

export const MORRICONE_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'EM',
  'Ennio Morricone film',
  EM_BASE,
  40,
);
