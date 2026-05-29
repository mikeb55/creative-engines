/**
 * Harmonic analysis for pasted progressions — scale degrees, function, tension, modulation hints.
 */

import type { AnalyticalModeResult } from '../music-context/musicContextTypes';
import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  enrichHarmonyWithTonalityVault,
  isTonalityVaultLeadSheetHarmonyEnrichmentEnabled,
  majorTonicPcFromKeyFifths,
  parseChordRootPcFromSymbol,
  type TonalityVaultChordAnnotation,
} from '../tonalityVault/tonalityVaultLeadSheetHarmonyEnrichment';

const FIFTHS_BY_ROOT: Record<string, number> = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  Gb: -6,
  'C#': 7,
  Db: -5,
  Ab: -4,
  Eb: -3,
  Bb: -2,
  F: -1,
};

const MAJOR_DEGREE_BY_INTERVAL = [
  'I',
  'bII',
  'II',
  'bIII',
  'III',
  'IV',
  '#IV',
  'V',
  'bVI',
  'VI',
  'bVII',
  'VII',
] as const;

const PC_TO_ROOT: Record<number, string> = {
  0: 'C',
  1: 'Db',
  2: 'D',
  3: 'Eb',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'Ab',
  9: 'A',
  10: 'Bb',
  11: 'B',
};

function parseKeyLabel(key?: string): { root: string; mode: string; tonicPc: number } {
  const raw = String(key ?? 'C').trim() || 'C';
  const minor = /minor|m\b/i.test(raw);
  const rootMatch = raw.match(/^([A-G](?:#|b)?)/i);
  const root = rootMatch ? rootMatch[1]![0]!.toUpperCase() + rootMatch[1]!.slice(1) : 'C';
  const fifths = FIFTHS_BY_ROOT[root] ?? FIFTHS_BY_ROOT[root.replace('Db', 'Db')] ?? 0;
  const tonicPc = majorTonicPcFromKeyFifths(fifths);
  return { root, mode: minor ? 'minor' : 'major', tonicPc };
}

function majorScaleRoots(tonicPc: number): Set<number> {
  return new Set([0, 2, 4, 5, 7, 9, 11].map((i) => (tonicPc + i) % 12));
}

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

function isDominantQuality(symbol: string): boolean {
  const s = symbol.toLowerCase();
  if (/maj|Δ|ma7|m7|min|ø|°|dim|sus2|sus4/.test(s) && !/(^|[^a-z])7/.test(s)) {
    if (!/7/.test(s)) return false;
  }
  return (
    /(^|[^0-9])7($|[^0-9])/.test(s) ||
    /7alt|7#|7b|9|11|13/.test(s) ||
    /dom7/.test(s)
  );
}

function isTonicQuality(symbol: string): boolean {
  const s = symbol.toLowerCase();
  if (/maj|Δ|ma7|maj7|6($|[^0-9])/.test(s)) return true;
  if (/^([a-g][#b]?)$/.test(s.trim())) return true;
  return false;
}

function tensionForChord(
  symbol: string,
  functionalHint: string | null,
  scaleDegree: string | null
): 'low' | 'medium' | 'high' | null {
  const domDegree =
    scaleDegree === 'V' ||
    scaleDegree === 'VII' ||
    scaleDegree === 'bVII' ||
    scaleDegree === 'bII';
  if (functionalHint === 'dominant_family' || (domDegree && isDominantQuality(symbol))) {
    return 'high';
  }
  if (functionalHint === 'tonic_family' && isTonicQuality(symbol)) {
    return 'low';
  }
  if (functionalHint === 'predominant_family' || functionalHint === 'chromatic_or_unknown') {
    return 'medium';
  }
  if (isTonicQuality(symbol)) return 'low';
  if (isDominantQuality(symbol)) return 'high';
  return null;
}

function flattenChords(chords: string[]): { barIndex: number; symbol: string }[] {
  const out: { barIndex: number; symbol: string }[] = [];
  let barIndex = 0;
  for (const entry of chords) {
    const raw = String(entry).trim();
    if (!raw) continue;
    if (raw.includes('|')) {
      for (const seg of raw.split('|')) {
        const tokens = seg.trim().split(/\s+/).filter((t) => t.length > 0);
        if (tokens.length === 0) {
          barIndex++;
          continue;
        }
        for (const token of tokens) {
          out.push({ barIndex, symbol: token });
        }
        barIndex++;
      }
    } else {
      out.push({ barIndex, symbol: raw });
      barIndex++;
    }
  }
  return out;
}

function deriveModulationSuggestions(
  bars: AnalyticalModeResult['bars'],
  tonicPc: number
): string[] {
  const scale = majorScaleRoots(tonicPc);
  const suggestions: string[] = [];
  let run = 0;
  let runStart = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    const inKey =
      b.rootPc !== null &&
      scale.has(b.rootPc) &&
      b.diatonicClass === 'diatonic_major_key';
    if (!inKey && b.rootPc !== null) {
      if (run === 0) runStart = i;
      run++;
    } else {
      if (run >= 3) {
        const last = bars[i - 1]!;
        if (last.rootPc !== null) {
          const targetRoot = PC_TO_ROOT[last.rootPc] ?? '?';
          suggestions.push(
            `Bars ${runStart + 1}–${i}: ${run} consecutive chords outside ${PC_TO_ROOT[tonicPc] ?? 'key'} major — consider modulation toward ${targetRoot} major.`
          );
        }
      }
      run = 0;
    }
  }
  if (run >= 3) {
    const last = bars[bars.length - 1]!;
    if (last.rootPc !== null) {
      const targetRoot = PC_TO_ROOT[last.rootPc] ?? '?';
      suggestions.push(
        `Bars ${runStart + 1}–${bars.length}: ${run} consecutive chords outside ${PC_TO_ROOT[tonicPc] ?? 'key'} major — consider modulation toward ${targetRoot} major.`
      );
    }
  }
  return suggestions;
}

const EMPTY_RESULT: AnalyticalModeResult = {
  bars: [],
  key: { root: 'C', mode: 'major' },
  modulationSuggestions: [],
  warnings: [],
};

/**
 * Analyse a chord list (one symbol per bar, or bar-delimited strings with `|`).
 * Never throws — returns partial result with warnings on failure.
 */
export function runAnalyticalMode(chords: string[], key?: string): AnalyticalModeResult {
  try {
    const warnings: string[] = [];
    const keyInfo = parseKeyLabel(key);
    const flat = flattenChords(chords);
    const useVault = isTonalityVaultLeadSheetHarmonyEnrichmentEnabled();
    const vaultResult = useVault
      ? enrichHarmonyWithTonalityVault({
          chordEvents: flat.map((b) => ({ bar: b.barIndex + 1, beat: 1, symbol: b.symbol })),
          keySignature: { fifths: FIFTHS_BY_ROOT[keyInfo.root] ?? 0 },
          totalBars: Math.max(1, flat.length),
        })
      : { applied: false, warnings: [] as string[], enrichment: undefined };

    if (vaultResult.warnings.length) warnings.push(...vaultResult.warnings);

    const scale = majorScaleRoots(keyInfo.tonicPc);
    const bars: AnalyticalModeResult['bars'] = flat.map((b, idx) => {
      const normalised = normalizeChordSymbol(b.symbol);
      const rootPc = parseChordRootPcFromSymbol(normalised) ?? null;
      const vaultAnn = vaultResult.enrichment?.byChordIndex[idx];

      let diatonicClass: string | null = null;
      let functionalHint: string | null = null;
      let scaleDegree: string | null = null;

      if (vaultAnn) {
        diatonicClass = vaultAnn.diatonicClass;
        functionalHint = vaultAnn.functionalHint;
        scaleDegree = vaultAnn.scaleDegreeFromMajor ?? null;
      } else if (rootPc !== null) {
        const interval = (rootPc - keyInfo.tonicPc + 120) % 12;
        scaleDegree = degreeFromMajor(keyInfo.tonicPc, rootPc);
        diatonicClass = scale.has(rootPc) ? 'diatonic_major_key' : 'chromatic_or_unknown';
        functionalHint = functionalHintFromInterval(interval);
      } else {
        warnings.push(`Unrecognised chord symbol: "${b.symbol}"`);
      }

      const tension = tensionForChord(normalised, functionalHint, scaleDegree);

      return {
        barIndex: b.barIndex,
        symbol: b.symbol,
        normalised,
        rootPc,
        diatonicClass,
        functionalHint,
        scaleDegree,
        tension,
      };
    });

    return {
      bars,
      key: { root: keyInfo.root, mode: keyInfo.mode },
      modulationSuggestions: deriveModulationSuggestions(bars, keyInfo.tonicPc),
      warnings,
    };
  } catch (e) {
    return {
      ...EMPTY_RESULT,
      key: parseKeyLabel(key),
      warnings: [e instanceof Error ? e.message : String(e)],
    };
  }
}
