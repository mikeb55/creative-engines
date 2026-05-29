/**
 * Rhythm guitar comping generator — Freddie Green / shell / full chord voicings.
 */

import { chordTonesFromSymbol, normalizeChordSymbol, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
  inferKeyRootFromChordSymbols,
  normalizeKeyRoot,
} from '../music-context/musicContextAdapters';
import type { MusicContext } from '../music-context/musicContextTypes';
import { parseChordRootPcFromSymbol } from '../tonalityVault/tonalityVaultLeadSheetHarmonyEnrichment';
import type { CompingOptions } from './compingTypes';

export type { CompingOptions } from './compingTypes';

export interface CompingResult {
  chordVoicings: {
    barIndex: number;
    beat: number;
    symbol: string;
    midiPitches: number[];
    duration: number;
  }[];
  musicContext: MusicContext;
  warnings: string[];
}

function beatsForPattern(
  pattern: CompingOptions['beatPattern'],
  beatsPerBar: number
): number[] {
  const n = Math.max(1, Math.floor(beatsPerBar));
  switch (pattern) {
    case 'beats_2_4':
      return n >= 4 ? [2, 4] : n >= 2 ? [2] : [1];
    case 'beats_1_3':
      return n >= 3 ? [1, 3] : n >= 1 ? [1] : [1];
    case 'all_beats':
      return Array.from({ length: n }, (_, i) => i + 1);
    case 'offbeats':
      return Array.from({ length: n }, (_, i) => i + 1.5);
    default:
      return [2, 4];
  }
}

function voicingMidisForSymbol(
  symbol: string,
  options: CompingOptions
): number[] | null {
  if (options.muted) return [];

  const parsed = parseChordSymbol(symbol);
  const tones = chordTonesFromSymbol(parsed.harmonyPart, { lockedHarmony: true });
  const root = tones.root;
  const third = tones.third;
  const fifth = tones.fifth;
  const seventh = tones.seventh;

  let pcs: number[];
  if (options.style === 'freddie_green') {
    pcs = [root, seventh];
  } else if (options.style === 'shell_voicing') {
    pcs = [root, third, seventh];
  } else {
    switch (options.voicingDensity) {
      case 'sparse':
        pcs = [root, seventh];
        break;
      case 'medium':
        pcs = [root, third, seventh];
        break;
      case 'dense':
      default:
        pcs = [root, third, fifth, seventh];
        break;
    }
  }

  const unique = [...new Set(pcs)].sort((a, b) => a - b);
  return unique;
}

function expandChordsToBars(chords: string[], bars: number): string[] {
  const cleaned = chords.map((c) => String(c).trim()).filter((c) => c.length > 0);
  if (cleaned.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < bars; i++) {
    out.push(cleaned[i % cleaned.length]!);
  }
  return out;
}

function buildCompingMusicContext(
  normalizedBars: string[],
  params: {
    key: string;
    bpm: number;
    bars: number;
    timeSignature: { num: number; den: number };
  }
): MusicContext {
  const { root, mode } = normalizeKeyRoot(params.key.trim() || inferKeyRootFromChordSymbols(normalizedBars));
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: 'riff_generator',
    key: { root, mode },
    meter: { beats: params.timeSignature.num, beatType: params.timeSignature.den },
    bpm: params.bpm,
    totalBars: params.bars,
    harmony: {
      bars: normalizedBars,
      checksum: computeMusicContextChecksum(normalizedBars),
      source: 'user',
    },
    provenance: {
      sourceEngineId: 'comping',
      capturedAt: Date.now(),
    },
    receipts: [
      {
        engine: 'comping',
        kind: 'comping_generation_complete',
        payload: { bars: params.bars, bpm: params.bpm },
      },
    ],
  };
}

const EMPTY_RESULT: CompingResult = {
  chordVoicings: [],
  musicContext: buildCompingMusicContext([], { key: 'C', bpm: 120, bars: 0, timeSignature: { num: 4, den: 4 } }),
  warnings: [],
};

/**
 * Generate rhythm-guitar comping voicings per bar and beat pattern.
 * Never throws.
 */
export function runCompingGenerator(
  chords: string[],
  params: {
    key: string;
    bpm: number;
    bars: number;
    timeSignature: { num: number; den: number };
    options: CompingOptions;
  }
): CompingResult {
  try {
    const warnings: string[] = [];
    const barChords = expandChordsToBars(chords, params.bars);
    if (barChords.length === 0) {
      return {
        ...EMPTY_RESULT,
        warnings: ['No chords provided.'],
      };
    }

    const normalizedBars = barChords.map((s) => normalizeChordSymbol(s));
    const beatPositions = beatsForPattern(params.options.beatPattern, params.timeSignature.num);
    const hitDuration =
      params.options.beatPattern === 'offbeats' ? 0.5 : 1;
    const chordVoicings: CompingResult['chordVoicings'] = [];

    for (let barIndex = 0; barIndex < barChords.length; barIndex++) {
      const symbol = barChords[barIndex]!;
      const rootPc = parseChordRootPcFromSymbol(normalizeChordSymbol(symbol));
      if (rootPc === undefined) {
        warnings.push(`Unrecognised chord symbol: "${symbol}" (bar ${barIndex + 1}).`);
      }
      const midiPitches = voicingMidisForSymbol(symbol, params.options);
      if (midiPitches === null) {
        warnings.push(`Could not build voicing for "${symbol}" (bar ${barIndex + 1}).`);
        continue;
      }
      for (const beat of beatPositions) {
        chordVoicings.push({
          barIndex,
          beat,
          symbol,
          midiPitches: [...midiPitches],
          duration: hitDuration,
        });
      }
    }

    return {
      chordVoicings,
      musicContext: buildCompingMusicContext(normalizedBars, {
        key: params.key,
        bpm: params.bpm,
        bars: params.bars,
        timeSignature: params.timeSignature,
      }),
      warnings,
    };
  } catch (e) {
    return {
      ...EMPTY_RESULT,
      warnings: [e instanceof Error ? e.message : String(e)],
    };
  }
}
