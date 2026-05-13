import { transformMotifThroughLayers, type MotifNote } from '../arrangement/motifTransformer';
import {
  getProfileForMode,
  planPhrase,
  type GenerationMode,
  type MelodicContourHint,
} from '../generation';
import { deriveVaultRngRoot, mixUint32, mulberry32 } from '../remix/vaultSeedMix';
import { generateVaultRiff, type ScoreNote } from '../guitar/vaultRiffGenerator';
import type { EmotionalDrift } from '../harmony/reharmCandidateEngine';
import type { TensionState } from '../harmony/layerStateMachine';
import { mapChordToVaultType } from './chordSymbolMapper';
import { parseIRealProInput } from './irealProAdapter';
import type { ParsedChart } from './parsedChart';
import {
  assertChorusQualityGate,
  buildChorusQualityGate,
  buildHookIdentityTracker,
  buildPhraseContoursForBars,
  buildTensionProgression,
  phraseContourForBar,
  type ChorusQualityGate,
  type ChorusTensionProgression,
  type PhraseContourTag,
  type VaultHookIdentity,
} from './vaultChorusPhraseDiagnostics';
import { applyVaultTensionProgressionShaping } from './vaultTensionShaping';

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

function cumulativeQuarterBeatsThroughBar(chart: ParsedChart, barIndexExclusive: number): number {
  let sum = 0;
  for (let b = 0; b < barIndexExclusive; b++) sum += quarterSpanForBar(chart, b);
  return sum;
}

function totalQuarterLengthForBars(chart: ParsedChart, barCount: number): number {
  let sum = 0;
  for (let b = 0; b < barCount; b++) sum += quarterSpanForBar(chart, b);
  return sum;
}

/** Carry-forward: {@link ParsedChart.barMeterMap} entries override `timeSignature` for subsequent bars. */
export function effectiveMeterForBar(chart: ParsedChart, barIndex: number): { num: number; den: number } {
  let running =
    chart.timeSignature && chart.timeSignature.den > 0 ? chart.timeSignature : { num: 4, den: 4 };
  const map = chart.barMeterMap ?? {};
  for (let b = 0; b <= barIndex; b++) {
    const o = map[b];
    if (o && o.den > 0) running = o;
  }
  return running;
}

function quarterSpanForBar(chart: ParsedChart, barIndex: number): number {
  const ts = effectiveMeterForBar(chart, barIndex);
  return (ts.num * 4) / ts.den;
}

function eighthsForBar(chart: ParsedChart, barIndex: number): number {
  const ts = effectiveMeterForBar(chart, barIndex);
  return Math.max(1, Math.round((ts.num * 8) / ts.den));
}

function scoreNotesToMotifNotes(notes: ScoreNote[], barIndex: number, chart: ParsedChart): MotifNote[] {
  const barStart = cumulativeQuarterBeatsThroughBar(chart, barIndex);
  return [...notes]
    .filter((n) => n.pitch > 0)
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((n) => ({
      pitchClass: ((n.pitch % 12) + 12) % 12,
      beatPosition: n.startBeat - barStart,
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
  chart: ParsedChart;
  generatedNotes: ScoreNote[];
  chordMappings: IRealVaultOutput['chordMappings'];
  barCount: number;
  /** Shifts which {@link TensionState} applies to the first bar after the seed (one step per repeated chorus). */
  tensionCycleRotation?: number;
}): ScoreNote[] {
  const { chart, generatedNotes, chordMappings, barCount, tensionCycleRotation = 0 } = params;
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
  const motif = scoreNotesToMotifNotes(seedScore, seedBar, chart);
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

    const beatOffset = cumulativeQuarterBeatsThroughBar(chart, b);
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
  /** Present when generation ran with {@link VaultGenerationOptions.seed} — base seed for remix / UI storage. */
  seed?: number;
  /** Per global bar: melodic step bias within the bar (`rise` / `fall` / `stable`). */
  phraseContours?: PhraseContourTag[];
  /** Chorus 1 bar 1 hook vs bar-1 recurrences in later choruses (multi-chorus only). */
  hookIdentity?: VaultHookIdentity;
  /** Per-chorus macro tension [0, 1] from contours + hook + position. */
  tensionProgression?: ChorusTensionProgression;
  /** Multi-chorus quality gate: each adjacent chorus transition must change at least two dimensions. */
  chorusQualityGate?: ChorusQualityGate;
};

/** Options for {@link generateVaultFromParsedChart} / iReal / paste / PDF vault pipelines. */
export type VaultGenerationOptions = {
  riffStyle?: 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string' | 'bebop-placement';
  tuningId?: string;
  /** Mixed into the vault RNG root when {@link seed} is set; reserved for future reharm consumption elsewhere. */
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
  /**
   * When set, vault phrase planning and melody-mode cadence rests use deterministic RNG (sole source of randomness).
   */
  seed?: number;
  /** Optional Song Mode duo intent — mixed into the vault RNG root when {@link seed} is set (remix / A-B). */
  duoIntent?: 'conversational' | 'supportive';
};

/** @deprecated Use {@link VaultGenerationOptions}; kept for existing imports. */
export type GenerateFromIRealOptions = VaultGenerationOptions;

function resolveChorusCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(64, Math.floor(n));
}

function generateVaultBarsSinglePass(params: {
  chart: ParsedChart;
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
  /** From prior chorus bar contours — guides {@link planPhrase} per local bar (multi-chorus only). */
  contourHintsPerBar?: readonly PhraseContourTag[];
  /** When non-null, {@link planPhrase} / melody rests use deterministic RNG derived from the vault root. */
  rngRoot: number | null;
  chorusIndex: number;
}): {
  generatedNotes: ScoreNote[];
  chordMappings: IRealVaultOutput['chordMappings'];
  unmappedChords: IRealVaultOutput['unmappedChords'];
} {
  const { chart, measures, mode, profile, effectiveRiffStyle, tuningId, contourHintsPerBar, rngRoot, chorusIndex } =
    params;
  const generatedNotes: ScoreNote[] = [];
  const chordMappings: IRealVaultOutput['chordMappings'] = [];
  const unmappedChords: IRealVaultOutput['unmappedChords'] = [];

  for (let barIndex = 0; barIndex < measures.length; barIndex++) {
    const rawContour = contourHintsPerBar?.[barIndex];
    const melodicHint: MelodicContourHint | undefined =
      rawContour === 'rise' || rawContour === 'fall' ? rawContour : undefined;
    const phraseSeed =
      rngRoot != null
        ? mixUint32(rngRoot, ['phrase', String(chorusIndex), String(barIndex)])
        : undefined;
    const phrasePlan =
      phraseSeed !== undefined ? planPhrase(1, mode, melodicHint, phraseSeed) : planPhrase(1, mode, melodicHint);

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

    const eighthsPerBar = eighthsForBar(chart, barIndex);
    const barNotes = generateVaultRiff({
      chordTypeId: mapped.vaultChordTypeId,
      rootPc: mapped.rootPc,
      bars: phrasePlan.bars as 1 | 2 | 4 | 8,
      style: effectiveRiffStyle,
      tuningId,
      eighthsPerBar,
    });

    const beatOffset = cumulativeQuarterBeatsThroughBar(chart, barIndex);
    for (const n of barNotes) {
      generatedNotes.push({
        ...n,
        startBeat: n.startBeat + beatOffset,
        barIndex,
      });
    }

    const restRoll =
      rngRoot != null
        ? mulberry32(mixUint32(rngRoot, ['melodyRest', String(chorusIndex), String(barIndex)]))()
        : Math.random();
    if (mode === 'melody' && barIndex % 2 === 1 && restRoll < profile.postCadenceRestProbability) {
      generatedNotes.push({
        pitch: 0,
        startBeat: cumulativeQuarterBeatsThroughBar(chart, barIndex + 1),
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
  const measures = chart.measures ?? [];
  const barsPerChorus = measures.length;
  const mode: GenerationMode = options?.mode ?? 'solo';
  const profile = getProfileForMode(mode);
  const riffStyleSolo = options?.riffStyle ?? 'bebop-placement';
  const baselineVaultRiffStyle = mode === 'melody' ? 'quadratonic' : riffStyleSolo;
  const tuningId = options?.tuningId ?? 'standard';
  const chorusCount = resolveChorusCount(options?.chorusCount);
  const explicitSeed =
    options?.seed != null && Number.isFinite(options.seed) ? Math.floor(Number(options.seed)) : undefined;
  const rngRoot =
    explicitSeed !== undefined
      ? deriveVaultRngRoot(explicitSeed, {
          mode,
          drift: String(options?.drift ?? 'neutral'),
          duoIntent: options?.duoIntent,
          riffStyle: options?.riffStyle ?? '',
          tuningId,
          chorusCount,
          songwriterStyleId: options?.songwriterStyleId ?? '',
        })
      : null;
  const chorusQuarterWidth = totalQuarterLengthForBars(chart, barsPerChorus);
  const skipChorusTensionAdvance = options?.songwriterStyleId === 'sonic_youth';
  const rawRiffOpt = options?.riffStyle;
  const triadPairStyleRotationEligible =
    rawRiffOpt === undefined || rawRiffOpt === 'triad-pair-pendulum';

  const allGeneratedNotes: ScoreNote[] = [];
  const allChordMappings: IRealVaultOutput['chordMappings'] = [];
  const allUnmappedChords: IRealVaultOutput['unmappedChords'] = [];

  /** Prior chorus’s per-bar melodic contours — seed phrase planner on repeats (chorus ≥ 1). */
  let contourHintsForNextChorus: PhraseContourTag[] | undefined;

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
      chart,
      measures,
      mode,
      profile,
      effectiveRiffStyle: effectiveRiffStyleForPass,
      tuningId,
      contourHintsPerBar: contourHintsForNextChorus,
      rngRoot,
      chorusIndex,
    });

    const tensionCycleRotation = skipChorusTensionAdvance ? 0 : chorusIndex;

    const chunkNotes =
      mode === 'melody'
        ? applyMelodyMotifReuseAcrossBars({
            chart,
            generatedNotes,
            chordMappings,
            barCount: barsPerChorus,
            tensionCycleRotation,
          })
        : generatedNotes;

    if (chorusIndex + 1 < chorusCount) {
      contourHintsForNextChorus = [];
      for (let b = 0; b < barsPerChorus; b++) {
        contourHintsForNextChorus.push(phraseContourForBar(chunkNotes, b));
      }
    }

    const barOffset = chorusIndex * barsPerChorus;
    const beatOffsetGlobal = chorusIndex * chorusQuarterWidth;

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

  const totalBars = barsPerChorus * chorusCount;
  const phraseContours = buildPhraseContoursForBars(allGeneratedNotes, totalBars);
  const hookIdentity = buildHookIdentityTracker(allGeneratedNotes, barsPerChorus, chorusCount);
  const tensionProgression = buildTensionProgression({
    phraseContours,
    hookIdentity,
    barsPerChorus,
    chorusCount,
  });

  const shaped = applyVaultTensionProgressionShaping({
    notes: allGeneratedNotes,
    chordMappings: allChordMappings,
    tensionProgression,
    barsPerChorus,
    chorusCount,
    chart,
  });
  const finalPhraseContours = buildPhraseContoursForBars(shaped.notes, totalBars);
  const finalTensionProgression = buildTensionProgression({
    phraseContours: finalPhraseContours,
    hookIdentity,
    barsPerChorus,
    chorusCount,
  });
  const chorusQualityGate = buildChorusQualityGate({
    notes: shaped.notes,
    phraseContours: finalPhraseContours,
    tensionProgression: finalTensionProgression,
    barsPerChorus,
    chorusCount,
  });
  assertChorusQualityGate(chorusQualityGate);

  return {
    title: chart.title,
    key: chart.key,
    bars: totalBars,
    generatedNotes: shaped.notes,
    chordMappings: shaped.chordMappings,
    unmappedChords: allUnmappedChords,
    mode,
    ...(explicitSeed !== undefined ? { seed: explicitSeed } : {}),
    phraseContours: finalPhraseContours,
    hookIdentity,
    tensionProgression: finalTensionProgression,
    chorusQualityGate,
  };
}

/**
 * Parse iReal input, map each bar’s first chord to the Vault, and concatenate **1-bar** riffs using the chart’s meter.
 */
export function generateFromIReal(input: string, options?: VaultGenerationOptions): IRealVaultOutput {
  const chart = parseIRealProInput(input);
  return generateVaultFromParsedChart(chart, options);
}
