/**
 * Inline riff chord-grid warnings — same parser as `riffChordLoop` / `parseChordsFromPipeDelimited`.
 */

import { noteNameToPitchClass } from '@composer-os/core/harmony/chordSymbolAnalysis';
import { parseChordStructureFromNormalized } from '../../../../engines/core/chordSymbolRegistry';
import {
  isValidChordShapeNormalized,
  normalizeLeadSheetChordSpelling,
} from '../../../../engines/core/leadSheetChordNormalize';
import {
  normalizeChordProgressionSeparators,
  normalizeChordToken,
  parseChordsFromPipeDelimited,
} from './chordProgressionClient';

export type RiffChordGridWarning = { token: string; message: string };

function displayToken(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function warningMessageForRawCell(rawCell: string): string | null {
  const display = displayToken(rawCell);
  if (!display) return null;

  const parsed = parseChordsFromPipeDelimited(display);
  if (parsed.length > 0 && parsed[0] != null) return null;

  const primary = normalizeChordToken(display);
  if (/^tonic_wash$/i.test(primary.replace(/\s+/g, ''))) return null;

  if (!isValidChordShapeNormalized(primary)) {
    return `${display} — unrecognised symbol`;
  }

  const symbol = normalizeLeadSheetChordSpelling(display).replace(/\s+/g, ' ').trim();
  const structure = parseChordStructureFromNormalized(normalizeChordToken(symbol));
  if (!structure) {
    return `${display} — unrecognised symbol`;
  }
  const rootPc = noteNameToPitchClass(structure.root);
  if (rootPc === undefined) {
    return `${display} — unknown root`;
  }
  return `${display} — unrecognised symbol`;
}

/** One warning per pipe-delimited bar cell (first chord in cell), matching riff engine slots. */
export function riffChordGridWarnings(input: string): RiffChordGridWarning[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const normalized = normalizeChordProgressionSeparators(trimmed);
  if (!normalized) return [];

  const warnings: RiffChordGridWarning[] = [];
  for (const cell of normalized.split('|')) {
    const c = cell.trim();
    if (!c) continue;
    const token = c.split(/\s+/).filter(Boolean)[0];
    if (!token) continue;
    const message = warningMessageForRawCell(token);
    if (message) warnings.push({ token: displayToken(token), message });
  }
  return warnings;
}
