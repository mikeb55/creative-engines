/**
 * V79e — Song Mode end-to-end mosaic smoke harness.
 * Confirms Song Mode generate (2+ sections, explicit opt-in) activates mosaic dispatch,
 * section eval, optional retry, and pipeline-truth on the Song Mode golden-path arm.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { manifestPathForMusicXml } from '../app-api/composerOsOutputPaths';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import { isMosaicModeActive } from '../core/mosaic-mode/mosaicBarHelpers';
import { pipelineTruthAllPassed } from '../core/score-integrity/pipelineTruthGates';

jest.setTimeout(120_000);

const SEED = 77777;
const SEED_RETRY = 79002;
const SEED_LEAD = 77777;
const SEED_SINGLE = 77777;
const TOTAL_BARS = 32;

const MOSAIC_PLAN_2: NonNullable<RunGoldenPathOptions['mosaicSectionPlan']> = [
  { sectionLabel: 'verse', startBar: 1, endBar: 16, songwriterStyleId: 'verlaine' },
  { sectionLabel: 'chorus', startBar: 17, endBar: 32, songwriterStyleId: 'marr' },
];

function lockedProgression32(): string[] {
  const roots = ['E', 'A', 'B', 'C#m', 'A', 'E', 'F#m', 'B'];
  const half = Array.from({ length: 16 }, (_, i) => (i < 8 ? `${roots[i]}maj7` : `${roots[i - 8]}7`));
  return [...half, ...half];
}

function songModeGoldenPathOpts(
  overrides: Partial<RunGoldenPathOptions> = {}
): RunGoldenPathOptions {
  const locked = lockedProgression32();
  const progressionText = locked.join(' | ');
  return {
    presetId: 'guitar_bass_duo',
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'verlaine',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: locked,
    parsedChordBars: [...locked],
    chordProgressionText: progressionText,
    mosaicSectionPlan: MOSAIC_PLAN_2,
    ...overrides,
  };
}

function songModeAppRequest(overrides: Partial<GenerateRequest> = {}): GenerateRequest {
  const locked = lockedProgression32();
  return {
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    seed: SEED,
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    primarySongwriterStyle: 'verlaine',
    styleProfile: 'STYLE_ECM',
    chordProgressionText: locked.join(' | '),
    mosaicSectionPlan: MOSAIC_PLAN_2,
    ...overrides,
  };
}

function withDispatchSpy<T>(fn: () => T): { result: T; dispatchCalls: number } {
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

describe('Song Mode mosaic smoke (V79e)', () => {
  let outputDir: string;

  beforeAll(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'song-mode-mosaic-smoke-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(outputDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('A: Song Mode + 2 sections → mosaic active, dispatch, eval, pipeline-truth', () => {
    const { result: gp, dispatchCalls } = withDispatchSpy(() =>
      runGoldenPathOnce(SEED, songModeGoldenPathOpts())
    );
    const md = gp.context?.generationMetadata;

    expect(gp.success).toBe(true);
    expect(gp.context).toBeDefined();
    expect(isMosaicModeActive(gp.context!)).toBe(true);
    expect(dispatchCalls).toBeGreaterThan(0);
    expect(Array.isArray(md?.mosaicMergedHarmonyBars)).toBe(true);
    expect(md?.mosaicMergedHarmonyBars?.length).toBe(TOTAL_BARS);
    expect(Array.isArray(md?.verlaineEffectiveHarmonyBars)).toBe(true);
    expect(Array.isArray(md?.marrEffectiveHarmonyBars)).toBe(true);
    expect(md?.mosaicSectionEvalResults?.length).toBe(2);
    expect(md?.mosaicSectionEvalResults?.map((e) => e.composerId)).toEqual(['verlaine', 'marr']);
    expect(gp.truthReport).toBeDefined();
    expect(pipelineTruthAllPassed(gp.truthReport!)).toBe(true);
    expect(gp.truthReport?.inputStage).toBe('pass');
    expect(gp.truthReport?.scoreStage).toBe('pass');
    expect(gp.truthReport?.exportStage).toBe('pass');

    const app = runAppGeneration(songModeAppRequest(), outputDir);
    expect(app.success).toBe(true);
    expect(app.filepath).toBeTruthy();
    const manifest = JSON.parse(
      fs.readFileSync(manifestPathForMusicXml(app.filepath!), 'utf8')
    ) as {
      pipelineTruthInputStage?: string;
      pipelineTruthScoreStage?: string;
      pipelineTruthExportStage?: string;
    };
    expect(manifest.pipelineTruthInputStage).toBe('pass');
    expect(manifest.pipelineTruthScoreStage).toBe('pass');
    expect(manifest.pipelineTruthExportStage).toBe('pass');
  });

  it('fires mosaicSectionRetry when a mosaic section fails eval', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const evalPath = require.resolve('../core/mosaic-mode/evaluateMosaicSections');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const retryPath = require.resolve('../core/mosaic-mode/mosaicSectionRetry');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const evalMod = require(evalPath) as typeof import('../core/mosaic-mode/evaluateMosaicSections');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const retryMod = require(retryPath) as typeof import('../core/mosaic-mode/mosaicSectionRetry');

    const origEval = evalMod.evaluateMosaicSections;
    const origRetry = retryMod.runMosaicSectionRetrySync;
    let evalCalls = 0;
    let retryCalls = 0;

    evalMod.evaluateMosaicSections = (score, ctx) => {
      evalCalls++;
      if (evalCalls === 1) {
        return [
          {
            sectionLabel: 'verse',
            startBar: 1,
            endBar: 16,
            composerId: 'verlaine',
            passed: false,
            scores: { overall: 4.0 },
            failures: ['forced fail for retry smoke'],
          },
          {
            sectionLabel: 'chorus',
            startBar: 17,
            endBar: 32,
            composerId: 'marr',
            passed: true,
            scores: { overall: 8.0 },
            failures: [],
          },
        ];
      }
      return origEval(score, ctx);
    };
    retryMod.runMosaicSectionRetrySync = (...args) => {
      retryCalls++;
      return origRetry(...args);
    };

    try {
      const gp = runGoldenPathOnce(SEED_RETRY, songModeGoldenPathOpts());
      expect(isMosaicModeActive(gp.context!)).toBe(true);
      expect(retryCalls).toBeGreaterThan(0);
      expect(gp.context?.generationMetadata?.mosaicSectionEvalResults?.length).toBe(2);
    } finally {
      evalMod.evaluateMosaicSections = origEval;
      retryMod.runMosaicSectionRetrySync = origRetry;
    }
  });

  it('B: Song Mode + 1-entry plan → mosaic inactive (V79a opt-in guard)', () => {
    const singlePlan: NonNullable<GenerateRequest['mosaicSectionPlan']> = [
      { sectionLabel: 'verse', startBar: 1, endBar: TOTAL_BARS, songwriterStyleId: 'bacharach' },
    ];
    const locked = lockedProgression32();
    const nonMosaicOpts: RunGoldenPathOptions = {
      presetId: 'guitar_bass_duo',
      totalBars: TOTAL_BARS,
      longFormEnabled: true,
      songModeHookFirstIdentity: true,
      primarySongwriterStyle: 'bacharach',
      harmonyMode: 'custom_locked',
      lockedHarmonyBarsRaw: locked,
      parsedChordBars: [...locked],
      chordProgressionText: locked.join(' | '),
    };

    const { result: gp, dispatchCalls } = withDispatchSpy(() =>
      runGoldenPathOnce(SEED_SINGLE, nonMosaicOpts)
    );
    const md = gp.context?.generationMetadata;

    expect(gp.success).toBe(true);
    expect(isMosaicModeActive(gp.context!)).toBe(false);
    expect(dispatchCalls).toBe(0);
    expect(md?.mosaicSectionEvalResults ?? []).toHaveLength(0);
    expect(md?.mosaicMergedHarmonyBars).toBeUndefined();

    const app = runAppGeneration(
      {
        presetId: 'song_mode',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 424242,
        totalBars: TOTAL_BARS,
        longFormEnabled: true,
        primarySongwriterStyle: 'bacharach',
        styleProfile: 'STYLE_SOPHISTICATED_POP',
        chordProgressionText: locked.join(' | '),
        mosaicSectionPlan: singlePlan,
      },
      outputDir
    );
    expect(app.success).toBe(true);
    expect(isMosaicModeActive({ generationMetadata: { mosaicSectionPlan: singlePlan } } as import('../core/compositionContext').CompositionContext)).toBe(false);
  });

  it('C: Song Mode + 2 sections + lead-sheet → one part, chord symbols present', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const evalPath = require.resolve('../core/mosaic-mode/evaluateMosaicSections');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const evalMod = require(evalPath) as typeof import('../core/mosaic-mode/evaluateMosaicSections');
    const origEval = evalMod.evaluateMosaicSections;
    evalMod.evaluateMosaicSections = (score, ctx) =>
      origEval(score, ctx).map((entry) => ({ ...entry, passed: true, failures: [] }));

    let gp;
    try {
      gp = runGoldenPathOnce(
        SEED_LEAD,
        songModeGoldenPathOpts({ mosaicOutputFormat: 'lead-sheet' })
      );
    } finally {
      evalMod.evaluateMosaicSections = origEval;
    }

    expect(isMosaicModeActive(gp.context!)).toBe(true);
    expect(gp.score).toBeDefined();

    const parts = gp.score?.parts ?? [];
    expect(parts.length).toBe(1);
    expect(parts[0]?.name).toBe('Lead');

    const chordAt = (bar: number) => parts[0]?.measures.find((m) => m.index === bar)?.chord;
    expect(chordAt(1)).toBeTruthy();
    expect(chordAt(17)).toBeTruthy();

    const xml = gp.xml ?? '';
    expect(xml.length).toBeGreaterThan(0);
    const xmlPartCount = (xml.match(/<score-part id="/g) ?? []).length;
    expect(xmlPartCount).toBe(1);
    const hasChordSymbolsInXml =
      xml.includes('<harmony>') ||
      xml.includes('<chord/>') ||
      parts[0]?.measures.some((m) => !!m.chord);
    expect(hasChordSymbolsInXml).toBe(true);
    expect(/<part-name>Upright Bass<\/part-name>/.test(xml)).toBe(false);

    const app = runAppGeneration(
      songModeAppRequest({
        seed: SEED_LEAD,
        mosaicOutputFormat: 'lead-sheet',
      }),
      outputDir
    );
    expect(app.xml).toBeTruthy();
    const appPartCount = ((app.xml ?? '').match(/<score-part id="/g) ?? []).length;
    expect(appPartCount).toBe(1);
    const appHasChordSymbols =
      app.xml?.includes('<harmony>') ||
      app.xml?.includes('<chord/>') ||
      (gp.score?.parts[0]?.measures.some((m) => !!m.chord) ?? false);
    expect(appHasChordSymbols).toBe(true);
  });
});
