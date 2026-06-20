/**
 * Desktop File->Open leadsheet-input (Phase 6) - renderer IPC client only.
 */

import { isDesktopIpc } from './api';

/** Keep ids aligned with `runLeadSheetFileInputApi.ts` LEADSHEET_FILE_INPUT_COMPOSERS. */
export type LeadSheetFileInputComposerId =
  | 'debussy'
  | 'kenny_wheeler'
  | 'james_brown'
  | 'bartok'
  | 'art_rock';

export const ART_ROCK_LEADSHEET_HELPER_TEXT =
  'Sparse intro, dense peak, open ending — modal power-chord color with a rock backbeat, for indie, post-rock, or cinematic charts.';

export const LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS: ReadonlyArray<{
  id: LeadSheetFileInputComposerId;
  label: string;
  title?: string;
}> = [
  { id: 'debussy', label: 'Debussy' },
  { id: 'kenny_wheeler', label: 'Kenny Wheeler' },
  { id: 'james_brown', label: 'James Brown' },
  { id: 'bartok', label: 'Bartók' },
  { id: 'art_rock', label: 'Art Rock', title: ART_ROCK_LEADSHEET_HELPER_TEXT },
];

export function getLeadSheetComposerDescription(composerId: LeadSheetFileInputComposerId): string | undefined {
  if (composerId === 'art_rock') return ART_ROCK_LEADSHEET_HELPER_TEXT;
  return LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS.find((opt) => opt.id === composerId)?.title;
}

export function sanitizeLeadSheetOutputLabel(raw: string): string {
  return raw.trim().replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
}

export function previewLeadSheetOutputFilename(
  outputLabel: string,
  composerId: LeadSheetFileInputComposerId,
  sourceFileName?: string | null
): string {
  const stem =
    sanitizeLeadSheetOutputLabel(outputLabel) ||
    (sourceFileName
      ? sourceFileName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').slice(0, 60)
      : 'leadsheet');
  return `${stem}_${composerId}_v<timestamp>_quintet.musicxml`;
}

export type LeadSheetHarmonyProvenanceBar = 'inferred-advisory' | 'user-override' | 'explicit';

export type LeadSheetHarmonyOverridesByBar = Record<number, string>;

export interface LeadSheetFileInputResponse {
  ok: boolean;
  error?: string;
  canceled?: boolean;
  composerId?: LeadSheetFileInputComposerId;
  sourceFileName?: string;
  sourceFormat?: 'musicxml' | 'midi';
  harmonyProvenance?: 'explicit' | 'inferred-advisory';
  harmonyConfidenceByBar?: number[];
  harmonyProvenanceByBar?: LeadSheetHarmonyProvenanceBar[];
  midiQuantizeNote?: string;
  barCount?: number;
  partCount?: number;
  partIds?: string[];
  hasBassPart?: boolean;
  hasDuoParts?: boolean;
  handoffVariationDetected?: boolean;
  melodyCarrierPartIds?: string[];
  musicXmlExportOk?: boolean;
  savedMusicXmlPath?: string;
}

/** Panel-facing slice derived from a successful API / IPC response. */
export interface LeadSheetFileInputPanelState {
  advisory?: string;
  harmonyConfidenceByBar?: number[];
  harmonyProvenanceByBar?: LeadSheetHarmonyProvenanceBar[];
  sourceFormat?: 'musicxml' | 'midi';
}

const INFERRED_HARMONY_ADVISORY_FALLBACK =
  'Harmony was inferred from melody content and is advisory only — not locked from the source file.';

export function deriveLeadSheetHarmonyAdvisory(
  response: Pick<LeadSheetFileInputResponse, 'harmonyProvenance' | 'midiQuantizeNote'>
): string | undefined {
  if (response.harmonyProvenance !== 'inferred-advisory') return undefined;
  return response.midiQuantizeNote?.trim() || INFERRED_HARMONY_ADVISORY_FALLBACK;
}

export function mapLeadSheetFileInputResponseToPanelState(
  response: LeadSheetFileInputResponse
): LeadSheetFileInputPanelState {
  const advisory = deriveLeadSheetHarmonyAdvisory(response);
  const panelState: LeadSheetFileInputPanelState = {};
  if (advisory) panelState.advisory = advisory;
  if (response.harmonyConfidenceByBar?.length) {
    panelState.harmonyConfidenceByBar = response.harmonyConfidenceByBar;
  }
  if (response.harmonyProvenanceByBar?.length) {
    panelState.harmonyProvenanceByBar = response.harmonyProvenanceByBar;
  }
  if (response.sourceFormat) panelState.sourceFormat = response.sourceFormat;
  return panelState;
}

export function buildLeadSheetHarmonyOverridePayload(
  overridesByBar: LeadSheetHarmonyOverridesByBar
): LeadSheetHarmonyOverridesByBar | undefined {
  const out: LeadSheetHarmonyOverridesByBar = {};
  for (const [key, value] of Object.entries(overridesByBar)) {
    const bar = Number(key);
    if (!Number.isInteger(bar) || bar < 1) continue;
    const symbol = value.trim();
    if (!symbol) continue;
    out[bar] = symbol;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface LeadSheetPickFileResponse {
  ok: boolean;
  canceled?: boolean;
  filepath?: string;
  error?: string;
}

export async function pickLeadSheetFile(): Promise<LeadSheetPickFileResponse> {
  if (!isDesktopIpc() || !window.composerOsDesktop?.invokeApi) {
    return { ok: false, error: 'Desktop IPC is not available.' };
  }
  return window.composerOsDesktop.invokeApi(
    'composer-os-api:pick-leadsheet-file',
    {}
  ) as Promise<LeadSheetPickFileResponse>;
}

/** @deprecated Use pickLeadSheetFile */
export async function pickLeadSheetMusicXmlFile(): Promise<LeadSheetPickFileResponse> {
  return pickLeadSheetFile();
}

export async function runLeadSheetFileInputDesktop(body: {
  filePath: string;
  composerId: LeadSheetFileInputComposerId;
  seed?: number;
  rhythmicActivity?: number;
  guitarCompDensity?: number;
  harmonyOverridesByBar?: LeadSheetHarmonyOverridesByBar;
  /** Optional user-facing stem for saved MusicXML filename. */
  outputLabel?: string;
}): Promise<LeadSheetFileInputResponse> {
  if (!isDesktopIpc() || !window.composerOsDesktop?.invokeApi) {
    return { ok: false, error: 'Desktop IPC is not available.' };
  }
  return window.composerOsDesktop.invokeApi(
    'composer-os-api:run-leadsheet-file-input',
    body
  ) as Promise<LeadSheetFileInputResponse>;
}
