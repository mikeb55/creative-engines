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
}): ScoreNote[] {
  const { generatedNotes, chordMappings, quarterSpan, barCount } = params;
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
    const state = MELODY_MOTIF_TENSION_CYCLE[(b - seedBar - 1) % MELODY_MOTIF_TENSION_CYCLE.length]!;
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

export type GenerateFromIRealOptions = {
  riffStyle?: 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string' | 'bebop-placement';
  tuningId?: string;
  /** Reserved for future reharm / candidate bias; not applied in this pipeline yet. */
  drift?: EmotionalDrift;
  /** Build I — solo (dense / bar-reactive) vs melody (sparse / phrase-oriented). */
  mode?: GenerationMode;
};

/**
 * Map each bar’s first chord to the Vault and concatenate **1-bar** riffs using the chart’s time signature (Build I).
 */
export function generateVaultFromParsedChart(chart: ParsedChart, options?: GenerateFromIRealOptions): IRealVaultOutput {
  void options?.drift;
  const measures = chart.measures ?? [];
  const bars = measures.length;
  const mode: GenerationMode = options?.mode ?? 'solo';
  const profile = getProfileForMode(mode);
  const riffStyleSolo = options?.riffStyle ?? 'bebop-placement';
  const effectiveRiffStyle = mode === 'melody' ? 'quadratonic' : riffStyleSolo;
  const tuningId = options?.tuningId ?? 'standard';
  const quarterSpan = quarterNoteSpanPerMeasure(chart);
  const eighthsPerBar = eighthsPerMeasureFromChart(chart);

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

  const notesOut =
    mode === 'melody'
      ? applyMelodyMotifReuseAcrossBars({
          generatedNotes,
          chordMappings,
          quarterSpan,
          barCount: bars,
        })
      : generatedNotes;

  return {
    title: chart.title,
    key: chart.key,
    bars,
    generatedNotes: notesOut,
    chordMappings,
    unmappedChords,
    mode,
  };
}

/**
 * Parse iReal input, map each bar’s first chord to the Vault, and concatenate **1-bar** riffs using the chart’s meter.
 */
export function generateFromIReal(input: string, options?: GenerateFromIRealOptions): IRealVaultOutput {
  const chart = parseIRealProInput(input);
  return generateVaultFromParsedChart(chart, options);
}
