/**
 * Riff Generator soft-link: optional explicit HV -> riffVrbId copy.
 * Separate from Phase B chord-colour toggle (riffUseHvForPattern).
 */

import {
  isRiffGeneratorVrbId,
  resolveRiffFamilyTag,
  type RiffFamilyTag,
  type RiffGeneratorVrbId,
} from './riffVrbRegistry';

export type RiffSoftLinkHvResult =
  | { ok: true; vrbId: RiffGeneratorVrbId; family: RiffFamilyTag }
  | { ok: false; mismatch: string };

/**
 * If harmonicVoice id is in RIFF_GENERATOR_VRB_IDS, return copy target.
 * Otherwise return mismatch copy (caller must leave riffVrbId unchanged).
 */
export function resolveRiffSoftLinkHv(harmonicVoiceId: string | null | undefined): RiffSoftLinkHvResult {
  const raw = (harmonicVoiceId ?? '').trim();
  if (!raw) {
    return { ok: false, mismatch: 'No dedicated riff library for [None] — pick a Harmonic Voice with a riff profile.' };
  }
  if (!isRiffGeneratorVrbId(raw)) {
    return { ok: false, mismatch: `No dedicated riff library for ${raw}` };
  }
  const family = resolveRiffFamilyTag(raw);
  if (!family) {
    return { ok: false, mismatch: `No dedicated riff library for ${raw}` };
  }
  return { ok: true, vrbId: raw, family };
}