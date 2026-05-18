/**
 * MIDI → pipe-separated chord timeline for SQ→BB (`parseUserChordInput` format).
 */

import { Midi } from '@tonejs/midi';

export interface MidiChordExtractionResult {
  chordString: string;
  barCount: number;
  bpm: number;
  warnings: string[];
}

export interface MidiChordExtractOptions {
  trackIndex?: number;
  bpm?: number;
  quantiseToBar?: boolean;
}

const PC_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

type ChordTemplateId =
  | 'major'
  | 'minor'
  | 'dom7'
  | 'maj7'
  | 'min7'
  | 'half_dim7'
  | 'dim7'
  | 'sus2'
  | 'sus4';

const CHORD_TEMPLATES: ReadonlyArray<{ id: ChordTemplateId; pcs: readonly number[]; suffix: string }> = [
  { id: 'major', pcs: [0, 4, 7], suffix: '' },
  { id: 'minor', pcs: [0, 3, 7], suffix: 'm' },
  { id: 'dom7', pcs: [0, 4, 7, 10], suffix: '7' },
  { id: 'maj7', pcs: [0, 4, 7, 11], suffix: 'maj7' },
  { id: 'min7', pcs: [0, 3, 7, 10], suffix: 'm7' },
  { id: 'half_dim7', pcs: [0, 3, 6, 10], suffix: 'm7b5' },
  { id: 'dim7', pcs: [0, 3, 6, 9], suffix: 'dim7' },
  { id: 'sus2', pcs: [0, 2, 7], suffix: 'sus2' },
  { id: 'sus4', pcs: [0, 5, 7], suffix: 'sus4' },
];

function pcName(pc: number): string {
  return PC_NAMES[((pc % 12) + 12) % 12]!;
}

function detectBpm(midi: Midi, override?: number): number {
  if (override != null && Number.isFinite(override) && override > 0) return override;
  const t = midi.header.tempos[0]?.bpm;
  return t != null && Number.isFinite(t) && t > 0 ? Math.round(t) : 120;
}

function selectTrack(midi: Midi, trackIndex?: number) {
  if (trackIndex != null && midi.tracks[trackIndex]) return midi.tracks[trackIndex]!;
  let best = midi.tracks[0];
  let bestCount = best?.notes.length ?? 0;
  for (const tr of midi.tracks) {
    if (tr.notes.length > bestCount) {
      best = tr;
      bestCount = tr.notes.length;
    }
  }
  return best;
}

function notesInBar(
  notes: readonly { midi: number; time: number; duration: number }[],
  barStart: number,
  barEnd: number,
): number[] {
  const mids: number[] = [];
  for (const n of notes) {
    const start = n.time;
    const end = n.time + n.duration;
    if (end <= barStart || start >= barEnd) continue;
    mids.push(n.midi);
  }
  return mids;
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

function identifyChordSymbol(midis: number[]): string {
  if (midis.length === 0) return 'N.C.';
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
  if (bassPc !== bestRoot) {
    symbol = `${symbol}/${pcName(bassPc)}`;
  }
  return symbol;
}

function dedupeConsecutive(chords: string[]): string[] {
  const out: string[] = [];
  for (const c of chords) {
    if (out.length === 0 || out[out.length - 1] !== c) out.push(c);
  }
  return out;
}

export function extractChordsFromMidi(
  buffer: ArrayBuffer,
  options?: MidiChordExtractOptions,
): MidiChordExtractionResult {
  const warnings: string[] = [];
  const quantiseToBar = options?.quantiseToBar !== false;

  let midi: Midi;
  try {
    midi = new Midi(buffer);
  } catch {
    return { chordString: '', barCount: 0, bpm: options?.bpm ?? 120, warnings: ['Failed to parse MIDI file.'] };
  }

  const bpm = detectBpm(midi, options?.bpm);
  const barDuration = (60 / bpm) * 4;
  const track = selectTrack(midi, options?.trackIndex);

  if (!track || track.notes.length === 0) {
    warnings.push('No notes found in selected MIDI track.');
    return { chordString: '', barCount: 0, bpm, warnings };
  }

  const noteRows = track.notes.map((n) => ({
    midi: n.midi,
    time: n.time,
    duration: n.duration,
  }));

  const endTime = Math.max(...noteRows.map((n) => n.time + n.duration), barDuration);
  const barCount = Math.max(1, Math.ceil(endTime / barDuration));

  const perBar: string[] = [];
  for (let bar = 0; bar < barCount; bar++) {
    const start = bar * barDuration;
    const end = start + barDuration;
    const mids = notesInBar(noteRows, start, end);
    perBar.push(identifyChordSymbol(mids));
  }

  const changes = quantiseToBar ? dedupeConsecutive(perBar) : perBar;
  const chordString = changes.filter((c) => c !== 'N.C.').join(' | ');

  if (!chordString) {
    warnings.push('No chord symbols could be inferred from MIDI notes.');
  }

  return { chordString, barCount, bpm, warnings };
}

/** Base64 → ArrayBuffer (Node + browser). */
export function arrayBufferFromBase64(b64: string): ArrayBuffer {
  const trimmed = b64.trim();
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(trimmed, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binary = atob(trimmed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** ArrayBuffer → base64 (Node + browser). */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}
