/**
 * Load synthetic phrase fixtures (JSON only - never opens GPX).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateRiffPhraseEntry,
  validateRiffPhraseIngestAuditRow,
} from './riffPhraseLibraryValidate';
import type { RiffPhraseEntry, RiffPhraseIngestAuditRow } from './riffPhraseLibraryTypes';

export const RIFF_PHRASE_SYNTHETIC_FIXTURE_DIR = path.join(
  __dirname,
  'fixtures',
  'phrase-library'
);

export function loadSyntheticPhraseFixtureIndex(): {
  version: number;
  kind: string;
  gpxTouch: boolean;
  licensingGate: string;
  entries: string[];
} {
  const raw = JSON.parse(
    fs.readFileSync(path.join(RIFF_PHRASE_SYNTHETIC_FIXTURE_DIR, 'index.json'), 'utf8')
  ) as {
    version: number;
    kind: string;
    gpxTouch: boolean;
    licensingGate: string;
    entries: string[];
  };
  return raw;
}

export function loadSyntheticPhraseFixtures(): RiffPhraseEntry[] {
  const index = loadSyntheticPhraseFixtureIndex();
  if (index.gpxTouch) {
    throw new Error('synthetic fixture index must set gpxTouch=false');
  }
  const out: RiffPhraseEntry[] = [];
  for (const name of index.entries) {
    const abs = path.join(RIFF_PHRASE_SYNTHETIC_FIXTURE_DIR, name);
    const raw = JSON.parse(fs.readFileSync(abs, 'utf8')) as unknown;
    const v = validateRiffPhraseEntry(raw);
    if (!v.ok) {
      throw new Error(name + ': ' + v.errors.join('; '));
    }
    out.push(v.entry);
  }
  return out;
}

export function loadSyntheticPhraseAuditRows(): RiffPhraseIngestAuditRow[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(RIFF_PHRASE_SYNTHETIC_FIXTURE_DIR, 'synthetic_audit.json'), 'utf8')
  ) as unknown[];
  return raw.map((row, i) => {
    const v = validateRiffPhraseIngestAuditRow(row);
    if (!v.ok) throw new Error('audit[' + i + ']: ' + v.errors.join('; '));
    return v.row;
  });
}