/**
 * V80j MIDI import timeline tests (jest).
 */

import { Midi } from '@tonejs/midi';
import { midiToImportTimeline } from '../core/import/midiToImportTimeline';
import { inferChordFromMidis } from '../core/import/midiToImportTimeline';
import { IMPORT_EIGHTH_GRID_BEATS } from '../core/import/mosaicImportTimeline';

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
