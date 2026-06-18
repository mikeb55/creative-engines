/**
 * Desktop File->Open leadsheet-input (Phase 6) - renderer IPC client only.
 */

import { isDesktopIpc } from './api';

/** Keep ids aligned with `runLeadSheetFileInputApi.ts` LEADSHEET_FILE_INPUT_COMPOSERS. */
export const LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS = [
  { id: 'debussy' as const, label: 'Debussy' },
  { id: 'kenny_wheeler' as const, label: 'Kenny Wheeler' },
  { id: 'james_brown' as const, label: 'James Brown' },
  { id: 'bartok' as const, label: 'Bartók' },
  { id: 'art_rock' as const, label: 'Art Rock' },
];

export type LeadSheetFileInputComposerId = (typeof LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS)[number]['id'];

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
}): Promise<LeadSheetFileInputResponse> {
  if (!isDesktopIpc() || !window.composerOsDesktop?.invokeApi) {
    return { ok: false, error: 'Desktop IPC is not available.' };
  }
  return window.composerOsDesktop.invokeApi(
    'composer-os-api:run-leadsheet-file-input',
    body
  ) as Promise<LeadSheetFileInputResponse>;
}
