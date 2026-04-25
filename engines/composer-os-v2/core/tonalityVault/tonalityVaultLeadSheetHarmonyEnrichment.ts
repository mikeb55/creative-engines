/**
 * Optional Tonality Vault–style harmonic *interpretation* on top of Stage 2 LeadSheet import.
 *
 * - Reads only imported harmony fields (chord symbols + key metadata); does not mutate `LeadSheet`.
 * - Default OFF via env. The Song Mode adapter wraps enrichment in try/catch: unexpected errors become
 *   warnings and `TonalityVaultEnrichmentRunResult.applied === false` without failing import.
 */

import type { LeadSheetChordEvent, LeadSheetKeySignature } from '../lead-sheet/leadSheetTypes';

const FLAG_ENV = 'COMPOSER_OS_TONALITY_VAULT_ENRICH';

/** `1` / `true` / `yes` (case-insensitive) enables enrichment at integration choke points. */
export function isTonalityVaultLeadSheetHarmonyEnrichmentEnabled(): boolean {
  if (typeof process === 'undefined' || typeof process.env !== 'object') return false;
  const v = process.env[FLAG_ENV];
  if (v === undefined || v === null) return false;
  const raw = String(v).trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** Immutable slice of post–Stage 2 harmony the enrichment layer may read. */
export interface RawHarmonyInput {
  chordEvents: readonly Pick<LeadSheetChordEvent, 'bar' | 'beat' | 'symbol'>[];
  keySignature?: LeadSheetKeySignature;
  totalBars: number;
  /** Optional hint for telemetry / future use; not required for stub logic. */
  importedHarmonyTimelineEventCount?: number;
}

export type TonalityVaultDiatonicClass = 'diatonic_major_key' | 'chromatic_or_unknown';

/** One imported chord → thin interpretation (no replacement symbol). */
export interface TonalityVaultChordAnnotation {
  bar: number;
  beat: number;
  sourceSymbol: string;
  /** Pitch class 0–11 of parsed chord root, when parseable. */
  chordRootPc?: number;
  /** Pitch class 0–11 of local major tonic inferred from `<key><fifths>`. */
  localMajorTonicPc: number;
  diatonicClass: TonalityVaultDiatonicClass;
  /** Major-relative degree label from inferred tonic (e.g. I, II, bVII). */
  scaleDegreeFromMajor?: string;
  /** Lightweight functional hint from scale degree; does not alter harmony. */
  functionalHint: 'tonic_family' | 'predominant_family' | 'dominant_family' | 'chromatic_or_unknown';
  /** Plain-English explanation for compare mode rendering. */
  explanation: string;
}

export interface TonalityVaultLeadSheetHarmonyEnrichment {
  /** Schema version for forward compatibility. */
  version: 1;
  /** Interprets against parallel major from fifths and attaches lightweight degree/function hints. */
  interpretationScope: 'parallel_major_from_fifths_degree_function_hints';
  byChordIndex: TonalityVaultChordAnnotation[];
}

export interface EnrichmentOptions {
  /**
   * Unit tests only: run enrichment even when `COMPOSER_OS_TONALITY_VAULT_ENRICH` is unset.
   * Production paths must not set this.
   */
  __testBypassFeatureFlag?: boolean;
}

export interface TonalityVaultEnrichmentRunResult {
  /** True only when enrichment ran (flag on or test bypass); false when flag off or adapter caught an exception. */
  applied: boolean;
  enrichment?: TonalityVaultLeadSheetHarmonyEnrichment;
  warnings: string[];
}

const STEP_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Tonic pitch class for a major key with the given key-signature fifths (MusicXML convention). */
export function majorTonicPcFromKeyFifths(fifths: number): number {
  let n = (7 * fifths) % 12;
  if (n < 0) n += 12;
  return n;
}

function majorScaleRoots(tonicPc: number): Set<number> {
  const intervals = [0, 2, 4, 5, 7, 9, 11];
  return new Set(intervals.map((i) => (tonicPc + i) % 12));
}

function normalizeAccidentalChunk(raw: string): number {
  let a = 0;
  for (const ch of raw) {
    if (ch === '#' || ch === '♯') a++;
    else if (ch === 'b' || ch === '♭') a--;
  }
  return a;
}

/** Best-effort root pitch class from a compact chord symbol (e.g. `Cmaj7`, `Bb`, `F#m7b5`). */
export function parseChordRootPcFromSymbol(symbol: string): number | undefined {
  const s = symbol.trim();
  const m = s.match(/^([A-Ga-g])([#b♯♭]*)/);
  if (!m) return undefined;
  const step = m[1]!.toUpperCase();
  const base = STEP_PC[step];
  if (base === undefined) return undefined;
  const alt = normalizeAccidentalChunk(m[2] ?? '');
  return (base + alt + 120) % 12;
}

function localTonicFromKey(sig: LeadSheetKeySignature | undefined): number {
  const f = sig?.fifths ?? 0;
  return majorTonicPcFromKeyFifths(f);
}

const MAJOR_DEGREE_BY_INTERVAL = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'] as const;

function degreeFromMajor(tonicPc: number, rootPc: number): string {
  const i = (rootPc - tonicPc + 120) % 12;
  return MAJOR_DEGREE_BY_INTERVAL[i] ?? '?';
}

function functionalHintFromInterval(interval: number): TonalityVaultChordAnnotation['functionalHint'] {
  if (interval === 0 || interval === 4 || interval === 9) return 'tonic_family';
  if (interval === 2 || interval === 5) return 'predominant_family';
  if (interval === 7 || interval === 11) return 'dominant_family';
  return 'chromatic_or_unknown';
}

function explanationForAnnotation(
  symbol: string,
  degree: string | undefined,
  hint: TonalityVaultChordAnnotation['functionalHint'],
  diatonicClass: TonalityVaultDiatonicClass
): string {
  if (!degree) return `Could not parse chord root for ${symbol}; kept as raw-only interpretation.`;
  if (diatonicClass === 'diatonic_major_key') {
    if (hint === 'dominant_family') return `${symbol} reads as ${degree} (dominant-family color) in the local major key.`;
    if (hint === 'predominant_family') return `${symbol} reads as ${degree} (predominant-family color) in the local major key.`;
    return `${symbol} reads as ${degree} (tonic-family color) in the local major key.`;
  }
  return `${symbol} reads as ${degree}, outside the local major scale (chromatic color).`;
}

/**
 * Thin enrichment pass: classifies each `chordEvents` entry as diatonic vs chromatic
 * against **parallel major** of the written key signature (first slice limitation).
 */
export function enrichHarmonyWithTonalityVault(
  input: RawHarmonyInput,
  options?: EnrichmentOptions
): TonalityVaultEnrichmentRunResult {
  const warnings: string[] = [];
  const on =
    options?.__testBypassFeatureFlag === true || isTonalityVaultLeadSheetHarmonyEnrichmentEnabled();
  if (!on) {
    return { applied: false, warnings };
  }

  const localMajorTonicPc = localTonicFromKey(input.keySignature);
  const scale = majorScaleRoots(localMajorTonicPc);
  const byChordIndex: TonalityVaultChordAnnotation[] = [];

  for (const ev of input.chordEvents) {
    const rootPc = parseChordRootPcFromSymbol(ev.symbol);
    const interval = rootPc === undefined ? undefined : (rootPc - localMajorTonicPc + 120) % 12;
    const degree = rootPc === undefined ? undefined : degreeFromMajor(localMajorTonicPc, rootPc);
    const diatonicClass: TonalityVaultDiatonicClass =
      rootPc === undefined
        ? 'chromatic_or_unknown'
        : scale.has(rootPc)
          ? 'diatonic_major_key'
          : 'chromatic_or_unknown';
    const functionalHint = interval === undefined ? 'chromatic_or_unknown' : functionalHintFromInterval(interval);
    if (rootPc === undefined) {
      warnings.push(`Tonality Vault enrichment: could not parse chord root for "${ev.symbol}" (bar ${ev.bar}).`);
    }
    byChordIndex.push({
      bar: ev.bar,
      beat: ev.beat,
      sourceSymbol: ev.symbol,
      ...(rootPc !== undefined ? { chordRootPc: rootPc } : {}),
      localMajorTonicPc,
      diatonicClass,
      ...(degree ? { scaleDegreeFromMajor: degree } : {}),
      functionalHint,
      explanation: explanationForAnnotation(ev.symbol, degree, functionalHint, diatonicClass),
    });
  }

  return {
    applied: true,
    enrichment: {
      version: 1,
      interpretationScope: 'parallel_major_from_fifths_degree_function_hints',
      byChordIndex,
    },
    warnings,
  };
}
