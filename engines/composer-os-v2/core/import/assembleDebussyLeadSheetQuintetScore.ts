/**
 * Phase 2 - debussy-only quintet assembly: guitar lead + SQ strings (parallel bypass).
 */

import type { GenerationMetadata } from '../compositionContext';
import { buildQuartetScoreModel } from '../string-quartet/quartetScoreBuilder';
import type { QuartetFormPlan } from '../string-quartet/quartetPlanTypes';
import { planQuartetTexture } from '../string-quartet/quartetTexturePlanner';
import {
  SQ_PART_V1,
  SQ_PART_V2,
  SQ_PART_VA,
  SQ_PART_VC,
} from '../string-quartet/stringQuartetTypes';
import {
  assignStringQuartetRoles,
  solveStringQuartetVoiceLeading,
} from '../string-quartet/stringQuartetMusicContextRealisation';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { buildMelodyOnlyHarmonyScaffoldScore } from './buildMelodyOnlyHarmonyScaffoldScore';
import {
  buildDebussyLeadSheetHarmonySpine,
} from './buildDebussyLeadSheetHarmonySpine';
import type { MosaicImportTimeline } from './mosaicImportTimeline';
import { pinMelodyOnScore, verifyPinnedMelodyOnScore } from './mosaicStyleTransfer';

const SQ_PART_IDS = [SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC] as const;

const MAX_LEADSHEET_SCORE_TITLE_LEN = 200;

export type LeadSheetQuintetScoreTitleOptions = {
  /** User-facing score title; falls back to proof title when omitted. */
  scoreTitle?: string;
};

/** Visible score title from optional user output label (underscores → spaces). */
export function resolveLeadSheetQuintetScoreTitle(
  outputLabel: string | undefined,
  composerId: string
): string {
  const trimmed = typeof outputLabel === 'string' ? outputLabel.trim() : '';
  if (trimmed) {
    return trimmed.replace(/_/g, ' ').slice(0, MAX_LEADSHEET_SCORE_TITLE_LEN);
  }
  return `${composerId} LeadSheet Quintet Proof`;
}

function buildQuartetFormPlanForBars(totalBars: number): QuartetFormPlan {
  if (totalBars < 1) {
    throw new Error('buildQuartetFormPlanForBars: totalBars must be >= 1');
  }
  return {
    totalBars,
    slices: [{ index: 0, phase: 'statement', startBar: 1, endBar: totalBars }],
  };
}

function countNotesInPart(part: ScoreModel['parts'][number] | undefined): number {
  if (!part) return 0;
  let n = 0;
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') n++;
    }
  }
  return n;
}

export interface DebussyLeadSheetQuintetAssemblyResult {
  score: ScoreModel;
  spine: ReturnType<typeof buildDebussyLeadSheetHarmonySpine>;
  melodyPinned: boolean;
  partIds: string[];
  partNames: string[];
  hasBassPart: boolean;
  stringNoteCount: number;
  musicContextBarCount: number;
}

export function assembleDebussyLeadSheetQuintetScore(
  seed = 90103,
  importTimeline?: MosaicImportTimeline,
  composerId = 'debussy',
  titleOpts?: LeadSheetQuintetScoreTitleOptions
): DebussyLeadSheetQuintetAssemblyResult {
  const spine = buildDebussyLeadSheetHarmonySpine(seed, importTimeline, composerId);
  const proofTitle =
    typeof titleOpts?.scoreTitle === 'string' && titleOpts.scoreTitle.trim()
      ? titleOpts.scoreTitle.trim().slice(0, MAX_LEADSHEET_SCORE_TITLE_LEN)
      : `${composerId} LeadSheet Quintet Proof`;
  const { importTimeline: resolvedImportTimeline, appliedHarmonyBars, generationMetadata } = spine;

  let guitarScore = buildMelodyOnlyHarmonyScaffoldScore(appliedHarmonyBars, {
    title: proofTitle,
  });
  guitarScore = pinMelodyOnScore(guitarScore, resolvedImportTimeline.melodyLine);
  const melodyPinned = verifyPinnedMelodyOnScore(guitarScore, resolvedImportTimeline.melodyLine);

  const formPlan = buildQuartetFormPlanForBars(appliedHarmonyBars.length);
  const texturePlan = planQuartetTexture(formPlan, seed);

  const roles = assignStringQuartetRoles(seed);
  const musicContextBars = solveStringQuartetVoiceLeading({
    harmonyBars: appliedHarmonyBars,
    seed,
    texture: 'arco_melody_accompaniment',
    roles,
    tritonicColour: 'subtle',
  });

  const quartetScore = buildQuartetScoreModel({
    title: proofTitle,
    seed,
    formPlan,
    texturePlan,
    chordBars: appliedHarmonyBars,
    songwriterStyleId: composerId,
    generationMetadata: generationMetadata as GenerationMetadata,
  });

  const guitarPart = guitarScore.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitarPart) {
    throw new Error('guitar lead part missing from Phase 1 scaffold');
  }

  const stringParts = SQ_PART_IDS.map((id) => quartetScore.parts.find((p) => p.id === id)).filter(
    (p): p is NonNullable<typeof p> => !!p
  );
  if (stringParts.length !== 4) {
    throw new Error('expected 4 string parts, got ' + stringParts.length);
  }

  const score: ScoreModel = {
    title: guitarScore.title,
    tempo: guitarScore.tempo,
    timeSignature: guitarScore.timeSignature,
    parts: [
      { ...guitarPart, name: 'Guitar', id: 'guitar' },
      ...stringParts.map((p) => structuredClone(p)),
    ],
  };

  const stringNoteCount = stringParts.reduce((sum, p) => sum + countNotesInPart(p), 0);
  const hasBassPart = score.parts.some(
    (p) =>
      p.instrumentIdentity === 'acoustic_upright_bass' ||
      p.id === 'bass' ||
      (p.name?.toLowerCase().includes('bass') && p.instrumentIdentity !== 'cello')
  );

  return {
    score,
    spine,
    melodyPinned,
    partIds: score.parts.map((p) => p.id),
    partNames: score.parts.map((p) => p.name),
    hasBassPart,
    stringNoteCount,
    musicContextBarCount: musicContextBars.length,
  };
}
