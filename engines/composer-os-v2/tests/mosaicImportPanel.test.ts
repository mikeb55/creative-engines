/**
 * Mosaic Import panel — workflow tests (jest node project).
 */
import * as fs from 'fs';
import * as path from 'path';
import { Midi } from '@tonejs/midi';
import type { MosaicImportTimeline } from '@composer-os/core/import/mosaicImportTimeline';
import {
  buildMosaicImportGeneratePartial,
  confidenceStripColor,
  parseMosaicImportFile,
  resolveMosaicImportPartial,
  withMosaicImportMode,
} from '../../../apps/composer-os-app/src/components/mosaic-import/useMosaicImportWorkflow';

const XML_HARMONY_MELODY = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind>major</kind>
      </harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony>
        <root><root-step>G</root-step></root>
        <kind>dominant</kind>
      </harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

function buildMidiBuffer(
  notes: Array<{ midi: number; bar: number; beat?: number; durationBeats?: number }>,
  bpm = 120,
): Uint8Array {
  const midi = new Midi();
  midi.header.tempos = [{ ticks: 0, bpm }];
  midi.header.update();
  const barSec = (60 / bpm) * 4;
  const track = midi.addTrack();
  for (const n of notes) {
    const beatOffset = (n.beat ?? 0) * (barSec / 4);
    const start = (n.bar - 1) * barSec + beatOffset;
    const dur = (n.durationBeats ?? 1) * (barSec / 4) * 0.95;
    track.addNote({ midi: n.midi, time: start, duration: dur, velocity: 0.85 });
  }
  return new Uint8Array(midi.toArray());
}

describe('mosaicImportPanel workflow', () => {
  test('A) valid MusicXML parses to timeline', async () => {
    const file = new File([XML_HARMONY_MELODY], 'chart.musicxml', { type: 'application/xml' });
    const { timeline } = await parseMosaicImportFile(file);
    expect(timeline.sourceFormat).toBe('musicxml');
    expect(timeline.bars).toBeGreaterThanOrEqual(2);
  });

  test('B) valid MIDI parses with midi sourceFormat', async () => {
    const buf = buildMidiBuffer([
      { midi: 60, bar: 1, beat: 0 },
      { midi: 64, bar: 1, beat: 1 },
    ]);
    const file = new File([buf], 'sketch.mid', { type: 'audio/midi' });
    const { timeline, tempoBpm } = await parseMosaicImportFile(file);
    expect(timeline.sourceFormat).toBe('midi');
    expect(timeline.melodyLine.length).toBeGreaterThan(0);
    expect(tempoBpm).toBe(120);
  });

  test('C) malformed MusicXML throws recoverable error', async () => {
    const bad = new File(['not music {{{'], 'broken.musicxml', { type: 'text/plain' });
    await expect(parseMosaicImportFile(bad)).rejects.toThrow();
    const good = new File([XML_HARMONY_MELODY], 'fix.musicxml', { type: 'application/xml' });
    const { timeline } = await parseMosaicImportFile(good);
    expect(timeline.bars).toBeGreaterThanOrEqual(2);
  });

  test('D) confidence strip colours by threshold', () => {
    expect(confidenceStripColor(0.9)).toBe('green');
    expect(confidenceStripColor(0.85)).toBe('green');
    expect(confidenceStripColor(0.7)).toBe('amber');
    expect(confidenceStripColor(0.5)).toBe('amber');
    expect(confidenceStripColor(0.49)).toBe('red');
  });

  test('E) import mode selection updates state', () => {
    const base = {
      importTimeline: null,
      importMode: null,
      parseError: null,
      parseDiagnostics: [],
      fileName: null,
      sourceFormat: null,
      tempoBpm: null,
    };
    expect(withMosaicImportMode(base, 'lock').importMode).toBe('lock');
    expect(withMosaicImportMode(base, 'variations').importMode).toBe('variations');
    expect(withMosaicImportMode(base, 'styleTransfer').importMode).toBe('styleTransfer');
  });
});


function mockTimeline(): MosaicImportTimeline {
  return {
    schemaVersion: 1,
    sourceFormat: 'musicxml',
    bars: 8,
    timeSig: { num: 4, den: 4 },
    keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.9, fieldOrigin: 'explicit' },
    harmonyByBar: [],
    melodyLine: [],
  };
}

describe('buildMosaicImportGeneratePartial', () => {
  test("A) mode lock maps lock_harmony + preserveImportHarmony", () => {
    const tl = mockTimeline();
    const { partial } = buildMosaicImportGeneratePartial({ timeline: tl, mode: 'lock' });
    expect(partial.importTimeline).toBe(tl);
    expect(partial.importHarmonyMode).toBe('lock_harmony');
    expect(partial.preserveImportHarmony).toBe(true);
  });

  test("B) mode variations sets generateVariations; styleTransfer absent", () => {
    const { partial } = buildMosaicImportGeneratePartial({ timeline: mockTimeline(), mode: 'variations' });
    expect(partial.generateVariations).toBe(true);
    expect(partial.variationCount).toBe(4);
    expect(partial.variationMode).toBe('full');
    expect(partial.styleTransfer).toBeUndefined();
  });

  test("C) mode styleTransfer sets styleTransfer; generateVariations absent", () => {
    const { partial } = buildMosaicImportGeneratePartial({
      timeline: mockTimeline(),
      mode: 'styleTransfer',
      config: { targetComposer: 'bill_evans', styleTransferStrength: 0.5 },
    });
    expect(partial.styleTransfer).toBe(true);
    expect(partial.targetComposer).toBe('bill_evans');
    expect(partial.styleTransferStrength).toBe(0.5);
    expect(partial.preserveMelody).toBe(true);
    expect(partial.generateVariations).toBeUndefined();
  });

  test('D) no import returns empty partial', () => {
    expect(buildMosaicImportGeneratePartial({ timeline: null, mode: 'lock' }).partial).toEqual({});
    expect(buildMosaicImportGeneratePartial({ timeline: mockTimeline(), mode: null }).partial).toEqual({});
  });

  test('mutex: variations wins when both flags present', () => {
    const { partial, mutexWarning } = resolveMosaicImportPartial({
      generateVariations: true,
      styleTransfer: true,
      variationCount: 3,
    });
    expect(partial.generateVariations).toBe(true);
    expect(partial.styleTransfer).toBeUndefined();
    expect(mutexWarning).toMatch(/variations wins/i);
  });
});

describe('HomeGenerate mosaic import wiring', () => {
  test('lazy MosaicImportPanel mount and workflow hook', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../../apps/composer-os-app/src/pages/HomeGenerate.tsx'),
      'utf-8',
    );
    expect(src).toContain('useMosaicImportWorkflow');
    expect(src).toContain('lazy(');
    expect(src).toContain('MosaicImportPanel');
    expect(src).toContain('<Suspense');
    expect(src).toContain('<MosaicImportPanel');
    expect(src).toContain('workflow={mosaicImportWorkflow}');
  });
});