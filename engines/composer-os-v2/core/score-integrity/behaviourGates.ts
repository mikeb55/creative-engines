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
import { isGuitarBassDuoFamily, isStandardGuitarBassDuo } from '../presets/guitarBassDuoPresetIds';
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
import { validatorRelaxActive } from '../authority/adapters/validatorRelaxAdapter';
import {
  isStyleTransferEightBarPinnedMelodyRelax,
  isStyleTransferPreserveMelodyActive,
} from '../import/mosaicStyleTransfer';
import { isBeMusicianPremiumMelodyBridgeActive } from '../bill-evans/beMusicianPremiumMelodyBridge';
import { riffFamilyForSongwriterId } from '../song-mode/songwriterStyleProfiles';

/** Art Rock mosaic / riff VRB composers — skip Metheny secondary gate only (not primary Metheny paths). */
const ART_ROCK_METHENY_GATE_BYPASS_COMPOSER_IDS = new Set(['verlaine', 'marr', 'fripp', 'morello']);

function isArtRockMethenyGateBypassPath(compositionContext?: CompositionContext): boolean {
  const md = compositionContext?.generationMetadata;
  if (!md) return false;

  const primary = md.songwriterStyleId?.trim().toLowerCase();
  if (primary) {
    if (ART_ROCK_METHENY_GATE_BYPASS_COMPOSER_IDS.has(primary)) return true;
    if (riffFamilyForSongwriterId(primary) === 'art_rock') return true;
  }

  const plan = md.mosaicSectionPlan;
  if (Array.isArray(plan)) {
    for (const entry of plan) {
      const sid = entry.songwriterStyleId?.trim().toLowerCase();
      if (sid && ART_ROCK_METHENY_GATE_BYPASS_COMPOSER_IDS.has(sid)) return true;
    }
  }

  return false;
}

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

/** Exported for retro/harness tests that assert style-stack weight validity without requiring every downstream behaviour gate (e.g. Metheny density). */
export function validateStyleBlendIntegrity(stack: StyleStack): { valid: boolean; errors: string[] } {
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
  const evansMusicianBridgeRelax = isBeMusicianPremiumMelodyBridgeActive(
    opts?.compositionContext?.generationMetadata
  );
  const compositionContext = opts?.compositionContext;
  const zappaStructuralRelax = compositionContext
    ? validatorRelaxActive(compositionContext, 'zappa_structural').active
    : false;
  const townerStructuralRelax =
    compositionContext?.generationMetadata?.songwriterStyleId === 'ralph_towner';
  const verlaineStructuralRelax = compositionContext
    ? validatorRelaxActive(compositionContext, 'structural').active
    : false;
  const holdsworthStructuralRelax =
    opts?.compositionContext?.generationMetadata?.songwriterStyleId === 'allan_holdsworth';
  const jackWhiteStructuralRelax =
    opts?.compositionContext?.generationMetadata?.songwriterStyleId === 'jack_white';
  const mandelStructuralRelax =
    opts?.compositionContext?.generationMetadata?.songwriterStyleId === 'johnny_mandel';
  const barryStructuralRelax =
    opts?.compositionContext?.generationMetadata?.songwriterStyleId === 'john_barry';
  const bassStructuralRelax =
    zappaStructuralRelax ||
    townerStructuralRelax ||
    verlaineStructuralRelax ||
    holdsworthStructuralRelax ||
    jackWhiteStructuralRelax ||
    mandelStructuralRelax ||
    barryStructuralRelax;
  const duoCtx = { compositionContext: opts?.compositionContext };
  const guitarBarCount =
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar')?.measures.length ?? 0;
  const effectiveFormBars =
    opts?.compositionContext?.form?.totalBars ?? guitarBarCount;
  const duoLockCtx = { compositionContext: opts?.compositionContext, effectiveFormBars };
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
  if (!contrast.valid && !zappaStructuralRelax) errors.push(...contrast.errors);

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
      const style = validateBarryHarrisConformance(score, opts?.compositionContext?.generationMetadata);
      const voiceLeadingJumpsWarningSubstr = 'Voice-leading jumps excessive';
      let blockingStyleErrors = style.errors;
      if (songMode || evansMusicianBridgeRelax) {
        const vl = blockingStyleErrors.filter((e) => e.includes(voiceLeadingJumpsWarningSubstr));
        blockingStyleErrors = blockingStyleErrors.filter((e) => !e.includes(voiceLeadingJumpsWarningSubstr));
        duoIdentityWarnings.push(...vl);
      }
      styleValid = blockingStyleErrors.length === 0;
      errors.push(...blockingStyleErrors);
    }
  }

  let triadPairValid = true;
  if (styleModules.includes('triad_pairs')) {
    const tp = validateTriadPairConformance(score);
    triadPairValid = tp.valid;
    if (!tp.valid) errors.push(...tp.errors);
  }

  let methenyValid = true;
  const methenySongwriterId = opts?.compositionContext?.generationMetadata?.songwriterStyleId;
  const skipMethenyForSongwriter =
    methenySongwriterId === 'claus_ogerman' || methenySongwriterId === 'don_sebesky';
  const skipMethenyForArtRockPath =
    styleStack?.primary !== 'metheny' && isArtRockMethenyGateBypassPath(opts?.compositionContext);
  if (
    styleModules.includes('metheny') &&
    opts?.presetId !== 'ecm_chamber' &&
    !skipMethenyForSongwriter &&
    !skipMethenyForArtRockPath
  ) {
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

  const duoMusical = validateDuoMusicalQuality(score, {
    styleStack,
    presetId: opts?.presetId,
    zappaStructuralRelax,
  });
  if (!duoMusical.valid) errors.push(...duoMusical.errors);
  const duoMusicalValid = duoMusical.valid;

  const styleTransferPreserveMelodyRelax = isStyleTransferPreserveMelodyActive(
    opts?.compositionContext?.generationMetadata
  );
  const relaxPinnedMelodyImport = isStyleTransferEightBarPinnedMelodyRelax(
    opts?.compositionContext?.generationMetadata,
    opts?.compositionContext?.form?.totalBars
  );
  const pushDuoGate = (messages: string[]) => {
    if (relaxPinnedMelodyImport || evansMusicianBridgeRelax) duoIdentityWarnings.push(...messages);
    else errors.push(...messages);
  };
  const bassRhythmicCellSubstr = 'rhythmic cell repeated across more than two consecutive bars';
  const bassIdentity = validateBassIdentity(score, {
    presetId: opts?.presetId,
    zappaStructuralRelax: bassStructuralRelax,
  });
  /**
   * Reich/Glass pattern-bass repeats a cell on purpose (`patternIntegrityMinRepeats`).
   * The jazz anti-loop lines are the wrong contract for that process. Other bass checks stay.
   */
  const reichGlassPatternBass =
    isGuitarBassDuoFamily(opts?.presetId) &&
    opts?.compositionContext?.generationMetadata?.songwriterStyleId === 'reich_glass';
  const bassIdentityErrors = reichGlassPatternBass
    ? bassIdentity.errors.filter(
        (e) =>
          !e.includes(bassRhythmicCellSubstr) &&
          !e.includes('identical contour reused too broadly'),
      )
    : bassIdentity.errors;
  if (bassIdentityErrors.length > 0) {
    if (styleTransferPreserveMelodyRelax) {
      const blocking = bassIdentityErrors.filter((e) => !e.includes(bassRhythmicCellSubstr));
      const rhythmic = bassIdentityErrors.filter((e) => e.includes(bassRhythmicCellSubstr));
      if (songMode) duoIdentityWarnings.push(...rhythmic);
      errors.push(...blocking);
    } else {
      errors.push(...bassIdentityErrors);
    }
  }
  const bassIdentityValid = styleTransferPreserveMelodyRelax
    ? bassIdentityErrors.filter((e) => !e.includes(bassRhythmicCellSubstr)).length === 0
    : bassIdentityErrors.length === 0;

  const phraseAuthority = validateDuoPhraseAuthority(score, {
    presetId: opts?.presetId,
    compositionContext: opts?.compositionContext,
  });
  pushDuoGate(phraseAuthority.errors);
  if (songMode || relaxPinnedMelodyImport) duoIdentityWarnings.push(...phraseAuthority.warnings);
  const phraseAuthorityValid = relaxPinnedMelodyImport ? true : phraseAuthority.valid;

  const jazzDuoBehaviour = validateJazzDuoBehaviourRules(score);
  if (!jazzDuoBehaviour.valid) errors.push(...jazzDuoBehaviour.errors);
  const jazzDuoBehaviourValid = jazzDuoBehaviour.valid;

  if (opts?.presetId === 'ecm_chamber') {
    const ecmLoop = validateEcmAntiLoop(score);
    if (!ecmLoop.valid) errors.push(...ecmLoop.errors);
  }

  /** Duo LOCK / melody-identity gates are calibrated for standard `guitar_bass_duo`; single-line uses monophony checks only. */
  if (opts?.presetId && isStandardGuitarBassDuo(opts.presetId)) {
    const duoRh = validateDuoRhythmAntiLoop(duoGateScore, duoLockCtx);
    pushDuoGate(duoRh.errors);
    if (songMode || relaxPinnedMelodyImport) duoIdentityWarnings.push(...duoRh.warnings);
    const duoGce = validateDuoGceHardGate(duoGateScore, duoLockCtx);
    pushDuoGate(duoGce.errors);
    if (songMode || relaxPinnedMelodyImport) duoIdentityWarnings.push(...duoGce.warnings);
    const duoV3 = validateDuoMelodyIdentityV3(duoGateScore, opts?.motifState, {
      presetId: opts?.presetId,
      compositionContext: opts?.compositionContext,
      effectiveFormBars,
    });
    pushDuoGate(duoV3.errors);
    if (songMode || relaxPinnedMelodyImport) duoIdentityWarnings.push(...duoV3.warnings);
    const duoSwing = validateDuoSwingRhythm(duoGateScore, duoLockCtx);
    pushDuoGate(duoSwing.errors);
    if (songMode || relaxPinnedMelodyImport) duoIdentityWarnings.push(...duoSwing.warnings);
    const duoIx = validateDuoInteractionAuthorityGate(duoGateScore, duoCtx);
    pushDuoGate(duoIx.errors);
    if (songMode || relaxPinnedMelodyImport) duoIdentityWarnings.push(...duoIx.warnings);
    const duoId = validateDuoIdentityMomentGate(duoGateScore, duoCtx);
    pushDuoGate(duoId.errors);
    if (songMode || relaxPinnedMelodyImport) duoIdentityWarnings.push(...duoId.warnings);
    const duoP33 = validateDuoPolishV33Gate(duoGateScore, duoLockCtx);
    pushDuoGate(duoP33.errors);
    if (songMode || relaxPinnedMelodyImport) duoIdentityWarnings.push(...duoP33.warnings);
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
