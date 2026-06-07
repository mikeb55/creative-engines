/**
 * V80 — apiGenerate request pass-through (import / variation / style-transfer / filepath).
 * Complements runAppApiBoundaryTests in appApiBoundary.test.ts (smoke harness).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { apiGenerate } from '../app-api/composerOsApiCore';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import type { MosaicImportTimeline } from '../core/import/mosaicImportTimeline';
import {
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
} from '../core/import/mosaicImportTimeline';

const SECTION_PLAN = [
  { sectionLabel: 'import', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' as const },
];

function lockedBarsForGoldenPath(iBars: string[]): string[] {
  return Array.from({ length: 8 }, (_, i) => iBars[i % iBars.length] ?? 'C');
}

function makeImportIr(): MosaicImportTimeline {
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
  };
}

function duoImportPayload(extra: Partial<GenerateRequest> = {}): Partial<GenerateRequest> {
  const ir = makeImportIr();
  const locked = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
  return {
    presetId: 'guitar_bass_duo',
    styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
    seed: 88200,
    harmonyMode: 'custom_locked',
    chordProgressionText: locked.join(' | '),
    totalBars: 8,
    importTimeline: ir,
    mosaicSectionPlan: SECTION_PLAN,
    ...extra,
  };
}

describe('apiGenerate V80 boundary', () => {
  jest.setTimeout(180_000);

  let tmp: string;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-api-gen-boundary-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  test('A: importTimeline -> importEcho', () => {
    const r = apiGenerate(
      duoImportPayload({
        seed: 88201,
        importHarmonyMode: 'lock_harmony',
        preserveImportHarmony: true,
      }),
      tmp
    );
    expect(r.success).toBe(true);
    expect(r.importEcho).toBeDefined();
    expect(r.importEcho!.sourceFormat).toBe('musicxml');
  });

  test('B: generateVariations -> variationEcho', () => {
    const r = apiGenerate(
      duoImportPayload({
        seed: 88202,
        generateVariations: true,
        variationCount: 4,
        variationMode: 'melodic',
        preserveImportHarmony: true,
      }),
      tmp
    );
    expect(r.variationEcho).toBeDefined();
    expect(r.variationEcho!.candidates.length).toBeGreaterThan(0);
  });

  test('C: styleTransfer -> styleTransferEcho', () => {
    const r = apiGenerate(
      duoImportPayload({
        seed: 88203,
        styleTransfer: true,
        targetComposer: 'jack_white',
        styleTransferStrength: 1,
        preserveMelody: true,
      }),
      tmp
    );
    expect(r.styleTransferEcho).toBeDefined();
    expect(r.styleTransferEcho!.composerApplied).toBe('jack_white');
    expect(r.styleTransferEcho!.melodyRetained).toBe(true);
  });

  test('D: successful run -> filepath present and on disk', () => {
    const r = apiGenerate(
      duoImportPayload({ seed: 88204, importHarmonyMode: 'lock_harmony' }),
      tmp
    );
    expect(r.success).toBe(true);
    expect(typeof r.filepath).toBe('string');
    expect(r.filepath!.trim().length).toBeGreaterThan(0);
    expect(fs.existsSync(r.filepath!)).toBe(true);
  });

  test('E: plain generate - no echoes, normal filepath', () => {
    const r = apiGenerate(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' } },
        seed: 88205,
      },
      tmp
    );
    expect(r.success).toBe(true);
    expect(r.importEcho).toBeUndefined();
    expect(r.variationEcho).toBeUndefined();
    expect(r.styleTransferEcho).toBeUndefined();
    expect(typeof r.filepath).toBe('string');
    expect(r.filepath!.trim().length).toBeGreaterThan(0);
  });
});