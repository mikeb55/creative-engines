/**
 * Desktop File->Open leadsheet-input (Phase 6) - renderer IPC client only.
 */

import { isDesktopIpc } from './api';

export const LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS = [
  { id: 'debussy' as const, label: 'Debussy' },
  { id: 'kenny_wheeler' as const, label: 'Kenny Wheeler' },
  { id: 'bartok' as const, label: 'Bartók' },
];

export type LeadSheetFileInputComposerId = (typeof LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS)[number]['id'];

export interface LeadSheetFileInputResponse {
  ok: boolean;
  error?: string;
  canceled?: boolean;
  composerId?: LeadSheetFileInputComposerId;
  sourceFileName?: string;
  sourceFormat?: 'musicxml' | 'midi';
  harmonyProvenance?: 'explicit' | 'inferred-advisory';
  harmonyConfidenceByBar?: number[];
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
}): Promise<LeadSheetFileInputResponse> {
  if (!isDesktopIpc() || !window.composerOsDesktop?.invokeApi) {
    return { ok: false, error: 'Desktop IPC is not available.' };
  }
  return window.composerOsDesktop.invokeApi(
    'composer-os-api:run-leadsheet-file-input',
    body
  ) as Promise<LeadSheetFileInputResponse>;
}
