/**
 * V80m IMP-5 - style-transfer tests (jest).
 */

import { normalizeChordToken } from '../core/harmony/chordProgressionParser';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import {
  applyStyleTransfer,
  buildStyleTransferHarmonyBars,
  melodyLinesMatchPitchForPitch,
  mergeImportedAndSliceHarmonyBars,
} from '../core/import/mosaicStyleTransfer';
import type { MosaicImportTimeline } from '../core/import/mosaicImportTimeline';
import {
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  IMPORT_HARD_LOCK_CONFIDENCE,
  MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
} from '../core/import/mosaicImportTimeline';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

const SECTION_PLAN = [
  { sectionLabel: 'import', startBar: 1, endBar: 8, songwriterStyleId: 'jack_white' as const },
];

function lockedBarsForGoldenPath(iBars: string[]): string[] {
  return Array.from({ length: 8 }, (_, i) => iBars[i % iBars.length] ?? 'C');
}

function makeImportIr(overrides?: Partial<MosaicImportTimeline>): MosaicImportTimeline {
  const harmonyByBar = Array.from({ length: 8 }, (_, i) => ({
    bar: i + 1,
    chordSymbol: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'][i] ?? 'C',
    confidence: 0.75,
    fieldOrigin: 'explicit' as const,
  }));
  harmonyByBar[0] = {
    bar: 1,
    chordSymbol: 'C',
    confidence: IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
    fieldOrigin: 'explicit',
  };
  return {
    schemaVersion: MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
    sourceFormat: 'musicxml',
    bars: 8,
    timeSig: { num: 4, den: 4 },
    keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.9, fieldOrigin: 'explicit' },
    harmonyByBar,
    melodyLine: [
      { bar: 1, onsetBeat: 0, durationBeats: 2, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' },
      { bar: 1, onsetBeat: 2, durationBeats: 2, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' },
      { bar: 2, onsetBeat: 0, durationBeats: 4, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' },
    ],
    parseDiagnostics: [],
    ...overrides,
  };
}

function runStyleTransferGoldenPath(
  seed: number,
  ir: MosaicImportTimeline,
  extra?: {
    styleTransferStrength?: number;
    importHarmonyMode?: 'lock_harmony' | 'blend_harmony' | 'free_harmony';
    reorchestrate?: boolean;
    presetId?: string;
  }
) {
  const locked = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
  return runGoldenPathOnce(seed, {
    presetId: extra?.presetId ?? 'guitar_bass_duo',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: locked,
    parsedChordBars: locked,
    chordProgressionText: locked.join(' | '),
    totalBars: 8,
    importTimeline: ir,
    styleTransfer: true,
    targetComposer: 'jack_white',
    styleTransferStrength: extra?.styleTransferStrength ?? 1,
    preserveMelody: true,
    importHarmonyMode: extra?.importHarmonyMode,
    reorchestrate: extra?.reorchestrate,
    mosaicSectionPlan: SECTION_PLAN,
    suppressWybleVoiceLayoutForTest: true,
  });
}

describe('styleTransfer', () => {
  jest.setTimeout(180_000);

  test('A: jack_white target retains melody and changes harmony', () => {
    const ir = makeImportIr();
    const gp = runStyleTransferGoldenPath(88101, ir, { styleTransferStrength: 1 });
    const result = gp.context.generationMetadata?.styleTransferResult;
    expect(result).toBeDefined();
    expect(melodyLinesMatchPitchForPitch(result!.retainedMelody, ir.melodyLine)).toBe(true);
    expect(result!.harmonyDelta.length).toBeGreaterThan(0);
    expect(result!.composerApplied).toBe('jack_white');
  });

  test('B: strength 0 keeps harmony near imported chords', () => {
    const ir = makeImportIr();
    const imported = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
    const slice = imported.map((c, i) => (i % 2 === 0 ? 'E7' : 'Am7'));
    const applied = buildStyleTransferHarmonyBars(imported, slice, 0, ir);
    for (let i = 0; i < imported.length; i++) {
      expect(normalizeChordToken(applied[i] ?? '')).toBe(normalizeChordToken(imported[i] ?? ''));
    }
  });

  test('C: strength 1 uses slice harmony where not hard-locked', () => {
    const ir = makeImportIr();
    const imported = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
    const slice = imported.map((_, i) => (i === 0 ? 'C' : 'E7'));
    const applied = buildStyleTransferHarmonyBars(imported, slice, 1, ir, 'free_harmony');
    expect(applied.slice(1).every((c, i) => normalizeChordToken(c) === normalizeChordToken(slice[i + 1] ?? ''))).toBe(
      true
    );
  });

  test('D: strength 0.5 blends imported and slice on differing bars', () => {
    const imported = ['C', 'Am', 'F', 'G'];
    const slice = ['E7', 'Am', 'Dm7', 'G'];
    const ir = makeImportIr();
    const low = mergeImportedAndSliceHarmonyBars(slice, imported, 0.75);
    const high = mergeImportedAndSliceHarmonyBars(slice, imported, 0.25);
    const mid = buildStyleTransferHarmonyBars(imported, slice, 0.5, ir, 'free_harmony');
    expect(mid[0]).not.toBe(mid[2]);
    expect(low[0]).toBe(imported[0]);
    expect(high[0]).toBe(slice[0]);
  });

  test('E: preserveMelody=true pitch-for-pitch guarantee', () => {
    const ir = makeImportIr();
    const gp = runStyleTransferGoldenPath(88102, ir);
    const result = gp.context.generationMetadata?.styleTransferResult;
    expect(result).toBeDefined();
    expect(melodyLinesMatchPitchForPitch(result!.retainedMelody, ir.melodyLine)).toBe(true);
  });

  test('F: hard-locked high-confidence bar skips slice mutation', () => {
    const ir = makeImportIr();
    ir.harmonyByBar[0] = {
      bar: 1,
      chordSymbol: 'C',
      confidence: IMPORT_HARD_LOCK_CONFIDENCE,
      fieldOrigin: 'explicit',
    };
    ir.harmonyByBar[1] = {
      bar: 2,
      chordSymbol: 'Am',
      confidence: 0.55,
      fieldOrigin: 'inferred',
    };
    const imported = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
    const slice = imported.map(() => 'E7');
    const applied = buildStyleTransferHarmonyBars(imported, slice, 1, ir, 'lock_harmony');
    expect(normalizeChordToken(applied[0] ?? '')).toBe(normalizeChordToken('C'));
    expect(normalizeChordToken(applied[1] ?? '')).toBe(normalizeChordToken('E7'));
  });

  test('G: reorchestrate=true on big_band adds ensemble part, melody intact', () => {
    const ir = makeImportIr();
    const gp = runStyleTransferGoldenPath(88103, ir, {
      styleTransferStrength: 1,
      reorchestrate: true,
      presetId: 'big_band',
    });
    const result = gp.context.generationMetadata?.styleTransferResult;
    expect(result).toBeDefined();
    expect(melodyLinesMatchPitchForPitch(result!.retainedMelody, ir.melodyLine)).toBe(true);
    expect(gp.score.parts.some((p) => p.id === 'style_transfer_bb_comp')).toBe(true);
  });
});
