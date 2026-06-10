/**
 * IMP-5 - Mosaic import style-transfer: pinned melody, composer-slice harmony.
 */

import type { CompositionContext, ImportHarmonyMode } from '../compositionContext';
import {
  generateGoldenPathDuoScore,
  type GoldenPathPlans,
} from '../goldenPath/generateGoldenPathDuoScore';
import { normalizeChordToken } from '../harmony/chordProgressionParser';
import {
  extractEffectiveHarmonyFromMetadata,
  getDispatchEntry,
} from '../mosaic-mode/mosaicComposerDispatch';
import {
  evaluateMosaicSections,
  type DuoSectionEvalResult,
} from '../mosaic-mode/evaluateMosaicSections';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { ImportMelodyNote, MosaicImportTimeline } from './mosaicImportTimeline';
import {
  IMPORT_CANDIDATE_MIN_CONFIDENCE,
  IMPORT_HARD_LOCK_CONFIDENCE,
} from './mosaicImportTimeline';
import { importTimelineToLockedHarmony, importTimelineToMotifSeed } from './importTimelineAdapters';
import {
  precomputeBarryHarrisChordMelodyFoundation,
  runBarryHarrisChordMelodyPipeline,
  type BarryHarrisChordMelodySummary,
  type ChordMelodyNoteChoice,
} from '../barry-harris';

export type MosaicSectionEvalResult = DuoSectionEvalResult;

export interface StyleTransferRequest {
  importTimeline: MosaicImportTimeline;
  targetComposer: string;
  styleTransferStrength?: number;
  preserveMelody?: boolean;
  reharmonize?: boolean;
  reorchestrate?: boolean;
}

export interface StyleTransferResult {
  scoreFragment: ScoreModel;
  retainedMelody: ImportMelodyNote[];
  harmonyDelta: string[];
  appliedHarmonyBars: string[];
  composerApplied: string;
  strengthApplied: number;
  evalResult: MosaicSectionEvalResult;
  /** V82d — Barry Harris chord-melody note resolutions (style-transfer only). */
  barryHarrisChordMelody?: BarryHarrisChordMelodySummary;
  barryHarrisNoteChoices?: ChordMelodyNoteChoice[];
}

export interface ApplyStyleTransferDeps {
  context: CompositionContext;
  plans: GoldenPathPlans;
  importHarmonyMode?: ImportHarmonyMode;
}

/** Same pick rule as mergeSongModeImportedAndGeneratedHarmonyBars (composerOsAppGeneration.ts). */
export function mergeImportedAndSliceHarmonyBars(
  sliceBars: string[],
  importedBars: string[],
  harmonyBlend: number
): string[] {
  const n = Math.min(sliceBars.length, importedBars.length);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const slice = sliceBars[i] ?? '';
    const imp = importedBars[i] ?? '';
    if (normalizeChordToken(slice.trim()) === normalizeChordToken(imp.trim())) {
      out.push(slice || imp);
    } else {
      out.push(harmonyBlend >= 0.5 ? imp || slice : slice || imp);
    }
  }
  return out;
}

function clampStrength(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0.5;
  return Math.max(0, Math.min(1, raw));
}

function padHarmonyBars(bars: string[], totalBars: number): string[] {
  if (totalBars <= 0) return [];
  if (bars.length === 0) return Array.from({ length: totalBars }, () => 'C');
  return Array.from({ length: totalBars }, (_, i) => bars[i % bars.length] ?? 'C');
}

function barMeetsHardLockThreshold(h: MosaicImportTimeline['harmonyByBar'][number]): boolean {
  if (h.fieldOrigin === 'explicit') {
    return h.confidence >= Math.min(IMPORT_HARD_LOCK_CONFIDENCE, 0.7);
  }
  return h.confidence >= IMPORT_HARD_LOCK_CONFIDENCE;
}

function hardLockedBarSet(ir: MosaicImportTimeline, importHarmonyMode?: ImportHarmonyMode): Set<number> {
  const locked = new Set<number>();
  if (importHarmonyMode !== 'lock_harmony') return locked;
  for (const h of ir.harmonyByBar) {
    if (h.confidence >= IMPORT_CANDIDATE_MIN_CONFIDENCE && barMeetsHardLockThreshold(h)) {
      locked.add(h.bar);
    }
  }
  return locked;
}

export function buildStyleTransferHarmonyBars(
  importedBars: string[],
  sliceBars: string[],
  styleTransferStrength: number,
  ir: MosaicImportTimeline,
  importHarmonyMode?: ImportHarmonyMode
): string[] {
  const n = Math.min(importedBars.length, sliceBars.length);
  const harmonyBlend = 1 - styleTransferStrength;
  const merged = mergeImportedAndSliceHarmonyBars(sliceBars, importedBars, harmonyBlend);
  const hardLocked = hardLockedBarSet(ir, importHarmonyMode);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const bar = i + 1;
    if (hardLocked.has(bar)) {
      out.push(importedBars[i] ?? merged[i] ?? 'C');
    } else {
      out.push(merged[i] ?? importedBars[i] ?? sliceBars[i] ?? 'C');
    }
  }
  return out;
}

export function pinMelodyOnScore(score: ScoreModel, melody: readonly ImportMelodyNote[]): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  const guitar = out.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar || melody.length === 0) return out;

  const barsWithMelody = new Set(melody.map((n) => n.bar));
  for (const m of guitar.measures) {
    if (!barsWithMelody.has(m.index)) continue;
    /** Clear all voice-1 events (notes + rests) — duo scaffold leaves rests that overlap pinned import melody. */
    m.events = m.events.filter((e) => (e.voice ?? 1) !== 1);
  }

  for (const note of melody) {
    let measure = guitar.measures.find((m) => m.index === note.bar);
    if (!measure) {
      measure = { index: note.bar, events: [] };
      guitar.measures.push(measure);
    }
    measure.events.push({
      kind: 'note',
      pitch: note.midiPitch,
      startBeat: note.onsetBeat,
      duration: note.durationBeats,
      voice: 1,
    });
  }

  for (const m of guitar.measures) {
    m.events.sort((a, b) => a.startBeat - b.startBeat);
  }
  guitar.measures.sort((a, b) => a.index - b.index);
  return out;
}

export function extractGuitarMelodyNotes(score: ScoreModel): ImportMelodyNote[] {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return [];
  const out: ImportMelodyNote[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note' || (e.voice ?? 1) !== 1) continue;
      out.push({
        bar: m.index,
        onsetBeat: e.startBeat,
        durationBeats: e.duration,
        midiPitch: e.pitch,
        confidence: 1,
        fieldOrigin: 'explicit',
      });
    }
  }
  out.sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch);
  return out;
}

export function melodyLinesMatchPitchForPitch(
  a: readonly ImportMelodyNote[],
  b: readonly ImportMelodyNote[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (
      left.bar !== right.bar ||
      left.midiPitch !== right.midiPitch ||
      Math.abs(left.onsetBeat - right.onsetBeat) > 1e-6 ||
      Math.abs(left.durationBeats - right.durationBeats) > 1e-6
    ) {
      return false;
    }
  }
  return true;
}

export function verifyPinnedMelodyOnScore(
  score: ScoreModel,
  melody: readonly ImportMelodyNote[]
): boolean {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return melody.length === 0;
  for (const note of melody) {
    const measure = guitar.measures.find((m) => m.index === note.bar);
    if (!measure) return false;
    const match = measure.events.some(
      (e) =>
        e.kind === 'note' &&
        (e.voice ?? 1) === 1 &&
        e.pitch === note.midiPitch &&
        Math.abs(e.startBeat - note.onsetBeat) <= 1e-6 &&
        Math.abs(e.duration - note.durationBeats) <= 1e-6
    );
    if (!match) return false;
  }
  return true;
}

export function retainedMelodyProof(
  score: ScoreModel,
  melody: readonly ImportMelodyNote[],
  preserveMelody: boolean
): ImportMelodyNote[] {
  if (!preserveMelody) return extractGuitarMelodyNotes(score);
  return verifyPinnedMelodyOnScore(score, melody) ? melody.map((n) => ({ ...n })) : extractGuitarMelodyNotes(score);
}

function harmonyDeltaFromBars(imported: string[], applied: string[]): string[] {
  const delta: string[] = [];
  const n = Math.min(imported.length, applied.length);
  for (let i = 0; i < n; i++) {
    const imp = imported[i]?.trim() ?? '';
    const next = applied[i]?.trim() ?? '';
    if (imp && next && normalizeChordToken(imp) !== normalizeChordToken(next)) {
      delta.push(`bar${i + 1}:${imp}->${next}`);
    }
  }
  return delta;
}

function evaluateStyleTransferScore(
  score: ScoreModel,
  context: CompositionContext,
  composerId: string,
  expectedHarmony: string[]
): MosaicSectionEvalResult {
  const span = context.form.totalBars;
  const evalContext: CompositionContext = {
    ...context,
    generationMetadata: {
      ...context.generationMetadata,
      mosaicLockRegistry: [
        {
          sectionLabel: 'style_transfer',
          startBar: 1,
          endBar: span,
          composerId,
          expectedHarmonyBars: expectedHarmony.slice(0, span),
        },
      ],
    },
  };
  const results = evaluateMosaicSections(score, evalContext);
  return (
    results[0] ?? {
      sectionLabel: 'style_transfer',
      startBar: 1,
      endBar: span,
      composerId,
      passed: false,
      scores: { overall: 0 },
      failures: ['eval_missing'],
    }
  );
}

function applyComposerOrchestration(
  score: ScoreModel,
  context: CompositionContext,
  composerId: string
): void {
  const entry = getDispatchEntry(composerId);
  if (!entry?.apply) return;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return;
  for (const m of guitar.measures) {
    entry.apply(m as MeasureModel, m.index, context);
  }
}

function applyBigBandStyleTransferVoicing(score: ScoreModel): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  if (out.parts.some((p) => p.id === 'style_transfer_bb_comp')) return out;
  const guitar = out.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return out;
  out.parts.push({
    id: 'style_transfer_bb_comp',
    name: 'Style Transfer BB Comp',
    instrumentIdentity: 'piano',
    midiProgram: 0,
    clef: 'treble',
    measures: guitar.measures.map((m) => ({
      index: m.index,
      chord: m.chord,
      events: m.events
        .filter((e) => e.kind === 'note')
        .map((e) => ({ ...e, pitch: Math.min(72, e.pitch + 12), voice: 2 })),
    })),
  });
  return out;
}

export function applyStyleTransfer(
  req: StyleTransferRequest,
  deps: ApplyStyleTransferDeps
): StyleTransferResult {
  const strength = clampStrength(req.styleTransferStrength);
  const { context, plans, importHarmonyMode } = deps;
  const totalBars = context.form.totalBars;
  const importedRaw = importTimelineToLockedHarmony(req.importTimeline);
  const importedBars = padHarmonyBars(importedRaw, totalBars);
  const melody = [...req.importTimeline.melodyLine];

  const transferCtx = structuredClone(context) as CompositionContext;
  transferCtx.lockedHarmonyBarsRaw = [...importedBars];
  transferCtx.generationMetadata = {
    ...transferCtx.generationMetadata,
    songwriterStyleId: req.targetComposer,
    parsedCustomProgressionBars: [...importedBars],
  };

  let sliceBars = importedBars;
  let barryHarrisChordMelody: BarryHarrisChordMelodySummary | undefined;
  let barryHarrisNoteChoices: ChordMelodyNoteChoice[] | undefined;
  const entry = getDispatchEntry(req.targetComposer);
  if (entry && req.reharmonize !== false) {
    entry.precompute(transferCtx);
    if (req.targetComposer === 'barry_harris') {
      const foundation = precomputeBarryHarrisChordMelodyFoundation(transferCtx, req.importTimeline);
      transferCtx.generationMetadata.barryHarrisChordMelodyFoundation = foundation;
      const pipeline = runBarryHarrisChordMelodyPipeline(
        foundation,
        melody,
        totalBars,
        importedBars,
        { importTimeline: req.importTimeline }
      );
      barryHarrisNoteChoices = pipeline.noteChoices;
      barryHarrisChordMelody = pipeline.summary;
      transferCtx.generationMetadata.barryHarrisChordMelodyReceipts = pipeline.cmReceipts;
      sliceBars = padHarmonyBars(pipeline.harmonyBars, totalBars);
    } else {
      sliceBars = padHarmonyBars(
        extractEffectiveHarmonyFromMetadata(transferCtx.generationMetadata, req.targetComposer) ??
          importedBars,
        totalBars
      );
    }
  }

  const blended =
    req.reharmonize === false
      ? importedBars
      : buildStyleTransferHarmonyBars(
          importedBars,
          sliceBars,
          strength,
          req.importTimeline,
          importHarmonyMode
        );

  transferCtx.lockedHarmonyBarsRaw = [...blended];
  transferCtx.generationMetadata.parsedCustomProgressionBars = [...blended];
  transferCtx.generationMetadata.customHarmonyLocked = strength < 0.95;

  if (req.targetComposer === 'wayne_shorter' && req.reharmonize !== false) {
    transferCtx.generationMetadata.styleTransferWayneHarmonyAuthoritative = true;
    transferCtx.generationMetadata.wayneShorterEffectiveHarmonyBars = [...blended];
  }

  const seedResult = importTimelineToMotifSeed(req.importTimeline);
  transferCtx.generationMetadata.mosaicSourceMotif = seedResult.coreMotif;
  transferCtx.generationMetadata.importMelodyLineFull = seedResult.fullMelodyLine;

  let score = generateGoldenPathDuoScore(transferCtx, plans);

  if (req.preserveMelody !== false) {
    score = pinMelodyOnScore(score, melody);
  }

  if (req.reorchestrate) {
    applyComposerOrchestration(score, transferCtx, req.targetComposer);
    if (transferCtx.presetId === 'big_band') {
      score = applyBigBandStyleTransferVoicing(score);
      transferCtx.generationMetadata.styleTransferReorchestrateApplied = true;
    }
  }

  const evalResult = evaluateStyleTransferScore(score, transferCtx, req.targetComposer, blended);
  const retainedMelody = retainedMelodyProof(score, melody, req.preserveMelody !== false);
  const harmonyDelta = harmonyDeltaFromBars(importedBars, blended);

  return {
    scoreFragment: score,
    retainedMelody,
    harmonyDelta,
    appliedHarmonyBars: blended,
    composerApplied: req.targetComposer,
    strengthApplied: strength,
    evalResult,
    ...(barryHarrisChordMelody ? { barryHarrisChordMelody } : {}),
    ...(barryHarrisNoteChoices ? { barryHarrisNoteChoices } : {}),
  };
}

export function shouldRunStyleTransfer(options: {
  importTimeline?: MosaicImportTimeline;
  styleTransfer?: boolean;
}): boolean {
  return options.styleTransfer === true && !!options.importTimeline;
}

/** Style-transfer with pinned import melody — motif/bass duo-LOCK relax gates apply. */
export function isStyleTransferPreserveMelodyActive(
  md: import('../compositionContext').GenerationMetadata | undefined
): boolean {
  if (!md?.styleTransferResult) return false;
  return md.styleTransferPreserveMelody !== false;
}

export function applyStyleTransferToScore(
  baseScore: ScoreModel,
  result: StyleTransferResult
): ScoreModel {
  return result.scoreFragment.parts.length > 0 ? result.scoreFragment : baseScore;
}
