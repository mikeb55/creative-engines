/**
 * V80a INS-3 - mixed-preset assembly (duo + BB + SQ) end-to-end.
 */

import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { validateMusicXmlSchema } from '../core/export/musicxmlValidation';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

jest.setTimeout(120000);

const SEED = 88020;
const TOTAL_BARS = 48;

const MIXED_PLAN: NonNullable<RunGoldenPathOptions['mosaicSectionPlan']> = [
  {
    sectionLabel: 'duo_a',
    startBar: 1,
    endBar: 16,
    songwriterStyleId: 'fripp',
    presetRole: 'duo',
  },
  {
    sectionLabel: 'bb_b',
    startBar: 17,
    endBar: 32,
    songwriterStyleId: 'verlaine',
    presetRole: 'big_band',
  },
  {
    sectionLabel: 'sq_c',
    startBar: 33,
    endBar: 48,
    songwriterStyleId: 'bartok',
    presetRole: 'string_quartet',
  },
];

function lockedHarmony48(): string[] {
  const cycle = ['Am', 'Dm', 'G', 'C', 'F', 'E7', 'Am', 'G'];
  return Array.from({ length: TOTAL_BARS }, (_, i) => cycle[i % cycle.length]!);
}

function noteEventCountInRange(score: ScoreModel, partId: string, startBar: number, endBar: number): number {
  const part = score.parts.find((p) => p.id === partId);
  if (!part) return 0;
  let n = 0;
  for (const m of part.measures) {
    if (m.index < startBar || m.index > endBar) continue;
    n += m.events.filter((e) => e.kind === 'note' || e.kind === 'chord').length;
  }
  return n;
}

function restOnlyOutsideRange(
  score: ScoreModel,
  partId: string,
  activeStart: number,
  activeEnd: number
): boolean {
  const part = score.parts.find((p) => p.id === partId);
  if (!part) return true;
  for (const m of part.measures) {
    if (m.index >= activeStart && m.index <= activeEnd) continue;
    const hasPitch = m.events.some((e) => e.kind === 'note' || e.kind === 'chord');
    if (hasPitch) return false;
  }
  return true;
}

describe('mixedPresetAssembly', () => {
  it('A-E: duo+BB+SQ sections assemble, export, ownership, scoped format', () => {
    const locked = lockedHarmony48();
    const r = runGoldenPathOnce(SEED, {
      presetId: 'guitar_bass_duo',
      scoreTitle: 'Mixed Preset Assembly',
      totalBars: TOTAL_BARS,
      longFormEnabled: true,
      harmonyMode: 'custom_locked',
      lockedHarmonyBarsRaw: locked,
      parsedChordBars: [...locked],
      chordProgressionText: locked.join(' | '),
      mosaicSectionPlan: MIXED_PLAN,
      mosaicOutputFormat: 'melody-bass-chords',
      bbMosaicEnabled: true,
      sqMosaicEnabled: true,
    });

    if (!r.success) {
      // eslint-disable-next-line no-console
      console.error('[mixedPresetAssembly] errors:', r.errors.slice(0, 15));
    }

    expect(r.score).toBeDefined();
    const score = r.score!;
    expect(r.context?.generationMetadata?.mixedPresetAssemblyApplied).toBe(true);

    const partIds = score.parts.map((p) => p.id);
    expect(partIds).toEqual(expect.arrayContaining(['guitar', 'bass']));
    expect(partIds.some((id) => id.startsWith('bb_'))).toBe(true);
    expect(partIds.some((id) => id.startsWith('sq_'))).toBe(true);

    for (const part of score.parts) {
      expect(part.measures.length).toBe(TOTAL_BARS);
      for (const m of part.measures) {
        expect(m.events.length).toBeGreaterThan(0);
      }
    }

    const ownership = r.context?.generationMetadata?.assembledSectionOwnership ?? {};
    for (let b = 1; b <= 16; b++) expect(ownership[b]).toBe('duo_a');
    for (let b = 17; b <= 32; b++) expect(ownership[b]).toBe('bb_b');
    for (let b = 33; b <= 48; b++) expect(ownership[b]).toBe('sq_c');

    expect(noteEventCountInRange(score, 'bb_alto_sax', 17, 32)).toBeGreaterThan(0);
    expect(restOnlyOutsideRange(score, 'bb_alto_sax', 17, 32)).toBe(true);

    expect(noteEventCountInRange(score, 'sq_violin_1', 33, 48)).toBeGreaterThan(0);
    expect(restOnlyOutsideRange(score, 'sq_violin_1', 33, 48)).toBe(true);

    expect(noteEventCountInRange(score, 'guitar', 1, 16)).toBeGreaterThan(0);

    const xmlResult = exportScoreModelToMusicXml(score);
    expect(xmlResult.success).toBe(true);
    expect(xmlResult.xml).toBeDefined();
    const xml = xmlResult.xml!;
    expect(validateMusicXmlSchema(xml).valid).toBe(true);

    for (const id of partIds) {
      expect(xml).toContain(`id="${id}"`);
    }
  });
});
