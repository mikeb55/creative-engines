/**
 * Mosaic Mode rc12 — section retry unit tests.
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { GoldenPathPlans } from '../core/goldenPath/generateGoldenPathDuoScore';
import type { DuoSectionEvalResult } from '../core/mosaic-mode/evaluateMosaicSections';
import { generateMosaicSourceMotif } from '../core/mosaic-mode/mosaicMotifEngine';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { MeasureModel } from '../core/score-model/scoreModelTypes';

function guitarPart(measures: MeasureModel[]) {
  return {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble' as const,
    measures,
  };
}

function minimalContext(overrides: Partial<GenerationMetadata> = {}): CompositionContext {
  const sourceMotif = generateMosaicSourceMotif(88001, 64);
  return {
    systemVersion: '2',
    presetId: 'guitar_bass_duo',
    seed: 88001,
    form: { sections: [{ label: 'intro', startBar: 1, length: 8 }], totalBars: 16 },
    feel: {} as CompositionContext['feel'],
    harmony: {} as CompositionContext['harmony'],
    motif: {} as CompositionContext['motif'],
    phrase: {} as CompositionContext['phrase'],
    register: {} as CompositionContext['register'],
    density: {} as CompositionContext['density'],
    instrumentProfiles: [],
    chordSymbolPlan: { segments: [], totalBars: 16 },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata: {
      generatedAt: '2026-06-07T00:00:00.000Z',
      songwriterStyleId: 'fripp',
      mosaicSectionPlan: [
        { sectionLabel: 'intro', startBar: 1, endBar: 8, songwriterStyleId: 'fripp' },
        { sectionLabel: 'verse', startBar: 9, endBar: 16, songwriterStyleId: 'jack_white' },
      ],
      mosaicMergedHarmonyBars: Array.from({ length: 16 }, () => 'Am7'),
      mosaicSourceMotif: sourceMotif,
      mosaicSectionMotifVariants: { intro: sourceMotif, verse: sourceMotif },
      mosaicSectionEvalResults: [
        {
          sectionLabel: 'intro',
          startBar: 1,
          endBar: 8,
          composerId: 'fripp',
          passed: false,
          scores: { overall: 5.0, blues_rate: 0.4 },
          failures: ['blues_rate low'],
        },
        {
          sectionLabel: 'verse',
          startBar: 9,
          endBar: 16,
          composerId: 'jack_white',
          passed: true,
          scores: { overall: 8.0, blues_rate: 0.8 },
          failures: [],
        },
      ],
      mosaicLockRegistry: [{ sectionLabel: 'intro', startBar: 1, endBar: 8, composerId: 'fripp', expectedHarmonyBars: [] }],
      mosaicMotifSimilarityReceipts: [{ fromSection: 'intro', toSection: 'verse', similarity: 0.55 }],
      ...overrides,
    },
    validation: {} as CompositionContext['validation'],
    readiness: {
      release: {} as CompositionContext['readiness']['release'],
      mx: {} as CompositionContext['readiness']['mx'],
    },
  };
}

function scoreWithBarEvents(startBar: number, endBar: number, tag: string): ScoreModel {
  return {
    title: 'test',
    parts: [
      guitarPart(
        Array.from({ length: 16 }, (_, i) => {
          const bar = i + 1;
          const inIntro = bar >= startBar && bar <= endBar;
          return {
            index: bar,
            events: inIntro
              ? [{ kind: 'note' as const, pitch: tag === 'original' ? 60 : 72, startBeat: 0, duration: 1, voice: 1 }]
              : [{ kind: 'note' as const, pitch: 48, startBeat: 0, duration: 1, voice: 1 }],
          };
        })
      ),
    ],
  };
}

type RetryModule = typeof import('../core/mosaic-mode/mosaicSectionRetry') & {
  __restoreMocks?: () => void;
};

function loadRetryModuleWithMocks(opts: {
  evaluateMosaicSections: (
    score: ScoreModel,
    context: CompositionContext
  ) => DuoSectionEvalResult[];
  regenerateMosaicSectionForRetry: (
    context: CompositionContext,
    plans: GoldenPathPlans,
    sectionLabel: string,
    attempt: number
  ) => ScoreModel | null;
  formatEvalFailureReport?: typeof import('../core/mosaic-mode/mosaicEvalDiagnostics').formatEvalFailureReport;
}): RetryModule {
  const evalPath = require.resolve('../core/mosaic-mode/evaluateMosaicSections');
  const gpPath = require.resolve('../core/goldenPath/generateGoldenPathDuoScore');
  const diagPath = require.resolve('../core/mosaic-mode/mosaicEvalDiagnostics');
  const retryPath = require.resolve('../core/mosaic-mode/mosaicSectionRetry');

  delete require.cache[retryPath];

  const evalMod = require(evalPath) as typeof import('../core/mosaic-mode/evaluateMosaicSections');
  const gpMod = require(gpPath) as typeof import('../core/goldenPath/generateGoldenPathDuoScore');
  const diagMod = require(diagPath) as typeof import('../core/mosaic-mode/mosaicEvalDiagnostics');

  const origEval = evalMod.evaluateMosaicSections;
  const origRegen = gpMod.regenerateMosaicSectionForRetry;
  const origFormat = diagMod.formatEvalFailureReport;

  evalMod.evaluateMosaicSections = opts.evaluateMosaicSections;
  gpMod.regenerateMosaicSectionForRetry = opts.regenerateMosaicSectionForRetry;
  if (opts.formatEvalFailureReport) {
    diagMod.formatEvalFailureReport = opts.formatEvalFailureReport;
  }

  delete require.cache[retryPath];
  const retryMod = require(retryPath) as RetryModule;

  retryMod.__restoreMocks = () => {
    evalMod.evaluateMosaicSections = origEval;
    gpMod.regenerateMosaicSectionForRetry = origRegen;
    diagMod.formatEvalFailureReport = origFormat;
    delete require.cache[retryPath];
  };

  return retryMod;
}

export function runMosaicSectionRetryTests(): { ok: boolean; name: string; detail?: string }[] {
  const out: { ok: boolean; name: string; detail?: string }[] = [];

  // 1 — retry attempted when eval fails
  {
    let regenCalls = 0;
    let evalCalls = 0;
    const context = minimalContext();
    let score = scoreWithBarEvents(1, 16, 'original');
    const retryMod = loadRetryModuleWithMocks({
      regenerateMosaicSectionForRetry: () => {
        regenCalls++;
        return scoreWithBarEvents(1, 8, 'retry');
      },
      evaluateMosaicSections: () => {
        evalCalls++;
        return [
          {
            sectionLabel: 'intro',
            startBar: 1,
            endBar: 8,
            composerId: 'fripp',
            passed: false,
            scores: { overall: 5.0 },
            failures: ['still failing'],
          },
        ];
      },
    });
    try {
      retryMod.bindMosaicSectionRetrySession({
        getScore: () => score,
        setScore: (s) => {
          score = s;
        },
        plans: {} as GoldenPathPlans,
      });
      retryMod.runMosaicSectionRetrySync(context, 'intro', 2);
      out.push({
        ok: regenCalls === 2 && evalCalls === 2,
        name: 'runMosaicSectionRetry: retry attempted when eval fails',
        detail: `regen=${regenCalls} eval=${evalCalls}`,
      });
    } finally {
      retryMod.clearMosaicSectionRetrySession();
      (retryMod as RetryModule).__restoreMocks?.();
    }
  }

  // 2 — original section kept when retry exhausted
  {
    const context = minimalContext();
    const original = scoreWithBarEvents(1, 16, 'original');
    let score = structuredClone(original) as ScoreModel;
    const retryMod = loadRetryModuleWithMocks({
      regenerateMosaicSectionForRetry: () => scoreWithBarEvents(1, 8, 'retry'),
      evaluateMosaicSections: () => [
        {
          sectionLabel: 'intro',
          startBar: 1,
          endBar: 8,
          composerId: 'fripp',
          passed: false,
          scores: { overall: 5.0 },
          failures: ['fail'],
        },
      ],
    });
    try {
      retryMod.bindMosaicSectionRetrySession({
        getScore: () => score,
        setScore: (s) => {
          score = s;
        },
        plans: {} as GoldenPathPlans,
      });
      const ok = retryMod.runMosaicSectionRetrySync(context, 'intro', 1);
      const bar1Pitch = score.parts[0]?.measures.find((m) => m.index === 1)?.events[0];
      const keptOriginal =
        ok === false &&
        bar1Pitch?.kind === 'note' &&
        (bar1Pitch as { pitch: number }).pitch === 60;
      out.push({
        ok: keptOriginal,
        name: 'runMosaicSectionRetry: original section kept when retry exhausted',
        detail: keptOriginal ? undefined : `returned=${ok} pitch=${(bar1Pitch as { pitch?: number })?.pitch}`,
      });
    } finally {
      retryMod.clearMosaicSectionRetrySession();
      (retryMod as RetryModule).__restoreMocks?.();
    }
  }

  // 3 — mosaicSourceMotif persists across retry
  {
    const context = minimalContext();
    const sourceMotif = generateMosaicSourceMotif(88001, 64);
    const sourceId = sourceMotif.id;
    let score = scoreWithBarEvents(1, 16, 'original');
    const retryMod = loadRetryModuleWithMocks({
      regenerateMosaicSectionForRetry: (_ctx) => {
        _ctx.generationMetadata = {
          ..._ctx.generationMetadata,
          mosaicSourceMotif: { id: 'wiped_by_regen' } as ReturnType<typeof generateMosaicSourceMotif>,
        };
        return scoreWithBarEvents(1, 8, 'retry');
      },
      evaluateMosaicSections: () => [
        {
          sectionLabel: 'intro',
          startBar: 1,
          endBar: 8,
          composerId: 'fripp',
          passed: false,
          scores: { overall: 5.0 },
          failures: ['fail'],
        },
      ],
    });
    try {
      retryMod.bindMosaicSectionRetrySession({
        getScore: () => score,
        setScore: (s) => {
          score = s;
        },
        plans: {} as GoldenPathPlans,
      });
      retryMod.runMosaicSectionRetrySync(context, 'intro', 1);
      out.push({
      ok: Boolean(
        context.generationMetadata?.mosaicSourceMotif &&
          'id' in context.generationMetadata.mosaicSourceMotif &&
          context.generationMetadata.mosaicSourceMotif.id === sourceId
      ),
      name: 'runMosaicSectionRetry: mosaicSourceMotif persists across retry',
      detail:
        context.generationMetadata?.mosaicSourceMotif &&
        'id' in context.generationMetadata.mosaicSourceMotif
          ? context.generationMetadata.mosaicSourceMotif.id
          : 'missing',
      });
    } finally {
      retryMod.clearMosaicSectionRetrySession();
      (retryMod as RetryModule).__restoreMocks?.();
    }
  }

  // 4 — passing sections are not retried (verse eval preserved; only intro retried)
  {
    let regenSection: string | undefined;
    const context = minimalContext();
    let score = scoreWithBarEvents(1, 16, 'original');
    const retryMod = loadRetryModuleWithMocks({
      regenerateMosaicSectionForRetry: (_ctx, _plans, label) => {
        regenSection = label;
        return scoreWithBarEvents(1, 8, 'retry');
      },
      evaluateMosaicSections: () => [
        {
          sectionLabel: 'intro',
          startBar: 1,
          endBar: 8,
          composerId: 'fripp',
          passed: true,
          scores: { overall: 8.0 },
          failures: [],
        },
      ],
    });
    try {
      retryMod.bindMosaicSectionRetrySession({
        getScore: () => score,
        setScore: (s) => {
          score = s;
        },
        plans: {} as GoldenPathPlans,
      });
      retryMod.runMosaicSectionRetrySync(context, 'intro', 2);
      const verseStillPassing = context.generationMetadata?.mosaicSectionEvalResults?.find(
        (r) => r.sectionLabel === 'verse'
      )?.passed;
      out.push({
        ok: regenSection === 'intro' && verseStillPassing === true,
        name: 'runMosaicSectionRetry: passing sections not retried; other eval results preserved',
        detail: `regenSection=${regenSection} versePassed=${verseStillPassing}`,
      });
    } finally {
      retryMod.clearMosaicSectionRetrySession();
      (retryMod as RetryModule).__restoreMocks?.();
    }
  }

  // 5 — surgical metadata merge (lock registry + similarity receipts survive regen wipe)
  {
    const context = minimalContext();
    const lockLen = context.generationMetadata!.mosaicLockRegistry!.length;
    const simLen = context.generationMetadata!.mosaicMotifSimilarityReceipts!.length;
    let score = scoreWithBarEvents(1, 16, 'original');
    const retryMod = loadRetryModuleWithMocks({
      regenerateMosaicSectionForRetry: (ctx) => {
        ctx.generationMetadata = {
          generatedAt: '2099-01-01T00:00:00.000Z',
          mosaicSectionEvalResults: [
            {
              sectionLabel: 'intro',
              startBar: 1,
              endBar: 8,
              composerId: 'fripp',
              passed: false,
              scores: { overall: 0 },
              failures: ['regen-only'],
            },
          ],
        };
        return scoreWithBarEvents(1, 8, 'retry');
      },
      evaluateMosaicSections: () => [
        {
          sectionLabel: 'intro',
          startBar: 1,
          endBar: 8,
          composerId: 'fripp',
          passed: true,
          scores: { overall: 7.5 },
          failures: [],
        },
      ],
    });
    try {
      retryMod.bindMosaicSectionRetrySession({
        getScore: () => score,
        setScore: (s) => {
          score = s;
        },
        plans: {} as GoldenPathPlans,
      });
      retryMod.runMosaicSectionRetrySync(context, 'intro', 1);
      const md = context.generationMetadata!;
      const merged =
        md.mosaicLockRegistry?.length === lockLen &&
        md.mosaicMotifSimilarityReceipts?.length === simLen &&
        md.mosaicSectionEvalResults?.length === 2 &&
        md.mosaicSectionEvalResults.some((r) => r.sectionLabel === 'verse' && r.passed === true) &&
        md.mosaicSectionEvalResults.some((r) => r.sectionLabel === 'intro' && r.passed === true);
      out.push({
        ok: merged === true,
        name: 'runMosaicSectionRetry: surgical metadata merge — no wholesale overwrite',
        detail: merged
          ? undefined
          : `lock=${md.mosaicLockRegistry?.length} sim=${md.mosaicMotifSimilarityReceipts?.length} evals=${md.mosaicSectionEvalResults?.length}`,
      });
    } finally {
      retryMod.clearMosaicSectionRetrySession();
      (retryMod as RetryModule).__restoreMocks?.();
    }
  }

  // 6 — formatEvalFailureReport called on retry exhaustion
  {
    let formatCalls = 0;
    const context = minimalContext();
    let score = scoreWithBarEvents(1, 16, 'original');
    const retryMod = loadRetryModuleWithMocks({
      regenerateMosaicSectionForRetry: () => scoreWithBarEvents(1, 8, 'retry'),
      evaluateMosaicSections: () => [
        {
          sectionLabel: 'intro',
          startBar: 1,
          endBar: 8,
          composerId: 'fripp',
          passed: false,
          scores: { overall: 5.0, blues_rate: 0.4 },
          failures: ['blues_rate low'],
        },
      ],
      formatEvalFailureReport: () => {
        formatCalls++;
        return 'mock failure report';
      },
    });
    try {
      retryMod.bindMosaicSectionRetrySession({
        getScore: () => score,
        setScore: (s) => {
          score = s;
        },
        plans: {} as GoldenPathPlans,
      });
      retryMod.runMosaicSectionRetrySync(context, 'intro', 1);
      out.push({
        ok: formatCalls === 1,
        name: 'runMosaicSectionRetry: formatEvalFailureReport called on retry exhaustion',
        detail: `formatCalls=${formatCalls}`,
      });
    } finally {
      retryMod.clearMosaicSectionRetrySession();
      (retryMod as RetryModule).__restoreMocks?.();
    }
  }

  return out;
}

if (require.main === module) {
  const rows = runMosaicSectionRetryTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
