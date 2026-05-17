/**
 * SQ→BB workflow UI types (mirrors engine `sqToBbWorkflowTypes` for app bundle).
 */

export type SqToBbStyleProfileId = 'schneider' | 'basie' | 'mingus' | 'brookmeyer';

export type {
  ComposerClassicalEraId as SqToBbClassicalEraId,
  ComposerEraId,
  ComposerEraSelectValue as SqToBbEraSelectValue,
  ComposerJazzEraId as SqToBbJazzEraId,
} from './composerEraOptions';

export {
  COMPOSER_ERA_SELECT_NULL as SQ_TO_BB_ERA_SELECT_NULL,
  composerEraDomValue,
  composerEraForRequest as sqToBbEraForRequest,
  composerEraSelectValueFromDom,
} from './composerEraOptions';

export {
  SQ_TO_BB_COMPATIBILITY_BADGE_LABEL,
  sqToBbClassicalEraCompatibility,
  sqToBbMismatchNoticeMessage,
  type SqToBbEraBbCompatibility,
} from '@composer-os/core/counterpoint/sqToBbWorkflowTypes';

export type SqToBbChordSourceMode = 'generate_harmony' | 'use_user_chords';

export type SqToBbDensity = 'sparse' | 'medium' | 'dense';

export const SQ_TO_BB_DENSITY_OPTIONS: ReadonlyArray<{ id: SqToBbDensity; label: string }> = [
  { id: 'sparse', label: 'Sparse' },
  { id: 'medium', label: 'Medium' },
  { id: 'dense', label: 'Dense' },
] as const;

/** Raw chord timeline for SQ→BB when user supplies progression (Session 1: store only). */
export function resolveSqToBbUserChordInput(
  mode: SqToBbChordSourceMode,
  raw: string,
): string | null {
  if (mode !== 'use_user_chords') return null;
  const t = raw.trim();
  return t.length > 0 ? raw : null;
}

export type SqToBbChordMismatchResolution =
  | 'repeat'
  | 'fill_internal'
  | 'stretch'
  | 'compress';

export {
  canGenerateWithUserChords,
  detectBarCountMismatch,
  lightCountUserChordBars,
  parseUserChordInput,
  type BarCountMismatch,
} from '@composer-os/core/counterpoint/parseUserChordInput';

export const SQ_TO_BB_LENGTH_PRESETS = [16, 32, 64] as const;
export const SQ_TO_BB_LENGTH_MIN = 8;
export const SQ_TO_BB_LENGTH_MAX = 128;
export const SQ_TO_BB_LENGTH_CUSTOM = 'custom' as const;

export type SqToBbLengthSelectValue = (typeof SQ_TO_BB_LENGTH_PRESETS)[number] | typeof SQ_TO_BB_LENGTH_CUSTOM;

export function resolveSqToBbLengthFromUi(
  select: SqToBbLengthSelectValue,
  customRaw: string,
): { ok: true; lengthBars: number } | { ok: false; error: string } {
  if (select !== SQ_TO_BB_LENGTH_CUSTOM) {
    return { ok: true, lengthBars: select };
  }
  const trimmed = customRaw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a bar count between 8 and 128.' };
  }
  const n = Math.floor(Number(trimmed));
  if (!Number.isFinite(n) || n !== Number(trimmed)) {
    return { ok: false, error: 'Bar count must be a whole number.' };
  }
  if (n < SQ_TO_BB_LENGTH_MIN || n > SQ_TO_BB_LENGTH_MAX) {
    return { ok: false, error: `Bar count must be between ${SQ_TO_BB_LENGTH_MIN} and ${SQ_TO_BB_LENGTH_MAX}.` };
  }
  return { ok: true, lengthBars: n };
}

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

export const SQ_TO_BB_SQ_COMPOSER_SELECT_NULL = '';

export const SQ_TO_BB_SQ_COMPOSER_OPTIONS: ReadonlyArray<{
  id: SqToBbSqComposer;
  label: string;
  enabled: boolean;
}> = [
  { id: null, label: '— None (default) —', enabled: true },
  { id: 'bartok', label: 'Bartók', enabled: true },
  { id: 'ravel', label: 'Ravel', enabled: true },
  { id: 'herrmann', label: 'Herrmann', enabled: true },
  { id: 'morricone', label: 'Morricone', enabled: true },
  { id: 'williams', label: 'Williams', enabled: true },
  { id: 'rota', label: 'Rota', enabled: true },
  { id: 'goldsmith', label: 'Goldsmith', enabled: true },
  { id: 'glass', label: 'Glass', enabled: true },
  { id: 'zimmer', label: 'Zimmer', enabled: true },
  { id: 'badalamenti', label: 'Badalamenti', enabled: true },
  { id: 'shostakovich', label: 'Shostakovich', enabled: true },
  { id: 'webern', label: 'Webern', enabled: true },
  { id: 'joni_mitchell', label: 'Joni Mitchell', enabled: true },
] as const;

export const SQ_TO_BB_STYLE_PROFILES: ReadonlyArray<{
  id: SqToBbStyleProfileId;
  label: string;
}> = [
  { id: 'schneider', label: 'Schneider' },
  { id: 'basie', label: 'Basie' },
  { id: 'mingus', label: 'Mingus' },
  { id: 'brookmeyer', label: 'Brookmeyer' },
];

export type SqToBbVoiceLaneId = 'S' | 'A' | 'T' | 'B';

export interface SqToBbGate1ReviewHintUi {
  flaggedPillar: 'melodic_identity' | 'phrase_grammar';
  flaggedPhraseIndex: number;
  flaggedScore: number;
  detailLine: string;
}

export interface SqToBbGate1Ui {
  outcome: 'pass' | 'retry_pass' | 'fail';
  melodicIdentity: number;
  phraseGrammar: number;
  primaryMonitoredCategory: 'Melodic Identity';
  proceedToRenderer: boolean;
  logLine: string;
  reviewHint?: SqToBbGate1ReviewHintUi;
}

export interface SqToBbGate2Ui {
  outcome: 'pass' | 'review' | 'fail';
  arrangementOrchestration: number;
  economyFocus: number;
  hierarchyClarity: number;
  overallGce: number;
  hardFail: boolean;
  logLine: string;
}

export interface SqToBbPhraseFeatureChipsUi {
  phraseId: string;
  startBeat: number;
  endBeat: number;
  textureClass: string;
  density: number;
  cadencePoint: string;
  lineIndependence: number;
}

export interface SqToBbLaneViewUi {
  voiceId: SqToBbVoiceLaneId;
  label: string;
  notes: ReadonlyArray<{
    pitchMidi: number;
    offsetBars: number;
    durationBars: number;
  }>;
}

export interface SqToBbPhraseBbViewUi {
  phraseId: string;
  geometryShape: string;
  assignments: ReadonlyArray<{
    phraseId: string;
    section: string;
    role: string;
    lineDerived: boolean;
  }>;
}

export interface SqToBbWorkflowPayloadUi {
  action: string;
  styleProfile: SqToBbStyleProfileId;
  vrbId: string;
  seed: number;
  totalBars: number;
  lanes: readonly SqToBbLaneViewUi[];
  phraseFeatures: readonly SqToBbPhraseFeatureChipsUi[];
  gate1: SqToBbGate1Ui;
  gate1BlockedRenderer: boolean;
  contrapuntalLineSet: unknown;
  gate2?: SqToBbGate2Ui;
  gate2Blocked?: boolean;
  bbPhrases?: readonly SqToBbPhraseBbViewUi[];
  sqMusicXmlFilepath?: string;
  bbMusicXmlFilepath?: string;
  sqMusicXml?: string;
  bbMusicXml?: string;
  error?: string;
}
