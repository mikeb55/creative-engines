/**
 * Bernard Herrmann — VoiceRuleBundle fingerprint receipts.
 *
 * Psycho / Vertigo / Taxi Driver / The Day the Earth Stood Still grammar.
 * HH_* receipts encode chromatic thriller underscore + ostinato cells.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const HH_BASE = [
  'HH_POLICY_01 — voiceId=herrmann: thriller-film SQ entry; chromatic harmonic rhythm; bassPolicy melodic-counterline; angular melody with ic1_tritone duo floor (0.45); herrmannRomanticModeAvailable for clearer centers.',
  'HH_POLICY_02 — harmonicRhythm: 1–8 bars per chord; ostinato cells may repeat under static harmony; allowMidBarChange=false for underscore lock.',
  'HH_POLICY_03 — contrapuntalLinePolicy: low independence, ostinato_cell_based, extreme_registers, parallel fifths allowed, octaves forbidden.',
  'HH_POLICY_04 — sqVrbProfileId=herrmann; bestBbStyle=brookmeyer; poly-triad + tritone dyad chord vocabulary.',
  'HH_HARM_01 — chromatic mediant moves and non-functional progressions; poly_triad_minor_second / poly_triad_tritone stacks.',
  'HH_HARM_02 — modal ambiguity: tonal center implied but not cadentially enforced; leitmotif_polytriad returns.',
  'HH_HARM_03 — ostinato cells: 0.5–2 bar phrase cells; cyclicMotifReturnBoost; dissonantClosureCredit.',
  'HH_VL_01 — contrary motion at cadences; inner voice semitone tension against static bass.',
  'HH_VL_02 — cluster_color_high_register; chromatic_median_shift between poly-chords.',
  'HH_MEL_01 — angular leaps up to 14 st; tritone motifs; registral extremes (extreme_registers policy).',
  'HH_MEL_02 — herrmannSignatureIntervalBlend; stepwise approach into chord tones after leap.',
  'HH_FORM_01 — formPolicy.suite + sectionRecallEnforced: cue-based arch with motivic return.',
  'HH_TEX_01 — string-orchestra density; no collective improv; anchorToneCount=2 duo planning.',
  'HH_WORK_PSYCHO_01 — Psycho: high-register string clusters + ostinato semitone cells; no heroic resolution.',
  'HH_WORK_VERTIGO_01 — Vertigo: spiral chromatic descent + wide register swirl; obsessive motif recurrence.',
  'HH_WORK_TAXI_01 — Taxi Driver: sax-led noir line over chromatic pads; urban tension not jazz swing.',
  'HH_DIFF_WILLIAMS_01 — vs Williams: less heroic leitmotif fanfare; more dissonant closure; no romantic periodic cadence default.',
  'HH_DIFF_MORRICONE_01 — vs Morricone: less lyrical folk arch; more angular tritone; no long pedal float.',
  'HH_DIFF_ROTA_01 — vs Rota: no waltz periodic cadence; thriller not comic-operetta bounce.',
  'HH_RHY_01 — pulse present but anti-heroic; ostinatoPhraseEndingCredit; no backbeat groove default.',
] as const;

export const HERRMANN_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'HH',
  'Bernard Herrmann film',
  HH_BASE,
  40,
);
