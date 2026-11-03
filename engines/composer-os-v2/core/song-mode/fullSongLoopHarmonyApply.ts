/**
 * Timed loop-harmony realization for duo melody/bass + export markers.
 *
 * Pitch selection ({@link selectMelodyPitchForTimedHarmony},
 * {@link selectBassPitchForTimedHarmony}) consults the expanded timeline at each
 * note onset. Intended to run inside duo generation *before* musical validation —
 * not as a post-golden-path rewrite from {@link generateFullSongMusicXml}.
 */

import {
  melodyAllowedPitchClassesForCanonical,
  type CanonicalChord,
} from '../../../core/canonicalChord';
import type { CompositionContext } from '../compositionContext';
import { noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import type { BarMeterMap, BarMeterSignature } from '../rhythm/barMeterTypes';
import type {
  ChordEvent,
  MeasureModel,
  NoteEvent,
  PartModel,
  RestEvent,
  ScoreEvent,
  ScoreModel,
} from '../score-model/scoreModelTypes';
import {
  lookupFullSongLoopHarmonyAt,
  quartersPerBarFromMeter,
  type FullSongLoopHarmonyEvent,
} from './fullSongLoopHarmony';
import { getTimedLoopHarmonyAuthority } from './timedLoopHarmonyOnset';

const EPS = 1e-9;

function measureSpanQuarters(measure: MeasureModel, fallback: number): number {
  return measure.measureBeatSpanQuarters ?? fallback;
}

function snapMidiToPitchClasses(midi: number, absolutePcs: number[]): number {
  if (absolutePcs.length === 0) return midi;
  const pc = ((midi % 12) + 12) % 12;
  let bestPc = absolutePcs[0]!;
  let bestDist = 99;
  for (const cand of absolutePcs) {
    const d = Math.min((cand - pc + 12) % 12, (pc - cand + 12) % 12);
    if (d < bestDist) {
      bestDist = d;
      bestPc = cand;
    }
  }
  const base = midi - pc;
  const up = base + bestPc;
  const down = up - 12;
  return Math.abs(up - midi) <= Math.abs(down - midi) ? up : down;
}

function absolutePcsForChord(chord: CanonicalChord): number[] {
  const rootPc = noteNameToPitchClass(chord.root);
  if (rootPc === undefined) return [];
  return melodyAllowedPitchClassesForCanonical(chord).map((d) => (rootPc + d) % 12);
}

function isChromaticNeighborOfChordTone(midi: number, absolutePcs: number[]): boolean {
  const pc = ((midi % 12) + 12) % 12;
  for (const cpc of absolutePcs) {
    const d = Math.min((cpc - pc + 12) % 12, (pc - cpc + 12) % 12);
    if (d === 1) return true;
  }
  return false;
}

/** Weak subdivision (not integer beat) may keep a chromatic approach / neighbour. */
function isWeakSubdivision(localBeatQuarters: number): boolean {
  const frac = Math.abs(localBeatQuarters - Math.round(localBeatQuarters));
  return frac > 0.05;
}

/**
 * Melody pitch selection at a timeline onset — keeps chord tones and contextually
 * supported passing/neighbour tones; otherwise snaps to nearest chord-tone PC.
 */
export function selectMelodyPitchForTimedHarmony(
  chord: CanonicalChord,
  proposedMidi: number,
  localBeatQuarters: number
): number {
  const pcs = absolutePcsForChord(chord);
  if (pcs.length === 0) return proposedMidi;
  const pc = ((proposedMidi % 12) + 12) % 12;
  if (pcs.includes(pc)) return proposedMidi;
  if (isWeakSubdivision(localBeatQuarters) && isChromaticNeighborOfChordTone(proposedMidi, pcs)) {
    return proposedMidi;
  }
  return snapMidiToPitchClasses(proposedMidi, pcs);
}

/** Bass pitch selection — prefers slash bass PC, else root, nearest register to proposal. */
export function selectBassPitchForTimedHarmony(chord: CanonicalChord, proposedMidi: number): number {
  const bassName = chord.bass ?? chord.root;
  const pc = noteNameToPitchClass(bassName);
  if (pc === undefined) return proposedMidi;
  const lo = 28;
  const hi = 55;
  let best = proposedMidi;
  let bd = 999;
  for (let oct = 1; oct <= 4; oct++) {
    const m = 12 * oct + pc;
    if (m < lo || m > hi) continue;
    const d = Math.abs(m - proposedMidi);
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

/** Scaffold one symbol per bar for custom_locked wire (first overlapping chord; else hold). */
export function projectLoopHarmonyTimelineToBarSymbols(
  timeline: readonly FullSongLoopHarmonyEvent[],
  meter: BarMeterSignature,
  totalBars: number
): string[] {
  const qpb = quartersPerBarFromMeter(meter);
  const sorted = [...timeline].sort((a, b) => a.onsetQuarters - b.onsetQuarters);
  const out: string[] = [];
  let hold = 'Cmaj7';
  for (let b = 0; b < totalBars; b++) {
    const start = b * qpb;
    const end = start + qpb;
    let found: string | null = null;
    for (const ev of sorted) {
      const evEnd = ev.onsetQuarters + ev.durationQuarters;
      if (evEnd <= start + EPS || ev.onsetQuarters >= end - EPS) continue;
      if (ev.kind === 'chord') {
        found = ev.chord.text;
        hold = found;
        break;
      }
    }
    out.push(found ?? hold);
  }
  return out;
}

/** Uniform barMeterMap so duo measures match loop metre quarters. */
export function uniformBarMeterMap(meter: BarMeterSignature, totalBars: number): BarMeterMap {
  const out: BarMeterMap = {};
  const numerator = Math.round(meter.numerator);
  const denominator = Math.round(meter.denominator);
  for (let b = 1; b <= totalBars; b++) {
    out[b] = { numerator, denominator };
  }
  return out;
}

type SpanSeg = {
  startAbs: number;
  endAbs: number;
  event: FullSongLoopHarmonyEvent;
};

function segmentsCoveringSpan(
  timeline: readonly FullSongLoopHarmonyEvent[],
  startAbs: number,
  endAbs: number
): SpanSeg[] {
  if (endAbs <= startAbs + EPS) return [];
  const sorted = [...timeline].sort((a, b) => a.onsetQuarters - b.onsetQuarters);
  const out: SpanSeg[] = [];
  for (const ev of sorted) {
    const evStart = ev.onsetQuarters;
    const evEnd = ev.onsetQuarters + ev.durationQuarters;
    const lo = Math.max(startAbs, evStart);
    const hi = Math.min(endAbs, evEnd);
    if (hi > lo + EPS) {
      out.push({ startAbs: lo, endAbs: hi, event: ev });
    }
  }
  return out;
}

function realizePartAgainstTimeline(
  part: PartModel,
  timeline: readonly FullSongLoopHarmonyEvent[],
  songLengthQuarters: number,
  qpb: number,
  role: 'melody' | 'bass'
): void {
  for (const measure of part.measures) {
    const barStart = (measure.index - 1) * qpb;
    const span = measureSpanQuarters(measure, qpb);
    const barEnd = Math.min(barStart + span, songLengthQuarters);
    const nextEvents: ScoreEvent[] = [];

    for (const ev of measure.events) {
      if (ev.kind === 'chord' && (ev as ChordEvent).pitches.length === 0) continue;
      if (ev.kind !== 'note' && ev.kind !== 'chord') {
        nextEvents.push(ev);
        continue;
      }

      const localStart = ev.startBeat;
      const localEnd = ev.startBeat + ev.duration;
      const absStart = barStart + localStart;
      const absEnd = Math.min(barStart + localEnd, barEnd);
      if (absEnd <= absStart + EPS) continue;

      const preferMidi =
        ev.kind === 'note'
          ? ev.pitch
          : [...ev.pitches].sort((a, b) => (role === 'bass' ? a - b : b - a))[0] ?? 60;
      const voice = typeof ev.voice === 'number' ? ev.voice : 1;
      const motifRef = 'motifRef' in ev ? ev.motifRef : undefined;

      const segs = segmentsCoveringSpan(timeline, absStart, absEnd);
      if (segs.length === 0) {
        nextEvents.push({
          kind: 'rest',
          startBeat: localStart,
          duration: localEnd - localStart,
          voice,
        } satisfies RestEvent);
        continue;
      }

      for (const seg of segs) {
        const segLocalStart = seg.startAbs - barStart;
        const segLocalDur = seg.endAbs - seg.startAbs;
        if (segLocalDur <= EPS) continue;
        if (seg.event.kind === 'rest') {
          nextEvents.push({
            kind: 'rest',
            startBeat: segLocalStart,
            duration: segLocalDur,
            voice,
          } satisfies RestEvent);
          continue;
        }
        const pitch =
          role === 'bass'
            ? selectBassPitchForTimedHarmony(seg.event.chord, preferMidi)
            : selectMelodyPitchForTimedHarmony(seg.event.chord, preferMidi, segLocalStart);
        nextEvents.push({
          kind: 'note',
          pitch,
          startBeat: segLocalStart,
          duration: segLocalDur,
          voice,
          ...(motifRef ? { motifRef } : {}),
        } satisfies NoteEvent);
      }
    }

    measure.events = nextEvents.sort((a, b) => a.startBeat - b.startBeat);
  }
}

function stampExportedHarmonyFromTimeline(
  guitar: PartModel,
  timeline: readonly FullSongLoopHarmonyEvent[],
  songLengthQuarters: number,
  qpb: number
): void {
  for (const measure of guitar.measures) {
    const barStart = (measure.index - 1) * qpb;
    const span = measureSpanQuarters(measure, qpb);
    const barEnd = Math.min(barStart + span, songLengthQuarters);

    measure.events = measure.events.filter(
      (e) => !(e.kind === 'chord' && (e as ChordEvent).pitches.length === 0)
    );

    const markers: ChordEvent[] = [];
    /** First sounding chord in bar — matches bar scaffold / LOCK wire even when bar opens with rest. */
    let firstSounding: string | undefined;
    for (const ev of timeline) {
      if (ev.kind !== 'chord') continue;
      const evEnd = ev.onsetQuarters + ev.durationQuarters;
      if (evEnd <= barStart + EPS || ev.onsetQuarters >= barEnd - EPS) continue;
      firstSounding = ev.chord.text;
      break;
    }
    measure.chord = firstSounding;
    measure.chordSymbol = firstSounding;

    /**
     * Zero-width empty-pitch markers for MusicXML &lt;harmony&gt; only — not rhythmic
     * voice atoms. Bar-math ignores them via isExportHarmonyMarker (strictBarMath).
     */
    const atBar = lookupFullSongLoopHarmonyAt(timeline, barStart, songLengthQuarters);
    if (atBar.ok && atBar.hit.event.kind === 'chord') {
      markers.push({
        kind: 'chord',
        pitches: [],
        startBeat: 0,
        duration: 0,
        voice: 1,
        chordSymbol: atBar.hit.event.chord.text,
      });
    }

    for (const ev of timeline) {
      if (ev.kind !== 'chord') continue;
      if (ev.onsetQuarters <= barStart + EPS) continue;
      if (ev.onsetQuarters >= barEnd - EPS) continue;
      const local = ev.onsetQuarters - barStart;
      markers.push({
        kind: 'chord',
        pitches: [],
        startBeat: local,
        duration: 0,
        voice: 1,
        chordSymbol: ev.chord.text,
      });
    }

    measure.events = [...markers, ...measure.events].sort((a, b) => a.startBeat - b.startBeat);
  }
}

/**
 * Export / LOCK bookkeeping only — no pitch rewrite.
 * Pitch/rest/boundary construction happens at addEvent via duoTimedHarmonyConstruct.
 */
export function stampTimedLoopHarmonyExportMarkers(
  score: ScoreModel,
  context: CompositionContext
): ScoreModel {
  const state = getTimedLoopHarmonyAuthority(context);
  if (!state) {
    throw new Error(
      'stampTimedLoopHarmonyExportMarkers: timedLoopHarmony missing on context (generation-time support incomplete)'
    );
  }
  const { timeline, meter, songLengthQuarters } = state;
  if (!timeline.length) {
    throw new Error('stampTimedLoopHarmonyExportMarkers: empty timeline');
  }
  const qpb = quartersPerBarFromMeter(meter);
  const out = structuredClone(score);
  const guitar = out.parts.find(
    (p) => p.instrumentIdentity === 'clean_electric_guitar' || p.id === 'guitar'
  );
  if (!guitar) {
    throw new Error('stampTimedLoopHarmonyExportMarkers: guitar part required');
  }
  stampExportedHarmonyFromTimeline(guitar, timeline, songLengthQuarters, qpb);
  return out;
}

/** @deprecated Pitch rewrite removed — use construction-time addEvent + {@link stampTimedLoopHarmonyExportMarkers}. */
export function realizeTimedLoopHarmonyAuthority(
  score: ScoreModel,
  context: CompositionContext
): ScoreModel {
  return stampTimedLoopHarmonyExportMarkers(score, context);
}
