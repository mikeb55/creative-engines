/**
 * SD3 Drum Guide — MIDI + sidecar JSON (wired from app export paths after MusicXML write).
 */

import * as fs from 'fs';
import * as path from 'path';
import MidiWriter from 'midi-writer-js';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import {
  COMPOSER_METER_PRESET_MAP,
  measureDivisionsForMeter,
  resolveMeasureBeatSpanQuarters,
  resolveMeterForBar,
  type ZappaMeterCyclePresetDefinition,
} from '../rhythm/oddMeterQuantiser';
import type { ChordEvent, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';

/** Sidecar JSON next to `baseName_drum_guide.mid` (version 1). */
export interface DrumGuideSidecarV1 {
  version: 1;
  ppq: number;
  bpm: number;
  totalBars: number;
  bars: Array<{
    bar: number;
    numerator: number;
    denominator: number;
    beatGrouping: number[];
    kickTicks: number[];
    snareTicks: number[];
  }>;
}

/** Pulses per quarter note (same grid as MusicXML divisions). */
export const PPQ = 480;

/** GM drum map — Bass drum 1 (channel 10). */
export const KICK_MIDI = 36;

/** GM drum map — Acoustic snare (channel 10). */
export const SNARE_MIDI = 38;

/** GM percussion channel (1-based for midi-writer-js). */
const DRUM_MIDI_CHANNEL = 10;

export interface DrumGuideBar {
  barIndex: number;
  meterNumerator: number;
  meterDenominator: number;
  /** Beat subdivision weights (same units as notated numerator; sum equals numerator). */
  beatGrouping: number[];
  /** Onset offsets from bar start, in PPQ ticks (0 .. bar length − 1). */
  kickTicks: number[];
  snareTicks: number[];
}

export interface DrumGuideOptions {
  bpm: number;
  bars: DrumGuideBar[];
  outputPath: string;
}

function allComposerMeterPresetDefinitions(): ZappaMeterCyclePresetDefinition[] {
  const out: ZappaMeterCyclePresetDefinition[] = [];
  const keys = Object.keys(COMPOSER_METER_PRESET_MAP) as (keyof typeof COMPOSER_METER_PRESET_MAP)[];
  for (const k of keys) {
    out.push(...COMPOSER_METER_PRESET_MAP[k]);
  }
  return out;
}

function groupingSum(grouping: number[]): number {
  return grouping.reduce((a, b) => a + b, 0);
}

function equalBeatGrouping(numerator: number): number[] {
  return Array.from({ length: numerator }, () => 1);
}

/** Match COMPOSER_METER_PRESET_MAP entries by meter signature; prefer explicit beatGrouping when present. */
function resolveBeatGroupingFromPresets(
  numerator: number,
  denominator: number,
  fallback: number[]
): number[] {
  for (const def of allComposerMeterPresetDefinitions()) {
    const matchSig = def.cycle.some((s) => s.numerator === numerator && s.denominator === denominator);
    if (!matchSig) continue;
    if (def.beatGrouping && def.beatGrouping.length > 0) {
      const g = [...def.beatGrouping];
      if (groupingSum(g) === numerator) return g;
    }
  }
  return fallback;
}

function normalizeGroupingOrFallback(numerator: number, grouping: number[]): number[] {
  if (grouping.length > 0 && groupingSum(grouping) === numerator) return grouping;
  return equalBeatGrouping(numerator);
}

function groupStartTicksWithinBar(barLenTicks: number, grouping: number[]): number[] {
  const sum = groupingSum(grouping);
  if (sum <= 0) return [0];
  const starts: number[] = [];
  let cum = 0;
  for (const g of grouping) {
    starts.push(Math.round((cum / sum) * barLenTicks));
    cum += g;
  }
  return starts;
}

/** Map desired MIDI velocity (0–127) to midi-writer-js scalar (1–100). */
function writerVelocityFromMidi(midi127: number): number {
  const clamped = Math.max(1, Math.min(127, Math.round(midi127)));
  return Math.max(1, Math.min(100, Math.round((clamped / 127) * 100)));
}

/**
 * Builds a single bar drum-guide payload: kicks on each beat-group downbeat; snare on 2nd group,
 * 4th group when present, else middle group for odd-length patterns.
 */
export function buildDrumGuideBar(
  barIndex: number,
  meterMap?: BarMeterMap,
  defaultGrouping?: number[]
): DrumGuideBar {
  const sig = resolveMeterForBar(barIndex, meterMap);
  const barLenTicks = measureDivisionsForMeter(sig.numerator, sig.denominator);
  const equal = equalBeatGrouping(sig.numerator);
  let grouping =
    defaultGrouping && defaultGrouping.length > 0
      ? normalizeGroupingOrFallback(sig.numerator, defaultGrouping)
      : resolveBeatGroupingFromPresets(sig.numerator, sig.denominator, equal);
  grouping = normalizeGroupingOrFallback(sig.numerator, grouping);

  const starts = groupStartTicksWithinBar(barLenTicks, grouping);
  const kickTicks: number[] = [...starts];

  const snareCand: number[] = [];
  if (starts.length >= 2) snareCand.push(starts[1]!);
  if (starts.length >= 4) {
    snareCand.push(starts[3]!);
  } else if (starts.length % 2 === 1 && starts.length >= 3) {
    const mid = Math.floor(starts.length / 2);
    if (mid !== 1) snareCand.push(starts[mid]!);
  }
  const snareTicks = [...new Set(snareCand)].sort((a, b) => a - b);

  return {
    barIndex,
    meterNumerator: sig.numerator,
    meterDenominator: sig.denominator,
    beatGrouping: grouping,
    kickTicks,
    snareTicks,
  };
}

function tempoMetaBytes(bpm: number): number[] {
  const usPerQuarter = Math.round(60_000_000 / Math.max(1, bpm));
  return [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff];
}

function timeSigMetaBytes(numerator: number, denominator: number): number[] {
  const denPow = Math.round(Math.log2(denominator));
  return [0xff, 0x58, 0x04, numerator & 0xff, denPow & 0xff, 24, 8];
}

/** Ordered meta events with absolute ticks (tempo + one time signature per bar start). */
function buildConductorTrackBytes(bpm: number, bars: DrumGuideBar[]): number[] {
  const utils = MidiWriter.Utils;
  type Queued = { t: number; order: number; bytes: number[] };
  const q: Queued[] = [];
  q.push({ t: 0, order: 0, bytes: tempoMetaBytes(bpm) });
  let cumTick = 0;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    q.push({
      t: cumTick,
      order: i + 1,
      bytes: timeSigMetaBytes(bar.meterNumerator, bar.meterDenominator),
    });
    cumTick += measureDivisionsForMeter(bar.meterNumerator, bar.meterDenominator);
  }
  q.sort((a, b) => a.t - b.t || a.order - b.order);

  const out: number[] = [];
  let prevTick = 0;
  for (const ev of q) {
    const delta = ev.t - prevTick;
    prevTick = ev.t;
    out.push(...utils.numberToVariableLength(delta), ...ev.bytes);
  }
  out.push(0x00, 0xff, 0x2f, 0x00);
  return out;
}

function createPrebuiltTrack(rawData: number[]): InstanceType<typeof MidiWriter.Track> {
  const track = new MidiWriter.Track();
  track.buildData = function (options?: { ticksPerBeat?: number }) {
    this.data = rawData;
    this.size = MidiWriter.Utils.numberToBytes(this.data.length, 4);
    this.type = MidiWriter.Constants.TRACK_CHUNK_TYPE;
    return this;
  };
  return track;
}

function addDrumHits(
  track: InstanceType<typeof MidiWriter.Track>,
  drumPitch: number,
  absoluteTicks: number[],
  velocitiesMidi127: number[]
): void {
  for (let i = 0; i < absoluteTicks.length; i++) {
    const tick = absoluteTicks[i]!;
    const velMidi = velocitiesMidi127[i] ?? velocitiesMidi127[velocitiesMidi127.length - 1] ?? 100;
    track.addEvent(
      new MidiWriter.NoteEvent({
        pitch: drumPitch,
        startTick: tick,
        duration: 't120',
        channel: DRUM_MIDI_CHANNEL,
        velocity: writerVelocityFromMidi(velMidi),
      })
    );
  }
}

function cumulativeBarOffsets(bars: DrumGuideBar[]): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const b of bars) {
    starts.push(acc);
    acc += measureDivisionsForMeter(b.meterNumerator, b.meterDenominator);
  }
  return starts;
}

function kickVelocitiesForBar(bar: DrumGuideBar): number[] {
  const barLen = measureDivisionsForMeter(bar.meterNumerator, bar.meterDenominator);
  const starts = groupStartTicksWithinBar(barLen, bar.beatGrouping);
  return bar.kickTicks.map((kt) => {
    const groupIdx = starts.indexOf(kt);
    return groupIdx === 0 ? 110 : 90;
  });
}

function snareVelocities(snareCount: number, barIndex: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < snareCount; i++) {
    out.push(barIndex % 2 === 0 ? 95 : 105);
  }
  return out;
}

/**
 * Writes a Type-1 SMF with conductor meta (track 0), kick (track 1), snare (track 2); drums on channel 10.
 */
export function writeDrumGuideMidi(options: DrumGuideOptions): void {
  const ticksPerBeat = PPQ;
  const { bpm, bars, outputPath } = options;
  if (!bars.length) {
    throw new Error('writeDrumGuideMidi: bars array is empty');
  }

  const metaRaw = buildConductorTrackBytes(bpm, bars);
  const metaTrack = createPrebuiltTrack(metaRaw);

  const barStarts = cumulativeBarOffsets(bars);
  const kickAbs: number[] = [];
  const kickVel: number[] = [];
  const snareAbs: number[] = [];
  const snareVel: number[] = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const base = barStarts[i] ?? 0;
    const kVel = kickVelocitiesForBar(bar);
    bar.kickTicks.forEach((t, j) => {
      kickAbs.push(base + t);
      kickVel.push(kVel[j] ?? 90);
    });
    const sVel = snareVelocities(bar.snareTicks.length, bar.barIndex);
    bar.snareTicks.forEach((t, j) => {
      snareAbs.push(base + t);
      snareVel.push(sVel[j] ?? 100);
    });
  }

  const kickTrack = new MidiWriter.Track();
  addDrumHits(kickTrack, KICK_MIDI, kickAbs, kickVel);

  const snareTrack = new MidiWriter.Track();
  addDrumHits(snareTrack, SNARE_MIDI, snareAbs, snareVel);

  const writer = new MidiWriter.Writer([metaTrack, kickTrack, snareTrack], { ticksPerBeat });
  fs.writeFileSync(outputPath, Buffer.from(writer.buildFile()));
}

function hasScoreBars(score: ScoreModel): boolean {
  if (!score.parts?.length) return false;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.index >= 1) return true;
    }
  }
  return false;
}

function buildDrumGuideSidecar(bpm: number, rows: DrumGuideBar[]): DrumGuideSidecarV1 {
  return {
    version: 1,
    ppq: PPQ,
    bpm: Math.round(bpm),
    totalBars: rows.length,
    bars: rows.map((r) => ({
      bar: r.barIndex,
      numerator: r.meterNumerator,
      denominator: r.meterDenominator,
      beatGrouping: [...r.beatGrouping],
      kickTicks: [...r.kickTicks],
      snareTicks: [...r.snareTicks],
    })),
  };
}

/**
 * Writes `baseName_drum_guide.mid` and `baseName_drum_guide.json` under `outputDir`.
 * No-op when the score has no measures. `bpmOverride` (e.g. request BPM) wins over `score.tempo`.
 */
export function writeDrumGuide(
  score: ScoreModel,
  outputDir: string,
  baseName: string,
  barMeterMap?: BarMeterMap,
  bpmOverride?: number
): void {
  if (!hasScoreBars(score)) return;
  const bars = reduceToBeatOnsets(score, barMeterMap);
  if (bars.length === 0) return;
  const bpm = bpmOverride ?? score.tempo ?? 120;
  const midPath = path.join(outputDir, `${baseName}_drum_guide.mid`);
  const jsonPath = path.join(outputDir, `${baseName}_drum_guide.json`);
  writeDrumGuideMidi({ bpm, bars, outputPath: midPath });
  const sidecar = buildDrumGuideSidecar(bpm, bars);
  fs.writeFileSync(jsonPath, JSON.stringify(sidecar, null, 0), 'utf-8');
}

function isNoteLike(e: ScoreEvent): e is NoteEvent | ChordEvent {
  return e.kind === 'note' || e.kind === 'chord';
}

function eventStartBeatQuarters(e: ScoreEvent): number | undefined {
  if (e.kind === 'note' || e.kind === 'chord' || e.kind === 'rest') {
    return e.startBeat;
  }
  return undefined;
}

function minimumNoteLikeOnsetInRange(events: ScoreEvent[], lo: number, hi: number): number | undefined {
  let min: number | undefined;
  for (const e of events) {
    if (!isNoteLike(e)) continue;
    const sb = eventStartBeatQuarters(e);
    if (sb === undefined) continue;
    if (sb >= lo && sb < hi) {
      if (min === undefined || sb < min) min = sb;
    }
  }
  return min;
}

function segmentBoundsQuarters(spanQuarters: number, grouping: number[]): { lo: number; hi: number }[] {
  const sum = groupingSum(grouping);
  if (sum <= 0) return [{ lo: 0, hi: spanQuarters }];
  const bounds: { lo: number; hi: number }[] = [];
  let cum = 0;
  for (const g of grouping) {
    const lo = (cum / sum) * spanQuarters;
    cum += g;
    const hi = (cum / sum) * spanQuarters;
    bounds.push({ lo, hi });
  }
  return bounds;
}

function scoreTotalBars(score: ScoreModel): number {
  let max = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.index > max) max = m.index;
    }
  }
  return max;
}

function collectScoreEventsForBar(score: ScoreModel, barIndex: number): ScoreEvent[] {
  const out: ScoreEvent[] = [];
  for (const p of score.parts) {
    const m = p.measures.find((mm) => mm.index === barIndex);
    if (m) out.push(...m.events);
  }
  return out;
}

/**
 * Derives {@link DrumGuideBar} rows from the score: first note-like onset per beat group (all parts),
 * mapped to tick offsets; preserves meter + grouping from {@link buildDrumGuideBar}.
 */
export function reduceToBeatOnsets(score: ScoreModel, barMeterMap?: BarMeterMap): DrumGuideBar[] {
  const tb = scoreTotalBars(score);
  const out: DrumGuideBar[] = [];
  for (let bar = 1; bar <= tb; bar++) {
    const base = buildDrumGuideBar(bar, barMeterMap);
    const spanQ = resolveMeasureBeatSpanQuarters(bar, barMeterMap);
    const bounds = segmentBoundsQuarters(spanQ, base.beatGrouping);
    const events = collectScoreEventsForBar(score, bar);

    const kickTicks: number[] = [];
    for (const seg of bounds) {
      const onsetQ = minimumNoteLikeOnsetInRange(events, seg.lo, seg.hi);
      const q = onsetQ !== undefined ? onsetQ : seg.lo;
      kickTicks.push(Math.max(0, Math.min(measureDivisionsForMeter(base.meterNumerator, base.meterDenominator) - 1, Math.round(q * PPQ))));
    }

    const snareTicks: number[] = [];
    const pushSnareForSegment = (idx: number) => {
      if (idx < 0 || idx >= bounds.length) return;
      const seg = bounds[idx]!;
      const onsetQ = minimumNoteLikeOnsetInRange(events, seg.lo, seg.hi);
      const q = onsetQ !== undefined ? onsetQ : seg.lo;
      snareTicks.push(
        Math.max(
          0,
          Math.min(
            measureDivisionsForMeter(base.meterNumerator, base.meterDenominator) - 1,
            Math.round(q * PPQ)
          )
        )
      );
    };
    if (bounds.length >= 2) pushSnareForSegment(1);
    if (bounds.length >= 4) {
      pushSnareForSegment(3);
    } else if (bounds.length % 2 === 1 && bounds.length >= 3) {
      const mid = Math.floor(bounds.length / 2);
      if (mid !== 1) pushSnareForSegment(mid);
    }

    const dedupedSnare = [...new Set(snareTicks)].sort((a, b) => a - b);

    out.push({
      ...base,
      kickTicks,
      snareTicks: dedupedSnare,
    });
  }
  return out;
}
