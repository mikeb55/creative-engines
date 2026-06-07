/**
 * V80a INS-3 + V80h export integrity — mixed-preset assembly (duo + BB + SQ).
 */

import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { validateMusicXmlSchema } from '../core/export/musicxmlValidation';
import { validateWrittenMusicXmlComplete } from '../core/export/validateMusicXmlWrittenStrict';
import { applyMelodyBassFormat } from '../core/goldenPath/generateMelodyBassScore';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import { buildMosaicTonicMap } from '../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { SectionSlice } from '../core/score-model/assembledScoreModel';
import type { AssembledScoreModel } from '../core/score-model/assembledScoreModel';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import {
  MixedPresetValidationError,
  ScopeViolationError,
  assertDuoScopedPassScope,
  snapshotMixedPresetScopeEvents,
  validateMixedPresetScore,
  type MixedPresetValidationInput,
} from '../core/score-model/validateScoreModel';

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

function runMixedGoldenPath() {
  const locked = lockedHarmony48();
  return runGoldenPathOnce(SEED, {
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
}

function activePartIdsForSection(score: ScoreModel, role: string): string[] {
  if (role === 'duo') {
    return score.parts.filter((p) => p.id === 'guitar' || p.id === 'bass').map((p) => p.id);
  }
  if (role === 'big_band') {
    return score.parts.filter((p) => p.id.startsWith('bb_')).map((p) => p.id);
  }
  if (role === 'string_quartet') {
    return score.parts.filter((p) => p.id.startsWith('sq_')).map((p) => p.id);
  }
  return [];
}

function assemblyPlanFromScore(score: ScoreModel): SectionSlice[] {
  return MIXED_PLAN.map((entry) => ({
    sectionLabel: entry.sectionLabel,
    startBar: entry.startBar,
    endBar: entry.endBar,
    presetRole: entry.presetRole ?? 'duo',
    activePartIds: activePartIdsForSection(score, entry.presetRole ?? 'duo'),
  }));
}

function validationInputFromRun(score: ScoreModel, ownership: Record<number, string>): MixedPresetValidationInput {
  return {
    score,
    globalPartRegistry: score.parts.map((p) => ({
      id: p.id,
      instrumentIdentity: p.instrumentIdentity,
      scoreInstrumentName: p.scoreInstrumentName,
      midiProgram: p.midiProgram,
    })),
    sectionOwnership: ownership,
    assemblyPlan: assemblyPlanFromScore(score),
  };
}

function assembledModelFromRun(score: ScoreModel, ownership: Record<number, string>): AssembledScoreModel {
  const assemblyPlan = assemblyPlanFromScore(score);
  return {
    score,
    assemblyPlan,
    globalPartRegistry: score.parts.map((p) => ({
      id: p.id,
      instrumentIdentity: p.instrumentIdentity,
      scoreInstrumentName: p.scoreInstrumentName,
      midiProgram: p.midiProgram,
    })),
    sectionOwnership: ownership,
  };
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

function measureCountForPartInXml(xml: string, partId: string): number {
  const re = new RegExp(`<part id="${partId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([\\s\\S]*?)</part>`);
  const match = xml.match(re);
  if (!match) return 0;
  return (match[1].match(/<measure /g) || []).length;
}

describe('mixedPresetAssembly', () => {
  it('A: valid 3-section assembly — score=pass export=pass', () => {
    const r = runMixedGoldenPath();
    if (!r.success) {
      // eslint-disable-next-line no-console
      console.error('[mixedPresetAssembly] errors:', r.errors.slice(0, 15));
    }

    expect(r.score).toBeDefined();
    const score = r.score!;
    expect(r.context?.generationMetadata?.mixedPresetAssemblyApplied).toBe(true);

    const ownership = r.context?.generationMetadata?.assembledSectionOwnership ?? {};
    expect(() => validateMixedPresetScore(validationInputFromRun(score, ownership))).not.toThrow();

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
    expect(validateWrittenMusicXmlComplete(score, xml).valid).toBe(true);

    for (const id of partIds) {
      expect(xml).toContain(`id="${id}"`);
    }
  });

  it('B: missing rest bar — score=fail (part-coverage)', () => {
    const r = runMixedGoldenPath();
    expect(r.score).toBeDefined();
    const score = structuredClone(r.score!) as ScoreModel;
    const ownership = r.context?.generationMetadata?.assembledSectionOwnership ?? {};
    const bass = score.parts.find((p) => p.id === 'bass');
    expect(bass).toBeDefined();
    const m5 = bass!.measures.find((m) => m.index === 5);
    expect(m5).toBeDefined();
    m5!.events = [];

    expect(() => validateMixedPresetScore(validationInputFromRun(score, ownership))).toThrow(MixedPresetValidationError);
    try {
      validateMixedPresetScore(validationInputFromRun(score, ownership));
    } catch (e) {
      expect(e).toBeInstanceOf(MixedPresetValidationError);
      expect((e as MixedPresetValidationError).kind).toBe('part-coverage');
      expect((e as MixedPresetValidationError).partId).toBe('bass');
      expect((e as MixedPresetValidationError).bar).toBe(5);
    }
  });

  it('C: global applyMelodyBassFormat — ScopeViolationError', () => {
    const r = runMixedGoldenPath();
    expect(r.score).toBeDefined();
    const score = structuredClone(r.score!) as ScoreModel;
    const ownership = r.context?.generationMetadata?.assembledSectionOwnership ?? {};
    const assembled = assembledModelFromRun(score, ownership);
    const tonicMap = buildMosaicTonicMap(MIXED_PLAN, r.context!);
    const before = snapshotMixedPresetScopeEvents(score, assembled);
    const globallyFormatted = applyMelodyBassFormat(score, MIXED_PLAN, tonicMap);

    expect(() =>
      assertDuoScopedPassScope(before, globallyFormatted, assembled, 'applyMelodyBassFormat')
    ).toThrow(ScopeViolationError);
  });

  it('D: part-id collision — score=fail (uniqueness)', () => {
    const r = runMixedGoldenPath();
    expect(r.score).toBeDefined();
    const score = structuredClone(r.score!) as ScoreModel;
    const ownership = r.context?.generationMetadata?.assembledSectionOwnership ?? {};
    score.parts.push(structuredClone(score.parts[0]!) as (typeof score.parts)[number]);

    expect(() => validateMixedPresetScore(validationInputFromRun(score, ownership))).toThrow(MixedPresetValidationError);
    try {
      validateMixedPresetScore(validationInputFromRun(score, ownership));
    } catch (e) {
      expect(e).toBeInstanceOf(MixedPresetValidationError);
      expect((e as MixedPresetValidationError).kind).toBe('part-id-uniqueness');
    }
  });

  it('E: MusicXML round-trip — all parts all bars, no measure mismatch', () => {
    const r = runMixedGoldenPath();
    expect(r.score).toBeDefined();
    const score = r.score!;
    const xmlResult = exportScoreModelToMusicXml(score);
    expect(xmlResult.success).toBe(true);
    const xml = xmlResult.xml!;

    expect(validateWrittenMusicXmlComplete(score, xml).valid).toBe(true);

    for (const part of score.parts) {
      expect(measureCountForPartInXml(xml, part.id)).toBe(TOTAL_BARS);
    }
  });
});