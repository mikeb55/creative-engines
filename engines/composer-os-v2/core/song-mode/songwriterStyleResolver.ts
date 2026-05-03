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
  const blend = (
    ka:
      | 'lineVsCellEmphasis'
      | 'harmonyColourBias'
      | 'formRegularity'
      | 'prosodyInfluence'
      | 'hookRepetitionBias'
      | 'phraseRegularity'
      | 'hookReturnVariation'
      | 'harmonicSpeed'
      | 'sectionContrast'
      | 'syncopationBias'
      | 'densityBias'
  ) =>
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

/**
 * Classical overlays — registry rules + per-composer blended scalar deltas (clamp01).
 * Schubert: syllabic prosody, periodic/strophic form, diatonic-functional harmony.
 * Schumann: strongest text-prosody drive, chromatic harmony, irregular/through-composed phrasing.
 * Fauré: arching line, floating/modal colour, continuous flow, lighter cadential closure.
 */
function applyClassicalSongOverlay(
  blendedProfile: SongwriterStyleProfile,
  classicalOverlayId: ClassicalSongRuleId
): void {
  switch (classicalOverlayId) {
    case 'schubert':
      blendedProfile.prosodyInfluence = clamp01(blendedProfile.prosodyInfluence + 0.1);
      blendedProfile.lineVsCellEmphasis = clamp01(blendedProfile.lineVsCellEmphasis + 0.06);
      blendedProfile.harmonyColourBias = clamp01(blendedProfile.harmonyColourBias - 0.05);
      blendedProfile.formRegularity = clamp01(blendedProfile.formRegularity + 0.08);
      blendedProfile.phraseRegularity = clamp01(blendedProfile.phraseRegularity + 0.07);
      break;
    case 'schumann':
      blendedProfile.prosodyInfluence = clamp01(blendedProfile.prosodyInfluence + 0.13);
      blendedProfile.harmonyColourBias = clamp01(blendedProfile.harmonyColourBias + 0.1);
      blendedProfile.lineVsCellEmphasis = clamp01(blendedProfile.lineVsCellEmphasis + 0.05);
      blendedProfile.phraseRegularity = clamp01(blendedProfile.phraseRegularity - 0.09);
      blendedProfile.hookReturnVariation = clamp01(blendedProfile.hookReturnVariation + 0.06);
      blendedProfile.harmonicSpeed = clamp01(blendedProfile.harmonicSpeed + 0.05);
      break;
    case 'faure':
      blendedProfile.prosodyInfluence = clamp01(blendedProfile.prosodyInfluence + 0.06);
      blendedProfile.lineVsCellEmphasis = clamp01(blendedProfile.lineVsCellEmphasis + 0.12);
      blendedProfile.harmonyColourBias = clamp01(blendedProfile.harmonyColourBias + 0.04);
      blendedProfile.hookRepetitionBias = clamp01(blendedProfile.hookRepetitionBias - 0.07);
      blendedProfile.phraseRegularity = clamp01(blendedProfile.phraseRegularity - 0.05);
      blendedProfile.sectionContrast = clamp01(blendedProfile.sectionContrast - 0.06);
      blendedProfile.syncopationBias = clamp01(blendedProfile.syncopationBias + 0.04);
      break;
    default: {
      const _exhaustive: never = classicalOverlayId;
      void _exhaustive;
    }
  }
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
    applyClassicalSongOverlay(blendedProfile, classicalOverlayId);
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

export type SongModeDiversityPresetId =
  | 'fagen_wonder_pocket'
  | 'shorter_bacharach_arc'
  | 'beatles_bach_counterline'
  | 'kendrick_debussy_space'
  | 'maxmartin_stravinsky_angles'
  | 'dylan_messiaen_literate_vs_sublime'
  | 'james_brown_joni_groove_vs_line'
  | 'barry_harris_max_martin_bebop_vs_charts'
  | 'ecm_chamber_prince_space_vs_pocket';

export interface SongModeDiversityPreset {
  id: SongModeDiversityPresetId;
  label: string;
  primarySongwriterStyle: SongwriterRuleId;
  secondarySongwriterStyle: SongwriterRuleId;
  audibleDescription: string;
}

export const SONG_MODE_DIVERSITY_PRESETS: readonly SongModeDiversityPreset[] = [
  {
    id: 'fagen_wonder_pocket',
    label: 'Jazz-Pop Pocket',
    primarySongwriterStyle: 'donald_fagen',
    secondarySongwriterStyle: 'stevie_wonder',
    audibleDescription: 'Smoother groove pocket with richer color chords and stronger hook lift.',
  },
  {
    id: 'shorter_bacharach_arc',
    label: 'Angular Lyric Arc',
    primarySongwriterStyle: 'wayne_shorter',
    secondarySongwriterStyle: 'bacharach',
    audibleDescription: 'More angular harmonic motion balanced by clearer lyrical phrase turns.',
  },
  {
    id: 'beatles_bach_counterline',
    label: 'Hook + Counterline',
    primarySongwriterStyle: 'beatles',
    secondarySongwriterStyle: 'bach',
    audibleDescription: 'Direct melodic hooks with tighter inner-line motion and form clarity.',
  },
  {
    id: 'kendrick_debussy_space',
    label: 'Motif + Colour Space',
    primarySongwriterStyle: 'kendrick_lamar',
    secondarySongwriterStyle: 'debussy',
    audibleDescription: 'Punchier motif cells with softer harmonic color wash and wider breathing room.',
  },
  {
    id: 'maxmartin_stravinsky_angles',
    label: 'Hook Grid + Asymmetry',
    primarySongwriterStyle: 'max_martin',
    secondarySongwriterStyle: 'stravinsky',
    audibleDescription: 'Pop-forward repetition anchored by sharper rhythmic accents and contour pivots.',
  },
  {
    id: 'dylan_messiaen_literate_vs_sublime',
    label: 'Literate Folk vs Sublime Colour',
    primarySongwriterStyle: 'bob_dylan',
    secondarySongwriterStyle: 'messiaen',
    audibleDescription:
      'Prosody-led narrative phrasing pulled toward modal colour fields and non-template harmonic stasis.',
  },
  {
    id: 'james_brown_joni_groove_vs_line',
    label: 'Groove Cell vs Shifting Line',
    primarySongwriterStyle: 'james_brown',
    secondarySongwriterStyle: 'joni_mitchell',
    audibleDescription:
      'Tight on-the-one funk hooks tempered by prosody-first melodic arcs and less square returns.',
  },
  {
    id: 'barry_harris_max_martin_bebop_vs_charts',
    label: 'Bebop Line vs Chart Template',
    primarySongwriterStyle: 'barry_harris',
    secondarySongwriterStyle: 'max_martin',
    audibleDescription:
      'Harmonic motion and line grammar from bebop blended with section clarity and hook-forward repetition.',
  },
  {
    id: 'ecm_chamber_prince_space_vs_pocket',
    label: 'Chamber Space vs Pocket Funk',
    primarySongwriterStyle: 'ecm_chamber',
    secondarySongwriterStyle: 'prince',
    audibleDescription:
      'Sparse harmonic rhythm and wide colour room pulled toward syncopated pocket and denser lift.',
  },
];

export function resolveSongModeDiversityPreset(id: string | null | undefined): SongModeDiversityPreset | null {
  if (!id) return null;
  return SONG_MODE_DIVERSITY_PRESETS.find((p) => p.id === id) ?? null;
}
