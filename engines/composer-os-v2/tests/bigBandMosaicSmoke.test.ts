/**
 * V80b/d/e — Big Band end-to-end mosaic smoke harness (flags ON).
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import {
  chordSymbolsEqualForPipelineTruth,
  chordStringFromMusicXmlHarmonyBlock,
} from '../core/export/chordSymbolMusicXml';
import { validateWrittenMusicXmlComplete } from '../core/export/validateMusicXmlWrittenStrict';
import { isMosaicModeActive } from '../core/mosaic-mode/mosaicBarHelpers';
import type { MosaicModeSectionPlanEntry } from '../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import {
  BB_MOSAIC_INJECT_EXCLUDED_PART_IDS,
  BB_MOSAIC_INJECT_LEAD_PART_ID,
} from '../core/mosaic-mode/mosaicTilePipeline';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

jest.setTimeout(120_000);

const SEED = 88001;
const SEED_OFF = 88002;
const TOTAL_BARS = 32;

function lockedProgression32(): string[] {
  const roots = ['E', 'A', 'B', 'C#m', 'A', 'E', 'F#m', 'B'];
  const half = Array.from({ length: 16 }, (_, i) => (i < 8 ? `${roots[i]}maj7` : `${roots[i - 8]}7`));
  return [...half, ...half];
}

function baseMosaicPlan(): MosaicModeSectionPlanEntry[] {
  return [
    {
      sectionLabel: 'background_figures',
      startBar: 1,
      endBar: 16,
      songwriterStyleId: 'verlaine',
      presetRole: 'big_band',
      mosaicOwned: true,
      injectEligible: false,
      spineProtected: false,
    },
    {
      sectionLabel: 'shout_chorus',
      startBar: 17,
      endBar: 32,
      songwriterStyleId: 'marr',
      presetRole: 'big_band',
      mosaicOwned: true,
      injectEligible: false,
      spineProtected: true,
    },
  ];
}

function bbMosaicContext(
  plan: MosaicModeSectionPlanEntry[],
  overrides: Partial<GenerationMetadata> = {}
): CompositionContext {
  const locked = lockedProgression32();
  return {
    systemVersion: '2',
    presetId: 'big_band',
    seed: SEED,
    form: {
      sections: plan.map((s) => ({
        label: s.sectionLabel,
        startBar: s.startBar,
        length: s.endBar - s.startBar + 1,
      })),
      totalBars: TOTAL_BARS,
    },
    lockedHarmonyBarsRaw: locked,
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: {
      segments: [{ startBar: 1, bars: TOTAL_BARS, chord: locked[0] ?? 'Em7' }],
      totalBars: TOTAL_BARS,
    },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: {
      generatedAt: '2026-06-07T00:00:00.000Z',
      songwriterStyleId: 'verlaine',
      mosaicSectionPlan: plan,
      ...overrides,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function bbRealiseInput(overrides: { bbMosaicEnabled?: boolean; context?: CompositionContext } = {}) {
  const locked = lockedProgression32();
  return {
    seed: SEED,
    title: 'BB mosaic smoke',
    totalBars: TOTAL_BARS,
    chordProgressionText: locked.join(' | '),
    suppressWybleVoiceLayoutForTest: true,
    ...overrides,
  };
}

interface BbMosaicSpyCapture {
  result: ReturnType<typeof runBigBandRealisation>;
  dispatchCalls: number;
  evalCalls: number;
  evalComposerIds: string[] | undefined;
  mergedBars: string[] | undefined;
}

function runBbMosaicWithSpies(
  input: ReturnType<typeof bbRealiseInput>
): BbMosaicSpyCapture {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dispatchMod = require('../core/mosaic-mode/mosaicComposerDispatch') as {
    getDispatchEntry: (composerId: string) => unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const precomputePath = require.resolve('../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const precomputeMod = require(precomputePath) as typeof import('../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const evalPath = require.resolve('../core/mosaic-mode/evaluateMosaicSections');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const evalMod = require(evalPath) as typeof import('../core/mosaic-mode/evaluateMosaicSections');

  const origDispatch = dispatchMod.getDispatchEntry;
  const origPrecompute = precomputeMod.precomputeMosaicEffectiveHarmonyBars;
  const origEval = evalMod.evaluateMosaicSections;

  let dispatchCalls = 0;
  let evalCalls = 0;
  let evalComposerIds: string[] | undefined;
  let mergedBars: string[] | undefined;

  dispatchMod.getDispatchEntry = (composerId: string) => {
    dispatchCalls++;
    return origDispatch(composerId);
  };
  precomputeMod.precomputeMosaicEffectiveHarmonyBars = (...args) => {
    const out = origPrecompute(...args);
    mergedBars = [...out.bars];
    return out;
  };
  evalMod.evaluateMosaicSections = (score, ctx) => {
    evalCalls++;
    const results = origEval(score, ctx);
    evalComposerIds = results.map((e) => e.composerId);
    return results;
  };

  try {
    return {
      result: runBigBandRealisation(input),
      dispatchCalls,
      evalCalls,
      evalComposerIds,
      mergedBars,
    };
  } finally {
    dispatchMod.getDispatchEntry = origDispatch;
    precomputeMod.precomputeMosaicEffectiveHarmonyBars = origPrecompute;
    evalMod.evaluateMosaicSections = origEval;
  }
}

function withDispatchSpyOnly<T>(fn: () => T): { result: T; dispatchCalls: number } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dispatchMod = require('../core/mosaic-mode/mosaicComposerDispatch') as {
    getDispatchEntry: (composerId: string) => unknown;
  };
  const original = dispatchMod.getDispatchEntry;
  let dispatchCalls = 0;
  dispatchMod.getDispatchEntry = (composerId: string) => {
    dispatchCalls++;
    return original(composerId);
  };
  try {
    return { result: fn(), dispatchCalls };
  } finally {
    dispatchMod.getDispatchEntry = original;
  }
}

function collectScoreChordsByBar(score: ScoreModel): Map<number, string> {
  const map = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.chord && !map.has(m.index)) {
        map.set(m.index, m.chord);
      }
    }
  }
  return map;
}

function extractHarmoniesFromEnsembleXml(xml: string): Map<number, string> {
  const parts = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/g) ?? [];
  const map = new Map<number, string>();
  for (const part of parts) {
    const measures = part.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
    for (const mb of measures) {
      const numMatch = mb.match(/<measure[^>]*number="(\d+)"/);
      const num = numMatch ? parseInt(numMatch[1], 10) : -1;
      if (num < 1 || map.has(num)) continue;
      const harmonyMatch = mb.match(/<harmony[^>]*>[\s\S]*?<\/harmony>/);
      if (!harmonyMatch) continue;
      const chordStr = chordStringFromMusicXmlHarmonyBlock(harmonyMatch[0]);
      if (chordStr) map.set(num, chordStr);
    }
  }
  return map;
}

function assertEnsembleHarmonyPipelineTruth(
  score: ScoreModel,
  xml: string,
  expectedBars: string[]
): void {
  const byBar = collectScoreChordsByBar(score);
  for (let b = 1; b <= expectedBars.length; b++) {
    const c = byBar.get(b);
    expect(c).toBeTruthy();
    expect(chordSymbolsEqualForPipelineTruth(c!, expectedBars[b - 1]!)).toBe(true);
  }
  const complete = validateWrittenMusicXmlComplete(score, xml);
  expect(complete.valid).toBe(true);
  const harmMap = extractHarmoniesFromEnsembleXml(xml);
  for (let b = 1; b <= expectedBars.length; b++) {
    const h = harmMap.get(b);
    expect(h).toBeTruthy();
    expect(chordSymbolsEqualForPipelineTruth(h!, expectedBars[b - 1]!)).toBe(true);
  }
}

function hasMosaicMotifInPartBar(score: ScoreModel, partId: string, bar: number): boolean {
  const m = score.parts.find((p) => p.id === partId)?.measures.find((x) => x.index === bar);
  if (!m) return false;
  return m.events.some(
    (e) => e.kind === 'note' && 'motifRef' in e && String(e.motifRef).startsWith('mosaic_motif_')
  );
}

function snapshotEventCount(score: ScoreModel, partId: string, bar: number): number {
  return (
    score.parts.find((p) => p.id === partId)?.measures.find((x) => x.index === bar)?.events.length ?? 0
  );
}

describe('Big Band mosaic smoke (V80b/d/e)', () => {
  it('A: BB + bbMosaicEnabled + 2 sections → mosaic active, dispatch, eval, pipeline-truth', () => {
    const plan = baseMosaicPlan();
    const context = bbMosaicContext(plan);
    expect(isMosaicModeActive(context)).toBe(true);

    const { result: r, dispatchCalls, evalCalls, evalComposerIds, mergedBars } = runBbMosaicWithSpies(
      bbRealiseInput({ bbMosaicEnabled: true, context })
    );

    expect(r.planning.validation.ok).toBe(true);
    expect(r.score).toBeDefined();
    expect(r.exportPipeline.ok).toBe(true);
    expect(dispatchCalls).toBeGreaterThan(0);
    expect(evalCalls).toBeGreaterThan(0);
    expect(evalComposerIds).toEqual(['verlaine', 'marr']);
    expect(mergedBars?.length).toBe(TOTAL_BARS);
    expect(r.score!.parts.length).toBe(7);

    const xml = r.exportPipeline.xml ?? '';
    expect(xml.includes('score-partwise')).toBe(true);
    if (mergedBars) {
      assertEnsembleHarmonyPipelineTruth(r.score!, xml, mergedBars);
    }
  });

  it('B: BB + bbMosaicEnabled + allowMosaicPostFinalizeInject → alto lead only', () => {
    const plan = baseMosaicPlan().map((s) =>
      s.sectionLabel === 'background_figures'
        ? { ...s, injectEligible: true, spineProtected: false }
        : s
    );
    const context = bbMosaicContext(plan, { allowMosaicPostFinalizeInject: true });

    const r = runBigBandRealisation(bbRealiseInput({ bbMosaicEnabled: true, context }));

    expect(r.planning.validation.ok).toBe(true);
    expect(r.score).toBeDefined();

    const beforeDrums = snapshotEventCount(r.score!, 'bb_drums', 1);
    const beforeRhythm = snapshotEventCount(r.score!, 'bb_rhythm_section', 1);

    expect(hasMosaicMotifInPartBar(r.score!, BB_MOSAIC_INJECT_LEAD_PART_ID, 1)).toBe(true);
    for (const excluded of BB_MOSAIC_INJECT_EXCLUDED_PART_IDS) {
      expect(hasMosaicMotifInPartBar(r.score!, excluded, 1)).toBe(false);
    }
    expect(snapshotEventCount(r.score!, 'bb_drums', 1)).toBe(beforeDrums);
    expect(snapshotEventCount(r.score!, 'bb_rhythm_section', 1)).toBe(beforeRhythm);
  });

  it('C: BB spineProtected section → inject skipped for protected section', () => {
    const plan = baseMosaicPlan().map((s) =>
      s.sectionLabel === 'background_figures'
        ? { ...s, injectEligible: true, spineProtected: false }
        : { ...s, injectEligible: true, spineProtected: true }
    );
    const context = bbMosaicContext(plan, { allowMosaicPostFinalizeInject: true });

    const r = runBigBandRealisation(bbRealiseInput({ bbMosaicEnabled: true, context }));

    expect(r.score).toBeDefined();
    expect(hasMosaicMotifInPartBar(r.score!, BB_MOSAIC_INJECT_LEAD_PART_ID, 1)).toBe(true);
    expect(hasMosaicMotifInPartBar(r.score!, BB_MOSAIC_INJECT_LEAD_PART_ID, 17)).toBe(false);
  });

  it('D: BB + flag off → no mosaic dispatch, normal BB output', () => {
    const locked = lockedProgression32();
    const { result: r, dispatchCalls } = withDispatchSpyOnly(() =>
      runBigBandRealisation({
        seed: SEED_OFF,
        title: 'BB mosaic off',
        totalBars: TOTAL_BARS,
        chordProgressionText: locked.join(' | '),
        suppressWybleVoiceLayoutForTest: true,
      })
    );

    expect(r.planning.validation.ok).toBe(true);
    expect(r.score).toBeDefined();
    expect(r.exportPipeline.ok).toBe(true);
    expect(r.score!.parts.length).toBe(7);
    expect(dispatchCalls).toBe(0);
    expect(isMosaicModeActive(bbMosaicContext(baseMosaicPlan()))).toBe(true);
    expect(isMosaicModeActive({ generationMetadata: {} } as CompositionContext)).toBe(false);
  });
});