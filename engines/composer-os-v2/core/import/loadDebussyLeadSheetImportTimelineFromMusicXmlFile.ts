/**
 * Phase 4 - debussy leadsheet file-path ingestion (MusicXML only).
 */

import fs from 'fs';
import path from 'path';
import {
  musicXmlToImportTimeline,
  type MusicXmlImportTimelineOptions,
} from './musicXmlToImportTimeline';
import type { MosaicImportTimeline } from './mosaicImportTimeline';

/** Chord symbols in the committed sample leadsheet (distinct from hardcoded proof set). */
export const DEBUSSY_LEADSHEET_FILE_PROOF_CHORDS: readonly string[] = [
  'Fmaj7',
  'Bb9',
  'Ebmaj7',
  'A7alt',
  'Fmaj7',
  'Bb13',
  'Ebmaj9',
  'Ebmaj9',
];

export const DEBUSSY_LEADSHEET_FILE_PROOF_RELATIVE =
  'resources/test-fixtures/debussy-leadsheet-file-proof/debussy_file_proof_leadsheet.musicxml';

export function resolveDebussyLeadSheetFileProofPath(fromDir = path.join(__dirname, '..', '..')): string {
  return path.join(fromDir, DEBUSSY_LEADSHEET_FILE_PROOF_RELATIVE);
}

export function loadDebussyLeadSheetImportTimelineFromMusicXmlFile(
  filePath: string,
  options?: MusicXmlImportTimelineOptions
): MosaicImportTimeline {
  const resolved = path.resolve(filePath);
  const xml = fs.readFileSync(resolved, 'utf8');
  return musicXmlToImportTimeline(xml, {
    targetBars: 8,
    ...options,
  });
}
