/**
 * Phase 3 - apply melody hand-off to Phase 2 quintet using ContrapuntalLineEngine (call-only).
 */

import type { CompositionContext } from '../compositionContext';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { AbstractLineSet, LineRole, NoteEvent } from '../counterpoint/abstractLineSet';
import { ContrapuntalLineEngine } from '../counterpoint/ContrapuntalLineEngine';
import type { MosaicSqContrapuntalGuideMap } from '../string-quartet/mosaicSqContrapuntalGuide';
import type { ImportMelodyNote } from './mosaicImportTimeline';
import { pinMelodyOnScore, verifyPinnedMelodyOnScore } from './mosaicStyleTransfer';
import type { DebussyLeadSheetQuintetAssemblyResult } from './assembleDebussyLeadSheetQuintetScore';
import {
  DEFAULT_DEBUSSY_LEADSHEET_MELODY_HANDOFF_PLAN,
  buildPerBarMelodyOwnership,
  type DebussyLeadSheetMelodyHandoffSegment,
  type DebussyMelodyHandoffPartId,
  type PerBarMelodyOwnership,
} from './debussyLeadSheetMelodyHandoffPlan';
import { BEATS_PER_MEASURE, type MeasureModel, type ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';

function buildHandoffMosaicGuide(melody: readonly ImportMelodyNote[], totalBars: number): MosaicSqContrapuntalGuideMap {
  const motifAnchors = melody
    .filter((n) => n.bar >= 1 && n.bar <= totalBars)
    .map((n) => ({
      bar: n.bar,
      beat: n.onsetBeat,
      pitchMidi: n.midiPitch,
      durationBeats: n.durationBeats,
      weight: n.bar <= 2 ? ('hard' as const) : ('soft' as const),
    }));
  return {
    handoff: {
      sectionLabel: 'handoff',
      startBar: 1,
      endBar: totalBars,
      presetRole: 'string_quartet',
      motifAnchors,
      protectedBars: [],
      allowableTransforms: ['registral_transfer', 'fragmentation', 'rhythmic_displacement', 'inversion'],
      forbiddenRewrites: {
        parallelOctaves: false,
        parallelFifths: false,
        voiceCrossing: true,
        retrograde: true,
      },
      voiceAssignment: { leadPartId: 'sq_violin_1', handoffAllowed: true },
    },
  };
}

function contextForContrapuntalEngine(base: CompositionContext, seed: number, composerId: string): CompositionContext {
  return {
    ...base,
    seed,
    voiceBundle: getVoiceRuleBundle(composerId),
  };
}

function generateHandoffLineSet(
  context: CompositionContext,
  melody: readonly ImportMelodyNote[],
  totalBars: number,
  seed: number,
  composerId: string,
): AbstractLineSet {
  const engineVrbId = composerId === 'art_rock' ? 'verlaine' : composerId;
  const engine = new ContrapuntalLineEngine(engineVrbId, contextForContrapuntalEngine(context, seed, engineVrbId));
  const mosaicSqGuides = buildHandoffMosaicGuide(melody, totalBars);
  const raw = engine.generateLines(totalBars, 'chords_only', { mosaicSqGuides });
  return engine.applyVrbFilter(raw);
}

function notesForRoleInBarRange(
  lineSet: AbstractLineSet,
  role: LineRole,
  startBar: number,
  endBar: number,
  pitchShiftSemitones = 0,
): NoteEvent[] {
  const voice = lineSet.voices.find((v) => v.role === role);
  if (!voice) return [];
  return voice.notes
    .filter((n) => {
      const bar = Math.floor(n.offsetBars) + 1;
      return bar >= startBar && bar <= endBar;
    })
    .map((n) => ({ ...n, pitchMidi: n.pitchMidi + pitchShiftSemitones }));
}

function importMelodyPitchesForBar(melody: readonly ImportMelodyNote[], bar: number): number[] {
  return melody.filter((n) => n.bar === bar).map((n) => n.midiPitch);
}

function enginePitchesForBar(notes: readonly NoteEvent[], bar: number): number[] {
  return notes
    .filter((n) => Math.floor(n.offsetBars) + 1 === bar)
    .map((n) => n.pitchMidi)
    .sort((a, b) => a - b);
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function lineNotesToMeasureEvents(notes: readonly NoteEvent[]): MeasureModel[] {
  const byBar = new Map<number, MeasureModel['events']>();
  for (const n of notes) {
    const bar = Math.floor(n.offsetBars) + 1;
    const startBeat = (n.offsetBars - (bar - 1)) * BEATS_PER_MEASURE;
    const duration = Math.max(0.25, n.durationBars * BEATS_PER_MEASURE);
    const list = byBar.get(bar) ?? [];
    list.push(createNote(n.pitchMidi, startBeat, duration, 1));
    byBar.set(bar, list);
  }
  return [...byBar.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, events]) => ({
      index,
      events: events.sort((a, b) => a.startBeat - b.startBeat),
    }));
}

function replacePartBarRangeEvents(
  score: ScoreModel,
  partId: string,
  startBar: number,
  endBar: number,
  newMeasures: MeasureModel[],
): void {
  const part = score.parts.find((p) => p.id === partId);
  if (!part) throw new Error(`part missing: ${partId}`);
  const newByBar = new Map(newMeasures.map((m) => [m.index, m]));
  for (let bar = startBar; bar <= endBar; bar++) {
    const nm = newByBar.get(bar);
    let measure = part.measures.find((m) => m.index === bar);
    if (!measure) {
      measure = { index: bar, events: [] };
      part.measures.push(measure);
    }
    const keep = measure.events.filter((e) => (e.voice ?? 1) !== 1);
    measure.events = [...keep, ...(nm?.events ?? [])];
    if (nm?.chord) measure.chord = nm.chord;
  }
  part.measures.sort((a, b) => a.index - b.index);
}

function buildGuitarHarmonyMeasure(bar: number, chordSymbol: string): MeasureModel {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const lo = 55;
  const hi = 72;
  const clamp = (m: number) => Math.max(lo, Math.min(hi, m));
  return {
    index: bar,
    chord: chordSymbol,
    events: [createNote(clamp(tones.root), 0, 2, 1), createNote(clamp(tones.third), 2, 2, 1)],
  };
}

function stripGuitarMelodyBars(score: ScoreModel, bars: readonly number[]): void {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return;
  for (const bar of bars) {
    const measure = guitar.measures.find((m) => m.index === bar);
    if (!measure) continue;
    measure.events = measure.events.filter((e) => (e.voice ?? 1) !== 1);
  }
}

export interface DebussyLeadSheetMelodyHandoffResult {
  score: ScoreModel;
  spine: DebussyLeadSheetQuintetAssemblyResult['spine'];
  lineSet: AbstractLineSet;
  perBarMelodyOwnership: PerBarMelodyOwnership[];
  melodyCarrierPartIds: DebussyMelodyHandoffPartId[];
  handoffVariationDetected: boolean;
  guitarMelodyBars: number[];
  guitarHarmonyBars: number[];
  melodyPinnedOnGuitarSegments: boolean;
  partIds: string[];
  hasBassPart: boolean;
}

export function applyDebussyLeadSheetMelodyHandoff(
  base: DebussyLeadSheetQuintetAssemblyResult,
  plan: readonly DebussyLeadSheetMelodyHandoffSegment[] = DEFAULT_DEBUSSY_LEADSHEET_MELODY_HANDOFF_PLAN,
  seed = base.spine.seed,
): DebussyLeadSheetMelodyHandoffResult {
  const { spine } = base;
  const { importTimeline, appliedHarmonyBars } = spine;
  const melody = importTimeline.melodyLine;
  const totalBars = appliedHarmonyBars.length;
  const score = structuredClone(base.score) as ScoreModel;
  const composerId = spine.composerId ?? 'debussy';

  const lineSet = generateHandoffLineSet(spine.context, melody, totalBars, seed, composerId);
  const perBarMelodyOwnership = buildPerBarMelodyOwnership(plan, totalBars);
  let handoffVariationDetected = false;

  for (const seg of plan) {
    if (seg.melodyPartId === 'guitar' || !seg.engineLineRole) continue;
    const engineNotes = notesForRoleInBarRange(
      lineSet,
      seg.engineLineRole,
      seg.startBar,
      seg.endBar,
      seg.pitchShiftSemitones ?? 0,
    );
    for (let bar = seg.startBar; bar <= seg.endBar; bar++) {
      const importPitches = importMelodyPitchesForBar(melody, bar);
      const enginePitches = enginePitchesForBar(engineNotes, bar);
      if (importPitches.length > 0 && enginePitches.length > 0 && !arraysEqual(importPitches, enginePitches)) {
        handoffVariationDetected = true;
      }
    }
    const measureEvents = lineNotesToMeasureEvents(engineNotes);
    for (const m of measureEvents) {
      const chord = appliedHarmonyBars[m.index - 1];
      if (chord) m.chord = chord;
    }
    replacePartBarRangeEvents(score, seg.melodyPartId, seg.startBar, seg.endBar, measureEvents);
  }

  const guitarHarmonyBars: number[] = [];
  for (const seg of plan) {
    if (seg.melodyPartId === 'guitar') continue;
    for (let bar = seg.startBar; bar <= seg.endBar; bar++) {
      stripGuitarMelodyBars(score, [bar]);
      const harmony = buildGuitarHarmonyMeasure(bar, appliedHarmonyBars[bar - 1] ?? '');
      const guitar = score.parts.find((p) => p.id === 'guitar');
      if (!guitar) throw new Error('guitar part missing');
      let measure = guitar.measures.find((m) => m.index === bar);
      if (!measure) {
        measure = { index: bar, events: [] };
        guitar.measures.push(measure);
      }
      measure.chord = harmony.chord;
      measure.events = [...measure.events.filter((e) => (e.voice ?? 1) !== 1), ...harmony.events];
      guitarHarmonyBars.push(bar);
    }
  }

  const guitarMelodyBars: number[] = [];
  for (const seg of plan) {
    if (seg.melodyPartId !== 'guitar') continue;
    for (let bar = seg.startBar; bar <= seg.endBar; bar++) guitarMelodyBars.push(bar);
  }

  const segmentMelody = melody.filter((n) => guitarMelodyBars.includes(n.bar));
  stripGuitarMelodyBars(score, guitarMelodyBars);
  const repinned = pinMelodyOnScore(score, segmentMelody);
  for (const part of repinned.parts) {
    const target = score.parts.find((p) => p.id === part.id);
    if (target) target.measures = part.measures;
  }

  const melodyPinnedOnGuitarSegments = verifyPinnedMelodyOnScore(score, segmentMelody);
  const melodyCarrierPartIds = [...new Set(plan.map((s) => s.melodyPartId))];
  const hasBassPart = score.parts.some(
    (p) =>
      p.instrumentIdentity === 'acoustic_upright_bass' ||
      p.id === 'bass' ||
      (p.name?.toLowerCase().includes('bass') && p.instrumentIdentity !== 'cello'),
  );

  return {
    score,
    spine,
    lineSet,
    perBarMelodyOwnership,
    melodyCarrierPartIds,
    handoffVariationDetected,
    guitarMelodyBars,
    guitarHarmonyBars,
    melodyPinnedOnGuitarSegments,
    partIds: score.parts.map((p) => p.id),
    hasBassPart,
  };
}
