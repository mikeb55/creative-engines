/**
 * Phase 4 - debussy leadsheet file-path ingestion (MusicXML + MIDI).
 */

import fs from 'fs';
import path from 'path';
import {
  LEADSHEET_IMPORT_MAX_BARS,
  musicXmlToImportTimeline,
  type MusicXmlImportTimelineOptions,
} from './musicXmlToImportTimeline';
import { midiToImportTimeline, type MidiImportTimelineOptions } from './midiToImportTimeline';
import type { MosaicImportTimeline } from './mosaicImportTimeline';

export type LeadSheetImportTimelineOptions = MusicXmlImportTimelineOptions | MidiImportTimelineOptions;

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

function isMusicXmlExtension(ext: string): boolean {
  return ext === '.musicxml' || ext === '.xml';
}

function isMidiExtension(ext: string): boolean {
  return ext === '.mid' || ext === '.midi';
}

export function loadDebussyLeadSheetImportTimelineFromFile(
  filePath: string,
  options?: LeadSheetImportTimelineOptions
): MosaicImportTimeline {
  const resolved = path.resolve(filePath);
  const ext = path.extname(resolved).toLowerCase();
  if (isMidiExtension(ext)) {
    const bytes = fs.readFileSync(resolved);
    return midiToImportTimeline(new Uint8Array(bytes), {
      maxBars: LEADSHEET_IMPORT_MAX_BARS,
      ...(options as MidiImportTimelineOptions | undefined),
    });
  }
  if (isMusicXmlExtension(ext)) {
    const xml = fs.readFileSync(resolved, 'utf8');
    return musicXmlToImportTimeline(xml, options as MusicXmlImportTimelineOptions | undefined);
  }
  throw new Error(
    `loadDebussyLeadSheetImportTimelineFromFile: unsupported extension "${ext}" (use .musicxml, .xml, .mid, or .midi).`
  );
}

export function loadDebussyLeadSheetImportTimelineFromMusicXmlFile(
  filePath: string,
  options?: MusicXmlImportTimelineOptions
): MosaicImportTimeline {
  const resolved = path.resolve(filePath);
  const ext = path.extname(resolved).toLowerCase();
  if (!isMusicXmlExtension(ext)) {
    throw new Error(
      `loadDebussyLeadSheetImportTimelineFromMusicXmlFile: expected MusicXML path, got "${ext}".`
    );
  }
  const xml = fs.readFileSync(resolved, 'utf8');
  return musicXmlToImportTimeline(xml, options);
}
