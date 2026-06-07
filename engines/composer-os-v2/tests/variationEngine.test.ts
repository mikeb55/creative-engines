/**
 * IMP-4 variation engine tests (jest).
 */

import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import {
  applySelectedVariationToScore,
  buildSectionMotifSeedFromIr,
  type VariationResult,
} from '../core/import/mosaicVariationEngine';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

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
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
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

const SECTION_PLAN = [
  {
    sectionLabel: 'import',
    startBar: 1,
    endBar: 8,
    songwriterStyleId: 'verlaine',
  },
] as const;

function lockedBarsForGoldenPath(irBars: string[]): string[] {
  return Array.from({ length: 8 }, (_, i) => irBars[i % irBars.length] ?? 'C');
}

function runVariationFixture(
  variationMode: 'harmonic' | 'melodic' | 'rhythmic' | 'full',
  preserveImportHarmony: boolean,
  variationCount = 4
): VariationResult {
  const ir = musicXmlToImportTimeline(XML_HARMONY_MELODY);
  const locked = lockedBarsForGoldenPath(importTimelineToLockedHarmony(ir));
  const gp = runGoldenPathOnce(88102, {
    presetId: 'guitar_bass_duo',
    importTimeline: ir,
    generateVariations: true,
    variationCount,
    variationMode,
    preserveImportHarmony,
    mosaicSectionPlan: [...SECTION_PLAN],
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: locked,
    parsedChordBars: locked,
    chordProgressionText: locked.join(' | '),
    totalBars: 8,
    suppressWybleVoiceLayoutForTest: true,
  });
  const result = gp.context.generationMetadata?.variationResult;
  if (!result) {
    throw new Error('variationResult missing from golden path metadata');
  }
  return result;
}

function evalOverall(result: VariationResult['candidates'][number]['evalResult']): number {
  return result.scores.overall ?? 0;
}

describe('variationEngine', () => {
  jest.setTimeout(180_000);

  test('A: four MusicXML variations - distinct motifs, all evaluated', () => {
    const result = runVariationFixture('full', true, 4);
    const variations = result.candidates.filter((c) => c.variationIndex > 0);
    expect(variations.length).toBe(4);
    const intervalSigs = variations.map((c) => JSON.stringify(c.motifVariant.intervalPattern));
    expect(new Set(intervalSigs).size).toBeGreaterThan(1);
    for (const c of result.candidates) {
      expect(c.evalResult.sectionLabel).toBe('import');
      expect(typeof c.evalResult.scores.overall).toBe('number');
    }
  });

  test('B: preserveImportHarmony=true - empty harmonyDelta on all candidates', () => {
    const result = runVariationFixture('full', true, 4);
    for (const c of result.candidates) {
      expect(c.harmonyDelta).toEqual([]);
    }
  });

  test('C: autoSelected equals highest eval score', () => {
    const result = runVariationFixture('melodic', true, 4);
    let bestIdx = 0;
    let best = evalOverall(result.candidates[0]!.evalResult);
    for (let i = 1; i < result.candidates.length; i++) {
      const score = evalOverall(result.candidates[i]!.evalResult);
      if (score > best) {
        best = score;
        bestIdx = i;
      }
    }
    expect(result.autoSelected).toBe(bestIdx);
  });

  test('D: importBaseline is candidate 0 and eval scored', () => {
    const result = runVariationFixture('melodic', true, 4);
    expect(result.candidates[0]!.variationIndex).toBe(0);
    expect(result.importBaseline.variationIndex).toBe(0);
    expect(result.candidates[0]).toBe(result.importBaseline);
    expect(typeof result.importBaseline.evalResult.scores.overall).toBe('number');
  });

  test('E: melodic mode - intervalPattern varies, rhythmPattern unchanged', () => {
    const result = runVariationFixture('melodic', true, 4);
    const baseline = result.importBaseline;
    const variations = result.candidates.filter((c) => c.variationIndex > 0);
    expect(
      variations.some(
        (c) =>
          JSON.stringify(c.motifVariant.intervalPattern) !==
          JSON.stringify(baseline.motifVariant.intervalPattern)
      )
    ).toBe(true);
    for (const c of variations) {
      expect(JSON.stringify(c.motifVariant.rhythmPattern)).toBe(
        JSON.stringify(baseline.motifVariant.rhythmPattern)
      );
    }
  });

  test('F: rhythmic mode - rhythmPattern varies, intervalPattern unchanged', () => {
    const result = runVariationFixture('rhythmic', true, 4);
    const baseline = result.importBaseline;
    const variations = result.candidates.filter((c) => c.variationIndex > 0);
    expect(
      variations.some(
        (c) =>
          JSON.stringify(c.motifVariant.rhythmPattern) !==
          JSON.stringify(baseline.motifVariant.rhythmPattern)
      )
    ).toBe(true);
    for (const c of variations) {
      expect(JSON.stringify(c.motifVariant.intervalPattern)).toBe(
        JSON.stringify(baseline.motifVariant.intervalPattern)
      );
    }
  });

  test('buildSectionMotifSeedFromIr retains section melody window', () => {
    const ir = musicXmlToImportTimeline(XML_HARMONY_MELODY);
    const seed = buildSectionMotifSeedFromIr(ir.melodyLine, 1, 8);
    expect(seed.intervalPattern.length).toBeGreaterThan(0);
    expect(seed.rhythmPattern.length).toBeGreaterThan(0);
  });

  test('applySelectedVariationToScore keeps baseline when index 0', () => {
    const result = runVariationFixture('melodic', true, 2);
    const base = result.importBaseline.scoreFragment;
    const merged = applySelectedVariationToScore(base, result, [...SECTION_PLAN], 0);
    expect(merged).toBe(base);
  });
});