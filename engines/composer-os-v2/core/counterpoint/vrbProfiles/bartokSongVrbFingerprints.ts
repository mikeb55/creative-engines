/**
 * Bela Bartok -- Song Mode / duo axis-folk VRB stub fingerprints.
 * BS_* receipts encode Mikrokosmos / axis / folk-modal Song posture -- not SQ Bartok VRB.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const BS_BASE = [
  'BS_POLICY_01 -- voiceId=bartok: Song Mode axis-folk twin (not sq_vrb_bartok SQ VRB).',
  'BS_POLICY_02 -- harmony emerges from axis substitution + folk-modal colour -- not SQ cluster stacks.',
  'BS_POLICY_03 -- harmonicRhythm: moderate windows; allow mid-bar colour when slice demands.',
  'BS_POLICY_04 -- vs sq_vrb_bartok: single Song Mode composer id; no SQ->BB dual-profile attach.',
  'BS_HARM_01 -- axis symmetry: tritone / minor-3rd root flips; Mikrokosmos slash/sus colour.',
  'BS_HARM_02 -- folk-modal m11 / quartal / maj7#11 islands; avoid functional ii-V-I teleology.',
  'BS_VL_01 -- angular contour with controlled leaps; guide motion secondary to axis colour.',
  'BS_MEL_01 -- cell-driven motives; golden-section climax density rather than song-hook return.',
  'BS_RHY_01 -- asymmetric / aksak-aware pulse allowed; not SQ Bulgarian engine as Song default.',
  'BS_FORM_01 -- suite / arch Song form; section contrast high; no SQ multi-movement ritual.',
  'BS_TEX_01 -- duo / Song texture; silence structural only at phrase seams.',
  'BS_WORK_MIKRO_01 -- Mikrokosmos posture: sus4/tritone-bass + quartal shells under pulse.',
  'BS_DIFF_VS_SQ_BARTOK_01 -- vs sq_vrb_bartok SQ: Song slice bartokEffectiveHarmonyBars; no SQ CLE attach.',
  'BS_DIFF_VS_SHOSTAKOVICH_01 -- vs Shostakovich: axis sets not DSCH motive grammar.',
  'BS_DIFF_VS_DEBUSSY_01 -- vs Debussy: folk-modal axis not planing colour fields.',
  'BS_DUO_01 -- duoVoicePolicy: angular interlock; ic1/tritone preference moderated for Song.',
] as const;

export const BARTOK_SONG_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'BS',
  'Bartok Song Mode',
  BS_BASE,
  40,
);