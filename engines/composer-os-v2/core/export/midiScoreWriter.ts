/**
 * Full-score MIDI export (Type-1 SMF): conductor meta + one melodic track per {@link PartModel}.
 * Uses same PPQ / tempo / meter sequencing patterns as {@link midiDrumGuideWriter}.
 */

import * as fs from 'fs';
import * as path from 'path';
import MidiWriter from 'midi-writer-js';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import {
  measureDivisionsForMeter,
  resolveMeasureDivisionsForBar,
  resolveMeterForBar,
} from '../rhythm/oddMeterQuantiser';
import type { ChordEvent, MeasureModel, NoteEvent, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { DIVISIONS } from '../score-model/scoreModelTypes';
import { GROOVE_DRUMS_INSTRUMENT_IDENTITY, GROOVE_DRUMS_PART_ID } from '../groove-scaffold/grooveScaffold';

/** Pulses per quarter (aligned with MusicXML divisions / drum guide). */
export const SCORE_MIDI_PPQ = DIVISIONS;

function tempoMetaBytes(bpm: number): number[] {
  const usPerQuarter = Math.round(60_000_000 / Math.max(1, bpm));
  return [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff];
}

function timeSigMetaBytes(numerator: number, denominator: number): number[] {
  const denPow = Math.round(Math.log2(denominator));
  return [0xff, 0x58, 0x04, numerator & 0xff, denPow & 0xff, 24, 8];
}

/** Map MIDI velocity 1–127 to midi-writer-js 1–100. */
function writerVelocityFromMidi(midi127: number): number {
  const clamped = Math.max(1, Math.min(127, Math.round(midi127)));
  return Math.max(1, Math.min(100, Math.round((clamped / 127) * 100)));
}

function createPrebuiltTrack(rawData: number[]): InstanceType<typeof MidiWriter.Track> {
  const track = new MidiWriter.Track();
  track.buildData = function buildData(options?: { ticksPerBeat?: number }) {
    this.data = rawData;
    this.size = MidiWriter.Utils.numberToBytes(this.data.length, 4);
    this.type = MidiWriter.Constants.TRACK_CHUNK_TYPE;
    return this;
  };
  return track;
}

/** Ordered meta events with absolute ticks (tempo + one time signature per bar start). */
function buildConductorTrackBytes(bpm: number, totalBars: number, barMeterMap?: BarMeterMap): number[] {
  const utils = MidiWriter.Utils;
  type Queued = { t: number; order: number; bytes: number[] };
  const q: Queued[] = [];
  q.push({ t: 0, order: 0, bytes: tempoMetaBytes(bpm) });
  let cumTick = 0;
  for (let i = 0; i < totalBars; i++) {
    const barNum = i + 1;
    const sig = resolveMeterForBar(barNum, barMeterMap);
    q.push({
      t: cumTick,
      order: i + 1,
      bytes: timeSigMetaBytes(sig.numerator, sig.denominator),
    });
    cumTick += measureDivisionsForMeter(sig.numerator, sig.denominator);
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

function scoreTotalBars(score: ScoreModel): number {
  let max = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.index > max) max = m.index;
    }
  }
  return max;
}

function findMeasureForBar(part: PartModel, bar1Based: number): MeasureModel | undefined {
  return part.measures.find((mm) => mm.index === bar1Based);
}

/** Prefer explicit measure span when any part carries it; else fall back to meter map / 4/4. */
function measureLengthTicks(
  bar1Based: number,
  score: ScoreModel,
  barMeterMap: BarMeterMap | undefined
): number {
  for (const p of score.parts) {
    const m = findMeasureForBar(p, bar1Based);
    if (m?.measureBeatSpanQuarters != null && Number.isFinite(m.measureBeatSpanQuarters)) {
      return Math.round(m.measureBeatSpanQuarters * SCORE_MIDI_PPQ);
    }
  }
  const map = barMeterMap ?? score.barMeterMap;
  return resolveMeasureDivisionsForBar(bar1Based, map);
}

function cumulativeBarOffsets(score: ScoreModel, totalBars: number, barMeterMap: BarMeterMap | undefined): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (let b = 1; b <= totalBars; b++) {
    starts.push(acc);
    acc += measureLengthTicks(b, score, barMeterMap);
  }
  return starts;
}

function isNoteLike(e: ScoreEvent): e is NoteEvent | ChordEvent {
  return e.kind === 'note' || e.kind === 'chord';
}

function pitchesFromNoteLike(e: NoteEvent | ChordEvent): number[] {
  if (e.kind === 'chord') {
    return [...new Set(e.pitches.map((p) => Math.round(p)).filter((p) => p >= 0 && p <= 127))].sort(
      (a, b) => a - b
    );
  }
  const raw = [e.pitch, ...(e.pitches ?? [])];
  return [...new Set(raw.map((p) => Math.round(p)).filter((p) => p >= 0 && p <= 127))].sort((a, b) => a - b);
}

/** MIDI channels 1–16 melodic; skip 10 (GM drums). */
function melodicChannelForPartIndex(partIndex: number): number {
  let ch = (partIndex % 15) + 1;
  if (ch >= 10) ch++;
  return ch;
}

function midiChannelForPart(part: PartModel, partIndex: number): number {
  if (part.id === GROOVE_DRUMS_PART_ID || part.instrumentIdentity === GROOVE_DRUMS_INSTRUMENT_IDENTITY) return 10;
  return melodicChannelForPartIndex(partIndex);
}

function hasRenderableNotes(score: ScoreModel): boolean {
  if (!score.parts?.length) return false;
  for (const p of score.parts) {
    for (const m of p.measures) {
      for (const e of m.events) {
        if (isNoteLike(e) && pitchesFromNoteLike(e).length > 0) return true;
      }
    }
  }
  return false;
}

export interface WriteScoreMidiOptions {
  /** Overrides {@link ScoreModel.tempo} when set. */
  bpm?: number;
  /** Overrides {@link ScoreModel.barMeterMap} when resolving meters (same as MusicXML export). */
  barMeterMap?: BarMeterMap;
}

/**
 * Writes a Type-1 SMF to `outputPath` (conductor + one track per part).
 * @returns true when a non-empty file was written.
 */
export function writeScoreModelMidiFile(score: ScoreModel, outputPath: string, options?: WriteScoreMidiOptions): boolean {
  const totalBars = scoreTotalBars(score);
  if (totalBars < 1 || !hasRenderableNotes(score)) {
    return false;
  }

  const barMeterMap = options?.barMeterMap ?? score.barMeterMap;
  const bpm = options?.bpm ?? score.tempo ?? 120;

  const metaRaw = buildConductorTrackBytes(bpm, totalBars, barMeterMap);
  const metaTrack = createPrebuiltTrack(metaRaw);

  const barStarts = cumulativeBarOffsets(score, totalBars, barMeterMap);

  const tracks: InstanceType<typeof MidiWriter.Track>[] = [metaTrack];

  score.parts.forEach((part, pi) => {
    const channel = midiChannelForPart(part, pi);
    const prog = Math.max(0, Math.min(127, Math.round(part.midiProgram)));

    const track = new MidiWriter.Track();
    if (channel !== 10) {
      track.addEvent(
        new MidiWriter.ProgramChangeEvent({
          instrument: prog,
          channel,
        })
      );
    }
    const label = (part.name || part.id || `part_${pi}`).slice(0, 128);
    track.addEvent(new MidiWriter.TrackNameEvent({ text: label }));

    for (let bar = 1; bar <= totalBars; bar++) {
      const meas = findMeasureForBar(part, bar);
      const baseTick = barStarts[bar - 1] ?? 0;
      if (!meas) continue;

      for (const ev of meas.events) {
        if (!isNoteLike(ev)) continue;
        const pitches = pitchesFromNoteLike(ev);
        if (pitches.length === 0) continue;

        const startBeat = ev.startBeat;
        const durationBeats = ev.duration;
        if (!Number.isFinite(startBeat) || !Number.isFinite(durationBeats)) continue;

        const startTick = baseTick + Math.round(startBeat * SCORE_MIDI_PPQ);
        let durTicks = Math.round(durationBeats * SCORE_MIDI_PPQ);
        if (durTicks < 1) durTicks = 1;

        const velRaw =
          ev.kind === 'note' && ev.velocity != null && Number.isFinite(ev.velocity)
            ? ev.velocity
            : 90;
        const velocity = writerVelocityFromMidi(velRaw);

        const durStr = `t${durTicks}`;
        for (const pitch of pitches) {
          track.addEvent(
            new MidiWriter.NoteEvent({
              pitch,
              startTick,
              duration: durStr,
              channel,
              velocity,
            })
          );
        }
      }
    }

    tracks.push(track);
  });

  const writer = new MidiWriter.Writer(tracks, { ticksPerBeat: SCORE_MIDI_PPQ });
  fs.writeFileSync(outputPath, Buffer.from(writer.buildFile()));
  return true;
}

/**
 * Writes `<baseName>.mid` under `outputDir` next to the MusicXML export.
 * @returns absolute `.mid` path when written, otherwise `undefined`.
 */
export function writeScoreMidi(
  score: ScoreModel,
  outputDir: string,
  baseName: string,
  barMeterMap?: BarMeterMap,
  bpmOverride?: number
): string | undefined {
  const safeBase = baseName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'score';
  const midPath = path.join(outputDir, `${safeBase}.mid`);
  const ok = writeScoreModelMidiFile(score, midPath, { barMeterMap, bpm: bpmOverride });
  return ok ? midPath : undefined;
}
