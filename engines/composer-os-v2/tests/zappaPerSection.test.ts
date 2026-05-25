/**
 * V65 P5 golden — per-section Zappa behavior (off smoke until V65 closeout).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  resolveZappaSectionBehaviorForBar,
} from '../core/song-mode/frankZappaSlice';
import type { CompositionContext } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { Song } from '../core/section-architecture/sectionArchitectureTypes';

const SEED = 84003;
const CHORDS = Array.from({ length: 8 }, (_, i) => (i < 4 ? 'Bb7' : 'E7alt'));

function zappaPerSectionSong(): Song {
  return {
    schemaVersion: 1,
    id: 'zappa_per_section_v65_p5',
    title: 'Zappa Per Section V65 P5',
    totalBars: 8,
    globalDefaults: {
      meter: '4/4',
      tempo: 120,
      defaultDensity: 'moderate',
      defaultPitchProfile: { registerFloor: 52, registerCeiling: 68, chromaticBudget: 0.3 },
    },
    sections: [
      {
        id: 'a',
        label: 'A',
        type: 'verse',
        barRange: { startBar: 1, endBar: 4 },
        energy: 0.25,
        pitchProfile: { registerFloor: 48, registerCeiling: 64, chromaticBudget: 0.3 },
        rhythmProfile: { antiMetric: false, metricDisplacement: 0.2 },
      },
      {
        id: 'b',
        label: 'B',
        type: 'bridge',
        barRange: { startBar: 5, endBar: 8 },
        energy: 0.88,
        pitchProfile: { registerFloor: 64, registerCeiling: 84, chromaticBudget: 0.7 },
        rhythmProfile: { antiMetric: true, metricDisplacement: 0.8 },
      },
    ],
    localOverrides: [
      { barRange: { startBar: 1, endBar: 4 }, target: 'section', parameterPath: 'density', value: 'sparse' },
      { barRange: { startBar: 5, endBar: 8 }, target: 'section', parameterPath: 'density', value: 'dense' },
    ],
  };
}

function guitarNotesByBars(score: ScoreModel | undefined, bars: number[]): { count: number; meanPitch: number; maxPitch: number } {
  const guitar = score?.parts.find((p) => p.id === 'guitar');
  if (!guitar) return { count: 0, meanPitch: 0, maxPitch: 0 };
  const pitches: number[] = [];
  let count = 0;
  for (const bar of bars) {
    const measure = guitar.measures.find((m) => m.index === bar);
    if (!measure) continue;
    for (const e of measure.events) {
      if (e.kind !== 'note') continue;
      count++;
      pitches.push(e.pitch);
    }
  }
  return {
    count,
    meanPitch: pitches.length ? pitches.reduce((a, p) => a + p, 0) / pitches.length : 0,
    maxPitch: pitches.length ? Math.max(...pitches) : 0,
  };
}

function runZappaPerSection() {
  return runGoldenPathOnce(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'frank_zappa',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS,
    parsedChordBars: CHORDS,
    song: zappaPerSectionSong(),
  });
}

function testResolveZappaSectionBehaviorHelper(): boolean {
  const r = runZappaPerSection();
  const ctx = r.context as CompositionContext | undefined;
  if (!ctx) return false;
  const a = resolveZappaSectionBehaviorForBar(2, ctx);
  const b = resolveZappaSectionBehaviorForBar(6, ctx);
  return (
    a?.sectionLabel === 'A' &&
    b?.sectionLabel === 'B' &&
    b.densityScalar > a.densityScalar &&
    b.registerShiftSemitones > a.registerShiftSemitones &&
    b.receipts.includes('FZ_DIFF_02')
  );
}

function testZappaSectionBehaviorMetadata(): boolean {
  const r = runZappaPerSection();
  const md = r.context?.generationMetadata;
  const bySection = md?.zappaSectionBehaviorBySection;
  const diff = md?.frankZappaDiffReceipts ?? [];
  if (!bySection?.A || !bySection.B) return false;
  return (
    diff.includes('FZ_DIFF_01') &&
    diff.includes('FZ_DIFF_02') &&
    bySection.B.meanDensityScalar > bySection.A.meanDensityScalar &&
    bySection.B.meanRegisterShiftSemitones > bySection.A.meanRegisterShiftSemitones &&
    bySection.B.receipts.includes('FZ_DIFF_02')
  );
}

function testZappaPerSectionOutputDiffers(): boolean {
  const r = runZappaPerSection();
  if (!r.score) return false;
  const a = guitarNotesByBars(r.score, [1, 2, 3, 4]);
  const b = guitarNotesByBars(r.score, [5, 6, 7, 8]);
  const deviceReceipts = r.context?.generationMetadata?.frankZappaDeviceReceipts ?? [];
  const dReceiptsHarmonyOnly = deviceReceipts
    .filter((x) => /^fz:d[1-5]:/.test(x))
    .every((x) => /^fz:d[1-5]:[^@]+@bar\d+#v1$/.test(x));
  return dReceiptsHarmonyOnly && b.maxPitch > a.maxPitch && Math.abs(b.count - a.count) >= 1;
}

export function runZappaPerSectionTests(): { name: string; ok: boolean }[] {
  return [
    ['Zappa per-section — helper resolves A/B behavior (seed 84003)', testResolveZappaSectionBehaviorHelper],
    ['Zappa per-section — metadata records section behavior', testZappaSectionBehaviorMetadata],
    ['Zappa per-section — output differs in density/register and fz:d1-d5 stays harmony-only', testZappaPerSectionOutputDiffers],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
