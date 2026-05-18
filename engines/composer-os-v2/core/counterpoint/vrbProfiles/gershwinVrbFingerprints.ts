/**
 * George Gershwin — SQ Harmonic Voice fingerprint receipts (GW_*).
 * Jazz-concert hybrid; dom7–dom13; blues colour; AABA + rhapsody.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const GW_BASE = [
  // ---- POLICY (8) ----
  'GW_POLICY_01 — harmonicRhythm 1–2 bars; allowMidBarChange on passing chords; SQ σ=27.',
  'GW_POLICY_02 — bassPolicy walking-or-symphonic: chromatic approach + walking bass colour.',
  'GW_POLICY_03 — voicingPolicy spread 16–24 st; jazz extensions on top (9/13/alt).',
  'GW_POLICY_04 — melodicPolicy blues-diatonic: pentatonic core + chromatic colour; maxLeap=14.',
  'GW_POLICY_05 — rhythmPolicy swing-inflected pulse; swingFeel=false (not full swing flag).',
  'GW_POLICY_06 — repairPolicy resolveParallels=true: contrary motion at cadence.',
  'GW_POLICY_07 — formPolicy AABA + concert development; rhapsodic elements; cadential arrival.',
  'GW_POLICY_08 — functional resolution enabled; jazzExtensionEnabled + bluesColourEnabled + rhythmChangesEnabled.',
  // ---- HARM (6) ----
  'GW_HARM_01 — dom7–dom13 default colour; dom7alt at climax cadences.',
  'GW_HARM_02 — secondary_dominant chains; III7–VI7–II7–V7 rhythm-changes bridge.',
  'GW_HARM_03 — chromatic_mediants: I→♭III / ♭VI pivots with return via V/x.',
  'GW_HARM_04 — lydian_IV colour over tonic prolongations.',
  'GW_HARM_05 — blues inflection: ♭3/♭7/♯4 colour on functional shell.',
  'GW_HARM_06 — ii_half_dim7 half-cadence + modal_interchange_bVII colour.',
  // ---- VL (5) ----
  'GW_VL_01 — halfStepApproachCredit: chromatic approach notes to chord tones.',
  'GW_VL_02 — chromatic inner voices between guide-tone pillars.',
  'GW_VL_03 — contrary motion cadences; resolveParallels at phrase joints.',
  'GW_VL_04 — walking bass colour: root–5th–chromatic approach cells.',
  'GW_VL_05 — jazz guide tones: 3rds and 7ths on dominants; 9/13 layered above.',
  // ---- MEL (4) ----
  'GW_MEL_01 — pentatonic core with chromatic colour; blues-diatonic contour.',
  'GW_MEL_02 — concert bravura leaps up to 14 st; scalar fill after wide interval.',
  'GW_MEL_03 — arching development: implication–realisation phrase pairs.',
  'GW_MEL_04 — periodic phrasing 4–8 bars; authenticCadenceCredit high.',
  // ---- FORM (4) ----
  'GW_FORM_01 — AABA song form default; sectionRecallEnforced.',
  'GW_FORM_02 — rhapsodic development sections; segmented macro form.',
  'GW_FORM_03 — concert hybrid structure: songbook + symphonic-jazz strata.',
  'GW_FORM_04 — clear cadential arrival; dominantResolutionPenalty low.',
  // ---- WORK (5) ----
  'GW_WORK_RHAPSODY_IN_BLUE_01 — Rhapsody in Blue: rhapsodic through-composed, blues + concert bravura, chromatic glissandi.',
  'GW_WORK_SOMEONE_TO_WATCH_01 — Someone to Watch Over Me: AABA, pentatonic melody, chromatic inner voices.',
  'GW_WORK_I_GOT_RHYTHM_01 — I Got Rhythm: rhythm changes, secondary dominants, jazz extensions.',
  'GW_WORK_SUMMERTIME_01 — Summertime: blues colour, modal opening, chromatic bass descent.',
  'GW_WORK_AN_AMERICAN_IN_PARIS_01 — An American in Paris: programmatic development, chromatic mediants, concert orchestration.',
  // ---- DIFF (3) ----
  'GW_DIFF_VS_PORTER_01 — vs Porter: concert bravura vs elegant song wit.',
  'GW_DIFF_VS_WILLIAMS_01 — vs Williams: jazz-blues colour vs neo-romantic leitmotif.',
  'GW_DIFF_VS_SHOSTAKOVICH_01 — vs Shostakovich: chromatic jazz vs chromatic post-tonal.',
] as const;

export const GERSHWIN_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'GW',
  'Gershwin SQ',
  GW_BASE,
  35,
);
