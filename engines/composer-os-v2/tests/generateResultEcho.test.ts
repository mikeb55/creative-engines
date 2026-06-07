/**
 * V80 — GenerateResult echo layer tests (import / variation / style-transfer / mixed-preset).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import type { MosaicImportTimeline } from '../core/import/mosaicImportTimeline';
import {
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
} from '../core/import/mosaicImportTimeline';
import { generateComposition, type GenerateResult } from '../app-api/generateComposition';

const SECTION_PLAN = [
  { sectionLabel: 'import', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' as const },
];

const MIXED_PLAN = [
  { sectionLabel: 'duo_a', startBar: 1, endBar: 16, songwriterStyleId: 'fripp', presetRole: 'duo' as const },
  { sectionLabel: 'bb_ab', startBar: 17, endBar: 32, songwriterStyleId: 'verlaine', presetRole: 'big_band' as const },
  { sectionLabel: 'sq_c', startBar: 33, endBar: 48, songwriterStyleId: 'bartok', presetRole: 'string_quartet' as const },
];

function lockedBarsForGoldenPath(iBars: string[]): string[] {
  return Array.from({ length: 8 }, (_, i) => iBars[i % iBars.length] ?? 'C');
}

function lockedHarmony48(): string[] {
  const cycle = ['Am', 'Dm', 'G', 'C', 'F', 'E7', 'Am7', 'G7'];
  return Array.from({ length: 48 }, (_, i) => cycle[i % cycle.length] ?? 'C');
}

function makeImportIr(overrides?: Partial<MosaicImportTimeline>): MosaicImportTimeline {
  const harmonyByBar = Array.from({ length: 8 }, (_, i) => ({
    bar: i + 1,
    chordSymbol: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'][i] ?? 'C',
    confidence: 0.75,
    fieldOrigin: 'inferred' as const,
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
    parseDiagnostics: ['warn:missing_clef'],
    ...overrides,
  };
}

function baseDuoReq(seed: number, extra: Record<string, unknown> = {}) {
  return {
    presetId: 'guitar_bass_duo',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    seed,
    ...extra,
  };
}

function runGenerate(extra: Record<string, unknown>): GenerateResult {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-test-'));
  return generateComposition(baseDuoReq(88100, extra) as Parameters<typeof generateComposition>[0], dir);
}

describe('generateResultEcho', () => {
  jest.setTimeout(180_000);

  test('A: variation run exposes variationEcho without score fragments', () => {
    const ir = makeImportIr();
    const locked = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
    const r = runGenerate({
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join(' | '),
      totalBars: 8,
      importTimeline: ir,
      generateVariations: true,
      variationCount: 4,
      variationMode: 'melodic',
      preserveImportHarmony: true,
      mosaicSectionPlan: SECTION_PLAN,
    });
    expect(r.variationEcho).toBeDefined();
    expect(r.variationEcho!.candidates.length).toBeGreaterThan(0);
    expect(r.variationEcho!.candidates.every((c) => typeof c.evalScore === 'number')).toBe(true);
    expect(r.variationEcho!.autoSelected).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(r)).not.toContain('scoreFragment');
  });

  test('B: style-transfer run exposes styleTransferEcho with melody retained', () => {
    const ir = makeImportIr();
    const locked = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
    const r = runGenerate({
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join(' | '),
      totalBars: 8,
      importTimeline: ir,
      styleTransfer: true,
      targetComposer: 'jack_white',
      styleTransferStrength: 1,
      preserveMelody: true,
      mosaicSectionPlan: SECTION_PLAN,
    });
    expect(r.styleTransferEcho).toBeDefined();
    expect(r.styleTransferEcho!.melodyRetained).toBe(true);
    expect(r.styleTransferEcho!.composerApplied).toBe('jack_white');
    expect(r.styleTransferEcho!.harmonyDeltaBars.length).toBeGreaterThan(0);
  });

  test('C: mixed-preset run exposes mixedPresetEcho with section part counts', () => {
    const locked = lockedHarmony48();
    const r = runGenerate({
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join(' | '),
      totalBars: 48,
      longFormEnabled: true,
      mosaicSectionPlan: MIXED_PLAN,
      bbMosaicEnabled: true,
      sqMosaicEnabled: true,
      mosaicOutputFormat: 'melody-bass-chords',
    });
    expect(r.mixedPresetEcho).toBeDefined();
    expect(r.mixedPresetEcho!.applied).toBe(true);
    expect(r.mixedPresetEcho!.sections.length).toBe(3);
    expect(r.mixedPresetEcho!.sections.every((s) => s.partCount > 0)).toBe(true);
    expect(typeof r.mixedPresetEcho!.exportIntegrityPassed).toBe('boolean');
    expect(r.runManifest?.v80Echo?.mixedPreset).toBeDefined();
  });

  test('D: import run exposes importEcho aligned with IR', () => {
    const ir = makeImportIr();
    const locked = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
    const r = runGenerate({
      harmonyMode: 'custom_locked',
      chordProgressionText: locked.join(' | '),
      totalBars: 8,
      importTimeline: ir,
      importHarmonyMode: 'lock_harmony',
      mosaicSectionPlan: SECTION_PLAN,
    });
    expect(r.importEcho).toBeDefined();
    expect(r.importEcho!.sourceFormat).toBe('musicxml');
    expect(r.importEcho!.harmonyConfidenceByBar).toEqual(ir.harmonyByBar.map((h) => h.confidence));
    expect(r.importEcho!.harmonyOriginByBar).toEqual(ir.harmonyByBar.map((h) => h.fieldOrigin));
    expect(r.importEcho!.parseDiagnostics).toEqual(ir.parseDiagnostics);
    expect(r.runManifest?.v80Echo?.import?.parseDiagnosticCount).toBe(1);
  });

  test('E: plain generation omits all echo fields', () => {
    const r = runGenerate({ seed: 42001 });
    expect(r.importEcho).toBeUndefined();
    expect(r.variationEcho).toBeUndefined();
    expect(r.styleTransferEcho).toBeUndefined();
    expect(r.mixedPresetEcho).toBeUndefined();
    expect(r.runManifest?.v80Echo).toBeUndefined();
    expect(r.success).toBe(true);
  });
});
