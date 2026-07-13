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
import type { AbstractLineSet, LineRole } from '../core/counterpoint/abstractLineSet';
import * as mosaicTilePipeline from '../core/mosaic-mode/mosaicTilePipeline';
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

function injectEligiblePlan(): MosaicModeSectionPlanEntry[] {
  return baseMosaicPlan().map((s) =>
    s.sectionLabel === 'development'
      ? { ...s, injectEligible: true, spineProtected: false }
      : { ...s, injectEligible: false }
  );
}

function intervalClass(a: number, b: number): number {
  return Math.abs(a - b) % 12;
}

function lineSetHasParallelOctaveOrFifth(lines: AbstractLineSet): boolean {
  const roles: LineRole[] = ['soprano', 'alto', 'tenor', 'bass'];
  const grid = new Map<number, Partial<Record<LineRole, number>>>();
  for (const v of lines.voices) {
    for (const n of v.notes) {
      const k = Math.round(n.offsetBars * 64) / 64;
      let slot = grid.get(k);
      if (!slot) {
        slot = {};
        grid.set(k, slot);
      }
      slot[v.role] = n.pitchMidi;
    }
  }
  const keys = [...grid.keys()].sort((a, b) => a - b);
  let prev: Partial<Record<LineRole, number>> | undefined;
  for (const k of keys) {
    const curr = grid.get(k)!;
    if (prev) {
      for (const [hi, lo] of [
        ['soprano', 'bass'],
        ['soprano', 'alto'],
        ['alto', 'tenor'],
      ] as const) {
        const p1 = prev[hi];
        const p2 = prev[lo];
        const c1 = curr[hi];
        const c2 = curr[lo];
        if (p1 == null || p2 == null || c1 == null || c2 == null) continue;
        const icp = intervalClass(p1, p2);
        const icc = intervalClass(c1, c2);
        const d1 = c1 - p1;
        const d2 = c2 - p2;
        const sameDir = Math.sign(d1) === Math.sign(d2) && d1 !== 0 && d2 !== 0;
        if (!sameDir) continue;
        if (icp === 0 && icc === 0 && Math.abs(c1 - p1) >= 12) return true;
        if (icp === 7 && icc === 7) return true;
      }
    }
    prev = curr;
  }
  return false;
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
      songwriterStyleId: 'sq_vrb_bartok',
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
    songwriterStyleId: 'sq_vrb_bartok',
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
        songwriterStyleId: 'sq_vrb_bartok',
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

describe('String Quartet mosaic contrapuntal guides (V80f)', () => {
  it('A: flag off → no guide built, no soft-targeting metadata', () => {
    const plan = injectEligiblePlan();
    const context = sqMosaicContext(plan, { allowMosaicPostFinalizeInject: true });
    const r = runQuartetRealisation(
      sqRealiseInput({ sqMosaicEnabled: false, context, seed: SEED_OFF + 1 })
    );
    expect(r.planning.validation.ok).toBe(true);
    expect(r.ensembleHarmonyMetadata?.mosaicSqContrapuntalGuides).toBeUndefined();
    expect(r.ensembleHarmonyMetadata?.contrapuntalLineSet).toBeUndefined();
  });

  it('B: flag on + injectEligible section → guide built, motif bias on soprano, voice-leading intact', () => {
    const plan = injectEligiblePlan();
    const context = sqMosaicContext(plan, { allowMosaicPostFinalizeInject: true });
    const r = runQuartetRealisation(sqRealiseInput({ sqMosaicEnabled: true, context, seed: 88013 }));

    expect(r.planning.validation.ok).toBe(true);
    const guides = r.ensembleHarmonyMetadata?.mosaicSqContrapuntalGuides;
    expect(guides).toBeDefined();
    expect(guides!.development).toBeDefined();
    expect(guides!.development.motifContour?.length).toBeGreaterThan(0);
    expect(guides!.contrast).toBeUndefined();

    const lines = r.ensembleHarmonyMetadata?.contrapuntalLineSet as AbstractLineSet | undefined;
    expect(lines).toBeDefined();
    expect(lines!.sourceMode).toBe('melody_plus_chords');
    expect(lineSetHasParallelOctaveOrFifth(lines!)).toBe(false);

    const soprano = lines!.voices.find((v) => v.role === 'soprano');
    expect(soprano?.notes.length).toBeGreaterThan(0);
    const guide = guides!.development;
    const soft = guide.motifAnchors.find((a) => a.weight === 'soft' && a.pitchMidi != null);
    if (soft) {
      const match = soprano!.notes.find(
        (n) =>
          Math.floor(n.offsetBars) + 1 === soft.bar &&
          Math.abs(n.offsetBars % 1 - soft.beat / 4) < 0.2
      );
      expect(match).toBeDefined();
    }
  });

  it('C: spineProtected section → no guide entry for protected section', () => {
    const plan = baseMosaicPlan().map((s) =>
      s.sectionLabel === 'contrast'
        ? { ...s, injectEligible: true, spineProtected: true }
        : { ...s, injectEligible: true, spineProtected: false }
    );
    const context = sqMosaicContext(plan, { allowMosaicPostFinalizeInject: true });
    const r = runQuartetRealisation(sqRealiseInput({ sqMosaicEnabled: true, context, seed: 88014 }));

    const guides = r.ensembleHarmonyMetadata?.mosaicSqContrapuntalGuides ?? {};
    expect(guides.development).toBeDefined();
    expect(guides.contrast).toBeUndefined();
  });

  it('D: SQ path never calls injectMosaicMotifNotesPostFinalize', () => {
    const plan = injectEligiblePlan();
    const context = sqMosaicContext(plan, { allowMosaicPostFinalizeInject: true });
    const spy = jest
      .spyOn(mosaicTilePipeline, 'injectMosaicMotifNotesPostFinalize')
      .mockImplementation((score) => score);

    try {
      runQuartetRealisation(sqRealiseInput({ sqMosaicEnabled: true, context, seed: 88015 }));
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('E: hard cadence downbeat anchor honoured; soft anchor may deviate', () => {
    const plan = injectEligiblePlan();
    const context = sqMosaicContext(plan, { allowMosaicPostFinalizeInject: true });
    const r = runQuartetRealisation(sqRealiseInput({ sqMosaicEnabled: true, context, seed: 88016 }));

    const guides = r.ensembleHarmonyMetadata?.mosaicSqContrapuntalGuides?.development;
    const lines = r.ensembleHarmonyMetadata?.contrapuntalLineSet as AbstractLineSet | undefined;
    expect(guides).toBeDefined();
    expect(lines).toBeDefined();

    const hard = guides!.motifAnchors.find(
      (a) => a.weight === 'hard' && a.pitchMidi != null && Math.abs(a.beat) < 1e-6
    );
    const soft = guides!.motifAnchors.find((a) => a.weight === 'soft' && a.pitchMidi != null);
    const soprano = lines!.voices.find((v) => v.role === 'soprano')!;

    expect(hard).toBeDefined();
    expect(soft).toBeDefined();

    const hardNote = soprano.notes.find(
      (n) =>
        Math.floor(n.offsetBars) + 1 === hard!.bar && Math.abs((n.offsetBars % 1) * 4 - hard!.beat) < 0.2
    );
    expect(hardNote?.pitchMidi).toBe(hard!.pitchMidi);

    const gridSoft = guides!.motifAnchors.find(
      (a) =>
        a.weight === 'soft' &&
        a.pitchMidi != null &&
        (Math.abs(a.beat) < 1e-6 || Math.abs(a.beat - 2) < 1e-6)
    );
    if (gridSoft) {
      const softNote = soprano.notes.find(
        (n) =>
          Math.floor(n.offsetBars) + 1 === gridSoft.bar &&
          Math.abs((n.offsetBars % 1) * 4 - gridSoft.beat) < 0.2
      );
      if (softNote && softNote.pitchMidi !== gridSoft.pitchMidi) {
        expect(Math.abs(softNote.pitchMidi - gridSoft.pitchMidi)).toBeLessThanOrEqual(8);
      }
    }
  });
});