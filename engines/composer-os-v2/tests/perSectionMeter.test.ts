/**
 * P6/P7 golden — per-section meter via Song schema (off smoke until P7).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { resolveMeterForBar } from '../core/rhythm/oddMeterQuantiser';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import { resolveBarMeterMapForGenerateRequest } from '../core/section-architecture/resolveGenerationBarMeterMap';
import type { Song } from '../core/section-architecture/sectionArchitectureTypes';

const CHORDS_8 = Array.from({ length: 8 }, () => 'Dm7');

export function perSectionMeterGoldenSong(): Song {
  return {
    schemaVersion: 1,
    id: 'per_section_meter_golden',
    title: 'Per Section Meter Golden',
    totalBars: 8,
    globalDefaults: { meter: '4/4', tempo: 120 },
    sections: [
      {
        id: 'verse',
        label: 'Verse',
        type: 'verse',
        barRange: { startBar: 1, endBar: 4 },
      },
      {
        id: 'bridge',
        label: 'Bridge',
        type: 'bridge',
        barRange: { startBar: 5, endBar: 8 },
        meterMap: [{ bar: 5, meter: '7/8' }],
      },
    ],
    localOverrides: [],
  };
}

function meterAtBar(map: BarMeterMap | undefined, bar: number): { num: number; den: number } {
  const sig = resolveMeterForBar(bar, map);
  return { num: sig.numerator, den: sig.denominator };
}

function testSongModePerSectionMeter79001(): boolean {
  const song = perSectionMeterGoldenSong();
  const r = runGoldenPathOnce(79001, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bill_evans',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS_8,
    parsedChordBars: CHORDS_8,
    song,
  });
  const map = r.context?.barMeterMap ?? r.context?.generationMetadata?.barMeterMap;
  if (!r.score || !map) return false;
  const b1 = meterAtBar(map, 1);
  const b5 = meterAtBar(map, 5);
  return (
    b1.num === 4 &&
    b1.den === 4 &&
    b5.num === 7 &&
    b5.den === 8 &&
    r.context?.generationMetadata?.sectionMeterApplied === true
  );
}

function testStringQuartetPerSectionMeter79002(): boolean {
  const song = perSectionMeterGoldenSong();
  const map = resolveBarMeterMapForGenerateRequest({ totalBars: 8, song, seed: 79002 });
  const progression = CHORDS_8.join(' | ');
  const r = runQuartetRealisation({
    seed: 79002,
    title: 'SQ per-section meter golden',
    totalBars: 8,
    chordProgressionText: progression,
    barMeterMap: map,
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      sectionMeterApplied: true,
      barMeterMap: map,
      parsedCustomProgressionBars: [...CHORDS_8],
      harmonySource: 'custom',
    },
  });
  const scoreMap = r.score?.barMeterMap ?? map;
  const b1 = meterAtBar(scoreMap, 1);
  const b5 = meterAtBar(scoreMap, 5);
  return (
    r.planning.validation.ok &&
    r.score != null &&
    r.exportPipeline.ok === true &&
    b1.num === 4 &&
    b1.den === 4 &&
    b5.num === 7 &&
    b5.den === 8
  );
}

function testStringQuartetZappaRespect79003(): boolean {
  const song = perSectionMeterGoldenSong();
  const map = resolveBarMeterMapForGenerateRequest({
    totalBars: 8,
    song,
    seed: 79003,
    songwriterStyleId: 'frank_zappa',
    zappaGceAutoBarMeterMapEnabled: true,
    zappaGceMeterMode: 'respect',
    zappaStyleMode: 'compositional',
  });
  const progression = CHORDS_8.join(' | ');
  const r = runQuartetRealisation({
    seed: 79003,
    title: 'SQ Zappa respect meter golden',
    totalBars: 8,
    chordProgressionText: progression,
    barMeterMap: map,
    songwriterStyleId: 'frank_zappa',
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      songwriterStyleId: 'frank_zappa',
      sectionMeterApplied: true,
      zappaGceMeterMode: 'respect',
      barMeterMap: map,
      parsedCustomProgressionBars: [...CHORDS_8],
      harmonySource: 'custom',
      zappaSQHarmonySlice: true,
    },
  });
  const scoreMap = r.score?.barMeterMap ?? map;
  const b1 = meterAtBar(scoreMap, 1);
  const b5 = meterAtBar(scoreMap, 5);
  const b2 = meterAtBar(scoreMap, 2);
  return (
    r.planning.validation.ok &&
    r.score != null &&
    r.exportPipeline.ok === true &&
    b1.num === 4 &&
    b1.den === 4 &&
    b2.num === 4 &&
    b2.den === 4 &&
    b5.num === 7 &&
    b5.den === 8
  );
}

export function runPerSectionMeterTests(): { name: string; ok: boolean }[] {
  return [
    ['Per-section meter — Song Mode seed 79001 (4/4 → 7/8)', testSongModePerSectionMeter79001],
    ['Per-section meter — String Quartet seed 79002', testStringQuartetPerSectionMeter79002],
    [
      'Per-section meter — String Quartet + Zappa respect seed 79003',
      testStringQuartetZappaRespect79003,
    ],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
