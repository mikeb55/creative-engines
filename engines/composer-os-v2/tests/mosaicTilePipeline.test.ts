/**
 * Mosaic Mode — tile inject, underfill pad, overfill trim unit tests.
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import { generateMosaicSourceMotif } from '../core/mosaic-mode/mosaicMotifEngine';
import {
  appendMosaicFullBarRestIfVoiceEmpty,
  injectMosaicMotifNotesPostFinalize,
  padMosaicUnderfillBars,
  trimMosaicOverfillBars,
} from '../core/mosaic-mode/mosaicTilePipeline';
import type { InstrumentRegisterMap } from '../core/register-map/registerMapTypes';
import { measureBeatSpanQuartersOf } from '../core/score-model/measureBeatSpan';
import { createNote, createRest } from '../core/score-model/scoreEventBuilder';
import type { MeasureModel, ScoreEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

function mosaicContext(overrides: Partial<GenerationMetadata> = {}): CompositionContext {
  const source = generateMosaicSourceMotif(99001, 64);
  const locked = Array.from({ length: 16 }, () => 'Am');
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: 99001,
    form: { sections: [{ label: 'intro', startBar: 1, length: 16 }], totalBars: 16 },
    lockedHarmonyBarsRaw: locked,
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: {
      segments: [{ startBar: 1, bars: 16, chord: 'Am' }],
      totalBars: 16,
    },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: {
      generatedAt: '2026-06-07T00:00:00.000Z',
      songwriterStyleId: 'fripp',
      mosaicSectionPlan: [
        {
          sectionLabel: 'intro',
          startBar: 1,
          endBar: 4,
          songwriterStyleId: 'fripp',
          timeSignature: { numerator: 5, denominator: 4 },
          phraseRole: 'statement',
        },
        {
          sectionLabel: 'verse',
          startBar: 5,
          endBar: 8,
          songwriterStyleId: 'verlaine',
        },
      ],
      mosaicMergedHarmonyBars: locked,
      mosaicSectionMotifVariants: { intro: source, verse: source },
      ...overrides,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

const GUITAR_MAP: InstrumentRegisterMap = {
  instrumentIdentity: 'clean_electric_guitar',
  sections: [{ sectionLabel: 'intro', preferredZone: [55, 79], dangerZone: [40, 90], ceilingTendency: 79, floorTendency: 55, contour: 'stable' }],
};

function measureAt(score: ScoreModel, bar: number): MeasureModel | undefined {
  return score.parts[0]?.measures.find((m) => m.index === bar);
}

function voiceEvents(m: MeasureModel, voice = 1): ScoreEvent[] {
  return m.events.filter((e) => (e.voice ?? 1) === voice).sort((a, b) => a.startBeat - b.startBeat);
}

function voiceHasOverlaps(events: ScoreEvent[]): boolean {
  let end = -1;
  for (const e of events) {
    if (e.startBeat < end - 0.001) return true;
    end = e.startBeat + e.duration;
  }
  return false;
}

function voiceDurationSum(events: ScoreEvent[]): number {
  return events.reduce((s, e) => s + e.duration, 0);
}

function guitarPart(measures: MeasureModel[]) {
  return {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble' as const,
    measures,
  };
}

function scoreWithMeasure(bar: number, m: MeasureModel): ScoreModel {
  return {
    title: 'test',
    parts: [guitarPart([{ ...m, index: bar }])],
  };
}

export function runMosaicTilePipelineTests(): { ok: boolean; name: string; detail?: string }[] {
  const out: { ok: boolean; name: string; detail?: string }[] = [];

  // A — inject tile path
  {
    const context = mosaicContext();
    const bar = 1;
    const scoreIn = scoreWithMeasure(bar, {
      index: bar,
      chord: 'Asus2',
      measureBeatSpanQuarters: 5,
      events: [
        createRest(0, 2, 1),
        createNote(60, 2, 1, 1),
        createNote(62, 3, 1, 1),
      ],
    });
    const injected = injectMosaicMotifNotesPostFinalize(scoreIn, context, GUITAR_MAP);
    const m = measureAt(injected, bar)!;
    const v1 = voiceEvents(m, 1);
    const noOverlaps = !voiceHasOverlaps(v1);
    const firstNote = v1.find((e) => e.kind === 'note');
    const noRestBeforeMotif =
      firstNote === undefined ||
      v1.filter((e) => e.kind === 'rest' && e.startBeat < firstNote.startBeat - 0.001).length === 0;
    out.push({
      ok: noOverlaps,
      name: 'injectMosaicMotifNotesPostFinalize tile: no overlapping events on voice 1',
      detail: noOverlaps ? undefined : JSON.stringify(v1),
    });
    out.push({
      ok: noRestBeforeMotif,
      name: 'injectMosaicMotifNotesPostFinalize tile: no rests before motif notes',
      detail: noRestBeforeMotif ? undefined : JSON.stringify(v1),
    });
    out.push({
      ok: m.chord === 'Asus2',
      name: 'injectMosaicMotifNotesPostFinalize tile: measure.chord preserved',
      detail: m.chord,
    });
  }

  // B — padMosaicUnderfillBars
  {
    const context = mosaicContext();
    const bar = 1;
    const scoreIn = scoreWithMeasure(bar, {
      index: bar,
      measureBeatSpanQuarters: 5,
      events: [createNote(60, 0, 1, 1), createNote(62, 2, 1, 1)],
    });
    const padded = padMosaicUnderfillBars(scoreIn, context);
    const m = measureAt(padded, bar)!;
    const v1 = voiceEvents(m, 1);
    const cap = measureBeatSpanQuartersOf(m);
    const total = voiceDurationSum(v1);
    out.push({
      ok: Math.abs(total - cap) < 0.02,
      name: 'padMosaicUnderfillBars: 5/4 bar reaches exactly 5 beats after pad',
      detail: `total=${total} cap=${cap}`,
    });
    const hasInternalGapRest = v1.some((e) => e.kind === 'rest' && e.startBeat > 0.01 && e.startBeat < 1.99);
    out.push({
      ok: hasInternalGapRest,
      name: 'padMosaicUnderfillBars: internal gaps filled with rests',
    });
    out.push({
      ok: !voiceHasOverlaps(v1),
      name: 'padMosaicUnderfillBars: no overlaps introduced',
    });

    const score44 = scoreWithMeasure(5, {
      index: 5,
      measureBeatSpanQuarters: 4,
      events: [createNote(60, 0, 1, 1)],
    });
    const padded44 = padMosaicUnderfillBars(score44, context);
    const m44 = measureAt(padded44, 5)!;
    out.push({
      ok: voiceDurationSum(voiceEvents(m44)) === 1,
      name: 'padMosaicUnderfillBars: 4/4 bars not touched (cap === 4 guard)',
    });
  }

  // C — trimMosaicOverfillBars
  {
    const context = mosaicContext();
    const bar = 1;
    const scoreIn = scoreWithMeasure(bar, {
      index: bar,
      measureBeatSpanQuarters: 5,
      events: [
        createNote(60, 0, 2, 1),
        createNote(62, 2, 2, 1),
        createNote(64, 4, 2, 1),
      ],
    });
    const trimmed = trimMosaicOverfillBars(scoreIn, context);
    const m = measureAt(trimmed, bar)!;
    const v1 = voiceEvents(m, 1);
    const cap = measureBeatSpanQuartersOf(m);
    out.push({
      ok: Math.abs(voiceDurationSum(v1) - cap) < 0.02,
      name: 'trimMosaicOverfillBars: 5/4 bar trimmed to exactly 5 beats',
      detail: `total=${voiceDurationSum(v1)} cap=${cap}`,
    });

    const score44 = scoreWithMeasure(5, {
      index: 5,
      measureBeatSpanQuarters: 4,
      events: [createNote(60, 0, 2, 1), createNote(62, 2, 3, 1)],
    });
    const trimmed44 = trimMosaicOverfillBars(score44, context);
    const m44 = measureAt(trimmed44, 5)!;
    out.push({
      ok: voiceDurationSum(voiceEvents(m44)) === 5,
      name: 'trimMosaicOverfillBars: 4/4 bars not touched (cap === 4 guard)',
    });

    const scoreWipe = scoreWithMeasure(bar, {
      index: bar,
      measureBeatSpanQuarters: 5,
      events: [createNote(60, 0, 8, 2)],
    });
    const trimmedEmpty = trimMosaicOverfillBars(scoreWipe, context);
    const mEmpty = measureAt(trimmedEmpty, bar)!;
    const vEmpty = voiceEvents(mEmpty, 2);
    const capped =
      vEmpty.length >= 1 &&
      Math.abs(voiceDurationSum(vEmpty) - 5) < 0.02 &&
      !voiceHasOverlaps(vEmpty);
    out.push({
      ok: capped,
      name: 'trimMosaicOverfillBars: heavy overfill voice capped to bar span',
      detail: JSON.stringify(vEmpty),
    });

    const scoreEmptyVoice = scoreWithMeasure(bar, {
      index: bar,
      measureBeatSpanQuarters: 5,
      events: [],
    });
    appendMosaicFullBarRestIfVoiceEmpty(scoreEmptyVoice.parts[0]!.measures[0]!, 3, 5);
    const v3 = voiceEvents(scoreEmptyVoice.parts[0]!.measures[0]!, 3);
    const fullRest =
      v3.length === 1 &&
      v3[0]!.kind === 'rest' &&
      Math.abs(v3[0]!.duration - 5) < 0.02 &&
      v3[0]!.startBeat === 0;
    out.push({
      ok: fullRest,
      name: 'trimMosaicOverfillBars: empty voice after trim gets full-bar rest',
      detail: JSON.stringify(v3),
    });

    const score34 = scoreWithMeasure(6, {
      index: 6,
      measureBeatSpanQuarters: 3,
      events: [createNote(60, 0, 2, 1), createNote(62, 2, 2, 1)],
    });
    const trimmed34 = trimMosaicOverfillBars(score34, context);
    const m34 = measureAt(trimmed34, 6)!;
    out.push({
      ok: Math.abs(voiceDurationSum(voiceEvents(m34, 1)) - 3) < 0.02,
      name: 'trimMosaicOverfillBars: 3/4 bar overfilled to 4 beats trimmed to 3',
      detail: `total=${voiceDurationSum(voiceEvents(m34, 1))}`,
    });

    const score24 = scoreWithMeasure(7, {
      index: 7,
      measureBeatSpanQuarters: 2,
      events: [createNote(60, 0, 2, 1), createNote(62, 2, 2, 1)],
    });
    const trimmed24 = trimMosaicOverfillBars(score24, context);
    const m24 = measureAt(trimmed24, 7)!;
    out.push({
      ok: Math.abs(voiceDurationSum(voiceEvents(m24, 1)) - 2) < 0.02,
      name: 'trimMosaicOverfillBars: 2/4 bar overfilled to 4 beats trimmed to 2',
      detail: `total=${voiceDurationSum(voiceEvents(m24, 1))}`,
    });
  }

  return out;
}

if (require.main === module) {
  const rows = runMosaicTilePipelineTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
