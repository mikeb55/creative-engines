/**
 * Pass 4 — merge contrapuntal line / BB section-render scores into ensemble exports.
 * Empty-bar fill only; never overwrites arranger-written measures.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { BigBandSectionRenderOutput } from '../composer/bigBandSectionPlanRenderer';
import type { AbstractLineSet } from './abstractLineSet';
import { abstractLineSetToSqScoreModel, bbSectionRenderToScoreModel } from './sqToBbScoreExport';
import type { MeasureModel, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';

export interface ContrapuntalLineMusicXmlMergeReceipt {
  sqBarsWritten: number;
  bbBarsWritten: number;
  barsSkipped: number;
}

function emptyMergeReceipt(): ContrapuntalLineMusicXmlMergeReceipt {
  return { sqBarsWritten: 0, bbBarsWritten: 0, barsSkipped: 0 };
}

function measureHasWrittenNotes(m: MeasureModel): boolean {
  return m.events.some((e) => e.kind === 'note' || e.kind === 'chord');
}

function cloneEvent(e: ScoreEvent): ScoreEvent {
  if (e.kind === 'note') {
    return {
      kind: 'note',
      pitch: e.pitch,
      ...(e.pitches ? { pitches: [...e.pitches] } : {}),
      startBeat: e.startBeat,
      duration: e.duration,
      ...(e.voice !== undefined ? { voice: e.voice } : {}),
      ...(e.articulation ? { articulation: e.articulation } : {}),
      ...(e.velocity !== undefined ? { velocity: e.velocity } : {}),
      ...(e.motifRef ? { motifRef: e.motifRef } : {}),
    };
  }
  if (e.kind === 'chord') {
    return {
      kind: 'chord',
      pitches: [...e.pitches],
      startBeat: e.startBeat,
      duration: e.duration,
      voice: e.voice,
      ...(e.chordSymbol !== undefined ? { chordSymbol: e.chordSymbol } : {}),
      ...(e.sonicYouth ? { sonicYouth: e.sonicYouth } : {}),
      ...(e.stabDuration ? { stabDuration: e.stabDuration } : {}),
      ...(e.bluesTension ? { bluesTension: e.bluesTension } : {}),
    };
  }
  return { kind: 'rest', startBeat: e.startBeat, duration: e.duration, ...(e.voice !== undefined ? { voice: e.voice } : {}) };
}

function scoreHasSqOverlayTargets(score: ScoreModel): boolean {
  return score.parts.some((p) => p.id === 'sq_violin_1' || p.instrumentIdentity === 'sq_violin_1');
}

function scoreHasBbOverlayTargets(score: ScoreModel): boolean {
  return score.parts.some((p) => p.id.startsWith('bb_'));
}

function resolveBasePart(base: ScoreModel, overlayPart: PartModel): PartModel | undefined {
  return (
    base.parts.find((p) => p.id === overlayPart.id) ??
    base.parts.find((p) => p.instrumentIdentity === overlayPart.instrumentIdentity) ??
    undefined
  );
}

function ensureMeasureCount(part: PartModel, barCount: number): void {
  while (part.measures.length < barCount) {
    part.measures.push({ index: part.measures.length + 1, events: [] });
  }
}

function clonePart(part: PartModel): PartModel {
  return {
    ...part,
    measures: part.measures.map((m) => ({
      index: m.index,
      ...(m.chord !== undefined ? { chord: m.chord } : {}),
      events: m.events.map(cloneEvent),
    })),
  };
}

/** Golden-path scores may seal `parts` after render — merge on a mutable clone. */
function cloneScoreForPass4Merge(score: ScoreModel): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((p) => ({
      ...p,
      measures: p.measures.map((m) => ({
        index: m.index,
        ...(m.chord !== undefined ? { chord: m.chord } : {}),
        events: m.events.map(cloneEvent),
      })),
    })),
  };
}

/** Merge overlay into base — fill measures that have no note/chord content in base. */
export function mergeEmptyBarOverlayIntoScore(
  base: ScoreModel,
  overlay: ScoreModel,
  lane: 'sq' | 'bb',
): ContrapuntalLineMusicXmlMergeReceipt {
  const receipt = emptyMergeReceipt();
  const barCount = Math.max(
    ...base.parts.map((p) => p.measures.length),
    ...overlay.parts.map((p) => p.measures.length),
    1,
  );

  for (const overlayPart of overlay.parts) {
    const basePart = resolveBasePart(base, overlayPart);
    if (!basePart) continue;
    ensureMeasureCount(basePart, barCount);
    ensureMeasureCount(overlayPart, barCount);

    for (let i = 0; i < barCount; i++) {
      const bm = basePart.measures[i];
      const om = overlayPart.measures[i];
      if (!bm || !om) continue;
      const overlayHasNotes = measureHasWrittenNotes(om);
      if (!overlayHasNotes) continue;

      if (measureHasWrittenNotes(bm)) {
        receipt.barsSkipped += 1;
        continue;
      }

      bm.events = om.events.map(cloneEvent);
      if (lane === 'sq') receipt.sqBarsWritten += 1;
      else receipt.bbBarsWritten += 1;
    }
  }

  return receipt;
}

export function bbContrapuntalMergeAllowed(meta: GenerationMetadata | undefined): boolean {
  if (!meta?.bigBandSectionRender) return false;
  if (meta.sqBbGceGate1BlockedRenderer === true) return false;
  const g2 = meta.sqBbGceGate2;
  if (g2?.hardFail === true) return false;
  if (g2 && g2.outcome !== 'pass' && g2.outcome !== 'review') return false;
  return true;
}

export function sqContrapuntalMergeAllowed(
  meta: GenerationMetadata | undefined,
  voiceBundle: { contrapuntalLinePolicy?: { enabled?: boolean } } | undefined,
): boolean {
  if (!meta?.contrapuntalLineSet) return false;
  if (!voiceBundle?.contrapuntalLinePolicy?.enabled) return false;
  return true;
}

function addReceipts(
  a: ContrapuntalLineMusicXmlMergeReceipt,
  b: ContrapuntalLineMusicXmlMergeReceipt,
): ContrapuntalLineMusicXmlMergeReceipt {
  return {
    sqBarsWritten: a.sqBarsWritten + b.sqBarsWritten,
    bbBarsWritten: a.bbBarsWritten + b.bbBarsWritten,
    barsSkipped: a.barsSkipped + b.barsSkipped,
  };
}

export function mergeSqContrapuntalLineSetIntoScore(
  base: ScoreModel,
  lineSet: AbstractLineSet,
): ContrapuntalLineMusicXmlMergeReceipt {
  const overlay = abstractLineSetToSqScoreModel(lineSet);
  return mergeEmptyBarOverlayIntoScore(base, overlay, 'sq');
}

export function mergeBbSectionRenderIntoScore(
  base: ScoreModel,
  render: BigBandSectionRenderOutput,
  lengthBars: number,
): ContrapuntalLineMusicXmlMergeReceipt {
  const overlay = bbSectionRenderToScoreModel(render, lengthBars);
  return mergeEmptyBarOverlayIntoScore(base, overlay, 'bb');
}

/**
 * Pass 4 — apply SQ + BB contrapuntal merges; writes {@link ContrapuntalLineMusicXmlMergeReceipt} on metadata.
 */
export function applyContrapuntalPass4MusicXmlMerge(
  score: ScoreModel,
  context: CompositionContext,
): ScoreModel {
  const meta = context.generationMetadata as GenerationMetadata;
  const vrbId = context.voiceBundle?.voiceId ?? '';
  const bundle = context.voiceBundle ?? (vrbId ? getVoiceRuleBundle(vrbId) : undefined);
  const needsSq =
    sqContrapuntalMergeAllowed(meta, bundle) &&
    Boolean(meta.contrapuntalLineSet) &&
    scoreHasSqOverlayTargets(score);
  const needsBb =
    bbContrapuntalMergeAllowed(meta) &&
    Boolean(meta.bigBandSectionRender) &&
    scoreHasBbOverlayTargets(score);

  if (!needsSq && !needsBb) {
    if (!meta.contrapuntalLineMusicXmlMergeReceipt) {
      meta.contrapuntalLineMusicXmlMergeReceipt = emptyMergeReceipt();
    }
    return score;
  }

  const working = cloneScoreForPass4Merge(score);
  let total = emptyMergeReceipt();

  if (needsSq && meta.contrapuntalLineSet) {
    total = addReceipts(total, mergeSqContrapuntalLineSetIntoScore(working, meta.contrapuntalLineSet));
  }

  if (needsBb && meta.bigBandSectionRender) {
    const tb = Math.max(1, context.form.totalBars);
    total = addReceipts(total, mergeBbSectionRenderIntoScore(working, meta.bigBandSectionRender, tb));
  }

  meta.contrapuntalLineMusicXmlMergeReceipt = total;
  return working;
}

/** SQ export helper when only metadata + bundle are available (no full CompositionContext). */
export function applySqContrapuntalPass4MergeOnScore(
  score: ScoreModel,
  meta: GenerationMetadata,
  voiceBundle: { contrapuntalLinePolicy?: { enabled?: boolean } } | undefined,
): ContrapuntalLineMusicXmlMergeReceipt {
  let total = meta.contrapuntalLineMusicXmlMergeReceipt ?? emptyMergeReceipt();
  if (
    sqContrapuntalMergeAllowed(meta, voiceBundle) &&
    meta.contrapuntalLineSet &&
    scoreHasSqOverlayTargets(score)
  ) {
    total = addReceipts(total, mergeSqContrapuntalLineSetIntoScore(score, meta.contrapuntalLineSet));
    meta.contrapuntalLineMusicXmlMergeReceipt = total;
  }
  return total;
}
