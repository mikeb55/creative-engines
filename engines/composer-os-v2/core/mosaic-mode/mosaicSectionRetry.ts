/**
 * Mosaic Mode rc12 — GCE section retry (regenerate failing section only).
 */

import type { CompositionContext } from '../compositionContext';
import { regenerateMosaicSectionForRetry } from '../goldenPath/generateGoldenPathDuoScore';
import type { GoldenPathPlans } from '../goldenPath/generateGoldenPathDuoScore';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';
import { evaluateMosaicSections, type DuoSectionEvalResult } from './evaluateMosaicSections';
import {
  formatEvalFailureReport,
  type MosaicEvalResult,
} from './mosaicEvalDiagnostics';

const logger = {
  warn(message: string): void {
    console.warn(message);
  },
};

const DEFAULT_OVERALL_THRESHOLD = 6.2;
const DEFAULT_SIGNATURE_THRESHOLD = 6.0;

function duoSectionEvalToMosaicEvalResult(duo: DuoSectionEvalResult): MosaicEvalResult {
  const signatures: MosaicEvalResult['signatures'] = {};
  for (const [key, value] of Object.entries(duo.scores)) {
    if (key === 'overall') continue;
    signatures[key] = {
      value,
      threshold: DEFAULT_SIGNATURE_THRESHOLD,
      pass: value >= DEFAULT_SIGNATURE_THRESHOLD,
    };
  }
  return {
    score: duo.scores.overall ?? 0,
    threshold: DEFAULT_OVERALL_THRESHOLD,
    signatures,
    pass: duo.passed,
  };
}

export interface MosaicSectionRetrySession {
  getScore: () => ScoreModel;
  setScore: (score: ScoreModel) => void;
  plans: GoldenPathPlans;
}

let activeSession: MosaicSectionRetrySession | null = null;

export function bindMosaicSectionRetrySession(session: MosaicSectionRetrySession): void {
  activeSession = session;
}

export function clearMosaicSectionRetrySession(): void {
  activeSession = null;
}

function cloneMeasure(m: MeasureModel): MeasureModel {
  return {
    ...m,
    events: m.events.map((ev) => ({ ...ev })),
  };
}

function spliceScoreSectionMeasures(
  base: ScoreModel,
  fragment: ScoreModel,
  startBar: number,
  endBar: number
): ScoreModel {
  const span = endBar - startBar + 1;
  const out = structuredClone(base) as ScoreModel;
  for (const part of out.parts) {
    const fragPart = fragment.parts.find((p) => p.id === part.id);
    if (!fragPart) continue;
    const kept = part.measures.filter((m) => m.index < startBar || m.index > endBar);
    const inserted = fragPart.measures
      .filter((m) => m.index >= 1 && m.index <= span)
      .map((m) => {
        const cloned = cloneMeasure(m);
        cloned.index = startBar + (m.index - 1);
        return cloned;
      });
    part.measures = [...kept, ...inserted].sort((a, b) => a.index - b.index);
  }
  return out;
}

type PreservedMosaicRetryState = {
  mosaicSourceMotif: CompositionContext['generationMetadata']['mosaicSourceMotif'];
  mosaicSectionMotifVariants: CompositionContext['generationMetadata']['mosaicSectionMotifVariants'];
  mosaicSectionPlan: CompositionContext['generationMetadata']['mosaicSectionPlan'];
  mosaicMotifSimilarityReceipts: CompositionContext['generationMetadata']['mosaicMotifSimilarityReceipts'];
  mosaicLockRegistry: CompositionContext['generationMetadata']['mosaicLockRegistry'];
  otherEvalResults: NonNullable<CompositionContext['generationMetadata']['mosaicSectionEvalResults']>;
  failingEvalResult:
    | NonNullable<CompositionContext['generationMetadata']['mosaicSectionEvalResults']>[number]
    | undefined;
};

function snapshotPreservedState(
  context: CompositionContext,
  failingSectionLabel: string
): PreservedMosaicRetryState | null {
  const md = context.generationMetadata;
  if (!md) return null;
  const evalResults = md.mosaicSectionEvalResults ?? [];
  return {
    mosaicSourceMotif: md.mosaicSourceMotif,
    mosaicSectionMotifVariants: md.mosaicSectionMotifVariants,
    mosaicSectionPlan: md.mosaicSectionPlan,
    mosaicMotifSimilarityReceipts: md.mosaicMotifSimilarityReceipts,
    mosaicLockRegistry: md.mosaicLockRegistry,
    otherEvalResults: evalResults.filter((r) => r.sectionLabel !== failingSectionLabel),
    failingEvalResult: evalResults.find((r) => r.sectionLabel === failingSectionLabel),
  };
}

function restorePreservedMetadata(
  context: CompositionContext,
  preserved: PreservedMosaicRetryState,
  passingEvalResult?: NonNullable<CompositionContext['generationMetadata']['mosaicSectionEvalResults']>[number]
): void {
  const md = context.generationMetadata ?? {};
  const failingResult = passingEvalResult ?? preserved.failingEvalResult;
  const mosaicSectionEvalResults = failingResult
    ? [...preserved.otherEvalResults, failingResult]
    : preserved.otherEvalResults;

  context.generationMetadata = {
    ...md,
    mosaicSourceMotif: preserved.mosaicSourceMotif,
    mosaicSectionMotifVariants: preserved.mosaicSectionMotifVariants,
    mosaicSectionPlan: preserved.mosaicSectionPlan,
    mosaicMotifSimilarityReceipts: preserved.mosaicMotifSimilarityReceipts,
    mosaicLockRegistry: preserved.mosaicLockRegistry,
    mosaicSectionEvalResults,
  };
}

export async function runMosaicSectionRetry(
  context: CompositionContext,
  failingSectionLabel: string,
  maxRetries: number = 2
): Promise<boolean> {
  return runMosaicSectionRetrySync(context, failingSectionLabel, maxRetries);
}

export function runMosaicSectionRetrySync(
  context: CompositionContext,
  failingSectionLabel: string,
  maxRetries: number = 2
): boolean {
  const session = activeSession;
  if (!session) {
    console.warn(
      `[mosaic-section-retry] no active session — skipping retry for "${failingSectionLabel}"`
    );
    return false;
  }

  const plan = context.generationMetadata?.mosaicSectionPlan;
  const section = plan?.find((s) => s.sectionLabel === failingSectionLabel);
  if (!section) return false;

  const preserved = snapshotPreservedState(context, failingSectionLabel);
  if (!preserved) return false;

  let score = session.getScore();
  let lastFailedEval: DuoSectionEvalResult | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const fragment = regenerateMosaicSectionForRetry(
      context,
      session.plans,
      failingSectionLabel,
      attempt
    );
    if (!fragment) continue;

    const trialScore = spliceScoreSectionMeasures(
      score,
      fragment,
      section.startBar,
      section.endBar
    );

    const evalResults = evaluateMosaicSections(trialScore, context);
    const sectionResult = evalResults.find((r) => r.sectionLabel === failingSectionLabel);

    if (sectionResult?.passed) {
      score = trialScore;
      session.setScore(trialScore);
      restorePreservedMetadata(context, preserved, sectionResult);
      context.generationMetadata = {
        ...context.generationMetadata,
        mosaicSectionRetryReceipt: `section ${failingSectionLabel} retry attempt ${attempt} passed`,
      };
      return true;
    }

    if (sectionResult) {
      lastFailedEval = sectionResult;
    }
  }

  restorePreservedMetadata(context, preserved);

  const evalForReport = lastFailedEval ?? preserved.failingEvalResult;
  if (evalForReport) {
    const report = formatEvalFailureReport(
      failingSectionLabel,
      evalForReport.composerId,
      duoSectionEvalToMosaicEvalResult(evalForReport),
      true
    );
    logger.warn(report);
  }

  return false;
}
