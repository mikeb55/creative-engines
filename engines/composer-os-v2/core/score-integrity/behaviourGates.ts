/**
 * Composer OS V2 — Behaviour validation gates
 */

import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';

/** Duo LOCK gates are 8-bar-calibrated; long-form scores use the opening chorus for the same thresholds. */
function sliceScoreToFirstEightBars(score: ScoreModel): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((p) => ({
      ...p,
      measures: p.measures.filter((m) => m.index >= 1 && m.index <= 8),
    })),
  };
}
import type { GuitarBehaviourPlan, BassBehaviourPlan } from '../instrument-behaviours/behaviourTypes';
import { validateGuitarBehaviour, validateBassBehaviour } from '../instrument-behaviours/behaviourValidation';
import { validateRhythmBehaviour } from '../rhythm-engine/rhythmBehaviourValidation';
import type { RhythmicConstraints } from '../rhythm-engine/rhythmTypes';
import { getDensityForBar } from '../density/densityCurvePlanner';
import type { DensityCurvePlan } from '../density/densityCurveTypes';
import type { MotifTrackerState } from '../motif/motifTypes';
import type { CompositionContext } from '../compositionContext';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { validateMotifIntegrity } from '../motif/motifValidation';
import { validateBarryHarrisConformance } from '../style-modules/barry-harris/moduleValidation';
import { validateMethenyConformance } from '../style-modules/metheny/moduleValidation';
import { validateTriadPairConformance } from '../style-modules/triad-pairs/moduleValidation';
import { validateBacharachConformance } from '../style-modules/bacharach/moduleValidation';
import type { StyleStack } from '../style-modules/styleModuleTypes';
import { normalizeStyleWeights } from '../style-modules/styleModuleTypes';
import type { InteractionPlan } from '../interaction/interactionTypes';
import { validateInteractionIntegrity, validateRegisterSeparation } from '../interaction/interactionValidation';
import { validateDuoMusicalQuality } from './duoMusicalQuality';
import { validateBassIdentity } from './bassIdentityValidation';
import { validateDuoPhraseAuthority } from './phraseAuthorityValidation';
import { validateJazzDuoBehaviourRules } from './jazzDuoBehaviourValidation';
import {
  validateDuoGceHardGate,
  validateDuoIdentityMomentGate,
  validateDuoInteractionAuthorityGate,
  validateDuoPolishV33Gate,
  validateDuoRhythmAntiLoop,
  validateDuoSwingRhythm,
} from './duoLockQuality';
import { validateDuoMelodyIdentityV3 } from './duoMelodyIdentityV3';

export interface SectionContrastResult {
  valid: boolean;
  errors: string[];
}

export function validateSectionContrast(
  sections: SectionWithRole[],
  densityPlan: DensityCurvePlan,
  score: ScoreModel
): SectionContrastResult {
  const errors: string[] = [];
  if (sections.length < 2) return { valid: true, errors: [] };

  const totalBars = score.parts[0]?.measures.length ?? 8;
  const span = Math.max(1, Math.floor(totalBars / 3));
  const pivotBar = totalBars > 8 ? 1 + span : 5;

  const densityA = getDensityForBar(densityPlan, 1);
  const densityB = getDensityForBar(densityPlan, pivotBar);
  if (densityA === densityB) {
    const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const endA = totalBars > 8 ? span : 4;
    const startB = totalBars > 8 ? 1 + span : 5;
    const endB = totalBars > 8 ? 2 * span : 8;
    const guitarPitchesA =
      g?.measures
        .filter((m) => m.index >= 1 && m.index <= endA)
        .flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => (e as { pitch: number }).pitch)) ?? [];
    const guitarPitchesB =
      g?.measures
        .filter((m) => m.index >= startB && m.index <= endB)
        .flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => (e as { pitch: number }).pitch)) ?? [];
    const avgA = guitarPitchesA.length ? guitarPitchesA.reduce((a, b) => a + b, 0) / guitarPitchesA.length : 0;
    const avgB = guitarPitchesB.length ? guitarPitchesB.reduce((a, b) => a + b, 0) / guitarPitchesB.length : 0;
    const eventCountA = score.parts.reduce(
      (s, p) => s + p.measures.filter((m) => m.index >= 1 && m.index <= endA).flatMap((m) => m.events).length,
      0
    );
    const eventCountB = score.parts.reduce(
      (s, p) => s + p.measures.filter((m) => m.index >= startB && m.index <= endB).flatMap((m) => m.events).length,
      0
    );
    if (Math.abs(avgA - avgB) < 2 && Math.abs(eventCountA - eventCountB) < 4) {
      errors.push('Sections A and B lack meaningful contrast in density or register');
    }
  }
  return { valid: errors.length === 0, errors };
}

export interface BehaviourGatesResult {
  rhythmValid: boolean;
  guitarValid: boolean;
  bassValid: boolean;
  sectionContrastValid: boolean;
  motifValid: boolean;
  styleValid: boolean;
  styleBlendValid: boolean;
  triadPairValid: boolean;
  methenyValid: boolean;
  bacharachValid: boolean;
  duoMusicalValid: boolean;
  bassIdentityValid: boolean;
  phraseAuthorityValid: boolean;
  jazzDuoBehaviourValid: boolean;
  interactionValid: boolean;
  registerSeparationValid: boolean;
  allValid: boolean;
  errors: string[];
  /** Song Mode: non-blocking Duo / Phrase Authority / LOCK / Identity messages. */
  duoIdentityWarnings: string[];
}

/** ECM: reject mechanical loops — identical guitar rhythm or contour for >2 consecutive bars. */
function validateEcmAntiLoop(score: ScoreModel): { valid: boolean; errors: string[] } {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return { valid: true, errors: [] };
  const errors: string[] = [];
  const rhythmSig = (m: MeasureModel): string =>
    [...m.events]
      .filter((e) => e.kind === 'note')
      .sort(
        (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
      )
      .map((e) => `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`)
      .join('|');
  const contourSig = (m: MeasureModel): string => {
    const notes = [...m.events]
      .filter((e) => e.kind === 'note')
      .sort(
        (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
      ) as { pitch: number }[];
    if (notes.length === 0) return 'rest';
    if (notes.length === 1) return `P${notes[0].pitch % 12}`;
    return notes
      .slice(1)
      .map((n, i) => n.pitch - notes[i].pitch)
      .join(',');
  };
  const sorted = [...guitar.measures].sort((a, b) => a.index - b.index);
  let prevRh = '';
  let prevCo = '';
  let runRh = 0;
  let runCo = 0;
  let maxRh = 0;
  let maxCo = 0;
  for (const m of sorted) {
    const rh = rhythmSig(m);
    const co = contourSig(m);
    if (rh === prevRh) runRh++;
    else {
      runRh = 1;
      prevRh = rh;
    }
    if (co === prevCo) runCo++;
    else {
      runCo = 1;
      prevCo = co;
    }
    maxRh = Math.max(maxRh, runRh);
    maxCo = Math.max(maxCo, runCo);
  }
  if (maxRh > 2) {
    errors.push('ECM anti-loop: guitar rhythm repeats for more than two consecutive bars');
  }
  if (maxCo > 2) {
    errors.push('ECM anti-loop: guitar pitch contour repeats for more than two consecutive bars');
  }
  return { valid: errors.length === 0, errors };
}

function validateStyleBlendIntegrity(stack: StyleStack): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const w = normalizeStyleWeights(stack);
  if (w.primary <= 0) errors.push('Style stack primary weight must be > 0');
  if (w.primary + w.secondary + w.colour < 0.01) errors.push('Style stack has no effective influence');
  return { valid: errors.length === 0, errors };
}

export function runBehaviourGates(
  score: ScoreModel,
  rhythmConstraints: RhythmicConstraints,
  guitarPlan: GuitarBehaviourPlan,
  bassPlan: BassBehaviourPlan,
  sections: SectionWithRole[],
  densityPlan: DensityCurvePlan,
  opts?: {
    motifState?: MotifTrackerState;
    styleStack?: StyleStack;
    interactionPlan?: InteractionPlan;
    /** Duo gates use golden-path chord assumptions; ECM chamber bypasses those checks. */
    presetId?: string;
    /** When set, duo melody/harmony checks use the same chord-tone policy as generation. */
    compositionContext?: CompositionContext;
  }
): BehaviourGatesResult {
  const errors: string[] = [];
  const duoIdentityWarnings: string[] = [];
  const songMode = opts?.compositionContext?.generationMetadata?.songModeHookFirstIdentity === true;
  const duoCtx = { compositionContext: opts?.compositionContext };
  const effectiveFormBars =
    opts?.compositionContext?.form?.totalBars ?? guitarBarCount;
  const duoLockCtx = { compositionContext: opts?.compositionContext, effectiveFormBars };
  const guitarBarCount =
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar')?.measures.length ?? 0;
  const duoGateScore =
    opts?.presetId && isGuitarBassDuoFamily(opts.presetId) && guitarBarCount > 8
      ? sliceScoreToFirstEightBars(score)
      : score;
  const styleStack = opts?.styleStack;
  const styleModules = styleStack
    ? [styleStack.primary, styleStack.secondary, styleStack.colour].filter(Boolean) as string[]
    : [];

  const rhythm = validateRhythmBehaviour(score, rhythmConstraints, {
    ecmChamber: opts?.presetId === 'ecm_chamber',
  });
  if (!rhythm.valid) errors.push(...rhythm.errors);

  const guitar = validateGuitarBehaviour(score, guitarPlan);
  if (!guitar.valid) errors.push(...guitar.errors);

  const bass = validateBassBehaviour(score, bassPlan);
  if (!bass.valid) errors.push(...bass.errors);

  const contrast = validateSectionContrast(sections, densityPlan, score);
  if (!contrast.valid) errors.push(...contrast.errors);

  let motifValid = true;
  if (opts?.motifState) {
    const motif = validateMotifIntegrity(opts.motifState, score);
    motifValid = motif.valid;
    if (!motif.valid) errors.push(...motif.errors);
  }

  let styleBlendValid = true;
  let styleValid = true;
  if (styleStack) {
    const blend = validateStyleBlendIntegrity(styleStack);
    styleBlendValid = blend.valid;
    if (!blend.valid) errors.push(...blend.errors);

    if (styleModules.includes('barry_harris')) {
      const style = validateBarryHarrisConformance(score);
      styleValid = style.valid;
      if (!style.valid) errors.push(...style.errors);
    }
  }

  let triadPairValid = true;
  if (styleModules.includes('triad_pairs')) {
    const tp = validateTriadPairConformance(score);
    triadPairValid = tp.valid;
    if (!tp.valid) errors.push(...tp.errors);
  }

  let methenyValid = true;
  if (styleModules.includes('metheny') && opts?.presetId !== 'ecm_chamber') {
    const metheny = validateMethenyConformance(guitarBarCount > 8 ? duoGateScore : score);
    methenyValid = metheny.valid;
    if (!metheny.valid) errors.push(...metheny.errors);
  }

  let bacharachValid = true;
  if (styleModules.includes('bacharach')) {
    const bach = validateBacharachConformance(score);
    bacharachValid = bach.valid;
    if (!bach.valid) errors.push(...bach.errors);
  }

  const duoMusical = validateDuoMusicalQuality(score, { styleStack, presetId: opts?.presetId });
  if (!duoMusical.valid) errors.push(...duoMusical.errors);
  const duoMusicalValid = duoMusical.valid;

  const bassIdentity = validateBassIdentity(score, { presetId: opts?.presetId });
  if (!bassIdentity.valid) errors.push(...bassIdentity.errors);
  const bassIdentityValid = bassIdentity.valid;

  const phraseAuthority = validateDuoPhraseAuthority(score, {
    presetId: opts?.presetId,
    compositionContext: opts?.compositionContext,
  });
  errors.push(...phraseAuthority.errors);
  if (songMode) duoIdentityWarnings.push(...phraseAuthority.warnings);
  const phraseAuthorityValid = phraseAuthority.valid;

  const jazzDuoBehaviour = validateJazzDuoBehaviourRules(score);
  if (!jazzDuoBehaviour.valid) errors.push(...jazzDuoBehaviour.errors);
  const jazzDuoBehaviourValid = jazzDuoBehaviour.valid;

  if (opts?.presetId === 'ecm_chamber') {
    const ecmLoop = validateEcmAntiLoop(score);
    if (!ecmLoop.valid) errors.push(...ecmLoop.errors);
  }

  if (opts?.presetId && isGuitarBassDuoFamily(opts.presetId)) {
    const duoRh = validateDuoRhythmAntiLoop(duoGateScore, duoLockCtx);
    errors.push(...duoRh.errors);
    if (songMode) duoIdentityWarnings.push(...duoRh.warnings);
    const duoGce = validateDuoGceHardGate(duoGateScore, duoLockCtx);
    errors.push(...duoGce.errors);
    if (songMode) duoIdentityWarnings.push(...duoGce.warnings);
    const duoV3 = validateDuoMelodyIdentityV3(duoGateScore, opts?.motifState, {
      presetId: opts?.presetId,
      compositionContext: opts?.compositionContext,
      effectiveFormBars,
    });
    errors.push(...duoV3.errors);
    if (songMode) duoIdentityWarnings.push(...duoV3.warnings);
    const duoSwing = validateDuoSwingRhythm(duoGateScore, duoLockCtx);
    errors.push(...duoSwing.errors);
    if (songMode) duoIdentityWarnings.push(...duoSwing.warnings);
    const duoIx = validateDuoInteractionAuthorityGate(duoGateScore, duoCtx);
    errors.push(...duoIx.errors);
    if (songMode) duoIdentityWarnings.push(...duoIx.warnings);
    const duoId = validateDuoIdentityMomentGate(duoGateScore, duoCtx);
    errors.push(...duoId.errors);
    if (songMode) duoIdentityWarnings.push(...duoId.warnings);
    const duoP33 = validateDuoPolishV33Gate(duoGateScore, duoLockCtx);
    errors.push(...duoP33.errors);
    if (songMode) duoIdentityWarnings.push(...duoP33.warnings);
  }

  let interactionValid = true;
  let registerSeparationValid = true;
  if (opts?.interactionPlan) {
    const ia = validateInteractionIntegrity(score, opts.interactionPlan);
    interactionValid = ia.valid;
    if (!ia.valid) errors.push(...ia.errors);
    const rs = validateRegisterSeparation(score, opts.interactionPlan);
    registerSeparationValid = rs.valid;
    if (!rs.valid) errors.push(...rs.errors);
  }

  return {
    rhythmValid: rhythm.valid,
    guitarValid: guitar.valid,
    bassValid: bass.valid,
    sectionContrastValid: contrast.valid,
    motifValid,
    styleValid,
    styleBlendValid,
    triadPairValid,
    methenyValid,
    bacharachValid,
    duoMusicalValid,
    bassIdentityValid,
    phraseAuthorityValid,
    jazzDuoBehaviourValid,
    interactionValid,
    registerSeparationValid,
    allValid: errors.length === 0,
    errors,
    duoIdentityWarnings,
  };
}
