/**
 * Resolve primary/secondary songwriter + optional classical overlay into rule ids + blended profile.
 */

import { SONGWRITER_RULE_REGISTRY } from './songwriterRuleRegistry';
import type { AuthorRuleId, ClassicalSongRuleId, SongwriterRuleId } from './songwritingResearchTypes';
import { resolveAuthorOverlay } from './authorOverlayResolver';
import {
  DEFAULT_PRIMARY_SONGWRITER_STYLE,
  SONGWRITER_STYLE_PROFILES,
  type SongwriterStyleProfile,
  normalizeSongwriterStyleKey,
} from './songwriterStyleProfiles';

export interface SongwriterStyleResolutionInput {
  /** When omitted, uses `DEFAULT_PRIMARY_SONGWRITER_STYLE`. */
  primary?: string | SongwriterRuleId | null;
  secondary?: string | SongwriterRuleId | null;
  authorOverlay?: AuthorRuleId | null;
  classicalOverlay?: ClassicalSongRuleId | null;
}

export interface ResolvedSongwritingStyle {
  primaryId: SongwriterRuleId;
  secondaryId: SongwriterRuleId | null;
  authorOverlayId: AuthorRuleId | null;
  classicalOverlayId: ClassicalSongRuleId | null;
  /** Ids from registry matching this resolution (deterministic). */
  resolvedRuleIds: string[];
  /** Blended profile for planning (primary weighted; secondary ~35%). */
  blendedProfile: SongwriterStyleProfile;
  styleFingerprint: string;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function blendProfiles(a: SongwriterStyleProfile, b: SongwriterStyleProfile, weightB: number): SongwriterStyleProfile {
  const w = clamp01(weightB);
  const blend = (ka: keyof Omit<SongwriterStyleProfile, 'id'>) =>
    a[ka] * (1 - w) + b[ka] * w;
  return {
    id: a.id,
    lineVsCellEmphasis: blend('lineVsCellEmphasis'),
    harmonyColourBias: blend('harmonyColourBias'),
    formRegularity: blend('formRegularity'),
    prosodyInfluence: blend('prosodyInfluence'),
    hookRepetitionBias: blend('hookRepetitionBias'),
    phraseRegularity: blend('phraseRegularity'),
    hookReturnVariation: blend('hookReturnVariation'),
    harmonicSpeed: blend('harmonicSpeed'),
    sectionContrast: blend('sectionContrast'),
    syncopationBias: blend('syncopationBias'),
    densityBias: blend('densityBias'),
  };
}

function collectRuleIds(
  primary: SongwriterRuleId,
  secondary: SongwriterRuleId | null,
  author: AuthorRuleId | null,
  classical: ClassicalSongRuleId | null
): string[] {
  const ids: string[] = [];
  const reg = SONGWRITER_RULE_REGISTRY;
  ids.push(...reg.songwriterRules[primary].map((r) => r.id));
  if (secondary) ids.push(...reg.songwriterRules[secondary].map((r) => r.id));
  if (author) ids.push(...reg.authorRules[author].map((r) => r.id));
  if (classical) ids.push(...reg.classicalSongRules[classical].map((r) => r.id));
  for (const cat of Object.values(reg.foundationalRules)) for (const r of cat) ids.push(r.id);
  return [...new Set(ids)].sort();
}

export function resolveSongwritingStyles(input: SongwriterStyleResolutionInput): ResolvedSongwritingStyle {
  const primaryRaw = input.primary;
  const primaryNorm =
    typeof primaryRaw === 'string'
      ? normalizeSongwriterStyleKey(primaryRaw)
      : primaryRaw ?? null;
  const primaryId = primaryNorm ?? DEFAULT_PRIMARY_SONGWRITER_STYLE;

  let secondaryId: SongwriterRuleId | null = null;
  if (input.secondary != null && input.secondary !== '') {
    const s =
      typeof input.secondary === 'string' ? normalizeSongwriterStyleKey(input.secondary) : input.secondary;
    if (s && s !== primaryId) secondaryId = s;
  }

  const authorOverlayId = input.authorOverlay ?? null;
  const classicalOverlayId = input.classicalOverlay ?? null;

  const p1 = SONGWRITER_STYLE_PROFILES[primaryId];
  const p2 = secondaryId ? SONGWRITER_STYLE_PROFILES[secondaryId] : null;
  const blendedProfile = p2 ? blendProfiles(p1, p2, 0.35) : { ...p1 };

  if (authorOverlayId) {
    const ao = resolveAuthorOverlay(authorOverlayId);
    if (ao) {
      blendedProfile.prosodyInfluence = clamp01(
        blendedProfile.prosodyInfluence + 0.08 * ao.prosodyStructureEmphasis
      );
      blendedProfile.harmonyColourBias = clamp01(
        blendedProfile.harmonyColourBias + 0.06 * ao.melodyHarmonicCraftEmphasis
      );
    }
  }

  if (classicalOverlayId) {
    blendedProfile.prosodyInfluence = clamp01(blendedProfile.prosodyInfluence + 0.05);
    blendedProfile.lineVsCellEmphasis = clamp01(blendedProfile.lineVsCellEmphasis + 0.04);
  }

  const resolvedRuleIds = collectRuleIds(primaryId, secondaryId, authorOverlayId, classicalOverlayId);
  const styleFingerprint = [
    primaryId,
    secondaryId ?? '-',
    authorOverlayId ?? '-',
    classicalOverlayId ?? '-',
    blendedProfile.hookRepetitionBias.toFixed(3),
    blendedProfile.formRegularity.toFixed(3),
  ].join('|');

  return {
    primaryId,
    secondaryId,
    authorOverlayId,
    classicalOverlayId,
    resolvedRuleIds,
    blendedProfile,
    styleFingerprint,
  };
}
