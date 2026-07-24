/**
 * Parse chord loop for riff — full progression length (no 4-chord cap). Falls back to Am7 vamp when empty.
 *
 * Phase 1 trust: null / unparseable slots still fill Am7 (parse behaviour unchanged), but callers can
 * surface `RiffChordLoopDisclosure` so the UI never hides typed→used mismatches.
 *
 * Phase 2: `previewRiffChordLoopTokens` exposes per-token UI state without changing fallback.
 *
 * Phase 3: ack gating — soft (`normalized`) / hard (`unsupported`|`invalid`); empty input ungated.
 * No confidence scores; no polychord grammar.
 */

import {
  normalizeChordProgressionSeparators,
  parseChordsFromPipeDelimited,
  type ParsedChordProgressionEntry,
} from '../harmony/chordProgressionParser';

const DEFAULT_VAMP = ['Am7'];

/** Default Am7 fill / hard-gate picker first option. */
export const RIFF_CHORD_DEFAULT_FALLBACK = DEFAULT_VAMP[0]!;

/** Common hard-gate fallback picker options (Am7 first). */
export const RIFF_CHORD_FALLBACK_OPTIONS: readonly string[] = [
  'Am7',
  'Dm7',
  'G7',
  'Cmaj7',
  'Em7',
  'A7',
  'Cm7',
  'Fmaj7',
];

/** Phase 1 coarse kinds — full 5-state token model lands in Phase 2+. */
export type RiffChordTokenDisclosureKind = 'substitution' | 'unsupported';

/** Phase 2 inline badge states (UI-only; fallback still Am7 for unsupported/invalid). */
export type RiffChordTokenUiStatus = 'valid' | 'normalized' | 'unsupported' | 'invalid';

/** Phase 3 gate kind — `valid` = none; `normalized` = soft; null-parse = hard. */
export type RiffChordTokenGateKind = 'none' | 'soft' | 'hard';

/** Soft Accept ack — keyed by index + typed token + interpreted symbol. */
export interface RiffChordTokenAckEntry {
  index: number;
  token: string;
  usedSymbol: string;
}

export interface RiffChordTokenDisclosure {
  originalToken: string;
  usedSymbol: string;
  kind: RiffChordTokenDisclosureKind;
  /** 1-based bar indices after tiling to `barCount`. */
  bars: number[];
}

export interface RiffChordLoopDisclosure {
  /** Parsed OK but spelling / canonical form differs from typed token. */
  substitutions: RiffChordTokenDisclosure[];
  /** Parse returned null — Phase 1 still fills Am7 (no longer silent). */
  unsupported: RiffChordTokenDisclosure[];
}

/** Live per-token preview for Chord loop field (Phase 2). */
export interface RiffChordTokenPreview {
  token: string;
  usedSymbol: string;
  status: RiffChordTokenUiStatus;
}

export function emptyRiffChordLoopDisclosure(): RiffChordLoopDisclosure {
  return { substitutions: [], unsupported: [] };
}

export function riffChordLoopDisclosureHasIssues(
  d: RiffChordLoopDisclosure | null | undefined
): boolean {
  return !!d && (d.substitutions.length > 0 || d.unsupported.length > 0);
}

function looksLikeChordRoot(token: string): boolean {
  return /^[A-Ga-g]/.test(token.trim());
}

function displayToken(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** Non-empty pipe cells → first whitespace token (same slot order as `parseChordsFromPipeDelimited`). */
function rawLoopTokens(input: string): string[] {
  const normalized = normalizeChordProgressionSeparators(input.trim());
  if (!normalized) return [];
  const out: string[] = [];
  for (const cell of normalized.split('|')) {
    const c = cell.trim();
    if (!c) continue;
    const token = c.split(/\s+/).filter(Boolean)[0];
    if (!token) continue;
    out.push(displayToken(token));
  }
  return out;
}

function disclosureKey(d: Omit<RiffChordTokenDisclosure, 'bars'>): string {
  return `${d.kind}\0${d.originalToken}\0${d.usedSymbol}`;
}

function collectDisclosure(
  loopSlots: Array<{ symbol: string; issue?: Omit<RiffChordTokenDisclosure, 'bars'> }>,
  barCount: number
): RiffChordLoopDisclosure {
  const byKey = new Map<string, RiffChordTokenDisclosure>();
  if (loopSlots.length === 0) return emptyRiffChordLoopDisclosure();

  for (let i = 0; i < barCount; i++) {
    const slot = loopSlots[i % loopSlots.length]!;
    if (!slot.issue) continue;
    const key = disclosureKey(slot.issue);
    let row = byKey.get(key);
    if (!row) {
      row = { ...slot.issue, bars: [] };
      byKey.set(key, row);
    }
    row.bars.push(i + 1);
  }

  const substitutions: RiffChordTokenDisclosure[] = [];
  const unsupported: RiffChordTokenDisclosure[] = [];
  for (const row of byKey.values()) {
    if (row.kind === 'unsupported') unsupported.push(row);
    else substitutions.push(row);
  }
  return { substitutions, unsupported };
}

/**
 * Same chord tiling as `normalizeChordLoop`, plus disclosure of typed→used mismatches.
 * Empty input → intentional Am7 vamp with empty disclosure (not a trust failure).
 */
export function normalizeChordLoopWithDisclosure(
  input: string | undefined,
  barCount: number
): { chords: string[]; disclosure: RiffChordLoopDisclosure } {
  const trimmed = (input ?? '').trim();
  if (!trimmed) {
    return {
      chords: Array(barCount).fill(DEFAULT_VAMP[0]),
      disclosure: emptyRiffChordLoopDisclosure(),
    };
  }

  const rawTokens = rawLoopTokens(trimmed);
  const parsed = parseChordsFromPipeDelimited(trimmed);
  if (parsed.length === 0) {
    const issue: Omit<RiffChordTokenDisclosure, 'bars'> = {
      originalToken: displayToken(trimmed),
      usedSymbol: DEFAULT_VAMP[0]!,
      kind: 'unsupported',
    };
    return {
      chords: Array(barCount).fill(DEFAULT_VAMP[0]),
      disclosure: {
        substitutions: [],
        unsupported: [
          {
            ...issue,
            bars: Array.from({ length: barCount }, (_, i) => i + 1),
          },
        ],
      },
    };
  }

  const loopSlots: Array<{ symbol: string; issue?: Omit<RiffChordTokenDisclosure, 'bars'> }> = [];
  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    const originalToken = rawTokens[i] ?? `(slot ${i + 1})`;
    if (entry == null) {
      console.warn(
        `[riff-chord] bar slot ${i + 1}: parse returned null — using default ${DEFAULT_VAMP[0]} for pitch field`
      );
      loopSlots.push({
        symbol: DEFAULT_VAMP[0]!,
        issue: {
          originalToken,
          usedSymbol: DEFAULT_VAMP[0]!,
          kind: 'unsupported',
        },
      });
      continue;
    }

    const usedSymbol = entry.symbol;
    if (originalToken !== usedSymbol) {
      loopSlots.push({
        symbol: usedSymbol,
        issue: {
          originalToken,
          usedSymbol,
          kind: 'substitution',
        },
      });
    } else {
      loopSlots.push({ symbol: usedSymbol });
    }
  }

  const chords: string[] = [];
  for (let i = 0; i < barCount; i++) {
    chords.push(loopSlots[i % loopSlots.length]!.symbol);
  }

  return {
    chords,
    disclosure: collectDisclosure(loopSlots, barCount),
  };
}

export function normalizeChordLoop(input: string | undefined, barCount: number): string[] {
  return normalizeChordLoopWithDisclosure(input, barCount).chords;
}

/**
 * Phase 2 — live per-token preview for Chord loop UI.
 * Does not change Am7 fallback; uses same parse path as disclosure.
 */
export function previewRiffChordLoopTokens(input: string | undefined): RiffChordTokenPreview[] {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return [];

  const rawTokens = rawLoopTokens(trimmed);
  const parsed = parseChordsFromPipeDelimited(trimmed);
  if (parsed.length === 0) {
    return [
      {
        token: displayToken(trimmed),
        usedSymbol: DEFAULT_VAMP[0]!,
        status: looksLikeChordRoot(trimmed) ? 'unsupported' : 'invalid',
      },
    ];
  }

  const out: RiffChordTokenPreview[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    const token = rawTokens[i] ?? `(slot ${i + 1})`;
    if (entry == null) {
      out.push({
        token,
        usedSymbol: DEFAULT_VAMP[0]!,
        status: looksLikeChordRoot(token) ? 'unsupported' : 'invalid',
      });
      continue;
    }
    if (token !== entry.symbol) {
      out.push({ token, usedSymbol: entry.symbol, status: 'normalized' });
    } else {
      out.push({ token, usedSymbol: entry.symbol, status: 'valid' });
    }
  }
  return out;
}

export function summarizeRiffChordTokenPreviews(tokens: RiffChordTokenPreview[]): {
  total: number;
  valid: number;
  normalized: number;
  unsupported: number;
  invalid: number;
  needReview: number;
} {
  const summary = {
    total: tokens.length,
    valid: 0,
    normalized: 0,
    unsupported: 0,
    invalid: 0,
    needReview: 0,
  };
  for (const t of tokens) {
    summary[t.status] += 1;
    if (t.status !== 'valid') summary.needReview += 1;
  }
  return summary;
}

/** Phase 3 — map UI status → gate kind. */
export function riffChordTokenGateKind(status: RiffChordTokenUiStatus): RiffChordTokenGateKind {
  if (status === 'valid') return 'none';
  if (status === 'normalized') return 'soft';
  return 'hard';
}

export function riffChordTokenAckKey(entry: RiffChordTokenAckEntry): string {
  return `${entry.index}\0${entry.token}\0${entry.usedSymbol}`;
}

/** Soft-gate resolved when ack matches index + typed + interpreted. */
export function isRiffChordTokenSoftAcknowledged(
  token: RiffChordTokenPreview,
  index: number,
  acks: ReadonlySet<string>
): boolean {
  if (riffChordTokenGateKind(token.status) !== 'soft') return true;
  return acks.has(
    riffChordTokenAckKey({ index, token: token.token, usedSymbol: token.usedSymbol })
  );
}

/**
 * True when Generate must stay disabled.
 * Empty preview (empty / whitespace loop) → not blocked.
 * Soft: needs Accept ack. Hard: always blocks until text fixed/Pick rewrite (no soft ack).
 */
export function riffChordLoopGenerateBlocked(
  tokens: readonly RiffChordTokenPreview[],
  softAcks: ReadonlySet<string>
): boolean {
  if (tokens.length === 0) return false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const gate = riffChordTokenGateKind(t.status);
    if (gate === 'none') continue;
    if (gate === 'hard') return true;
    if (!isRiffChordTokenSoftAcknowledged(t, i, softAcks)) return true;
  }
  return false;
}

export function countRiffChordLoopUnresolved(
  tokens: readonly RiffChordTokenPreview[],
  softAcks: ReadonlySet<string>
): { soft: number; hard: number; total: number } {
  let soft = 0;
  let hard = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const gate = riffChordTokenGateKind(t.status);
    if (gate === 'hard') hard += 1;
    else if (gate === 'soft' && !isRiffChordTokenSoftAcknowledged(t, i, softAcks)) soft += 1;
  }
  return { soft, hard, total: soft + hard };
}

/**
 * Replace the first chord token of pipe-cell `index` with `newToken`.
 * Preserves cell separators; empty / missing index → returns input unchanged.
 */
export function replaceRiffChordLoopTokenAt(
  input: string,
  index: number,
  newToken: string
): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed || index < 0) return input;
  const replacement = displayToken(newToken);
  if (!replacement) return input;

  const normalized = normalizeChordProgressionSeparators(trimmed);
  const cells = normalized.split('|');
  let slot = 0;
  for (let c = 0; c < cells.length; c++) {
    const cell = cells[c]!;
    const parts = cell.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    if (slot === index) {
      parts[0] = replacement;
      const lead = cell.match(/^\s*/)?.[0] ?? '';
      const trail = cell.match(/\s*$/)?.[0] ?? '';
      cells[c] = lead + parts.join(' ') + trail;
      return cells.join('|');
    }
    slot += 1;
  }
  return input;
}

/** Expose parsed progression entries for tests / diagnostics. */
export function parseRiffChordProgression(input: string): (ParsedChordProgressionEntry | null)[] {
  return parseChordsFromPipeDelimited(input);
}
