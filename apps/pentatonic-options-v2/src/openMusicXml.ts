/**
 * Open MusicXML seam for Pentatonic Options.
 * Dialog is injected. Score bytes go through the existing MusicXML intake, then analyseScoreXml.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { extractScoreMusicXmlFromUint8Array } from '../../../engines/composer-os-v2/core/lead-sheet/musicXmlScoreInput';
import { analyseScoreXml } from '../../../engines/composer-os-v2/core/pentatonic/practiceFacade';

export const MUSICXML_OPEN_EXTENSIONS = ['musicxml', 'xml', 'mxl'] as const;

export function musicXmlOpenDialogOptions(): {
  title: string;
  filters: { name: string; extensions: string[] }[];
  properties: Array<'openFile'>;
} {
  return {
    title: 'Open MusicXML',
    filters: [{ name: 'MusicXML', extensions: [...MUSICXML_OPEN_EXTENSIONS] }],
    properties: ['openFile'],
  };
}

export interface LoadedMusicXmlScore {
  ok: true;
  path: string;
  fileName: string;
  sha256: string;
  map: string;
  regionCount: number;
  song: string;
  xml: string;
}

export interface RejectedMusicXmlScore {
  ok: false;
  error: string;
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function readFailure(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not read MusicXML.';
}

export function loadMusicXmlFile(
  filePath: string,
  readFile: (filePath: string) => Uint8Array = (target) => fs.readFileSync(target)
): LoadedMusicXmlScore | RejectedMusicXmlScore {
  let before: Uint8Array;
  try {
    before = readFile(filePath);
  } catch (error) {
    return { ok: false, error: readFailure(error) };
  }
  const beforeHash = sha256Bytes(before);
  const extracted = extractScoreMusicXmlFromUint8Array(before);
  if (!extracted.ok || !extracted.xml) {
    return { ok: false, error: extracted.errors[0] || 'Not a MusicXML score.' };
  }
  let analysed: ReturnType<typeof analyseScoreXml>;
  try {
    analysed = analyseScoreXml(extracted.xml);
  } catch (error) {
    return { ok: false, error: readFailure(error) };
  }
  let after: Uint8Array;
  try {
    after = readFile(filePath);
  } catch {
    return { ok: false, error: 'Source MusicXML could not be re-read.' };
  }
  if (sha256Bytes(after) !== beforeHash) {
    return { ok: false, error: 'Source MusicXML changed.' };
  }
  return {
    ok: true,
    path: filePath,
    fileName: path.basename(filePath),
    sha256: beforeHash,
    map: analysed.map,
    regionCount: analysed.regionCount,
    song: analysed.song,
    xml: extracted.xml,
  };
}

export async function openMusicXmlFromDialog(deps: {
  showOpenDialog: (options: ReturnType<typeof musicXmlOpenDialogOptions>) => Promise<{ canceled: boolean; filePaths: string[] }>;
  readFile?: (filePath: string) => Uint8Array;
}): Promise<null | LoadedMusicXmlScore | RejectedMusicXmlScore> {
  const picked = await deps.showOpenDialog(musicXmlOpenDialogOptions());
  if (picked.canceled || !picked.filePaths[0]) return null;
  return loadMusicXmlFile(picked.filePaths[0], deps.readFile);
}
