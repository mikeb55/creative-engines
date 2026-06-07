/**
 * V80j IMP-3 - MIDI to MosaicImportTimeline.
 */

import { Midi } from '@tonejs/midi';
import type {
  ImportFieldOrigin,
  ImportHarmonyBar,
  ImportMelodyNote,
  MosaicImportTimeline,
} from './mosaicImportTimeline';
import {
  IMPORT_CANDIDATE_MIN_CONFIDENCE,
  MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
} from './mosaicImportTimeline';
import {
  beatsPerBarFromTimeSig,
  globalBeatToBarOnset,
  quantizeDurationBeats,
  snapToEighthGrid,
} from './importQuantize';

/** GM drum channel (0-indexed in @tonejs/midi). */
const MIDI_DRUM_CHANNEL = 9;

const PC_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

type ChordTemplate = { pcs: readonly number[]; suffix: string };

const CHORD_TEMPLATES: readonly ChordTemplate[] = [
  { pcs: [0, 4, 7], suffix: '' },
  { pcs: [0, 3, 7], suffix: 'm' },
  { pcs: [0, 4, 7, 10], suffix: '7' },
  { pcs: [0, 4, 7, 11], suffix: 'maj7' },
  { pcs: [0, 3, 7, 10], suffix: 'm7' },
  { pcs: [0, 3, 6, 10], suffix: 'm7b5' },
  { pcs: [0, 3, 6, 9], suffix: 'dim7' },
];

export interface MidiImportTimelineOptions {
  bpm?: number;
  timeSigNum?: number;
  timeSigDen?: number;
}

interface TimedNote {
  midi: number;
  startSec: number;
  durationSec: number;
  channel: number;
}

function pcName(pc: number): string {
  return PC_NAMES[((pc % 12) + 12) % 12]!;
}

function templateScore(rel: Set<number>, template: readonly number[]): number {
  let hits = 0;
  for (const t of template) {
    if (rel.has(t)) hits++;
  }
  let extra = 0;
  for (const r of rel) {
    if (!template.includes(r)) extra++;
  }
  return hits / template.length - extra * 0.1;
}

export function inferChordFromMidis(midis: number[]): { symbol: string; confidence: number } {
  if (midis.length === 0) return { symbol: 'N.C.', confidence: 0 };
  if (midis.length === 1) {
    return { symbol: pcName(midis[0]!), confidence: 0.45 };
  }

  const pcSet = new Set(midis.map((m) => ((m % 12) + 12) % 12));
  const bassPc = ((Math.min(...midis) % 12) + 12) % 12;

  let bestRoot = 0;
  let bestSuffix = '';
  let bestScore = -1;

  for (let root = 0; root < 12; root++) {
    const rel = new Set<number>();
    for (const pc of pcSet) rel.add((pc - root + 12) % 12);
    for (const tmpl of CHORD_TEMPLATES) {
      const s = templateScore(rel, tmpl.pcs);
      if (s > bestScore) {
        bestScore = s;
        bestRoot = root;
        bestSuffix = tmpl.suffix;
      }
    }
  }

  let symbol = `${pcName(bestRoot)}${bestSuffix}`;
  if (bassPc !== bestRoot) symbol = `${symbol}/${pcName(bassPc)}`;

  const confidence = Math.max(0, Math.min(1, 0.35 + bestScore * 0.65));
  return { symbol, confidence };
}

function collectTimedNotes(midi: Midi, drumChannel: number): TimedNote[] {
  const out: TimedNote[] = [];
  for (const track of midi.tracks) {
    const channel = track.channel ?? 0;
    if (channel === drumChannel) continue;
    for (const n of track.notes) {
      out.push({
        midi: n.midi,
        startSec: n.time,
        durationSec: n.duration,
        channel,
      });
    }
  }
  return out.sort((a, b) => a.startSec - b.startSec || a.midi - b.midi);
}

function detectSwingRatio(notes: TimedNote[], bpm: number): number | undefined {
  if (notes.length < 4) return undefined;
  const beatSec = 60 / bpm;
  const eighthSec = beatSec / 2;
  const onsets = notes.slice(0, 24).map((n) => n.startSec % beatSec);
  let longShort = 0;
  let pairs = 0;
  for (let i = 0; i + 1 < onsets.length; i += 2) {
    const a = onsets[i]!;
    const b = onsets[i + 1]!;
    const delta = Math.abs(b - a);
    if (delta > eighthSec * 0.4 && delta < eighthSec * 1.2) {
      pairs++;
      if (delta > eighthSec * 0.55) longShort++;
    }
  }
  if (pairs < 2) return undefined;
  return longShort / pairs >= 0.5 ? 2.0 : undefined;
}

function skylineMelodyFromNotes(
  notes: TimedNote[],
  bpm: number,
  beatsPerBar: number,
  totalBars: number
): ImportMelodyNote[] {
  const beatSec = 60 / bpm;
  const slots = new Map<string, { midi: number; startBeat: number; durBeats: number }>();

  for (const n of notes) {
    const globalBeat = n.startSec / beatSec;
    const { bar, onsetBeat } = globalBeatToBarOnset(globalBeat, beatsPerBar);
    if (bar < 1 || bar > totalBars) continue;
    const onset = snapToEighthGrid(onsetBeat);
    const dur = quantizeDurationBeats(n.durationSec / beatSec);
    const key = `${bar}:${onset.value}`;
    const existing = slots.get(key);
    if (!existing || n.midi > existing.midi) {
      slots.set(key, { midi: n.midi, startBeat: onset.value, durBeats: dur });
    }
  }

  return [...slots.entries()]
    .map(([key, v]) => {
      const bar = Number(key.split(':')[0]);
      return {
        bar,
        onsetBeat: v.startBeat,
        durationBeats: v.durBeats,
        midiPitch: v.midi,
        confidence: 0.8,
        fieldOrigin: 'inferred' as ImportFieldOrigin,
      };
    })
    .sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
}

function harmonyByBarFromNotes(
  notes: TimedNote[],
  bpm: number,
  beatsPerBar: number,
  totalBars: number
): ImportHarmonyBar[] {
  const beatSec = 60 / bpm;
  const out: ImportHarmonyBar[] = [];

  for (let bar = 1; bar <= totalBars; bar++) {
    const startSec = (bar - 1) * beatsPerBar * beatSec;
    const endSec = bar * beatsPerBar * beatSec;
    const mids: number[] = [];
    for (const n of notes) {
      const nEnd = n.startSec + n.durationSec;
      if (nEnd <= startSec || n.startSec >= endSec) continue;
      mids.push(n.midi);
    }
    const { symbol, confidence } = inferChordFromMidis(mids);
    if (confidence < IMPORT_CANDIDATE_MIN_CONFIDENCE) continue;
    out.push({
      bar,
      chordSymbol: symbol,
      confidence,
      fieldOrigin: 'inferred',
    });
  }
  return out;
}

export function midiToImportTimeline(
  midiBytes: Uint8Array,
  options?: MidiImportTimelineOptions
): MosaicImportTimeline {
  const diagnostics: string[] = [];
  const buffer = midiBytes.buffer.slice(
    midiBytes.byteOffset,
    midiBytes.byteOffset + midiBytes.byteLength
  );

  let midi: Midi;
  try {
    midi = new Midi(buffer);
  } catch {
    throw new Error('midiToImportTimeline: failed to parse MIDI buffer.');
  }

  const bpm =
    options?.bpm ??
    (midi.header.tempos[0]?.bpm && midi.header.tempos[0].bpm > 0
      ? Math.round(midi.header.tempos[0].bpm)
      : 120);

  const ts = midi.header.timeSignatures[0];
  const num = options?.timeSigNum ?? ts?.timeSignature?.[0] ?? 4;
  const den = options?.timeSigDen ?? ts?.timeSignature?.[1] ?? 4;
  const beatsPerBar = beatsPerBarFromTimeSig(num, den);
  const beatSec = 60 / bpm;

  const notes = collectTimedNotes(midi, MIDI_DRUM_CHANNEL);
  if (notes.length === 0) diagnostics.push('No non-drum notes found in MIDI.');

  const endSec = Math.max(...notes.map((n) => n.startSec + n.durationSec), beatSec * beatsPerBar);
  const totalBars = Math.max(1, Math.ceil(endSec / (beatSec * beatsPerBar)));

  const swingRatio = detectSwingRatio(notes, bpm);
  const melodyLine = skylineMelodyFromNotes(notes, bpm, beatsPerBar, totalBars);
  const harmonyByBar = harmonyByBarFromNotes(notes, bpm, beatsPerBar, totalBars);

  const tonicPc = melodyLine[0]?.midiPitch ?? 60;
  const keyEstimate = {
    tonic: pcName(tonicPc),
    mode: 'unknown' as const,
    confidence: 0.35,
    fieldOrigin: 'inferred' as ImportFieldOrigin,
  };

  return {
    schemaVersion: MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
    sourceFormat: 'midi',
    bars: totalBars,
    timeSig: { num, den },
    keyEstimate,
    harmonyByBar,
    melodyLine,
    ...(swingRatio !== undefined ? { swingRatio } : {}),
    parseDiagnostics: diagnostics.length ? diagnostics : undefined,
  };
}
