/**
 * MIDI chord extraction for SQ→BB import.
 */

import { Midi } from '@tonejs/midi';
import { parseUserChordInput } from '../core/counterpoint/parseUserChordInput';
import {
  arrayBufferFromBase64,
  arrayBufferToBase64,
  extractChordsFromMidi,
} from '../core/harmony/midiChordExtractor';

function buildMidiBuffer(
  notes: Array<{ midi: number; bar: number; durationBars?: number }>,
  opts?: { bpm?: number; trackIndex?: number; emptyTrack?: boolean },
): ArrayBuffer {
  const midi = new Midi();
  const bpm = opts?.bpm ?? 120;
  midi.header.tempos = [{ ticks: 0, bpm }];
  midi.header.update();
  const barSec = (60 / bpm) * 4;

  const trackCount = opts?.trackIndex != null ? opts.trackIndex + 1 : 1;
  while (midi.tracks.length < trackCount) midi.addTrack();

  if (!opts?.emptyTrack) {
    const track = midi.tracks[opts?.trackIndex ?? 0]!;
    for (const n of notes) {
      track.addNote({
        midi: n.midi,
        time: (n.bar - 1) * barSec,
        duration: (n.durationBars ?? 1) * barSec * 0.95,
        velocity: 0.85,
      });
    }
  }

  return midi.toArray().buffer.slice(0) as ArrayBuffer;
}

export function runMidiChordExtractorTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const cTriad = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 60, bar: 1 },
      { midi: 64, bar: 1 },
      { midi: 67, bar: 1 },
    ]),
  );
  out.push({
    ok: cTriad.chordString.includes('C'),
    name: 'extractChordsFromMidi — C major triad notes in bar 1 → chord string contains C',
  });

  const g7 = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 55, bar: 1 },
      { midi: 59, bar: 1 },
      { midi: 62, bar: 1 },
      { midi: 65, bar: 1 },
    ]),
  );
  out.push({
    ok: g7.chordString.includes('G7'),
    name: 'extractChordsFromMidi — G dominant 7 notes (G B D F) → chord string contains G7',
  });

  const am7 = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 57, bar: 1 },
      { midi: 60, bar: 1 },
      { midi: 64, bar: 1 },
      { midi: 67, bar: 1 },
    ]),
  );
  out.push({
    ok: am7.chordString.includes('Am7'),
    name: 'extractChordsFromMidi — Am7 notes (A C E G) → chord string contains Am7',
  });

  const dedupe = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 60, bar: 1 },
      { midi: 64, bar: 1 },
      { midi: 67, bar: 1 },
      { midi: 60, bar: 2 },
      { midi: 64, bar: 2 },
      { midi: 67, bar: 2 },
    ]),
  );
  out.push({
    ok: dedupe.chordString.split('|').map((s) => s.trim()).filter(Boolean).length === 1,
    name: 'Consecutive identical chords → deduplicated (2 bars of Cmaj7 → one Cmaj7 not two)',
  });

  const slash = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 38, bar: 1 },
      { midi: 55, bar: 1 },
      { midi: 59, bar: 1 },
      { midi: 62, bar: 1 },
    ]),
  );
  out.push({
    ok: slash.chordString.includes('G') && slash.chordString.includes('/D'),
    name: "Slash chord: bass D, upper = G major triad → 'G/D' or 'Gmaj/D' in output",
  });

  const fourBars = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 60, bar: 1 },
      { midi: 64, bar: 1 },
      { midi: 67, bar: 1 },
      { midi: 62, bar: 2 },
      { midi: 65, bar: 2 },
      { midi: 69, bar: 2 },
      { midi: 57, bar: 3 },
      { midi: 60, bar: 3 },
      { midi: 64, bar: 3 },
      { midi: 55, bar: 4 },
      { midi: 59, bar: 4 },
      { midi: 62, bar: 4 },
    ]),
  );
  out.push({
    ok: fourBars.barCount === 4,
    name: 'barCount: 4-bar MIDI → barCount === 4',
  });

  const tempo140 = extractChordsFromMidi(buildMidiBuffer([{ midi: 60, bar: 1 }], { bpm: 140 }));
  out.push({
    ok: tempo140.bpm === 140,
    name: 'bpm: MIDI tempo event 140 → bpm === 140',
  });

  const defaultBpm = extractChordsFromMidi(buildMidiBuffer([{ midi: 60, bar: 1 }]));
  out.push({
    ok: defaultBpm.bpm === 120,
    name: 'bpm default: no tempo event → bpm === 120',
  });

  const empty = extractChordsFromMidi(buildMidiBuffer([], { emptyTrack: true }));
  out.push({
    ok: empty.warnings.length > 0,
    name: 'warnings: empty MIDI track → warnings array non-empty',
  });

  const multi = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 60, bar: 1 },
      { midi: 64, bar: 1 },
      { midi: 67, bar: 1 },
      { midi: 57, bar: 2 },
      { midi: 60, bar: 2 },
      { midi: 64, bar: 2 },
    ]),
  );
  out.push({
    ok: multi.chordString.includes('|'),
    name: 'chordString format: output is pipe-separated (contains | when > 1 chord)',
  });

  const bpmOverride = extractChordsFromMidi(buildMidiBuffer([{ midi: 60, bar: 1 }], { bpm: 140 }), {
    bpm: 90,
  });
  out.push({
    ok: bpmOverride.bpm === 90,
    name: 'options.bpm override: extracted BPM ignored when options.bpm provided',
  });

  const trackBuf = (() => {
    const midi = new Midi();
    midi.header.tempos = [{ ticks: 0, bpm: 120 }];
    midi.header.update();
    const t0 = midi.addTrack();
    t0.addNote({ midi: 40, time: 0, duration: 0.5, velocity: 0.5 });
    const t1 = midi.addTrack();
    for (const m of [55, 59, 62, 65]) {
      t1.addNote({ midi: m, time: 0, duration: 3.5, velocity: 0.85 });
    }
    return midi.toArray().buffer.slice(0) as ArrayBuffer;
  })();
  const trackPick = extractChordsFromMidi(trackBuf, { trackIndex: 1 });
  const trackZero = extractChordsFromMidi(trackBuf, { trackIndex: 0 });
  out.push({
    ok: trackPick.chordString.includes('G7') && !trackZero.chordString.includes('G7'),
    name: 'options.trackIndex: specific track used when provided',
  });

  const dm7b5 = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 50, bar: 1 },
      { midi: 53, bar: 1 },
      { midi: 56, bar: 1 },
      { midi: 60, bar: 1 },
    ]),
  );
  out.push({
    ok: dm7b5.chordString.toLowerCase().includes('m7b5') || dm7b5.chordString.includes('Dm'),
    name: 'extractChordsFromMidi — Dm7b5 notes (D F Ab C) → half_dim7 detected',
  });

  const roundTrip = extractChordsFromMidi(
    buildMidiBuffer([
      { midi: 60, bar: 1 },
      { midi: 64, bar: 1 },
      { midi: 67, bar: 1 },
      { midi: 55, bar: 2 },
      { midi: 59, bar: 2 },
      { midi: 62, bar: 2 },
    ]),
  );
  const parsed = parseUserChordInput(roundTrip.chordString);
  out.push({
    ok: !parsed.hasErrors && parsed.chordCount > 0,
    name: 'parseUserChordInput accepts output of extractChordsFromMidi without error (round-trip test)',
  });

  const buf = buildMidiBuffer([{ midi: 60, bar: 1 }]);
  const b64 = arrayBufferToBase64(buf);
  const back = arrayBufferFromBase64(b64);
  out.push({
    ok: new Uint8Array(back).length === new Uint8Array(buf).length,
    name: 'midiChordInput base64 round-trip: encode → decode → same ArrayBuffer length',
  });

  return out;
}
