/**
 * Lightweight chord text parsing: | bars, line blocks, iReal-ish { } repeats ignored as content.
 */

import { normalizeChordProgressionSeparators } from '../harmony/chordProgressionParser';
import type { ChordInputSectionBlock, ParsedChordInputPlan } from './chordInputTypes';

const CHORD_TOKEN =
  /^([A-G](?:#|b)?)([^/]*?)(?:\/([A-G](?:#|b)?))?$/i;

function normalizeChordToken(raw: string): string {
  return raw.trim().replace(/\s+/g, '');
}

export function isRecognizedChordToken(raw: string): boolean {
  const s = normalizeChordToken(raw);
  if (!s) return false;
  return CHORD_TOKEN.test(s) && (s.match(CHORD_TOKEN)?.[2]?.length ?? 0) <= 14;
}

const SECTION_HEADER = /^\s*\[([^\]]+)\]\s*$/i;
const SECTION_COLON = /^\s*(?:section|sec)\s*:\s*(.+)$/i;

function stripIrealRepeatBraces(line: string): string {
  return line.replace(/\{[^}]*\}/g, ' ').trim();
}

function splitBarLine(line: string): string[] {
  const cleaned = normalizeChordProgressionSeparators(stripIrealRepeatBraces(line));
  if (cleaned.includes('|')) {
    return cleaned
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.length ? parts : [];
}

/**
 * Line-separated blocks: optional [SECTION] header, then chord lines (| or space-separated).
 */
export function parseChordInputBlocks(text: string): ParsedChordInputPlan {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const sections: ChordInputSectionBlock[] = [];
  let currentLabel = 'A';
  let currentBars: string[] = [];

  function flush(): void {
    if (currentBars.length === 0) return;
    sections.push({ label: currentLabel, bars: [...currentBars] });
    currentBars = [];
  }

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const m1 = line.match(SECTION_HEADER);
    if (m1) {
      flush();
      currentLabel = m1[1].trim();
      continue;
    }
    const m2 = line.match(SECTION_COLON);
    if (m2) {
      flush();
      currentLabel = m2[1].trim();
      continue;
    }
    const bars = splitBarLine(line);
    for (const cell of bars) {
      const tok = normalizeChordToken(cell);
      if (tok) currentBars.push(tok);
    }
  }
  flush();

  const allBars = sections.flatMap((s) => s.bars);
  return {
    sections,
    allBars,
    totalBars: allBars.length,
  };
}

/**
 * Pipe-separated single progression (common duo input). Variable length.
 */
export function parsePipeChordLine(line: string): string[] {
  const trimmed = normalizeChordProgressionSeparators(line.trim());
  if (!trimmed) return [];
  const bars = trimmed
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((cell) => {
      const first = cell.split(/\s+/)[0] ?? '';
      return normalizeChordToken(first);
    })
    .filter(Boolean);
  return bars;
}
