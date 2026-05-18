/**
 * Structural MIDI validation (@tonejs/midi) for smoke / release output checks.
 */

import * as fs from 'fs';
import { Midi } from '@tonejs/midi';

export type InstrumentRange = readonly [minMidi: number, maxMidi: number];

export type InstrumentRangeMap = Record<string, InstrumentRange>;

export const DEFAULT_INSTRUMENT_RANGES: InstrumentRangeMap = {
  violin_1: [55, 103],
  sq_violin_1: [55, 103],
  violin_2: [50, 100],
  sq_violin_2: [50, 100],
  viola: [48, 91],
  sq_viola: [48, 91],
  cello: [36, 76],
  sq_cello: [36, 76],
  bass: [28, 67],
  guitar: [40, 84],
  bb_trumpet: [52, 96],
  bb_trumpets: [52, 96],
  bb_trombone: [40, 77],
  bb_trombones: [40, 77],
  bb_alto_sax: [49, 87],
  bb_tenor_sax: [45, 82],
};

export type MidiValidationOptions = {
  expectedPartCount?: number;
  expectedBars?: number;
  beatsPerBar?: number;
  instrumentRanges?: Partial<InstrumentRangeMap>;
  /** When true, skip pitch-range checks (e.g. drum guide). */
  skipPitchRangeCheck?: boolean;
  /** When true, skip cross-part tick:midi unison doubling check. */
  skipUnisonCheck?: boolean;
  /** When true, skip same-track monophonic overlap check (e.g. merged SMF tracks). */
  skipMonophonicOverlapCheck?: boolean;
  /** Tolerance in ticks for bar-length check (default PPQ/2). */
  barCountToleranceTicks?: number;
};

export type MidiValidationResult = {
  passed: boolean;
  failures: string[];
  warnings: string[];
  stats: {
    trackCount: number;
    noteTrackCount: number;
    totalNotes: number;
    durationBars: number;
    ppq: number;
  };
};

function normalizeTrackKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

function resolveRangeForTrack(
  trackName: string,
  ranges: InstrumentRangeMap
): InstrumentRange | undefined {
  const key = normalizeTrackKey(trackName);
  if (ranges[key]) return ranges[key];
  for (const [rk, rv] of Object.entries(ranges)) {
    if (key.includes(rk) || rk.includes(key)) return rv;
  }
  return undefined;
}

function isDrumTrack(trackName: string, channel: number | undefined): boolean {
  const n = normalizeTrackKey(trackName);
  if (n.includes('drum') || n.includes('percussion') || n.includes('drum_guide')) return true;
  return channel === 9 || channel === 10;
}

export function validateMidiFile(
  filePath: string,
  options: MidiValidationOptions = {}
): MidiValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const beatsPerBar = options.beatsPerBar ?? 4;
  const ranges: InstrumentRangeMap = {
    ...DEFAULT_INSTRUMENT_RANGES,
    ...(options.instrumentRanges as InstrumentRangeMap | undefined),
  };

  if (!fs.existsSync(filePath)) {
    return {
      passed: false,
      failures: [`missing file: ${filePath}`],
      warnings,
      stats: { trackCount: 0, noteTrackCount: 0, totalNotes: 0, durationBars: 0, ppq: 480 },
    };
  }

  let midi: Midi;
  try {
    midi = new Midi(fs.readFileSync(filePath));
  } catch (e) {
    return {
      passed: false,
      failures: [`parse error: ${e instanceof Error ? e.message : String(e)}`],
      warnings,
      stats: { trackCount: 0, noteTrackCount: 0, totalNotes: 0, durationBars: 0, ppq: 480 },
    };
  }

  const ppq = midi.header.ppq || 480;
  const noteTracks = midi.tracks.filter((t) => t.notes.length > 0);
  let totalNotes = 0;
  let maxEndTick = 0;

  for (const track of noteTracks) {
    totalNotes += track.notes.length;
    const trackName = track.name || 'unnamed';
    const drum = isDrumTrack(trackName, track.channel);

    const sorted = [...track.notes].sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);
    for (let i = 0; i < sorted.length; i++) {
      const n = sorted[i]!;
      if (n.velocity <= 0.01 || n.velocity > 1.0) {
        failures.push(`${trackName}: velocity out of range ${n.velocity} at tick ${n.ticks}`);
      }
      const end = n.ticks + n.durationTicks;
      if (end > maxEndTick) maxEndTick = end;

      if (!options.skipMonophonicOverlapCheck && i > 0) {
        const prev = sorted[i - 1]!;
        if (prev.ticks !== n.ticks && prev.ticks + prev.durationTicks > n.ticks) {
          failures.push(
            `${trackName}: monophonic overlap ${prev.midi}@${prev.ticks} → ${n.midi}@${n.ticks}`
          );
        }
      }

      if (!options.skipPitchRangeCheck && !drum) {
        const range = resolveRangeForTrack(trackName, ranges);
        if (range && (n.midi < range[0] || n.midi > range[1])) {
          failures.push(
            `${trackName}: pitch ${n.midi} outside [${range[0]},${range[1]}] at tick ${n.ticks}`
          );
        }
      }
    }
  }

  if (noteTracks.length === 0) {
    failures.push('no tracks with notes');
  } else {
    for (const track of midi.tracks) {
      if (track.notes.length === 0 && track.name) {
        warnings.push(`empty track skipped: ${track.name}`);
      }
    }
  }

  const durationBars = maxEndTick > 0 ? maxEndTick / (ppq * beatsPerBar) : 0;

  if (options.expectedBars != null && options.expectedBars > 0) {
    const expectedTicks = options.expectedBars * beatsPerBar * ppq;
    const tol = options.barCountToleranceTicks ?? Math.floor(ppq / 2);
    if (Math.abs(maxEndTick - expectedTicks) > tol + ppq) {
      failures.push(
        `duration ticks ${maxEndTick} vs expected ~${expectedTicks} (±${tol}) for ${options.expectedBars} bars`
      );
    }
  }

  if (options.expectedPartCount != null && noteTracks.length !== options.expectedPartCount) {
    failures.push(
      `note track count ${noteTracks.length} !== expectedPartCount ${options.expectedPartCount}`
    );
  }

  if (!options.skipUnisonCheck) {
    const unisonKeys = new Map<string, string>();
    for (const track of noteTracks) {
      const trackName = track.name || 'unnamed';
      if (isDrumTrack(trackName, track.channel)) continue;
      for (const n of track.notes) {
        const key = `${n.ticks}:${n.midi}`;
        const prev = unisonKeys.get(key);
        if (prev && prev !== trackName) {
          failures.push(`unison doubling ${key} on ${prev} and ${trackName}`);
        } else {
          unisonKeys.set(key, trackName);
        }
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
    stats: {
      trackCount: midi.tracks.length,
      noteTrackCount: noteTracks.length,
      totalNotes,
      durationBars,
      ppq,
    },
  };
}
