/**
 * SQ→BB sketch playback — four FluidR3_GM string samplers (Gleitz CDN).
 */

import { midiToNoteName } from '@tonaljs/midi';
import * as Tone from 'tone';

const GLEITZ_BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';

/** Sparse sample map (Tone interpolates between nearest samples). */
const GLEITZ_SAMPLE_URLS: Record<string, string> = {
  A0: 'A0.mp3',
  C1: 'C1.mp3',
  'D#1': 'Ds1.mp3',
  'F#1': 'Fs1.mp3',
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  'D#2': 'Ds2.mp3',
  'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
  'D#6': 'Ds6.mp3',
  'F#6': 'Fs6.mp3',
  A6: 'A6.mp3',
  C7: 'C7.mp3',
  'D#7': 'Ds7.mp3',
  'F#7': 'Fs7.mp3',
  A7: 'A7.mp3',
  C8: 'C8.mp3',
};

export type StringVoice = 'violin1' | 'violin2' | 'viola' | 'cello';

export type StringVoiceNote = {
  pitchMidi: number;
  offsetBars: number;
  durationBars: number;
};

export type AllVoiceNotes = Record<StringVoice, StringVoiceNote[]>;

const VOICE_FOLDERS: Record<StringVoice, string> = {
  violin1: 'violin-mp3',
  violin2: 'violin-mp3',
  viola: 'viola-mp3',
  cello: 'cello-mp3',
};

const samplers: Record<StringVoice, Tone.Sampler> = {
  violin1: new Tone.Sampler({
    urls: GLEITZ_SAMPLE_URLS,
    baseUrl: `${GLEITZ_BASE}${VOICE_FOLDERS.violin1}/`,
    release: 1.5,
  }).toDestination(),
  violin2: new Tone.Sampler({
    urls: GLEITZ_SAMPLE_URLS,
    baseUrl: `${GLEITZ_BASE}${VOICE_FOLDERS.violin2}/`,
    release: 1.5,
  }).toDestination(),
  viola: new Tone.Sampler({
    urls: GLEITZ_SAMPLE_URLS,
    baseUrl: `${GLEITZ_BASE}${VOICE_FOLDERS.viola}/`,
    release: 1.5,
  }).toDestination(),
  cello: new Tone.Sampler({
    urls: GLEITZ_SAMPLE_URLS,
    baseUrl: `${GLEITZ_BASE}${VOICE_FOLDERS.cello}/`,
    release: 1.5,
  }).toDestination(),
};

const voiceMuted: Record<StringVoice, boolean> = {
  violin1: false,
  violin2: false,
  viola: false,
  cello: false,
};

let soloVoice: StringVoice | null = null;
let voicesReady = false;
let initPromise: Promise<void> | null = null;
let endScheduleId: number | undefined;

const START_BUFFER_SEC = 0.1;
const BEATS_PER_BAR = 4;

function applyVoiceVolume(voice: StringVoice): void {
  const sampler = samplers[voice];
  if (soloVoice != null && soloVoice !== voice) {
    sampler.volume.value = -Infinity;
    return;
  }
  sampler.volume.value = voiceMuted[voice] ? -Infinity : 0;
}

function applyAllVolumes(): void {
  for (const voice of Object.keys(samplers) as StringVoice[]) {
    applyVoiceVolume(voice);
  }
}

function barOffsetToSeconds(offsetBars: number, bpm: number): number {
  return (offsetBars * BEATS_PER_BAR * 60) / bpm;
}

function barDurationToSeconds(durationBars: number, bpm: number): number {
  return Math.max(0.04, (durationBars * BEATS_PER_BAR * 60) / bpm);
}

function midiToSamplerNote(pitchMidi: number): string | null {
  if (!Number.isFinite(pitchMidi) || pitchMidi < 0 || pitchMidi > 127) return null;
  return midiToNoteName(Math.round(pitchMidi), { sharps: true });
}

function clearEndSchedule(transport: ReturnType<typeof Tone.getTransport>): void {
  if (endScheduleId !== undefined) {
    transport.clear(endScheduleId);
    endScheduleId = undefined;
  }
}

export async function initVoices(): Promise<void> {
  if (voicesReady) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    applyAllVolumes();
    await Tone.loaded();
    voicesReady = true;
  })();
  return initPromise;
}

export function setMute(voice: StringVoice, muted: boolean): void {
  voiceMuted[voice] = muted;
  applyVoiceVolume(voice);
}

export function setSolo(voice: StringVoice | null): void {
  soloVoice = voice;
  applyAllVolumes();
}

export function stopPlayback(): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.position = 0;
  clearEndSchedule(transport);
  for (const voice of Object.keys(samplers) as StringVoice[]) {
    samplers[voice].releaseAll();
  }
}

export async function startPlayback(
  allVoiceNotes: AllVoiceNotes,
  bpm: number,
  onEnded?: () => void,
): Promise<void> {
  stopPlayback();
  await Tone.start();
  await initVoices();

  const transport = Tone.getTransport();
  transport.bpm.value = Math.max(1, bpm);
  transport.stop();
  transport.cancel();
  transport.position = 0;
  clearEndSchedule(transport);

  applyAllVolumes();

  let maxEndSec = 0;

  for (const voice of Object.keys(allVoiceNotes) as StringVoice[]) {
    const sampler = samplers[voice];
    if (soloVoice != null && soloVoice !== voice) continue;
    if (voiceMuted[voice]) continue;

    for (const n of allVoiceNotes[voice]) {
      const noteName = midiToSamplerNote(n.pitchMidi);
      if (!noteName) continue;
      const startSec = START_BUFFER_SEC + barOffsetToSeconds(n.offsetBars, bpm);
      const durSec = barDurationToSeconds(n.durationBars, bpm);
      maxEndSec = Math.max(maxEndSec, startSec + durSec);

      transport.schedule((time) => {
        sampler.triggerAttackRelease(noteName, durSec, time);
      }, startSec);
    }
  }

  if (maxEndSec <= START_BUFFER_SEC) {
    onEnded?.();
    return;
  }

  endScheduleId = transport.scheduleOnce(() => {
    stopPlayback();
    onEnded?.();
  }, maxEndSec + 0.05);

  transport.start();
}
