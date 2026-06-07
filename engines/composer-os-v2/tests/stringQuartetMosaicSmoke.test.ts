/**
 * V80e — String Quartet end-to-end mosaic smoke harness (flags ON).
 * Proves SQ mosaic dispatch + eval fire before contrapuntal pass; no SQ inject (V80g).
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import * as contrapuntalPass4 from '../core/counterpoint/contrapuntalPass4MusicXmlMerge';
import {
  chordSymbolsEqualForPipelineTruth,
  chordStringFromMusicXmlHarmonyBlock,
} from '../core/export/chordSymbolMusicXml';
import { validateWrittenMusicXmlComplete } from '../core/export/validateMusicXmlWrittenStrict';
import { isMosaicModeActive } from '../core/mosaic-mode/mosaicBarHelpers';
import type { MosaicModeSectionPlanEntry } from '../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

jest.setTimeout(120_000);

const SEED = 88011;
const SEED_OFF = 88012;
const TOTAL_BARS = 32;

function lockedProgression32(): string[] {
  const roots = ['E', 'A', 'B', 'C#m', 'A', 'E', 'F#m', 'B'];
  const half = Array.from({ length: 16 }, (_, i) => (i < 8 ? `${roots[i]}maj7` : `${roots[i - 8]}7`));
  return [...half, ...half];
}

function baseMosaicPlan(): MosaicModeSectionPlanEntry[] {
  return [
    {
      sectionLabel: 'development',
      startBar: 1,
      endBar: 16,
      songwriterStyleId: 'verlaine',
      presetRole: 'string_quartet',
      mosaicOwned: true,
      injectEligible: false,
      spineProtected: false,
    },
    {
      sectionLabel: 'contrast',
      startBar: 17,
      endBar: 32,
      songwriterStyleId: 'marr',
      presetRole: 'string_quartet',
      mosaicOwned: true,
      injectEligible: false,
      spineProtected: true,
    },
  ];
}

function sqMosaicContext(
  plan: MosaicModeSectionPlanEntry[],
  overrides: Partial<GenerationMetadata> = {}
): CompositionContext {
  const locked = lockedProgression32();
  return {
    systemVersion: '2',
    presetId: 'string_quartet',
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
      songwriterStyleId: 'bartok',
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

function sqRealiseInput(
  overrides: {
    sqMosaicEnabled?: boolean;
    context?: CompositionContext;
    seed?: number;
  } = {}
) {
  const locked = lockedProgression32();
  return {
    seed: overrides.seed ?? SEED,
    title: 'SQ mosaic smoke',
    totalBars: TOTAL_BARS,
    chordProgressionText: locked.join(' | '),
    songwriterStyleId: 'bartok',
    suppressWybleVoiceLayoutForTest: true,
    ...overrides,
  };
}

interface SqMosaicSpyCapture {
  result: ReturnType<typeof runQuartetRealisation>;
  dispatchCalls: number;
  evalCalls: number;
  evalComposerIds: string[] | undefined;
  mergedBars: string[] | undefined;
  contrapuntalCalls: number;
}

function runSqMosaicWithSpies(
  input: ReturnType<typeof sqRealiseInput>
): SqMosaicSpyCapture {
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
  const origContrapuntal = contrapuntalPass4.applySqContrapuntalPass4MergeOnScore;

  let dispatchCalls = 0;
  let evalCalls = 0;
  let evalComposerIds: string[] | undefined;
  let mergedBars: string[] | undefined;
  let contrapuntalCalls = 0;

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
  jest.spyOn(contrapuntalPass4, 'applySqContrapuntalPass4MergeOnScore').mockImplementation((...args) => {
    contrapuntalCalls++;
    return origContrapuntal(...args);
  });

  try {
    return {
      result: runQuartetRealisation(input),
      dispatchCalls,
      evalCalls,
      evalComposerIds,
      mergedBars,
      contrapuntalCalls,
    };
  } finally {
    dispatchMod.getDispatchEntry = origDispatch;
    precomputeMod.precomputeMosaicEffectiveHarmonyBars = origPrecompute;
    evalMod.evaluateMosaicSections = origEval;
    jest.restoreAllMocks();
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

describe('String Quartet mosaic smoke (V80e)', () => {
  it('A: SQ + sqMosaicEnabled + 2 sections → mosaic active, dispatch, eval, contrapuntal, pipeline-truth', () => {
    const plan = baseMosaicPlan();
    const context = sqMosaicContext(plan);
    expect(isMosaicModeActive(context)).toBe(true);

    const { result: r, dispatchCalls, evalCalls, evalComposerIds, mergedBars, contrapuntalCalls } =
      runSqMosaicWithSpies(sqRealiseInput({ sqMosaicEnabled: true, context }));

    expect(r.planning.validation.ok).toBe(true);
    expect(r.score).toBeDefined();
    expect(r.exportPipeline.ok).toBe(true);
    expect(dispatchCalls).toBeGreaterThan(0);
    expect(evalCalls).toBeGreaterThan(0);
    expect(contrapuntalCalls).toBeGreaterThan(0);
    expect(evalComposerIds).toEqual(['verlaine', 'marr']);
    expect(mergedBars?.length).toBe(TOTAL_BARS);
    expect(r.score!.parts.length).toBe(5);

    const xml = r.exportPipeline.xml ?? '';
    expect(xml.includes('score-partwise')).toBe(true);
    if (mergedBars) {
      assertEnsembleHarmonyPipelineTruth(r.score!, xml, mergedBars);
    }
  });

  it('B: SQ + flag off → no mosaic dispatch, normal SQ output', () => {
    const locked = lockedProgression32();
    const { result: r, dispatchCalls } = withDispatchSpyOnly(() =>
      runQuartetRealisation({
        seed: SEED_OFF,
        title: 'SQ mosaic off',
        totalBars: TOTAL_BARS,
        chordProgressionText: locked.join(' | '),
        songwriterStyleId: 'bartok',
        suppressWybleVoiceLayoutForTest: true,
      })
    );

    expect(r.planning.validation.ok).toBe(true);
    expect(r.score).toBeDefined();
    expect(r.exportPipeline.ok).toBe(true);
    expect(r.score!.parts.length).toBe(5);
    expect(dispatchCalls).toBe(0);
    expect(isMosaicModeActive(sqMosaicContext(baseMosaicPlan()))).toBe(true);
    expect(isMosaicModeActive({ generationMetadata: {} } as CompositionContext)).toBe(false);
  });

  it('C: SQ dispatch runs before contrapuntal pass', () => {
    const plan = baseMosaicPlan();
    const context = sqMosaicContext(plan);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const precomputePath = require.resolve('../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const precomputeMod = require(precomputePath) as typeof import('../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars');
    const origPrecompute = precomputeMod.precomputeMosaicEffectiveHarmonyBars;
    const origContrapuntal = contrapuntalPass4.applySqContrapuntalPass4MergeOnScore;

    const order: string[] = [];

    precomputeMod.precomputeMosaicEffectiveHarmonyBars = (...args) => {
      order.push('dispatch');
      return origPrecompute(...args);
    };
    jest.spyOn(contrapuntalPass4, 'applySqContrapuntalPass4MergeOnScore').mockImplementation((...args) => {
      order.push('contrapuntal');
      return origContrapuntal(...args);
    });

    try {
      const r = runQuartetRealisation(sqRealiseInput({ sqMosaicEnabled: true, context }));
      expect(r.planning.validation.ok).toBe(true);
      expect(r.score).toBeDefined();
      expect(order.indexOf('dispatch')).toBeGreaterThanOrEqual(0);
      expect(order.indexOf('contrapuntal')).toBeGreaterThanOrEqual(0);
      expect(order.indexOf('dispatch')).toBeLessThan(order.indexOf('contrapuntal'));
    } finally {
      precomputeMod.precomputeMosaicEffectiveHarmonyBars = origPrecompute;
      jest.restoreAllMocks();
    }
  });
});