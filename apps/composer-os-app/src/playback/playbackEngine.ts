import * as Tone from 'tone';
import type { PlaybackSequence } from './playbackTypes';

let synth: Tone.PolySynth<Tone.Synth> | null = null;
let click: Tone.Synth | null = null;
let beatRepeatId: number | undefined;
let endStopId: number | undefined;

function disposeSynth(): void {
  synth?.dispose();
  synth = null;
  click?.dispose();
  click = null;
}

function clearScheduledIds(transport: ReturnType<typeof Tone.getTransport>): void {
  if (beatRepeatId !== undefined) {
    transport.clear(beatRepeatId);
    beatRepeatId = undefined;
  }
  if (endStopId !== undefined) {
    transport.clear(endStopId);
    endStopId = undefined;
  }
}

/**
 * Unlocks the AudioContext (browser/Electron requires this during a user gesture).
 * Await this before {@link play}; do not schedule Transport until it resolves.
 */
export async function initPlayback(): Promise<void> {
  // Import-time Tone.start() resumes a dummy context. Touch the real context first.
  Tone.getContext();
  await Tone.start();
  const raw = Tone.getContext().rawContext as { state?: string } | undefined;
  if (raw?.state && raw.state !== 'running') {
    throw new Error(`Audio context is ${raw.state}. Playback did not start.`);
  }
}

export type PlayOptions = {
  loop?: boolean;
  /** Finite passes on the same Transport. Ignored while loop is on. */
  repeat?: number;
  /** Beat clicks on the same Transport. They are not written into MusicXML. */
  metronome?: boolean;
  /** Fires once when a non-looping sequence reaches its last note. */
  onEnded?: () => void;
  onSound?: (midi: number, barIndex: number, startBeat: number) => void;
};

export interface PlannedPlayback {
  notes: { startSec: number; durationSec: number; midi: number; barIndex: number; startBeat: number }[];
  clicks: { startSec: number }[];
  endSec: number;
  passes: number;
  barQuarters: number;
}

export function barQuarterSpan(seq: PlaybackSequence): number {
  return seq.barQuarters ?? seq.beatsPerBar;
}

/**
 * Motif onsets are quarter-lengths from the start of the cell.
 * barIndex is 1-based. startBeat is the position inside that bar.
 * A 0-based bar index schedules every note before the transport starts.
 */
export function sequenceFromTimedNotes(
  events: readonly { onset: number; duration: number; midi: number | null }[],
  bpm = 96,
  beatsPerBar = 4
): PlaybackSequence {
  const safeBeats = Math.max(1, beatsPerBar);
  const notes: PlaybackSequence['notes'] = [];
  let endQuarter = 0;
  for (const event of events) {
    if (typeof event.midi !== 'number' || event.midi <= 0) continue;
    const barIndex = Math.floor(event.onset / safeBeats) + 1;
    const startBeat = event.onset - (barIndex - 1) * safeBeats;
    endQuarter = Math.max(endQuarter, event.onset + event.duration);
    notes.push({
      pitch: event.midi,
      startBeat,
      duration: event.duration,
      barIndex,
    });
  }
  return {
    notes,
    bpm,
    beatsPerBar: safeBeats,
    totalBars: Math.max(1, Math.ceil(endQuarter / safeBeats)),
    barQuarters: safeBeats,
  };
}

/** Quarter-grid schedule for one shared Transport. No audio objects. */
export function planPlayback(seq: PlaybackSequence, options?: Pick<PlayOptions, 'repeat' | 'metronome'>): PlannedPlayback {
  const secondsPerQuarter = 60 / seq.bpm;
  const barQuarters = barQuarterSpan(seq);
  const passes = Math.max(1, Math.floor(options?.repeat ?? 1));
  const notes: PlannedPlayback['notes'] = [];
  let maxEndQuarter = 0;
  for (let pass = 0; pass < passes; pass += 1) {
    const origin = pass * seq.totalBars * barQuarters;
    for (const note of seq.notes) {
      if (typeof note.pitch !== 'number' || note.pitch <= 0) continue;
      const startQuarter = origin + (note.barIndex - 1) * barQuarters + note.startBeat;
      const endQuarter = startQuarter + note.duration;
      maxEndQuarter = Math.max(maxEndQuarter, endQuarter);
      notes.push({
        startSec: startQuarter * secondsPerQuarter,
        durationSec: Math.max(0.04, note.duration * secondsPerQuarter),
        midi: note.pitch,
        barIndex: note.barIndex,
        startBeat: note.startBeat,
      });
    }
  }
  const clicks: { startSec: number }[] = [];
  if (options?.metronome) {
    const clickQuarter = barQuarters / Math.max(1, seq.beatsPerBar);
    for (let pass = 0; pass < passes; pass += 1) {
      for (let bar = 0; bar < seq.totalBars; bar += 1) {
        for (let beat = 0; beat < seq.beatsPerBar; beat += 1) {
          const startQuarter = pass * seq.totalBars * barQuarters + bar * barQuarters + beat * clickQuarter;
          clicks.push({ startSec: startQuarter * secondsPerQuarter });
        }
      }
    }
  }
  return {
    notes,
    clicks,
    endSec: maxEndQuarter * secondsPerQuarter + 0.05,
    passes,
    barQuarters,
  };
}

/**
 * VaultMicroscope-style PolySynth + Transport scheduling; singleton transport, fresh synth each run.
 */
export async function play(
  seq: PlaybackSequence,
  onBeat: (beat: number) => void,
  options?: PlayOptions
): Promise<void> {
  Tone.getContext();
  await Tone.start();
  const raw = Tone.getContext().rawContext as { state?: string } | undefined;
  if (raw?.state && raw.state !== 'running') {
    throw new Error(`Audio context is ${raw.state}. Playback did not start.`);
  }
  stop();

  if (!seq.notes.length) {
    return;
  }

  const transport = Tone.getTransport();
  transport.bpm.value = seq.bpm;
  transport.stop();
  transport.cancel();
  transport.position = 0;
  transport.loop = false;

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.015, decay: 0.12, sustain: 0.25, release: 0.08 },
  }).toDestination();
  synth.volume.value = -14;

  const planned = planPlayback(seq, {
    repeat: options?.loop ? 1 : options?.repeat,
    metronome: options?.metronome,
  });

  for (const note of planned.notes) {
    const noteName = new Tone.Midi(note.midi).toNote();
    transport.schedule((time) => {
      synth!.triggerAttackRelease(noteName, note.durationSec, time);
      options?.onSound?.(note.midi, note.barIndex, note.startBeat);
    }, note.startSec);
  }

  if (options?.metronome) {
    click = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
    }).toDestination();
    click.volume.value = -24;
    for (const tick of planned.clicks) {
      transport.schedule((time) => {
        click?.triggerAttackRelease('G5', 0.03, time);
      }, tick.startSec);
    }
  }

  const beatInterval = (60 / transport.bpm.value) * (planned.barQuarters / Math.max(1, seq.beatsPerBar));
  let beatCount = 0;
  beatRepeatId = transport.scheduleRepeat(
    () => {
      onBeat(beatCount);
      beatCount += 1;
    },
    beatInterval,
    0
  );

  const endSec = planned.endSec;
  if (options?.loop) {
    transport.loop = true;
    transport.loopEnd = endSec;
  } else {
    const onEnded = options?.onEnded;
    endStopId = transport.scheduleOnce(() => {
      transport.stop();
      transport.cancel();
      clearScheduledIds(transport);
      disposeSynth();
      onEnded?.();
    }, endSec);
  }

  transport.start();
}

export function pause(): void {
  Tone.getTransport().pause();
}

export function stop(): void {
  const transport = Tone.getTransport();
  transport.loop = false;
  transport.stop();
  transport.cancel();
  transport.position = 0;
  clearScheduledIds(transport);
  disposeSynth();
}
