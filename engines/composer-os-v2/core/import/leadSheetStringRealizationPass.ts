/**
 * Phase 7 - leadsheet quintet string realization (import-layer post-assembly).
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { BEATS_PER_MEASURE, type MeasureModel, type ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import type { ImportMelodyNote } from './mosaicImportTimeline';
import type { PerBarMelodyOwnership } from './debussyLeadSheetMelodyHandoffPlan';
import {
  fitMelodyPitchesToPartRange,
  getLeadSheetPartMidiBounds,
  isLeadSheetStringPartId,
  pitchInPartRange,
} from './leadSheetPartMidiBounds';

const STRING_PART_IDS = ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'] as const;

export interface LeadSheetPhase7Diagnostics {
  melodyOwnershipEnforced: boolean;
  accompanimentMotionApplied: boolean;
  rangeViolationsBefore: number;
  rangeViolationsAfter: number;
  ownedBarMelodyMatch: Array<{ bar: number; ownerPartId: string; matched: boolean }>;
  accompanimentBarsWithMotion: number[];
}

export interface LeadSheetPhase7RealizationInput {
  score: ScoreModel;
  melody: readonly ImportMelodyNote[];
  appliedHarmonyBars: readonly string[];
  perBarMelodyOwnership: readonly PerBarMelodyOwnership[];
  seed?: number;
  composerId?: string;
}

export interface LeadSheetPhase7RealizationResult {
  score: ScoreModel;
  diagnostics: LeadSheetPhase7Diagnostics;
}

function seededUnit(seed: number, bar: number, partId: string, slot: number): number {
  let h = seed ^ (bar * 7919) ^ (slot * 104729);
  for (let i = 0; i < partId.length; i++) h = (h * 31 + partId.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

function measureNotes(measure: MeasureModel | undefined) {
  return measure?.events.filter((e) => e.kind === 'note') ?? [];
}

function isStaticPadMeasure(measure: MeasureModel | undefined): boolean {
  const notes = measureNotes(measure);
  if (notes.length === 0) return false;
  if (notes.length === 1 && notes[0]!.duration >= BEATS_PER_MEASURE - 0.01) return true;
  return notes.every((n) => n.duration >= BEATS_PER_MEASURE * 0.85);
}

function ownerForBar(ownership: readonly PerBarMelodyOwnership[], bar: number): string {
  return ownership.find((o) => o.bar === bar)?.ownerPartId ?? 'guitar';
}

function melodyForBar(melody: readonly ImportMelodyNote[], bar: number): ImportMelodyNote[] {
  return melody.filter((n) => n.bar === bar).sort((a, b) => a.onsetBeat - b.onsetBeat);
}

function replaceVoiceOneEvents(measure: MeasureModel, newEvents: MeasureModel['events']): void {
  const keep = measure.events.filter((e) => (e.voice ?? 1) !== 1);
  measure.events = [...keep, ...newEvents].sort((a, b) => a.startBeat - b.startBeat);
}

function pinImportMelodyOnOwnerBar(
  score: ScoreModel,
  ownerPartId: string,
  bar: number,
  barMelody: readonly ImportMelodyNote[],
): void {
  if (barMelody.length === 0) return;
  const part = score.parts.find((p) => p.id === ownerPartId);
  if (!part) return;
  let measure = part.measures.find((m) => m.index === bar);
  if (!measure) {
    measure = { index: bar, events: [] };
    part.measures.push(measure);
  }

  const rawPitches = barMelody.map((n) => n.midiPitch);
  const fitted = fitMelodyPitchesToPartRange(rawPitches, ownerPartId);
  const events = barMelody.map((n, i) => createNote(fitted[i]!, n.onsetBeat, n.durationBeats, 1));
  replaceVoiceOneEvents(measure, events);
  part.measures.sort((a, b) => a.index - b.index);
}

function demoteNonOwnerVoiceOne(score: ScoreModel, bar: number, ownerPartId: string): void {
  for (const part of score.parts) {
    if (part.id === ownerPartId) continue;
    const measure = part.measures.find((m) => m.index === bar);
    if (!measure) continue;
    measure.events = measure.events.filter((e) => (e.voice ?? 1) !== 1);
  }
}

function pickAccompanimentPitches(chordSymbol: string, partId: string, bar: number, seed: number): number[] {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const pool = [tones.third, tones.fifth, tones.root, tones.seventh].filter(
    (p): p is number => typeof p === 'number' && Number.isFinite(p),
  );
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  const normalized = [
    ...new Set(
      pool.map((p) => {
        let out = p;
        while (out < lo) out += 12;
        while (out > hi) out -= 12;
        return Math.max(lo, Math.min(hi, out));
      }),
    ),
  ].sort((a, b) => a - b);

  if (normalized.length === 0) {
    let root = tones.root;
    while (root < lo) root += 12;
    while (root > hi) root -= 12;
    normalized.push(Math.max(lo, Math.min(hi, root)));
  }

  const u = seededUnit(seed, bar, partId, 0);
  if (partId === 'sq_violin_2' || partId === 'sq_viola') {
    const a = normalized[0]!;
    const b = normalized[normalized.length - 1] ?? a;
    const neighbor = u > 0.5 ? Math.min(hi, b + 2) : Math.max(lo, a - 1);
    return [a, neighbor, b];
  }
  if (partId === 'sq_cello' && normalized.length >= 2) {
    return [normalized[0]!, normalized[Math.min(1, normalized.length - 1)]!];
  }
  return normalized.slice(0, 2);
}

function fitPitchToPartRange(pitch: number, partId: string): number {
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  let out = pitch;
  while (out < lo) out += 12;
  while (out > hi) out -= 12;
  return Math.max(lo, Math.min(hi, out));
}

function buildJamesBrownStaticCelloBassEvents(
  chordSymbol: string,
  bar: number,
  seed: number,
): MeasureModel['events'] {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const rootPitch = fitPitchToPartRange(tones.root, 'sq_cello');

  // Push pitch: root or 5th only (no scalar/chromatic approaches in this pass).
  const u = seededUnit(seed, bar, 'sq_cello', 1);
  let pushRaw = tones.root;
  if (u < 0.55 && tones.root != null) pushRaw = tones.root;
  else if (tones.fifth != null) pushRaw = tones.fifth;
  const pushPitch = fitPitchToPartRange(pushRaw, 'sq_cello');

  // Optional and-of-4 (3.5): every 4th bar in the chart (bar % 4 === 0), gated by seed
  // so ~75% of those bars take the third stab — keeps most bars at two-hit density.
  const includeAndOf4 = bar % 4 === 0 && seededUnit(seed, bar, 'sq_cello', 2) < 0.75;

  const STAB = 0.5;
  const events: MeasureModel['events'] = [
    createNote(rootPitch, 0, STAB, 1),
    createNote(pushPitch, 2.5, STAB, 1),
  ];

  if (includeAndOf4) {
    const u2 = seededUnit(seed, bar, 'sq_cello', 3);
    let secondPushRaw = pushRaw;
    if (tones.fifth != null && tones.root != null) {
      secondPushRaw = u2 < 0.5 ? tones.fifth : tones.root;
      if (secondPushRaw === pushRaw) {
        secondPushRaw = pushRaw === tones.root ? tones.fifth : tones.root;
      }
    }
    events.push(createNote(fitPitchToPartRange(secondPushRaw, 'sq_cello'), 3.5, STAB, 1));
  }

  return events;
}

function buildMotionAccompanimentEvents(
  chordSymbol: string,
  partId: string,
  bar: number,
  seed: number,
): MeasureModel['events'] {
  const pitches = pickAccompanimentPitches(chordSymbol, partId, bar, seed);
  if (pitches.length === 0) return [];

  const events: MeasureModel['events'] = [];
  if (pitches.length >= 3) {
    events.push(createNote(pitches[0]!, 0, 1.5, 1));
    events.push(createNote(pitches[1]!, 1.5, 1, 1));
    events.push(createNote(pitches[2]!, 2.5, 1.5, 1));
  } else if (pitches.length === 2) {
    events.push(createNote(pitches[0]!, 0, 2, 1));
    events.push(createNote(pitches[1]!, 2, 2, 1));
  } else {
    events.push(createNote(pitches[0]!, 0, 2, 1));
    events.push(createNote(pitches[0]!, 2, 2, 1));
  }
  return events;
}

function enrichAccompanimentMotionForBar(
  score: ScoreModel,
  bar: number,
  ownerPartId: string,
  chordSymbol: string,
  seed: number,
  composerId?: string,
): boolean {
  let applied = false;
  for (const partId of STRING_PART_IDS) {
    if (partId === ownerPartId) continue;
    const part = score.parts.find((p) => p.id === partId);
    if (!part) continue;
    let measure = part.measures.find((m) => m.index === bar);
    if (!measure) {
      measure = { index: bar, events: [] };
      part.measures.push(measure);
    }
    const notes = measureNotes(measure);
    const needsMotion = notes.length === 0 || isStaticPadMeasure(measure);
    if (!needsMotion) continue;
    const motion =
      composerId === 'james_brown' && partId === 'sq_cello'
        ? buildJamesBrownStaticCelloBassEvents(chordSymbol, bar, seed)
        : buildMotionAccompanimentEvents(chordSymbol, partId, bar, seed);
    if (motion.length === 0) continue;
    replaceVoiceOneEvents(measure, motion);
    applied = true;
  }
  return applied;
}

function countRangeViolations(score: ScoreModel): number {
  let n = 0;
  for (const part of score.parts) {
    const [lo, hi] = getLeadSheetPartMidiBounds(part.id);
    for (const m of part.measures) {
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        if (e.pitch < lo || e.pitch > hi) n++;
      }
    }
  }
  return n;
}

function ownerMelodyMatchesImport(
  score: ScoreModel,
  ownerPartId: string,
  bar: number,
  barMelody: readonly ImportMelodyNote[],
): boolean {
  if (barMelody.length === 0) return true;
  const part = score.parts.find((p) => p.id === ownerPartId);
  const measure = part?.measures.find((m) => m.index === bar);
  const rendered = measureNotes(measure)
    .filter((e) => (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);
  if (rendered.length !== barMelody.length) return false;

  const importPcs = barMelody.map((n) => n.midiPitch % 12);
  const renderedPcs = rendered.map((n) => n.pitch % 12);
  for (let i = 0; i < importPcs.length; i++) {
    if (importPcs[i] !== renderedPcs[i]) return false;
  }
  return true;
}

function clampAllNotesToPartRanges(score: ScoreModel): void {
  for (const part of score.parts) {
    const [lo, hi] = getLeadSheetPartMidiBounds(part.id);
    for (const m of part.measures) {
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        if (e.pitch < lo) e.pitch += 12 * Math.ceil((lo - e.pitch) / 12);
        if (e.pitch > hi) e.pitch -= 12 * Math.ceil((e.pitch - hi) / 12);
        e.pitch = Math.max(lo, Math.min(hi, e.pitch));
      }
    }
  }
}

export function applyLeadSheetPhase7StringRealization(
  input: LeadSheetPhase7RealizationInput,
): LeadSheetPhase7RealizationResult {
  const seed = input.seed ?? 90107;
  const score = structuredClone(input.score) as ScoreModel;
  const totalBars = input.appliedHarmonyBars.length;
  const violationsBefore = countRangeViolations(score);

  const ownedBarMelodyMatch: LeadSheetPhase7Diagnostics['ownedBarMelodyMatch'] = [];
  const accompanimentBarsWithMotion: number[] = [];

  for (let bar = 1; bar <= totalBars; bar++) {
    const ownerPartId = ownerForBar(input.perBarMelodyOwnership, bar);
    const barMelody = melodyForBar(input.melody, bar);
    const chord = input.appliedHarmonyBars[bar - 1] ?? 'C';

    pinImportMelodyOnOwnerBar(score, ownerPartId, bar, barMelody);
    demoteNonOwnerVoiceOne(score, bar, ownerPartId);

    ownedBarMelodyMatch.push({
      bar,
      ownerPartId,
      matched: ownerMelodyMatchesImport(score, ownerPartId, bar, barMelody),
    });

    if (enrichAccompanimentMotionForBar(score, bar, ownerPartId, chord, seed, input.composerId)) {
      accompanimentBarsWithMotion.push(bar);
    }
  }

  clampAllNotesToPartRanges(score);
  const violationsAfter = countRangeViolations(score);

  return {
    score,
    diagnostics: {
      melodyOwnershipEnforced: ownedBarMelodyMatch.every((r) => r.matched),
      accompanimentMotionApplied: accompanimentBarsWithMotion.length > 0,
      rangeViolationsBefore: violationsBefore,
      rangeViolationsAfter: violationsAfter,
      ownedBarMelodyMatch,
      accompanimentBarsWithMotion,
    },
  };
}

export function dumpLeadSheetQuintetBarVoices(score: ScoreModel): Array<{
  bar: number;
  parts: Record<string, string>;
}> {
  const partIds = score.parts.map((p) => p.id);
  const bars = new Set<number>();
  for (const p of score.parts) {
    for (const m of p.measures) bars.add(m.index);
  }
  return [...bars].sort((a, b) => a - b).map((bar) => {
    const parts: Record<string, string> = {};
    for (const pid of partIds) {
      const part = score.parts.find((p) => p.id === pid);
      const m = part?.measures.find((x) => x.index === bar);
      parts[pid] =
        measureNotes(m)
          .map((e) => `${e.pitch}@${e.startBeat}x${e.duration}`)
          .join('|') || '-';
    }
    return { bar, parts };
  });
}

export function assertLeadSheetScoreInRange(score: ScoreModel): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const part of score.parts) {
    if (!isLeadSheetStringPartId(part.id) && part.id !== 'guitar') continue;
    const [lo, hi] = getLeadSheetPartMidiBounds(part.id);
    for (const m of part.measures) {
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        if (!pitchInPartRange(e.pitch, part.id)) {
          violations.push(`${part.id} bar ${m.index}: MIDI ${e.pitch} outside [${lo},${hi}]`);
        }
      }
    }
  }
  return { ok: violations.length === 0, violations };
}
