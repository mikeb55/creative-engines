/**
 * Olivier Messiaen -- Song Mode / duo mode-birdsong VRB stub fingerprints.
 * MS_* receipts encode limited-transposition / birdsong Song posture -- not MM_SQ_* SQ VRB.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const MS_BASE = [
  'MS_POLICY_01 -- voiceId=messiaen: Song Mode mode-birdsong twin (not sq_vrb_messiaen SQ VRB).',
  'MS_POLICY_02 -- harmony emerges from modes of limited transposition + colourTag -- not SQ pitch-field CLE attach.',
  'MS_POLICY_03 -- harmonicRhythm: slow windows (2-24 bars); allowMidBarChange=false.',
  'MS_POLICY_04 -- vs sq_vrb_messiaen: single Song Mode composer id; no SQ->BB dual-profile attach.',
  'MS_HARM_01 -- Mode 2 / Mode 3 reservoirs as vertical colour pools; no functional ii-V-I rail.',
  'MS_HARM_02 -- chord of resonance / added-value colour; deceptive cadences preferred over V->I.',
  'MS_VL_01 -- colour over leading-tone drama; guide motion secondary to mode colour.',
  'MS_MEL_01 -- birdsong filaments + non-retrogradable cells; motif recurrence via colour recall.',
  'MS_RHY_01 -- non-retrogradable + additive Greek/Hindu cells; antiMetric=true for Song.',
  'MS_FORM_01 -- non-teleological Song arches; symmetry over cadence; no SQ multi-image ritual.',
  'MS_TEX_01 -- duo / Song texture; silence structural only at phrase seams.',
  'MS_WORK_QUARTET_01 -- Quartet for the End of Time posture: slow mode blocks + birdsong glitter under pulse.',
  'MS_DIFF_VS_SQ_MESSIAEN_01 -- vs sq_vrb_messiaen SQ: Song slice messiaenEffectiveHarmonyBars (om:*); no SQ CLE attach.',
  'MS_DIFF_VS_DEBUSSY_01 -- vs Debussy: limited-transposition modes not planing colour fields.',
  'MS_DIFF_VS_STEVE_REICH_01 -- vs steve_reich: mode colour blocks not phase/additive process fields.',
  'MS_DUO_01 -- duoVoicePolicy: angular interlock; colour independence moderated for Song.',
] as const;

export const MESSIAEN_SONG_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'MS',
  'Messiaen Song Mode',
  MS_BASE,
  40,
);