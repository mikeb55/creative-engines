import * as Tone from 'tone';
import type { PlaybackSequence } from './playbackTypes';

let synth: Tone.PolySynth<Tone.Synth> | null = null;
let beatRepeatId: number | undefined;
let endStopId: number | undefined;

function disposeSynth(): void {
  synth?.dispose();
  synth = null;
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
  await Tone.start();
}

function globalQuarterStart(
  barIndex: number,
  startBeat: number,
  beatsPerBar: number
): number {
  return (barIndex - 1) * beatsPerBar + startBeat;
}

/**
 * VaultMicroscope-style PolySynth + Transport scheduling; singleton transport, fresh synth each run.
 */
export async function play(
  seq: PlaybackSequence,
  onBeat: (beat: number) => void
): Promise<void> {
  await Tone.start();
  stop();

  if (!seq.notes.length) {
    return;
  }

  const transport = Tone.getTransport();
  transport.bpm.value = seq.bpm;
  transport.stop();
  transport.cancel();
  transport.position = 0;

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.015, decay: 0.12, sustain: 0.25, release: 0.08 },
  }).toDestination();
  synth.volume.value = -14;

  const secondsPerQuarter = 60 / transport.bpm.value;

  for (const n of seq.notes) {
    if (typeof n.pitch !== 'number' || n.pitch <= 0) continue;
    const startSec =
      globalQuarterStart(n.barIndex, n.startBeat, seq.beatsPerBar) * secondsPerQuarter;
    const durSec = Math.max(0.04, n.duration * secondsPerQuarter);
    const noteName = new Tone.Midi(n.pitch).toNote();

    transport.schedule((time) => {
      synth!.triggerAttackRelease(noteName, durSec, time);
    }, startSec);
  }

  const beatInterval = Tone.Time('1n').toSeconds() / seq.beatsPerBar;
  let beatCount = 0;
  beatRepeatId = transport.scheduleRepeat(
    () => {
      onBeat(beatCount);
      beatCount += 1;
    },
    beatInterval,
    0
  );

  let maxEndQuarter = 0;
  for (const n of seq.notes) {
    const end =
      globalQuarterStart(n.barIndex, n.startBeat, seq.beatsPerBar) + n.duration;
    maxEndQuarter = Math.max(maxEndQuarter, end);
  }
  const endSec = maxEndQuarter * secondsPerQuarter + 0.05;
  endStopId = transport.scheduleOnce(() => {
    transport.stop();
    transport.cancel();
    clearScheduledIds(transport);
    disposeSynth();
  }, endSec);

  transport.start();
}

export function pause(): void {
  Tone.getTransport().pause();
}

export function stop(): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.position = 0;
  clearScheduledIds(transport);
  disposeSynth();
}
