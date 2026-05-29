/**
 * MusicContext adapters — checksum, motif mapping, harmony validation, modulation attach.
 */

import { computeHarmonyChecksum } from '../harmony/harmonyContext';
import { noteNameToPitchClass, normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { ModulationPlan } from '../modulation/modulationPlanTypes';
import type { IRealVaultOutput } from '../irealpro/irealVaultPipeline';
import type { ParsedChart } from '../irealpro/parsedChart';
import type { SlonimskyNote } from '../slonimsky/slonimskyEngine';
import type {
  MusicContext,
  MusicContextHarmony,
  MusicContextMotif,
  MusicContextReceipt,
} from './musicContextTypes';
import type { RiffGeneratorParams } from '../riff-generator/riffTypes';

const ROOT_RE = /^([A-G](?:#|b)?)/i;

/** Deterministic harmony checksum for MusicContext (delegates to harmonyContext). */
export function computeMusicContextChecksum(bars: readonly string[]): string {
  return computeHarmonyChecksum(bars);
}

/** Pitch class 0–11 from key root letter (C→0, F#→6, Bb→10). */
export function keyPcFromRoot(root: string): number {
  return noteNameToPitchClass(root) ?? 0;
}

/** Returns a new MusicContext with an appended receipt (does not mutate the input). */
export function appendReceiptToMusicContext(
  ctx: MusicContext,
  receipt: MusicContextReceipt
): MusicContext {
  return {
    ...ctx,
    receipts: [...(ctx.receipts ?? []), receipt],
  };
}

/** Normalise pitch-class root from key label (e.g. "Bb major" → "Bb"). */
export function normalizeKeyRoot(keyLabel: string): { root: string; mode: 'major' | 'minor' } {
  const raw = String(keyLabel || 'C').trim();
  const minor = /minor|\bm\b/i.test(raw) && !/major/i.test(raw);
  const rootMatch = raw.match(ROOT_RE);
  const root = rootMatch ? rootMatch[1]![0]!.toUpperCase() + rootMatch[1]!.slice(1) : 'C';
  return { root, mode: minor ? 'minor' : 'major' };
}

/** Infer tonal centre from the first chord symbol root. */
export function inferKeyRootFromChordSymbols(chordSymbols: readonly string[]): string {
  for (const sym of chordSymbols) {
    const trimmed = String(sym || '').trim();
    if (!trimmed || /^n\.c\.$/i.test(trimmed)) continue;
    const slashIdx = trimmed.indexOf('/');
    const harmony = slashIdx >= 0 ? trimmed.slice(0, slashIdx) : trimmed;
    const m = harmony.match(ROOT_RE);
    if (m) return m[1]![0]!.toUpperCase() + m[1]!.slice(1);
  }
  return 'C';
}

export interface SlonimskyResult {
  notes: SlonimskyNote[];
  patternLength?: number;
}

function motifFromSlonimskyNotes(notes: readonly SlonimskyNote[]): CoreMotif | undefined {
  if (notes.length < 2) return undefined;
  const intervalPattern = notes.slice(1).map((n, i) => n.midi - notes[i]!.midi);
  const contourPattern = intervalPattern.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0));
  return {
    id: 'slonimsky-0',
    intervalPattern,
    rhythmPattern: notes.map((n) => ({ startBeat: n.beat, duration: n.durationBeats })),
    contourPattern,
    roleTags: [],
    registerTags: [],
  };
}

export function coreMotifToMusicContextMotif(
  motif: CoreMotif,
  producer: MusicContextMotif['producer']
): MusicContextMotif {
  return {
    id: motif.id || `${producer}-0`,
    intervalPattern: [...motif.intervalPattern],
    rhythmPattern: motif.rhythmPattern.map((r) => ({ startBeat: r.startBeat, duration: r.duration })),
    contourPattern: [...motif.contourPattern],
    anchorMidi: undefined,
    seedPitches: undefined,
    producer,
  };
}

/** LOSSY CONVERSION — not reversible. */
export function motifToSeedPitches(motif: MusicContextMotif, keyPc: number): [number, number] {
  const upperMidi = motif.anchorMidi ?? keyPc + 60;
  const lowerMidi = upperMidi - (motif.intervalPattern[0] ?? 7);
  return [upperMidi, lowerMidi];
}

export function harmonyBarsFromMusicContext(ctx: MusicContext): string[] {
  const recomputed = computeMusicContextChecksum(ctx.harmony.bars);
  if (recomputed !== ctx.harmony.checksum) {
    throw new Error('MusicContext harmony checksum mismatch');
  }
  return [...ctx.harmony.bars];
}

export function attachModulationToContext(ctx: MusicContext, plan: ModulationPlan): MusicContext {
  return {
    ...ctx,
    modulation: plan,
  };
}

type RiffMusicContextParams = Pick<
  RiffGeneratorParams,
  'seed' | 'bars' | 'style' | 'bpm' | 'chordSymbols'
> & {
  keyRoot?: string;
};

/** MusicContext snapshot for successful riff generation (V90a). */
export function buildRiffGeneratorMusicContext(
  params: RiffMusicContextParams,
  coreMotif?: CoreMotif
): MusicContext {
  const harmonyBars = params.chordSymbols ?? [];
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'user',
  };
  const keyRoot =
    params.keyRoot?.trim()
      ? normalizeKeyRoot(params.keyRoot).root
      : inferKeyRootFromChordSymbols(harmonyBars);
  return {
    schemaVersion: '1.0',
    seed: params.seed ?? 0,
    presetId: 'riff_generator',
    key: { root: keyRoot, mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm: params.bpm ?? 120,
    totalBars: params.bars ?? 4,
    harmony,
    motif: coreMotif ? coreMotifToMusicContextMotif(coreMotif, 'riff') : undefined,
    provenance: {
      sourceEngineId: 'riff',
      capturedAt: Date.now(),
    },
    receipts: [
      {
        engine: 'riff',
        kind: 'riff_generator_complete',
        payload: { seed: params.seed, bars: params.bars },
      },
    ],
  };
}

/** MusicContext snapshot from an iReal parsed chart (V90b). */
export function buildMusicContextFromIReal(chart: ParsedChart): MusicContext {
  const chordBars = (chart.harmonies ?? []).map(normalizeChordSymbol);
  const keyLabel = chart.key?.trim() || inferKeyRootFromChordSymbols(chordBars);
  const { root, mode } = normalizeKeyRoot(keyLabel);
  const ts = chart.timeSignature ?? chart.meter ?? { num: 4, den: 4 };
  const harmony: MusicContextHarmony = {
    bars: chordBars,
    checksum: computeMusicContextChecksum(chordBars),
    source: 'user',
  };
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: 'ireal_import',
    key: { root, mode },
    meter: { beats: ts.num, beatType: ts.den },
    bpm: chart.tempo ?? 120,
    totalBars: chordBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'ireal',
      capturedAt: Date.now(),
    },
    receipts: [],
  };
}

/** MusicContext snapshot from Wyble etude chord bars (V90c). */
export function buildMusicContextFromWyble(
  chordBars: readonly string[],
  params: {
    key?: string;
    bpm?: number;
    timeSignature?: { num: number; den: number };
    tuning?: { name: string; strings: readonly number[]; capo: number };
    totalBars?: number;
  }
): MusicContext {
  const harmonyBars = chordBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'user',
  };
  const keyLabel = params.key?.trim();
  const { root, mode } = keyLabel
    ? normalizeKeyRoot(keyLabel)
    : { root: 'C', mode: 'major' as const };
  const ts = params.timeSignature ?? { num: 4, den: 4 };
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: 'wyble_etude',
    key: { root, mode },
    meter: { beats: ts.num, beatType: ts.den },
    bpm: params.bpm ?? 120,
    totalBars: params.totalBars ?? chordBars.length,
    harmony,
    ...(params.tuning ? { tuning: params.tuning } : {}),
    provenance: {
      sourceEngineId: 'wyble',
      capturedAt: Date.now(),
    },
    receipts: [],
  };
}

/** True when provenance.capturedAt is older than threshold (default 10 min). */
export function isMusicContextStale(
  mc: MusicContext,
  thresholdMs: number = 10 * 60 * 1000
): boolean {
  if (!mc.provenance?.capturedAt) return false;
  return Date.now() - mc.provenance.capturedAt > thresholdMs;
}

const ENGINE_GENERATION_COMPLETE_KIND_RE = /_(?:generation|generator)_complete$/;

/** Count engine-generation-complete receipts (hop chain depth). */
export function getMusicContextHopCount(mc: MusicContext): number {
  const receipts = mc.receipts ?? [];
  return receipts.filter((r) => ENGINE_GENERATION_COMPLETE_KIND_RE.test(r.kind)).length;
}

/** True when hop count meets or exceeds limit (default 2). */
export function isMusicContextHopLimitReached(mc: MusicContext, limit: number = 2): boolean {
  return getMusicContextHopCount(mc) >= limit;
}

/** MusicContext snapshot from vault generation output (V90b). */
export function buildMusicContextFromVaultOutput(
  output: IRealVaultOutput,
  chart: ParsedChart,
  options?: { bpm?: number }
): MusicContext {
  try {
    const chordBars = (chart.harmonies ?? []).map(normalizeChordSymbol);
    const harmony: MusicContextHarmony = {
      bars: chordBars,
      checksum: computeMusicContextChecksum(chordBars),
      source: 'user',
    };
    const { root, mode } =
      chart.key != null
        ? normalizeKeyRoot(chart.key.trim())
        : { root: 'C', mode: 'major' as const };
    const ts = chart.timeSignature ?? { num: 4, den: 4 };
    const measuresLen = chart.measures?.length ?? 0;
    const receipts: MusicContextReceipt[] = [
      {
        engine: 'vault',
        kind: 'vault_generation_complete',
        payload: {
          mode: output.mode,
          seed: output.seed ?? null,
          chorusCount: measuresLen > 0 ? Math.round(output.bars / measuresLen) : 1,
        },
      },
    ];
    if (output.unmappedChords.length > 0) {
      receipts.push({
        engine: 'vault',
        kind: 'vault_unmapped_chords',
        payload: {
          count: output.unmappedChords.length,
          bars: output.unmappedChords.map((u) => u.barIndex),
        },
      });
    }
    return {
      schemaVersion: '1.0',
      seed: output.seed ?? 0,
      presetId: 'vault',
      key: { root, mode },
      meter: { beats: ts.num, beatType: ts.den },
      bpm: options?.bpm ?? chart.tempo ?? 120,
      totalBars: measuresLen,
      harmony,
      provenance: {
        sourceEngineId: 'vault',
        capturedAt: Date.now(),
        sourceRunId: output.seed != null ? String(output.seed) : undefined,
      },
      receipts,
    };
  } catch (err) {
    return {
      schemaVersion: '1.0',
      seed: 0,
      presetId: 'vault',
      key: { root: 'C', mode: 'major' },
      meter: { beats: 4, beatType: 4 },
      bpm: 120,
      totalBars: 0,
      harmony: {
        bars: [],
        checksum: computeMusicContextChecksum([]),
        source: 'user',
      },
      receipts: [
        {
          engine: 'vault',
          kind: 'vault_producer_error',
          payload: { message: String(err) },
        },
      ],
    };
  }
}

/** MusicContext snapshot from a Slonimsky pattern result (V90b). */
export function buildMusicContextFromSlonimsky(
  result: SlonimskyResult,
  params: {
    key: string;
    bpm?: number;
    bars?: number;
  }
): MusicContext {
  const { root, mode } = normalizeKeyRoot(params.key);
  const coreMotif = result.notes?.length ? motifFromSlonimskyNotes(result.notes) : undefined;
  const totalBars = params.bars ?? result.patternLength ?? 4;
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: 'slonimsky_pattern',
    key: { root, mode: mode === 'minor' ? mode : 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm: params.bpm ?? 120,
    totalBars,
    harmony: {
      bars: [],
      checksum: computeMusicContextChecksum([]),
      source: 'generated',
    },
    motif: coreMotif ? coreMotifToMusicContextMotif(coreMotif, 'user') : undefined,
    provenance: {
      sourceEngineId: 'slonimsky',
      capturedAt: Date.now(),
    },
    receipts: [],
  };
}

export function buildMusicContextFromMartino(
  tuneConfig: Record<string, unknown>,
  phrasePlan: Array<{ chord: string; reduction: string }>,
  generationParams: { key?: string; bpm?: number; totalBars?: number }
): MusicContext {
  try {
    const bars = phrasePlan.map(b => normalizeChordSymbol(b.chord));
    const checksum = computeMusicContextChecksum(bars);
    const keyParsed = normalizeKeyRoot(generationParams.key ?? null) ?? { root: 'C', mode: 'major' };
    const totalBars = generationParams.totalBars ?? phrasePlan.length;
    const ts = tuneConfig.time_signature as any;
    const meter = ts ? { num: ts.beats, den: ts.beat_type } : { num: 4, den: 4 };
    return {
      schemaVersion: '1.0',
      key: keyParsed,
      meter,
      bpm: generationParams.bpm ?? 120,
      totalBars,
      harmony: { bars, checksum, source: 'martino' },
      provenance: { sourceEngineId: 'martino', capturedAt: Date.now() },
      receipts: [{
        engine: 'martino',
        kind: 'martino_generation_complete',
        payload: { bars: totalBars, key: generationParams.key ?? null, source: 'phrasePlan' }
      }]
    };
  } catch (err) {
    return {
      schemaVersion: '1.0',
      key: { root: 'C', mode: 'major' },
      meter: { num: 4, den: 4 },
      bpm: 120,
      totalBars: 0,
      harmony: { bars: [], checksum: computeMusicContextChecksum([]), source: 'martino' },
      provenance: { sourceEngineId: 'martino', capturedAt: Date.now() },
      receipts: [{ engine: 'martino', kind: 'martino_producer_error',
                   payload: { message: String(err) } }]
    };
  }
}
