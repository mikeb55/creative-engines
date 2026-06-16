/**
 * Phase D - late-stage quintet guitar chording under pinned melody (voice 1 untouched).
 */

import {
  closeBlockVoicingBelowMelody,
  drop2VoicingBelowMelody,
} from '../barry-harris/blockVoicings';
import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { runCompingGenerator } from '../comping/compingGenerator';
import { chordTonesFromSymbol } from '../harmony/chordSymbolAnalysis';
import type { NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import { SIXTEENTH_GRID_BEATS } from './leadSheetQuintetSixteenthGridClampPass';

export type LeadSheetGuitarChordingComposerId = 'bartok' | 'debussy' | 'kenny_wheeler';

export interface LeadSheetGuitarChordingPassInput {
  score: ScoreModel;
  appliedHarmonyBars: readonly string[];
  composerId: LeadSheetGuitarChordingComposerId | string;
  seed?: number;
  /** 0 = lighter comp, 0.5 = composer baseline, 1 = busier comp. */
  guitarCompDensity?: number;
}

export interface LeadSheetGuitarChordingPassDiagnostics {
  chordBarCountBefore: number;
  chordBarCountAfter: number;
  eventsAdded: number;
  dyadCount: number;
  triadCount: number;
  shellCount: number;
  feasibilityChecks: number;
  feasibilityPasses: number;
  feasibilitySkips: number;
  composerId: string;
}

export interface LeadSheetGuitarChordingPassResult {
  score: ScoreModel;
  diagnostics: LeadSheetGuitarChordingPassDiagnostics;
}

type VoicingKind = 'dyad' | 'triad' | 'shell';

interface ChordAnchor {
  bar: number;
  startBeat: number;
  duration: number;
  melodyMidi?: number;
  reason: 'sustain' | 'phrase_start' | 'phrase_end' | 'empty_bar' | 'harmonic_space';
}

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function snap16(value: number): number {
  return Math.round(value / SIXTEENTH_GRID_BEATS) * SIXTEENTH_GRID_BEATS;
}

function seededUnit(seed: number, bar: number, slot: number, tag: string): number {
  let h = (seed ^ (bar * 7919)) >>> 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  }
  h = (h ^ (slot * 104729)) >>> 0;
  return (h % 10000) / 10000;
}

function tonePcsForSymbol(symbol: string, composerId: string): number[] {
  const tones = chordTonesFromSymbol(symbol, { lockedHarmony: true });
  const pcs = [tones.root, tones.third, tones.fifth, tones.seventh].map(mod12);
  if (composerId === 'debussy') {
    const fourth = mod12(tones.root + 5);
    if (!pcs.includes(fourth)) pcs.push(fourth);
  }
  return [...new Set(pcs)];
}

function shellPcsForSymbol(symbol: string): number[] {
  const comp = runCompingGenerator([symbol], {
    key: 'C',
    bpm: 96,
    bars: 1,
    timeSignature: { num: 4, den: 4 },
    options: {
      style: 'shell_voicing',
      beatPattern: 'beats_2_4',
      voicingDensity: 'medium',
      muted: false,
    },
  });
  const hit = comp.chordVoicings.find((v) => v.barIndex === 0);
  if (!hit || hit.midiPitches.length === 0) {
    const tones = chordTonesFromSymbol(symbol, { lockedHarmony: true });
    return [mod12(tones.root), mod12(tones.third), mod12(tones.seventh)];
  }
  return [...new Set(hit.midiPitches.map(mod12))];
}

function innerMidisBelowMelody(
  melodyMidi: number,
  tonePcs: readonly number[],
  useDrop2: boolean,
  maxInner: number,
): number[] {
  const inner = useDrop2
    ? drop2VoicingBelowMelody(melodyMidi, tonePcs)
    : closeBlockVoicingBelowMelody(melodyMidi, tonePcs);
  if (inner.length <= maxInner) return inner;
  return inner.slice(-maxInner);
}

function midRegisterShellMidis(tonePcs: readonly number[], topMidi = 72): number[] {
  const sorted = [...tonePcs].sort((a, b) => a - b);
  const placed: number[] = [];
  let cursor = topMidi - 1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const pc = sorted[i]!;
    let pitch = cursor;
    while (mod12(pitch) !== pc) pitch -= 1;
    while (pitch < 40) pitch += 12;
    placed.unshift(pitch);
    cursor = pitch - 1;
  }
  return placed;
}

function evaluateGuitarVoicingFeasibility(midis: readonly number[]): boolean {
  return assessGuitarFeasibility(midis, { allowStretch: false }).feasible;
}

function classifyVoicing(innerCount: number, kind: VoicingKind): VoicingKind {
  if (kind === 'shell') return 'shell';
  if (innerCount <= 1) return 'dyad';
  return innerCount === 2 ? 'dyad' : 'triad';
}

function tryVoicing(
  melodyMidi: number | undefined,
  tonePcs: readonly number[],
  useDrop2: boolean,
  targetSize: number,
  kind: VoicingKind,
): { inner: number[]; kind: VoicingKind } | null {
  const sizes = kind === 'shell' ? [3, 2] : [targetSize, Math.max(1, targetSize - 1), 1];
  for (const size of sizes) {
    const inner =
      melodyMidi !== undefined
        ? innerMidisBelowMelody(melodyMidi, tonePcs, useDrop2, size)
        : midRegisterShellMidis(tonePcs, 70).slice(-size);
    if (inner.length === 0) continue;
    const grip = melodyMidi !== undefined ? [...inner, melodyMidi] : inner;
    if (evaluateGuitarVoicingFeasibility(grip)) {
      return { inner, kind: classifyVoicing(inner.length, kind) };
    }
  }
  return null;
}

export function countGuitarChordBars(score: ScoreModel): number {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return 0;
  let count = 0;
  for (const measure of guitar.measures) {
    const v2 = measure.events.filter(
      (e) => (e.kind === 'note' || e.kind === 'chord') && (e.voice ?? 1) === 2,
    );
    if (v2.length > 0) count += 1;
  }
  return count;
}

export function leadSheetGuitarMelodyRhythmKey(score: ScoreModel): string {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return '';
  const chunks: string[] = [];
  for (const measure of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const notes = measure.events
      .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
      .sort((a, b) => a.startBeat - b.startBeat)
      .map((e) => `${e.startBeat.toFixed(3)}:${e.duration.toFixed(3)}:${e.pitch}`);
    chunks.push(`${measure.index}:${notes.join(',')}`);
  }
  return chunks.join('|');
}

function guitarV1Notes(score: ScoreModel, bar: number): NoteEvent[] {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const measure = guitar?.measures.find((m) => m.index === bar);
  return (
    measure?.events
      .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
      .sort((a, b) => a.startBeat - b.startBeat) ?? []
  );
}

function hasV2AtBeat(
  measure: { events: readonly { kind: string; voice?: number; startBeat: number }[] },
  beat: number,
): boolean {
  return measure.events.some(
    (e) =>
      (e.kind === 'note' || e.kind === 'chord') &&
      (e.voice ?? 1) === 2 &&
      Math.abs(e.startBeat - beat) < 0.02,
  );
}

function guitarCompScale(guitarCompDensity: number): number {
  const clamped = Math.max(0, Math.min(1, guitarCompDensity));
  return 0.55 + clamped * 0.9;
}

function buildAnchors(
  score: ScoreModel,
  bar: number,
  composerId: string,
  seed: number,
  guitarCompDensity = 0.5,
): ChordAnchor[] {
  const compScale = guitarCompScale(guitarCompDensity);
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const measure = guitar?.measures.find((m) => m.index === bar);
  if (!measure) return [];

  const v1 = guitarV1Notes(score, bar);
  const anchors: ChordAnchor[] = [];

  if (v1.length === 0) {
    const u = seededUnit(seed, bar, 0, 'empty');
    const density =
      (composerId === 'bartok' ? 0.22 : composerId === 'debussy' ? 0.35 : 0.28) * compScale;
    if (u < density) {
      anchors.push({ bar, startBeat: 0, duration: composerId === 'debussy' ? 2 : 1, reason: 'empty_bar' });
    }
    return anchors;
  }

  const first = v1[0]!;
  const last = v1[v1.length - 1]!;
  const density =
    (composerId === 'bartok' ? 0.28 : composerId === 'debussy' ? 0.42 : 0.34) * compScale;

  if (seededUnit(seed, bar, 1, 'phrase_start') < density && !hasV2AtBeat(measure, first.startBeat)) {
    anchors.push({
      bar,
      startBeat: first.startBeat,
      duration: snap16(Math.min(first.duration, composerId === 'bartok' ? 0.5 : first.duration)),
      melodyMidi: first.pitch,
      reason: 'phrase_start',
    });
  }

  if (
    last !== first &&
    seededUnit(seed, bar, 2, 'phrase_end') < density &&
    !hasV2AtBeat(measure, last.startBeat)
  ) {
    anchors.push({
      bar,
      startBeat: last.startBeat,
      duration: snap16(Math.min(last.duration, composerId === 'bartok' ? 0.5 : last.duration)),
      melodyMidi: last.pitch,
      reason: 'phrase_end',
    });
  }

  for (let i = 0; i < v1.length; i++) {
    const n = v1[i]!;
    if (n.duration < 1 && composerId !== 'debussy') continue;
    if (hasV2AtBeat(measure, n.startBeat)) continue;
    const sustainGate =
      (composerId === 'bartok' ? 0.35 : composerId === 'debussy' ? 0.55 : 0.45) / compScale;
    if (seededUnit(seed, bar, 10 + i, 'sustain') >= Math.min(0.95, sustainGate)) continue;
    if (n.duration >= 1 || composerId === 'debussy') {
      anchors.push({
        bar,
        startBeat: n.startBeat,
        duration: snap16(
          composerId === 'bartok'
            ? Math.max(SIXTEENTH_GRID_BEATS, Math.min(n.duration, 0.5))
            : Math.max(SIXTEENTH_GRID_BEATS, Math.min(n.duration, 2)),
        ),
        melodyMidi: n.pitch,
        reason: n.duration >= 1.5 ? 'sustain' : 'harmonic_space',
      });
    }
  }

  const maxPerBar = composerId === 'bartok' ? 1 : 2;
  const seen = new Set<string>();
  const uniq: ChordAnchor[] = [];
  for (const a of anchors) {
    const k = a.startBeat.toFixed(3);
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(a);
  }
  return uniq.slice(0, maxPerBar);
}

function composerVoicingPlan(composerId: string): {
  useDrop2: boolean;
  targetSize: number;
  kind: VoicingKind;
} {
  if (composerId === 'kenny_wheeler') {
    return { useDrop2: true, targetSize: 3, kind: 'shell' };
  }
  if (composerId === 'debussy') {
    return { useDrop2: false, targetSize: 2, kind: 'triad' };
  }
  return { useDrop2: false, targetSize: 1, kind: 'dyad' };
}

export function applyLeadSheetGuitarChordingPass(
  input: LeadSheetGuitarChordingPassInput,
): LeadSheetGuitarChordingPassResult {
  const seed = input.seed ?? 90106;
  const guitarCompDensity = input.guitarCompDensity ?? 0.5;
  const composerId = input.composerId;
  const score = structuredClone(input.score) as ScoreModel;
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) {
    return {
      score,
      diagnostics: {
        chordBarCountBefore: 0,
        chordBarCountAfter: 0,
        eventsAdded: 0,
        dyadCount: 0,
        triadCount: 0,
        shellCount: 0,
        feasibilityChecks: 0,
        feasibilityPasses: 0,
        feasibilitySkips: 0,
        composerId,
      },
    };
  }

  const chordBarCountBefore = countGuitarChordBars(score);
  const plan = composerVoicingPlan(composerId);
  let eventsAdded = 0;
  let dyadCount = 0;
  let triadCount = 0;
  let shellCount = 0;
  let feasibilityChecks = 0;
  let feasibilityPasses = 0;
  let feasibilitySkips = 0;

  const totalBars = input.appliedHarmonyBars.length;
  for (let bar = 1; bar <= totalBars; bar++) {
    const symbol = input.appliedHarmonyBars[bar - 1] ?? 'C';
    const tonePcs =
      composerId === 'kenny_wheeler' ? shellPcsForSymbol(symbol) : tonePcsForSymbol(symbol, composerId);
    const measure = guitar.measures.find((m) => m.index === bar);
    if (!measure) continue;

    const anchors = buildAnchors(score, bar, composerId, seed, guitarCompDensity);
    for (const anchor of anchors) {
      feasibilityChecks += 1;
      const voicing = tryVoicing(anchor.melodyMidi, tonePcs, plan.useDrop2, plan.targetSize, plan.kind);
      if (!voicing) {
        feasibilitySkips += 1;
        continue;
      }
      feasibilityPasses += 1;

      const startBeat = snap16(anchor.startBeat);
      const duration = Math.max(SIXTEENTH_GRID_BEATS, snap16(anchor.duration));
      const sortedInner = [...voicing.inner].sort((a, b) => a - b);
      const topInner = sortedInner[sortedInner.length - 1]!;
      const melodyTop = anchor.melodyMidi !== undefined ? anchor.melodyMidi > topInner : true;

      if (anchor.melodyMidi !== undefined && !melodyTop) {
        feasibilitySkips += 1;
        continue;
      }

      measure.events.push(createNote(topInner, startBeat, duration, 2, undefined, sortedInner));
      eventsAdded += 1;
      if (voicing.kind === 'shell') shellCount += 1;
      else if (voicing.kind === 'triad') triadCount += 1;
      else dyadCount += 1;
    }

    measure.events.sort((a, b) => a.startBeat - b.startBeat);
  }

  return {
    score,
    diagnostics: {
      chordBarCountBefore,
      chordBarCountAfter: countGuitarChordBars(score),
      eventsAdded,
      dyadCount,
      triadCount,
      shellCount,
      feasibilityChecks,
      feasibilityPasses,
      feasibilitySkips,
      composerId,
    },
  };
}