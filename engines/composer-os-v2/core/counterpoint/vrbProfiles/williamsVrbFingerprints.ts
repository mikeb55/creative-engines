/**
 * John Williams — VoiceRuleBundle fingerprint receipts.
 *
 * Star Wars / Schindler / Jaws / E.T. neo-romantic film grammar.
 * JW_* receipts encode leitmotif + heroic arch vocabulary.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const JW_BASE = [
  'JW_POLICY_01 — voiceId=williams: leitmotif recall enforced; heroic_arch_with_fanfare_leaps; romantic_periodic_cadential phrase grammar.',
  'JW_POLICY_02 — harmonicRhythm: 4–16 bar cells; phrasePeriodBars=8; authenticCadenceCredit enabled.',
  'JW_POLICY_03 — contrapuntalLinePolicy: moderate independence, leitmotif_development, fixed line roles.',
  'JW_POLICY_04 — sqVrbProfileId=williams; bestBbStyle=schneider; dom7/dom9/lydian_IV vocabulary.',
  'JW_HARM_01 — neo-romantic diatonic spine with chromatic colour: secondary_dominant, chromatic_mediants, neapolitan_phrygian_color.',
  'JW_HARM_02 — quartal_fanfare + pandiatonic_chord for brass-heroic planning.',
  'JW_VL_01 — parallel thirds/sixths in inner voices; horn-like doubling at phrase peaks.',
  'JW_VL_02 — resolveByStep=true on dissonanceProfile; parallel octaves forbidden.',
  'JW_MEL_01 — singable leaps with pentatonic core; williamsSignatureIntervalBlend.',
  'JW_MEL_02 — contour angular-heroic; maxLeapSemitones tuned for fanfare register.',
  'JW_FORM_01 — ABA + development; cyclicMotifReturnBoost; sectionRecallEnforced.',
  'JW_TEX_01 — orchestral brass/string planning; no collective improv on duo path.',
  'JW_WORK_STARWARS_01 — Star Wars: main-title fanfare leitmotif; lydian_IV colour on heroic themes.',
  'JW_WORK_SCHINDLER_01 — Schindler: violin-led lyrical theme over sparse harmony; periodic 8-bar periods.',
  'JW_WORK_JAWS_01 — Jaws: low-register ostinato cell (2-note motif); minimal harmonic change.',
  'JW_DIFF_HERRMANN_01 — vs Herrmann: more tonal centers and authentic cadence credit; less poly-cluster thriller.',
  'JW_DIFF_GOLDSMITH_01 — vs Goldsmith: less doubly-open chromatic volatility; clearer periodic cadence.',
  'JW_DIFF_MORRICONE_01 — vs Morricone: more epic orchestral scale; less folk-modal float.',
  'JW_RHY_01 — rhythmicIndependenceRequired=true; leitmotif_development imitation style.',
] as const;

export const WILLIAMS_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'JW',
  'John Williams film',
  JW_BASE,
  40,
);
