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
import { buildDebussyLeadSheetHarmonySpine } from './buildDebussyLeadSheetHarmonySpine';
import { pinMelodyOnScore, verifyPinnedMelodyOnScore } from './mosaicStyleTransfer';

const SQ_PART_IDS = [SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC] as const;

function buildEightBarQuartetFormPlan(): QuartetFormPlan {
  return {
    totalBars: 8,
    slices: [{ index: 0, phase: 'statement', startBar: 1, endBar: 8 }],
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

export function assembleDebussyLeadSheetQuintetScore(seed = 90103): DebussyLeadSheetQuintetAssemblyResult {
  const spine = buildDebussyLeadSheetHarmonySpine(seed);
  const { importTimeline, appliedHarmonyBars, generationMetadata } = spine;

  let guitarScore = buildMelodyOnlyHarmonyScaffoldScore(appliedHarmonyBars, {
    title: 'Debussy LeadSheet Quintet Proof',
  });
  guitarScore = pinMelodyOnScore(guitarScore, importTimeline.melodyLine);
  const melodyPinned = verifyPinnedMelodyOnScore(guitarScore, importTimeline.melodyLine);

  const formPlan = buildEightBarQuartetFormPlan();
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
    title: 'Debussy LeadSheet Quintet Proof',
    seed,
    formPlan,
    texturePlan,
    chordBars: appliedHarmonyBars,
    songwriterStyleId: 'debussy',
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