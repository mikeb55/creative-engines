import { transformMotifThroughLayers, type MotifNote } from '../arrangement/motifTransformer';
import { getProfileForMode, planPhrase, type GenerationMode } from '../generation';
import { generateVaultRiff, type ScoreNote } from '../guitar/vaultRiffGenerator';
import type { EmotionalDrift } from '../harmony/reharmCandidateEngine';
import type { TensionState } from '../harmony/layerStateMachine';
import { mapChordToVaultType } from './chordSymbolMapper';
import { parseIRealProInput } from './irealProAdapter';
import type { ParsedChart } from './parsedChart';

/** Per-bar layer choice when restating the seed motif (Build F → iReal melody reuse). */
const MELODY_MOTIF_TENSION_CYCLE: readonly TensionState[] = [
  'primary',
  'tension',
  'chaos',
  'recover',
  'resolve',
];

/** Solo vault riff style per chorus when base style is triad-pair-pendulum or omitted (aligned with tension cycle length). */
export const TRIAD_PAIR_CHORUS_ROTATION: readonly [
  'triad-pair-pendulum',
  'bebop-placement',
  'triad-pair-pendulum',
  'quadratonic',
  'triad-pair-pendulum',
] = [
  'triad-pair-pendulum',
  'bebop-placement',
  'triad-pair-pendulum',
  'quadratonic',
  'triad-pair-pendulum',
];

function groupScoreNotesByBar(notes: ScoreNote[]): Map<number, ScoreNote[]> {
  const byBar = new Map<number, ScoreNote[]>();
  for (const n of notes) {
    const arr = byBar.get(n.barIndex) ?? [];
    arr.push(n);
    byBar.set(n.barIndex, arr);
  }
  for (const arr of byBar.values()) {
    arr.sort((a, b) => a.startBeat - b.startBeat);
  }
  return byBar;
}

function scoreNotesToMotifNotes(
  notes: ScoreNote[],
  barIndex: number,
  quarterSpan: number
): MotifNote[] {
  return [...notes]
    .filter((n) => n.pitch > 0)
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((n) => ({
      pitchClass: ((n.pitch % 12) + 12) % 12,
      beatPosition: n.startBeat - barIndex * quarterSpan,
      duration: n.duration,
    }));
}

function mapMidiKeepingContour(refMidi: number, newPc: number): number {
  const oldPc = ((refMidi % 12) + 12) % 12;
  let delta = newPc - oldPc;
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;
  let m = refMidi + delta;
  while (m < 40) m += 12;
  while (m > 88) m -= 12;
  return m;
}

/**
 * Melody mode: restate bar-1 rhythmic motif on later bars via {@link transformMotifThroughLayers} (vault pools per chord).
 */
function applyMelodyMotifReuseAcrossBars(params: {
  generatedNotes: ScoreNote[];
  chordMappings: IRealVaultOutput['chordMappings'];
  quarterSpan: number;
  barCount: number;
  /** Shifts which {@link TensionState} applies to the first bar after the seed (one step per repeated chorus). */
  tensionCycleRotation?: number;
}): ScoreNote[] {
  const { generatedNotes, chordMappings, quarterSpan, barCount, tensionCycleRotation = 0 } = params;
  if (barCount < 2 || chordMappings.length === 0) return generatedNotes;

  const byBar = groupScoreNotesByBar(generatedNotes);
  const chordByBar = new Map(chordMappings.map((m) => [m.barIndex, m]));

  let seedBar = -1;
  for (let b = 0; b < barCount; b++) {
    const playable = byBar.get(b)?.filter((n) => n.pitch > 0) ?? [];
    if (playable.length > 0 && chordByBar.has(b)) {
      seedBar = b;
      break;
    }
  }
  if (seedBar < 0) return generatedNotes;

  const seedScore = byBar.get(seedBar)!.filter((n) => n.pitch > 0).sort((a, b) => a.startBeat - b.startBeat);
  const motif = scoreNotesToMotifNotes(seedScore, seedBar, quarterSpan);
  if (motif.length === 0) return generatedNotes;

  const out: ScoreNote[] = [];
  for (let b = 0; b < barCount; b++) {
    const orig = byBar.get(b) ?? [];
    if (b <= seedBar || !chordByBar.has(b)) {
      out.push(...orig);
      continue;
    }

    const ch = chordByBar.get(b)!;
    const layers = transformMotifThroughLayers(motif, ch.vaultChordTypeId, ch.rootPc);
    const L = MELODY_MOTIF_TENSION_CYCLE.length;
    const cycleIdx = ((b - seedBar - 1 + tensionCycleRotation) % L + L) % L;
    const state = MELODY_MOTIF_TENSION_CYCLE[cycleIdx]!;
    const variant = layers[state];
    if (!variant.length) {
      out.push(...orig);
      continue;
    }

    const beatOffset = b * quarterSpan;
    for (let i = 0; i < variant.length; i++) {
      const v = variant[i]!;
      const ref = seedScore[i];
      if (!ref) break;
      out.push({
        pitch: mapMidiKeepingContour(ref.pitch, v.pitchClass),
        startBeat: v.beatPosition + beatOffset,
        duration: v.duration,
        guitarString: ref.guitarString,
        guitarFret: ref.guitarFret,
        barIndex: b,
      });
    }
  }

  return out;
}

/** Quarter-note span per measure (startBeat uses quarter-note units; eighth = 0.5). */
export function quarterNoteSpanPerMeasure(chart: ParsedChart): number {
  const ts = chart.timeSignature;
  if (!ts || ts.den <= 0) return 4;
  return (ts.num * 4) / ts.den;
}

/** Eighth-note subdivisions per measure (4/4 ⇒ 8, 3/4 ⇒ 6). */
export function eighthsPerMeasureFromChart(chart: ParsedChart): number {
  const ts = chart.timeSignature;
  if (!ts || ts.den <= 0) return 8;
  return Math.max(1, Math.round((ts.num * 8) / ts.den));
}

export type IRealVaultOutput = {
  title: string;
  key: string | null;
  bars: number;
  generatedNotes: ScoreNote[];
  chordMappings: { barIndex: number; symbol: string; vaultChordTypeId: string; rootPc: number }[];
  unmappedChords: { barIndex: number; symbol: string }[];
  mode: GenerationMode;
};

/** Options for {@link generateVaultFromParsedChart} / iReal / paste / PDF vault pipelines. */
export type VaultGenerationOptions = {
  riffStyle?: 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string' | 'bebop-placement';
  tuningId?: string;
  /** Reserved for future reharm / candidate bias; not applied in this pipeline yet. */
  drift?: EmotionalDrift;
  /** Build I — solo (dense / bar-reactive) vs melody (sparse / phrase-oriented). */
  mode?: GenerationMode;
  /** Repeat the full chart this many times; bar indices and beats continue sequentially. Default 1. */
  chorusCount?: number;
  /**
   * When set to `sonic_youth`, repeated choruses do **not** advance the melody motif tension-cycle phase
   * (SY slice owns texture state elsewhere).
   */
  songwriterStyleId?: string;
};

/** @deprecated Use {@link VaultGenerationOptions}; kept for existing imports. */
export type GenerateFromIRealOptions = VaultGenerationOptions;

function resolveChorusCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(64, Math.floor(n));
}

function generateVaultBarsSinglePass(params: {
  measures: NonNullable<ParsedChart['measures']>;
  mode: GenerationMode;
  profile: ReturnType<typeof getProfileForMode>;
  effectiveRiffStyle:
    | 'quadratonic'
    | 'dyad-seesaw'
    | 'triad-pair-pendulum'
    | 'pedal-string'
    | 'bebop-placement';
  tuningId: string;
  quarterSpan: number;
  eighthsPerBar: number;
}): {
  generatedNotes: ScoreNote[];
  chordMappings: IRealVaultOutput['chordMappings'];
  unmappedChords: IRealVaultOutput['unmappedChords'];
} {
  const { measures, mode, profile, effectiveRiffStyle, tuningId, quarterSpan, eighthsPerBar } = params;
  const generatedNotes: ScoreNote[] = [];
  const chordMappings: IRealVaultOutput['chordMappings'] = [];
  const unmappedChords: IRealVaultOutput['unmappedChords'] = [];

  for (let barIndex = 0; barIndex < measures.length; barIndex++) {
    const phrasePlan = planPhrase(1, mode);

    const measure = measures[barIndex];
    const first = measure?.[0];
    if (!first) continue;

    const mapped = mapChordToVaultType(first);
    if (!mapped) {
      unmappedChords.push({ barIndex, symbol: first.symbol });
      continue;
    }

    chordMappings.push({
      barIndex,
      symbol: first.symbol,
      vaultChordTypeId: mapped.vaultChordTypeId,
      rootPc: mapped.rootPc,
    });

    const barNotes = generateVaultRiff({
      chordTypeId: mapped.vaultChordTypeId,
      rootPc: mapped.rootPc,
      bars: phrasePlan.bars as 1 | 2 | 4 | 8,
      style: effectiveRiffStyle,
      tuningId,
      eighthsPerBar,
    });

    const beatOffset = barIndex * quarterSpan;
    for (const n of barNotes) {
      generatedNotes.push({
        ...n,
        startBeat: n.startBeat + beatOffset,
        barIndex,
      });
    }

    if (
      mode === 'melody' &&
      barIndex % 2 === 1 &&
      Math.random() < profile.postCadenceRestProbability
    ) {
      generatedNotes.push({
        pitch: 0,
        startBeat: (barIndex + 1) * quarterSpan,
        duration: 0.5,
        guitarString: 0,
        guitarFret: 0,
        barIndex,
      });
    }
  }

  return { generatedNotes, chordMappings, unmappedChords };
}

/**
 * Map each bar’s first chord to the Vault and concatenate **1-bar** riffs using the chart’s time signature (Build I).
 */
export function generateVaultFromParsedChart(chart: ParsedChart, options?: VaultGenerationOptions): IRealVaultOutput {
  void options?.drift;
  const measures = chart.measures ?? [];
  const barsPerChorus = measures.length;
  const mode: GenerationMode = options?.mode ?? 'solo';
  const profile = getProfileForMode(mode);
  const riffStyleSolo = options?.riffStyle ?? 'bebop-placement';
  const baselineVaultRiffStyle = mode === 'melody' ? 'quadratonic' : riffStyleSolo;
  const tuningId = options?.tuningId ?? 'standard';
  const quarterSpan = quarterNoteSpanPerMeasure(chart);
  const eighthsPerBar = eighthsPerMeasureFromChart(chart);
  const chorusCount = resolveChorusCount(options?.chorusCount);
  const skipChorusTensionAdvance = options?.songwriterStyleId === 'sonic_youth';
  const rawRiffOpt = options?.riffStyle;
  const triadPairStyleRotationEligible =
    rawRiffOpt === undefined || rawRiffOpt === 'triad-pair-pendulum';

  const allGeneratedNotes: ScoreNote[] = [];
  const allChordMappings: IRealVaultOutput['chordMappings'] = [];
  const allUnmappedChords: IRealVaultOutput['unmappedChords'] = [];

  for (let chorusIndex = 0; chorusIndex < chorusCount; chorusIndex++) {
    let effectiveRiffStyleForPass = baselineVaultRiffStyle;
    if (
      mode === 'solo' &&
      triadPairStyleRotationEligible &&
      !skipChorusTensionAdvance
    ) {
      effectiveRiffStyleForPass = TRIAD_PAIR_CHORUS_ROTATION[chorusIndex % TRIAD_PAIR_CHORUS_ROTATION.length]!;
    }

    const { generatedNotes, chordMappings, unmappedChords } = generateVaultBarsSinglePass({
      measures,
      mode,
      profile,
      effectiveRiffStyle: effectiveRiffStyleForPass,
      tuningId,
      quarterSpan,
      eighthsPerBar,
    });

    const tensionCycleRotation = skipChorusTensionAdvance ? 0 : chorusIndex;

    const chunkNotes =
      mode === 'melody'
        ? applyMelodyMotifReuseAcrossBars({
            generatedNotes,
            chordMappings,
            quarterSpan,
            barCount: barsPerChorus,
            tensionCycleRotation,
          })
        : generatedNotes;

    const barOffset = chorusIndex * barsPerChorus;
    const beatOffsetGlobal = chorusIndex * barsPerChorus * quarterSpan;

    for (const n of chunkNotes) {
      allGeneratedNotes.push({
        ...n,
        barIndex: n.barIndex + barOffset,
        startBeat: n.startBeat + beatOffsetGlobal,
      });
    }
    for (const m of chordMappings) {
      allChordMappings.push({ ...m, barIndex: m.barIndex + barOffset });
    }
    for (const u of unmappedChords) {
      allUnmappedChords.push({ ...u, barIndex: u.barIndex + barOffset });
    }
  }

  return {
    title: chart.title,
    key: chart.key,
    bars: barsPerChorus * chorusCount,
    generatedNotes: allGeneratedNotes,
    chordMappings: allChordMappings,
    unmappedChords: allUnmappedChords,
    mode,
  };
}

/**
 * Parse iReal input, map each bar’s first chord to the Vault, and concatenate **1-bar** riffs using the chart’s meter.
 */
export function generateFromIReal(input: string, options?: VaultGenerationOptions): IRealVaultOutput {
  const chart = parseIRealProInput(input);
  return generateVaultFromParsedChart(chart, options);
}
