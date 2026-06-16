/**
 * V80j MIDI import timeline tests (jest).
 */

import { Midi } from '@tonejs/midi';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { evaluateImportHarmonyLock } from '../core/import/importTimelineAdapters';
import { midiToImportTimeline } from '../core/import/midiToImportTimeline';
import { inferChordFromMidis } from '../core/import/midiToImportTimeline';
import { IMPORT_EIGHTH_GRID_BEATS, IMPORT_EXPLICIT_HARMONY_CONFIDENCE } from '../core/import/mosaicImportTimeline';
import { MIDI_INFERRED_HARMONY_CONFIDENCE_CAP } from '../core/import/midiChordInferenceTemplates';
import { LEADSHEET_IMPORT_MAX_BARS } from '../core/import/musicXmlToImportTimeline';
import { runDebussyLeadSheetFileHandoffProof } from '../core/import/runDebussyLeadSheetFileHandoffProof';
import { resolveDebussyLeadSheetFileProofPath } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';

function buildMidiBuffer(
  notes: Array<{ midi: number; bar: number; beat?: number; durationBeats?: number; channel?: number }>,
  opts?: { bpm?: number; drumTrack?: boolean }
): Uint8Array {
  const midi = new Midi();
  const bpm = opts?.bpm ?? 120;
  midi.header.tempos = [{ ticks: 0, bpm }];
  midi.header.update();
  const barSec = (60 / bpm) * 4;

  if (opts?.drumTrack) {
    const drums = midi.addTrack();
    drums.channel = 9;
    drums.addNote({ midi: 36, time: 0, duration: 0.1, velocity: 0.9 });
  }

  const track = midi.addTrack();
  track.channel = 0;
  for (const n of notes) {
    const beatOffset = (n.beat ?? 0) * (barSec / 4);
    const start = (n.bar - 1) * barSec + beatOffset;
    const dur = (n.durationBeats ?? 1) * (barSec / 4) * 0.95;
    track.addNote({ midi: n.midi, time: start, duration: dur, velocity: 0.85 });
  }

  return new Uint8Array(midi.toArray());
}

function buildMultiTrackMidiBuffer(
  tracks: Array<Array<{ midi: number; bar: number; beat?: number; durationBeats?: number }>>,
  opts?: { bpm?: number }
): Uint8Array {
  const midi = new Midi();
  const bpm = opts?.bpm ?? 120;
  midi.header.tempos = [{ ticks: 0, bpm }];
  midi.header.update();
  const barSec = (60 / bpm) * 4;

  for (const trackNotes of tracks) {
    const track = midi.addTrack();
    track.channel = midi.tracks.length - 1;
    for (const n of trackNotes) {
      const beatOffset = (n.beat ?? 0) * (barSec / 4);
      const start = (n.bar - 1) * barSec + beatOffset;
      const dur = (n.durationBeats ?? 1) * (barSec / 4) * 0.95;
      track.addNote({ midi: n.midi, time: start, duration: dur, velocity: 0.85 });
    }
  }

  return new Uint8Array(midi.toArray());
}

function buildEighthGridMelodyMidi(bars = 8): Uint8Array {
  const notes: Array<{ midi: number; bar: number; beat?: number; durationBeats?: number }> = [];
  const pitch = [64, 65, 67, 69, 71, 72, 74, 76];
  for (let bar = 1; bar <= bars; bar++) {
    for (let beat = 0; beat < 4; beat += 0.5) {
      notes.push({
        midi: pitch[(bar + Math.floor(beat)) % pitch.length]!,
        bar,
        beat,
        durationBeats: 0.5,
      });
    }
  }
  return buildMultiTrackMidiBuffer([notes]);
}

function rootLetter(symbol: string): string {
  return symbol.match(/^[A-G](?:#|b)?/)?.[0] ?? '';
}

describe('midiToImportTimeline', () => {
  test('D) note events quantized; swing stored separately when detected', () => {
    const buf = buildMidiBuffer([
      { midi: 60, bar: 1, beat: 0 },
      { midi: 62, bar: 1, beat: 0.5 },
      { midi: 64, bar: 1, beat: 1 },
    ]);
    const ir = midiToImportTimeline(buf);
    expect(ir.sourceFormat).toBe('midi');
    expect(ir.melodyLine.length).toBeGreaterThan(0);
    for (const n of ir.melodyLine) {
      expect(n.onsetBeat % IMPORT_EIGHTH_GRID_BEATS).toBe(0);
    }
    expect(ir.swingRatio === undefined || typeof ir.swingRatio === 'number').toBe(true);
  });

  test('E) chord inference confidence; weak bar dropped below 0.50', () => {
    const strong = inferChordFromMidis([60, 64, 67]);
    expect(strong.confidence).toBeGreaterThanOrEqual(0.5);
    expect(strong.symbol).toMatch(/^C/);

    const weak = inferChordFromMidis([]);
    expect(weak.confidence).toBeLessThan(0.5);

    const buf = buildMidiBuffer([{ midi: 60, bar: 1 }]);
    const ir = midiToImportTimeline(buf);
    const lowBars = ir.harmonyByBar.filter((h) => h.confidence < 0.5);
    expect(lowBars.length).toBe(0);
  });

  test('F) drums channel 10 excluded from melody', () => {
    const buf = buildMidiBuffer([], { drumTrack: true });
    const ir = midiToImportTimeline(buf);
    expect(ir.melodyLine.length).toBe(0);
  });
});

describe('leadSheetMidiInputV1', () => {
  test('inferChordFromMidis: bounded vocabulary, no slash, confidence below explicit MusicXML', () => {
    const cTriad = inferChordFromMidis([48, 52, 55]);
    expect(cTriad.symbol).toBe('C');
    expect(cTriad.symbol).not.toContain('/');

    const c7 = inferChordFromMidis([48, 52, 55, 58]);
    expect(c7.symbol).toBe('C7');

    const sus = inferChordFromMidis([48, 50, 55]);
    expect(sus.symbol).toBe('Csus2');

    const slashWouldBe = inferChordFromMidis([52, 55, 59, 48]);
    expect(slashWouldBe.symbol).not.toContain('/');

    expect(MIDI_INFERRED_HARMONY_CONFIDENCE_CAP).toBeLessThan(IMPORT_EXPLICIT_HARMONY_CONFIDENCE);
    expect(cTriad.confidence).toBeLessThanOrEqual(MIDI_INFERRED_HARMONY_CONFIDENCE_CAP);
  });

  test('evaluateImportHarmonyLock: MIDI never hard-locks even when lock_harmony requested', () => {
    const ir = midiToImportTimeline(
      buildMidiBuffer([
        { midi: 60, bar: 1, durationBeats: 4 },
        { midi: 64, bar: 1, durationBeats: 4 },
        { midi: 67, bar: 1, durationBeats: 4 },
      ])
    );
    const lock = evaluateImportHarmonyLock(ir, 'lock_harmony');
    expect(lock.customHarmonyLocked).toBe(false);
    expect(ir.sourceFormat).toBe('midi');
  });

  test('single-track eighth-grid melody: skyline pitch 100%, >=98% retention, onset within 0.25 beat', () => {
    const buf = buildEighthGridMelodyMidi(8);
    const bpm = 120;
    const barSec = 2;
    const beatSec = barSec / 4;

    const sourceEvents: Array<{ bar: number; beat: number; midi: number }> = [];
    const pitch = [64, 65, 67, 69, 71, 72, 74, 76];
    for (let bar = 1; bar <= 8; bar++) {
      for (let beat = 0; beat < 4; beat += 0.5) {
        sourceEvents.push({
          bar,
          beat,
          midi: pitch[(bar + Math.floor(beat)) % pitch.length]!,
        });
      }
    }

    const ir = midiToImportTimeline(buf, { bpm });
    expect(ir.melodyLine.length).toBeGreaterThanOrEqual(Math.floor(sourceEvents.length * 0.98));

    for (const out of ir.melodyLine) {
      expect(out.onsetBeat % IMPORT_EIGHTH_GRID_BEATS).toBe(0);
      const match = sourceEvents.find((s) => s.bar === out.bar && Math.abs(s.beat - out.onsetBeat) <= 0.25);
      expect(match).toBeDefined();
      expect(match!.midi).toBe(out.midiPitch);
      const sourceOnsetSec = (match!.bar - 1) * barSec + match!.beat * beatSec;
      const outOnsetSec = (out.bar - 1) * barSec + out.onsetBeat * beatSec;
      expect(Math.abs(sourceOnsetSec - outOnsetSec)).toBeLessThanOrEqual(0.25 * beatSec + 1e-6);
    }
  });

  test('2-track melody high / block comp low: root letter correct on >=6/8 bars', () => {
    const progression: Array<{ root: string; pcs: number[] }> = [
      { root: 'C', pcs: [0, 4, 7, 11] },
      { root: 'A', pcs: [9, 1, 4] },
      { root: 'D', pcs: [2, 5, 9] },
      { root: 'G', pcs: [7, 11, 2, 5] },
      { root: 'C', pcs: [0, 4, 7, 11] },
      { root: 'A', pcs: [9, 1, 4] },
      { root: 'D', pcs: [2, 5, 9] },
      { root: 'G', pcs: [7, 11, 2, 5] },
    ];

    const melody: Array<{ midi: number; bar: number; beat?: number; durationBeats?: number }> = [];
    const comp: Array<{ midi: number; bar: number; beat?: number; durationBeats?: number }> = [];
    for (let bar = 1; bar <= 8; bar++) {
      const prog = progression[bar - 1]!;
      melody.push({ midi: 76 + (bar % 3), bar, beat: 0, durationBeats: 0.5 });
      melody.push({ midi: 79 + (bar % 2), bar, beat: 1, durationBeats: 0.5 });
      for (const pc of prog.pcs) {
        comp.push({ midi: 48 + pc, bar, beat: 0, durationBeats: 4 });
      }
    }

    const ir = midiToImportTimeline(buildMultiTrackMidiBuffer([melody, comp]));
    expect(ir.harmonyByBar.length).toBeGreaterThanOrEqual(8);

    let rootHits = 0;
    for (let bar = 1; bar <= 8; bar++) {
      const expected = progression[bar - 1]!.root;
      const got = ir.harmonyByBar.find((h) => h.bar === bar);
      if (got && rootLetter(got.chordSymbol) === expected) rootHits++;
    }
    expect(rootHits).toBeGreaterThanOrEqual(6);
  });

  test('64-bar cap parity with MusicXML path constant', () => {
    expect(LEADSHEET_IMPORT_MAX_BARS).toBe(64);
    const notes: Array<{ midi: number; bar: number; durationBeats?: number }> = [];
    for (let bar = 1; bar <= 80; bar++) {
      notes.push({ midi: 60 + (bar % 12), bar, durationBeats: 4 });
    }
    const ir = midiToImportTimeline(buildMultiTrackMidiBuffer([notes]));
    expect(ir.bars).toBe(64);
    expect(ir.melodyLine.every((n) => n.bar <= 64)).toBe(true);
    expect(ir.harmonyByBar.every((h) => h.bar <= 64)).toBe(true);
  });

  test('MIDI file handoff proof runs quintet pipeline', () => {
    const buf = buildEighthGridMelodyMidi(8);
    const tmp = path.join(os.tmpdir(), `cos-midi-v1-${Date.now()}.mid`);
    fs.writeFileSync(tmp, buf);
    try {
      const proof = runDebussyLeadSheetFileHandoffProof(tmp, 90107, 'bartok');
      expect(proof.sourceFormat).toBe('midi');
      expect(proof.harmonyAdvisoryOnly).toBe(true);
      expect(proof.musicXmlExportOk).toBe(true);
      expect(proof.partIds.length).toBe(5);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  test('MusicXML file proof unchanged (regression guard)', () => {
    const filePath = resolveDebussyLeadSheetFileProofPath(path.join(__dirname, '..'));
    const proof = runDebussyLeadSheetFileHandoffProof(filePath, 90105);
    expect(proof.sourceFormat).toBe('musicxml');
    expect(proof.harmonyAdvisoryOnly).toBe(false);
    expect(proof.fileChordMatch).toBe(true);
    expect(proof.partIds.length).toBe(5);
  });
});
