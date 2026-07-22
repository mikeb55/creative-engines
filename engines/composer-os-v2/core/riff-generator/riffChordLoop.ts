/**
 * Parse chord loop for riff — full progression length (no 4-chord cap). Falls back to Am7 vamp when empty.
 *
 * Phase 1 trust: null / unparseable slots still fill Am7 (parse behaviour unchanged), but callers can
 * surface `RiffChordLoopDisclosure` so the UI never hides typed→used mismatches.
 *
 * Phase 2: `previewRiffChordLoopTokens` exposes per-token UI state without changing fallback.
 */

import {
  normalizeChordProgressionSeparators,
  parseChordsFromPipeDelimited,
  type ParsedChordProgressionEntry,
} from '../harmony/chordProgressionParser';

const DEFAULT_VAMP = ['Am7'];

/** Phase 1 coarse kinds — full 5-state token model lands in Phase 2+. */
export type RiffChordTokenDisclosureKind = 'substitution' | 'unsupported';

/** Phase 2 inline badge states (UI-only; fallback still Am7 for unsupported/invalid). */
export type RiffChordTokenUiStatus = 'valid' | 'normalized' | 'unsupported' | 'invalid';

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

/** Expose parsed progression entries for tests / diagnostics. */
export function parseRiffChordProgression(input: string): (ParsedChordProgressionEntry | null)[] {
  return parseChordsFromPipeDelimited(input);
}
