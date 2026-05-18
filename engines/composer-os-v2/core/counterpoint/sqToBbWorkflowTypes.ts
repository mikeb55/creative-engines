/**
 * SQ→BB workflow — serializable DTOs for app API + UI (Phase B).
 */

import type { AbstractLineSet } from './abstractLineSet';
import type { QuartetFeatures } from './quartetFeatureTypes';
import type { SqBbGceGate1Record, SqBbGceGate2Record } from './sqToBbGceGates';
import type { VoicingGeometryShape } from './chooseVoicingGeometry';
import type { EnsembleSection, SectionRole } from './quartetFeatureTypes';

export type SqToBbStyleProfileId = 'schneider' | 'basie' | 'mingus' | 'brookmeyer';

/** SQ→BB meso quantizer density (Session 5). */
export type SqToBbDensity = 'sparse' | 'medium' | 'dense';

export const SQ_TO_BB_DENSITY_OPTIONS: ReadonlyArray<{ id: SqToBbDensity; label: string }> = [
  { id: 'sparse', label: 'Sparse' },
  { id: 'medium', label: 'Medium' },
  { id: 'dense', label: 'Dense' },
] as const;

/** Meso boundary threshold — fewer/longer spans (sparse) vs more/shorter (dense). */
export const SQ_TO_BB_DENSITY_MESO_THRESHOLD: Readonly<Record<SqToBbDensity, number>> = {
  sparse: 0.65,
  medium: 0.55,
  dense: 0.45,
};

export function normalizeSqToBbDensity(raw: unknown): SqToBbDensity {
  if (raw === 'sparse' || raw === 'dense') return raw;
  return 'medium';
}

/** Jazz era hint for SQ→BB when explicitly chosen; `null` = no era tag. */
export type SqToBbJazzEraId =
  | 'swing'
  | 'bebop'
  | 'post_bop'
  | 'contemporary'
  | 'cool_jazz'
  | 'hard_bop'
  | 'fusion';

export type SqToBbClassicalEraId =
  | 'classical'
  | 'romantic'
  | 'impressionist'
  | 'early_modernist'
  | 'postwar_modernist'
  | 'contemporary_classical';

export type SqToBbEraId = SqToBbJazzEraId | SqToBbClassicalEraId | null;

export type SqToBbEraBbCompatibility = 'natural' | 'unconventional' | 'mismatch';

export const SQ_TO_BB_CLASSICAL_ERA_BB_COMPATIBILITY: Readonly<
  Record<SqToBbClassicalEraId, Readonly<Record<SqToBbStyleProfileId, SqToBbEraBbCompatibility>>>
> = {
  classical: {
    schneider: 'unconventional',
    basie: 'natural',
    mingus: 'mismatch',
    brookmeyer: 'natural',
  },
  romantic: {
    schneider: 'natural',
    basie: 'natural',
    mingus: 'unconventional',
    brookmeyer: 'natural',
  },
  impressionist: {
    schneider: 'natural',
    basie: 'unconventional',
    mingus: 'unconventional',
    brookmeyer: 'natural',
  },
  early_modernist: {
    schneider: 'natural',
    basie: 'mismatch',
    mingus: 'natural',
    brookmeyer: 'unconventional',
  },
  postwar_modernist: {
    schneider: 'unconventional',
    basie: 'mismatch',
    mingus: 'natural',
    brookmeyer: 'mismatch',
  },
  contemporary_classical: {
    schneider: 'natural',
    basie: 'mismatch',
    mingus: 'unconventional',
    brookmeyer: 'unconventional',
  },
} as const;

export const SQ_TO_BB_COMPATIBILITY_BADGE_LABEL: Record<SqToBbEraBbCompatibility, string> = {
  natural: 'Natural fit',
  unconventional: 'Unconventional pairing — interesting results possible',
  mismatch: 'Strong mismatch — unexpected results likely',
};

export function isSqToBbClassicalEraId(era: string): era is SqToBbClassicalEraId {
  return era in SQ_TO_BB_CLASSICAL_ERA_BB_COMPATIBILITY;
}

export function sqToBbClassicalEraCompatibility(
  era: string | null | undefined,
  bbStyle: SqToBbStyleProfileId,
): SqToBbEraBbCompatibility | null {
  if (era == null || era === '') return null;
  if (!isSqToBbClassicalEraId(era)) return null;
  return SQ_TO_BB_CLASSICAL_ERA_BB_COMPATIBILITY[era][bbStyle] ?? null;
}

/** Display labels for mismatch notices (docs/SQ_BB_ERA_STYLE_GUIDE.md §6). */
export const SQ_TO_BB_BB_STYLE_LABEL: Record<SqToBbStyleProfileId, string> = {
  schneider: 'Schneider',
  basie: 'Basie',
  mingus: 'Mingus',
  brookmeyer: 'Brookmeyer',
};

export const SQ_TO_BB_CLASSICAL_ERA_LABEL: Record<SqToBbClassicalEraId, string> = {
  classical: 'Classical',
  romantic: 'Romantic',
  impressionist: 'Impressionist / Late Romantic',
  early_modernist: 'Early Modernist',
  postwar_modernist: 'Postwar Modernist / Serialist',
  contemporary_classical: 'Contemporary Classical',
};

const SQ_TO_BB_BB_STYLE_TRAIT: Record<SqToBbStyleProfileId, string> = {
  schneider: 'coloristic orchestration and chamber-jazz pacing',
  basie: 'swing feel and economical shout-band rhythms',
  mingus: 'blues roots and angular post-bop expression',
  brookmeyer: 'linear contrapuntal voicing and cool-jazz pacing',
};

/** RED pairing notices — docs/SQ_BB_ERA_STYLE_GUIDE.md §6.1 (exact wording). */
export const SQ_TO_BB_MISMATCH_NOTICE_COPY: Readonly<
  Partial<Record<SqToBbClassicalEraId, Partial<Record<SqToBbStyleProfileId, string>>>>
> = {
  classical: {
    mingus:
      'Mingus-style writing relies on blues roots and angular post-bop expression. Classical source material may produce unexpected results. You can still generate.',
  },
  early_modernist: {
    basie:
      'Basie-style writing relies on swing feel and economical shout-band rhythms. Early Modernist source material may produce unexpected results. You can still generate.',
  },
  postwar_modernist: {
    basie:
      'Basie-style writing relies on swing feel and economical shout-band rhythms. Postwar Modernist / Serialist source material may produce unexpected results. You can still generate.',
    brookmeyer:
      'Brookmeyer-style writing relies on linear contrapuntal voicing and cool-jazz pacing. Postwar Modernist / Serialist source material may produce unexpected results. You can still generate.',
  },
  contemporary_classical: {
    basie:
      'Basie-style writing relies on swing feel and economical shout-band rhythms. Contemporary Classical source material may produce unexpected results. You can still generate.',
  },
} as const;

/** Mismatch notice body when compatibility is RED; null otherwise. */
export function sqToBbMismatchNoticeMessage(
  era: string | null | undefined,
  bbStyle: SqToBbStyleProfileId,
): string | null {
  const level = sqToBbClassicalEraCompatibility(era, bbStyle);
  if (level !== 'mismatch' || era == null || !isSqToBbClassicalEraId(era)) return null;
  const listed = SQ_TO_BB_MISMATCH_NOTICE_COPY[era]?.[bbStyle];
  if (listed) return listed;
  const bbLabel = SQ_TO_BB_BB_STYLE_LABEL[bbStyle];
  const eraLabel = SQ_TO_BB_CLASSICAL_ERA_LABEL[era];
  const trait = SQ_TO_BB_BB_STYLE_TRAIT[bbStyle];
  return `${bbLabel}-style writing relies on ${trait}. ${eraLabel} source material may produce unexpected results. You can still generate.`;
}

/** Normalize request era — omit/null/blank → undefined (do not pass empty string). */
export function normalizeSqToBbEraInput(raw: string | null | undefined): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const t = String(raw).trim();
  return t.length > 0 ? t : undefined;
}

/** SQ→BB chord source (UI state; engine wiring Session 2+). */
export type SqToBbChordSourceMode = 'generate_harmony' | 'use_user_chords' | 'midi';

/** Resolve `userChordInput` on generate request — null when generating harmony. */
export function resolveSqToBbUserChordInput(
  mode: SqToBbChordSourceMode | undefined,
  raw: string | null | undefined,
): string | null {
  if (mode !== 'use_user_chords') return null;
  if (raw === null || raw === undefined) return null;
  const t = String(raw).trim();
  return t.length > 0 ? raw : null;
}

export const SQ_TO_BB_STYLE_PROFILES: ReadonlyArray<{
  id: SqToBbStyleProfileId;
  label: string;
  vrbId: string;
}> = [
  { id: 'schneider', label: 'Schneider', vrbId: 'maria_schneider' },
  { id: 'basie', label: 'Basie', vrbId: 'count_basie' },
  { id: 'mingus', label: 'Mingus', vrbId: 'charles_mingus' },
  { id: 'brookmeyer', label: 'Brookmeyer', vrbId: 'bob_brookmeyer' },
] as const;

export function vrbIdForSqToBbStyleProfile(id: SqToBbStyleProfileId): string {
  const row = SQ_TO_BB_STYLE_PROFILES.find((p) => p.id === id);
  return row?.vrbId ?? 'bob_brookmeyer';
}

/** SQ sketch length presets (UI shortcuts). Any integer 8–128 is valid. */
export const SQ_TO_BB_LENGTH_PRESETS = [16, 32, 64] as const;
export const SQ_TO_BB_LENGTH_MIN = 8;
export const SQ_TO_BB_LENGTH_MAX = 128;
export const SQ_TO_BB_DEFAULT_LENGTH_BARS = 32;

export type SqToBbLengthBars = number;

export function isSqToBbLengthBars(n: number): boolean {
  return Number.isInteger(n) && n >= SQ_TO_BB_LENGTH_MIN && n <= SQ_TO_BB_LENGTH_MAX;
}

export function resolveSqToBbLengthBars(raw: unknown): { ok: true; lengthBars: SqToBbLengthBars } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, lengthBars: SQ_TO_BB_DEFAULT_LENGTH_BARS };
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return { ok: false, error: 'SQ→BB lengthBars must be an integer between 8 and 128.' };
  }
  const n = Math.floor(Number(trimmed));
  if (!Number.isFinite(n) || n !== Number(trimmed)) {
    return { ok: false, error: 'SQ→BB lengthBars must be an integer between 8 and 128.' };
  }
  if (!isSqToBbLengthBars(n)) {
    return {
      ok: false,
      error: `SQ→BB lengthBars must be between ${SQ_TO_BB_LENGTH_MIN} and ${SQ_TO_BB_LENGTH_MAX} (got ${String(raw)}).`,
    };
  }
  return { ok: true, lengthBars: n };
}

/** SQ harmonic voice picker — `null` = style-profile default line engine. */
export type SqToBbSqComposerId =
  | 'bartok'
  | 'ravel'
  | 'herrmann'
  | 'morricone'
  | 'williams'
  | 'rota'
  | 'goldsmith'
  | 'glass'
  | 'zimmer'
  | 'badalamenti'
  | 'shostakovich'
  | 'webern'
  | 'joni_mitchell';
export type SqToBbSqComposer = SqToBbSqComposerId | null;

export const SQ_TO_BB_SQ_COMPOSER_ENABLED: ReadonlySet<SqToBbSqComposerId> = new Set([
  'bartok',
  'ravel',
  'herrmann',
  'morricone',
  'williams',
  'rota',
  'goldsmith',
  'glass',
  'zimmer',
  'badalamenti',
  'shostakovich',
  'webern',
  'joni_mitchell',
]);

/** Greyed-out / unknown values → None (no throw). */
export function normalizeSqToBbSqComposer(raw: unknown): SqToBbSqComposer {
  if (raw === null || raw === undefined || raw === '') return null;
  const id = String(raw).trim().toLowerCase() as SqToBbSqComposerId;
  if (!SQ_TO_BB_SQ_COMPOSER_ENABLED.has(id)) return null;
  return id;
}

export function sqLineVrbIdForSqToBb(
  sqComposer: SqToBbSqComposer | undefined,
  styleProfile: SqToBbStyleProfileId,
): string {
  const active = normalizeSqToBbSqComposer(sqComposer);
  if (active === 'bartok') return 'bartok';
  if (active === 'ravel') return 'ravel';
  if (active === 'herrmann') return 'herrmann';
  if (active === 'morricone') return 'morricone';
  if (active === 'williams') return 'williams';
  if (active === 'rota') return 'rota';
  if (active === 'goldsmith') return 'goldsmith';
  if (active === 'glass') return 'glass';
  if (active === 'zimmer') return 'zimmer';
  if (active === 'badalamenti') return 'badalamenti';
  if (active === 'shostakovich') return 'shostakovich';
  if (active === 'webern') return 'webern';
  if (active === 'joni_mitchell') return 'joni_mitchell';
  return vrbIdForSqToBbStyleProfile(styleProfile);
}

export type SqToBbWorkflowAction =
  | 'sketch'
  | 'regenerate_whole'
  | 'regenerate_phrase'
  | 'translate'
  | 'export';

export type SqToBbVoiceLaneId = 'S' | 'A' | 'T' | 'B';

export interface SqToBbPhraseFeatureChips {
  phraseId: string;
  startBeat: number;
  endBeat: number;
  textureClass: QuartetFeatures['textureClass'];
  density: number;
  cadencePoint: string;
  lineIndependence: number;
}

export interface SqToBbLaneView {
  voiceId: SqToBbVoiceLaneId;
  label: string;
  notes: ReadonlyArray<{
    pitchMidi: number;
    offsetBars: number;
    durationBars: number;
  }>;
}

export interface SqToBbSectionAssignmentView {
  phraseId: string;
  section: EnsembleSection;
  role: SectionRole;
  lineDerived: boolean;
}

export interface SqToBbPhraseBbView {
  phraseId: string;
  geometryShape: VoicingGeometryShape;
  assignments: readonly SqToBbSectionAssignmentView[];
}

export interface SqToBbWorkflowPayload {
  action: SqToBbWorkflowAction;
  styleProfile: SqToBbStyleProfileId;
  vrbId: string;
  seed: number;
  totalBars: number;
  lanes: readonly SqToBbLaneView[];
  phraseFeatures: readonly SqToBbPhraseFeatureChips[];
  gate1: SqBbGceGate1Record;
  gate1BlockedRenderer: boolean;
  contrapuntalLineSet: AbstractLineSet;
  gate2?: SqBbGceGate2Record;
  gate2Blocked?: boolean;
  bbPhrases?: readonly SqToBbPhraseBbView[];
  sqMusicXmlFilepath?: string;
  bbMusicXmlFilepath?: string;
  sqMusicXml?: string;
  bbMusicXml?: string;
  error?: string;
}
