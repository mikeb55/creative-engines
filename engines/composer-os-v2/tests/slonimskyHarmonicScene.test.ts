import type { CompositionContext } from '../core/compositionContext';
import {
  dominantVoicingColorFromCellPcs,
  enrichHarmonicScenesWithSlonimskyCells,
  pitchClassesFromIntervalPattern,
} from '../core/slonimsky/slonimskyHarmonicScene';
import { getPatternsBySection } from '../core/slonimsky/thesaurusRegistry';
import { applyHarmonicSceneChordBias } from '../core/composer/harmonicSceneChordBias';
import { applySlonimskyHarmonicSceneToContext } from '../core/slonimsky/slonimskyHarmonicScene';

function testPitchClassesFromPattern(): boolean {
  const pat = getPatternsBySection('tritone_progression')[0];
  if (!pat) return false;
  const pcs = pitchClassesFromIntervalPattern(pat, 0);
  return pcs.length >= 2 && pcs.every((p) => p >= 0 && p < 12);
}

function testTritoneColourMapping(): boolean {
  return dominantVoicingColorFromCellPcs([0, 6, 10], 0) === 'tritone-sus';
}

function testEnrichScenesSetsColour(): boolean {
  const scenes = [
    {
      sceneId: 'test_a',
      tensionLevel: 0.4,
      dominantVoicingColor: 'neutral',
      activeMotifIds: [],
      barRange: [1, 4] as [number, number],
    },
  ];
  const { scenes: out, receipts } = enrichHarmonicScenesWithSlonimskyCells(scenes, 42, 9, 'rio_73');
  return (
    out.length === 1 &&
    receipts.length === 1 &&
    out[0]!.dominantVoicingColor !== 'neutral' &&
    (out[0]!.slonimskyCellPitchClasses?.length ?? 0) >= 2
  );
}

function testZappaCompositionalContextWire(): boolean {
  const context = {
    seed: 42,
    presetId: 'song_mode',
    generationMetadata: {
      songwriterStyleId: 'frank_zappa',
      zappaStyleMode: 'compositional',
      zappaEraPreset: 'synclavier_84',
      generatedAt: 't',
    },
    form: { sections: [{ label: 'A', startBar: 1, length: 8 }], totalBars: 8 },
    harmonicScenes: [
      {
        sceneId: 'zappa_a',
        tensionLevel: 0.5,
        dominantVoicingColor: 'neutral',
        activeMotifIds: [],
        barRange: [1, 8] as [number, number],
      },
    ],
    lockedHarmonyBarsRaw: ['Am7', 'Am7', 'Am7', 'Am7', 'Am7', 'Am7', 'Am7', 'Am7'],
  } as unknown as CompositionContext;
  applySlonimskyHarmonicSceneToContext(context);
  const receipts = context.generationMetadata.slonimskyHarmonicSceneReceipts;
  if (!receipts?.length) return false;
  const biased = applyHarmonicSceneChordBias(4, 'Cmaj', context);
  return context.harmonicScenes![0]!.dominantVoicingColor !== 'neutral' || biased.includes('maj7');
}

export function runSlonimskyHarmonicSceneTests(): { name: string; ok: boolean }[] {
  return [
    ['Slonimsky Z7 — pitch classes from pattern', testPitchClassesFromPattern],
    ['Slonimsky Z7 — tritone cell → tritone-sus colour', testTritoneColourMapping],
    ['Slonimsky Z7 — enrich harmonic scenes', testEnrichScenesSetsColour],
    ['Slonimsky Z7 — compositional Zappa context + chord bias', testZappaCompositionalContextWire],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
