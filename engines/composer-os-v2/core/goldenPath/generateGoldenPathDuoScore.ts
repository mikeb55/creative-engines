/**
 * Composer OS V2 — Golden path duo score generator
 * Motif-driven melody, style-influenced, section-aware (Guitar–Bass Duo).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { SongModeHookIdentity } from '../motif/motifEngineTypes';

declare module '../compositionContext' {
  interface CompositionContext {
    /** Mirrors `generationMetadata.songwriterStyleId` for motif passes (narrow extension). */
    songwriterStyleId?: string;
    /** Wayne `buildPhrase` rhythm cells for phrase A (duration@beat), return nudge duration bias. */
    waynePhraseAFingerprint?: string[];
  }
}
import { chordTonesForChordSymbolWithContext, shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import { assertGuitarScoreMatchesHarmonyContext } from '../harmony/harmonyContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import {
  parseChordSymbol,
  pitchClassToBassMidi,
  noteNameToPitchClass,
  type ChordTonesOptions,
} from '../harmony/chordSymbolAnalysis';
import type {
  ScoreModel,
  PartModel,
  MeasureModel,
  NoteEvent,
  RestEvent,
  ScoreEvent,
  ChordEvent,
  DuoElectricVoiceRole,
} from '../score-model/scoreModelTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID, isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { applyPhraseFirstSingleLineMonophony, buildPhraseFirstDuoScore } from './duoSingleLinePhraseFirstPipeline';
import { applyDuoWybleBassAnchorBar1Nudge } from './duoWybleBassAnchorNudge';
import { wybleConsumptionReceiptForDuoFamily } from '../wyble/wybleConsumptionReceipt';
import { createMeasure, createNote, createRest, addEvent, createScore } from '../score-model/scoreEventBuilder';
import type { GuitarProfile, BassProfile } from '../instrument-profiles/instrumentProfileTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { GUITAR_BASS_DUO_BASS_PART_NAME } from '../instrument-profiles/guitarBassDuoExportNames';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import type { DensityCurvePlan } from '../density/densityCurveTypes';
import type { GuitarBehaviourPlan, BassBehaviourPlan } from '../instrument-behaviours/behaviourTypes';
import type { RhythmicConstraints } from '../rhythm-engine/rhythmTypes';
import type { MotifTrackerState, PlacedMotif } from '../motif/motifTypes';
import { getDensityForBar } from '../density/densityCurvePlanner';
import { styleStackToModuleIds, type StyleStack } from '../style-modules/styleModuleTypes';
import type { InteractionPlan } from '../interaction/interactionTypes';
import { getInteractionForBar } from '../interaction/interactionPlanner';
import { applyPerformancePass } from '../performance/performancePass';
import { applyExpressiveDuoFeel, buildFeelProfileFromTempo } from './expressiveDuoFeel';
import { pickGuideTone, clampPitch, seededUnit, approachFromBelow, type ChordToneSet } from './guitarBassDuoHarmony';
import {
  accumulateBrianWilsonHarmonyDiagnostics,
  applyBrianWilsonGuitarBarPasses,
  createBrianWilsonHarmonyAccumulator,
  finalizeBrianWilsonPetSoundsMetadata,
  inferTonicPitchClassFromBar1,
  precomputeBrianWilsonEffectiveHarmonyBars,
} from './brianWilsonPetSoundsSlice';
import {
  accumulateStevieWonderHarmonyDiagnostics,
  applyStevieWonderGuitarBarPasses,
  createStevieWonderHarmonyAccumulator,
  finalizeStevieWonderMetadata,
  precomputeStevieWonderEffectiveHarmonyBars,
} from './stevieWonderSlice';
import {
  accumulateRadioheadHarmonyDiagnostics,
  createRadioheadHarmonyAccumulator,
  finalizeRadioheadMetadata,
  precomputeRadioheadEffectiveHarmonyBars,
} from './radioheadSlice';
import {
  accumulateJamesBrownHarmonyDiagnostics,
  applyJamesBrownGuitarBarPasses,
  createJamesBrownHarmonyAccumulator,
  finalizeJamesBrownMetadata,
  precomputeJamesBrownEffectiveHarmonyBars,
} from './jamesBrownSlice';
import {
  accumulateJoniMitchellHarmonyDiagnostics,
  createJoniMitchellHarmonyAccumulator,
  finalizeJoniMitchellMetadata,
  precomputeJoniMitchellEffectiveHarmonyBars,
} from './joniMitchellSlice';
import {
  accumulateSonicYouthHarmonyDiagnostics,
  applySonicYouthGuitarBarPasses,
  createSonicYouthHarmonyAccumulator,
  finalizeSonicYouthMetadata,
  precomputeSonicYouthEffectiveHarmonyBars,
} from './sonicYouthSlice';
import {
  accumulatePatMethenyHarmonyDiagnostics,
  createPatMethenyHarmonyAccumulator,
  finalizePatMethenyMetadata,
  precomputePatMethenyEffectiveHarmonyBars,
} from './patMethenySlice';
import {
  accumulateWayneShorterHarmonyDiagnostics,
  createWayneShorterHarmonyAccumulator,
  finalizeWayneShorterMetadata,
  precomputeWayneShorterEffectiveHarmonyBars,
} from './wayneShorterSlice';
import {
  accumulateFrankZappaHarmonyDiagnostics,
  attachFrankZappaHarmonyContext,
  createFrankZappaHarmonyAccumulator,
  finalizeFrankZappaMetadata,
} from './frankZappaSlice';
import {
  applyZappaSoloToMetadata,
  generateZappaSolo,
  mergeZappaSoloPart,
} from '../solo/zappasoloEngine';
import {
  accumulateBarryHarrisHarmonyDiagnostics,
  createBarryHarrisHarmonyAccumulator,
  finalizeBarryHarrisMetadata,
  precomputeBarryHarrisEffectiveHarmonyBars,
} from './barryHarrisSlice';
import {
  accumulateBillEvansHarmonyDiagnostics,
  createBillEvansHarmonyAccumulator,
  finalizeBillEvansMetadata,
  precomputeBillEvansEffectiveHarmonyBars,
} from './billEvansSlice';
import {
  accumulateDebussyHarmonyDiagnostics,
  createDebussyHarmonyAccumulator,
  finalizeDebussyMetadata,
  precomputeDebussyEffectiveHarmonyBars,
} from './debussySlice';
import {
  accumulateDukeEllingtonHarmonyDiagnostics,
  createDukeEllingtonHarmonyAccumulator,
  finalizeDukeEllingtonMetadata,
  precomputeDukeEllingtonEffectiveHarmonyBars,
} from './dukeEllingtonSlice';
import {
  accumulateMilesDavisHarmonyDiagnostics,
  createMilesDavisHarmonyAccumulator,
  finalizeMilesDavisMetadata,
  precomputeMilesDavisEffectiveHarmonyBars,
} from './milesDavisSlice';
import {
  accumulateBartokHarmonyDiagnostics,
  createBartokHarmonyAccumulator,
  finalizeBartokMetadata,
  precomputeBartokEffectiveHarmonyBars,
} from './bartokSlice';
import {
  accumulateGershwinHarmonyDiagnostics,
  createGershwinHarmonyAccumulator,
  finalizeGershwinMetadata,
  precomputeGershwinEffectiveHarmonyBars,
} from './gershwinSlice';
import {
  accumulateArvoPartHarmonyDiagnostics,
  createArvoPartHarmonyAccumulator,
  finalizeArvoPartMetadata,
  precomputeArvoPartEffectiveHarmonyBars,
} from './arvoPartSlice';
import {
  accumulateSatieHarmonyDiagnostics,
  createSatieHarmonyAccumulator,
  finalizeSatieMetadata,
  precomputeSatieEffectiveHarmonyBars,
} from './satieSlice';
import {
  accumulatePrinceHarmonyDiagnostics,
  createPrinceHarmonyAccumulator,
  finalizePrinceMetadata,
  precomputePrinceEffectiveHarmonyBars,
} from './princeSlice';
import {
  accumulateBeatlesHarmonyDiagnostics,
  createBeatlesHarmonyAccumulator,
  finalizeBeatlesMetadata,
  precomputeBeatlesEffectiveHarmonyBars,
} from './beatlesSlice';
import {
  accumulateColePorterHarmonyDiagnostics,
  createColePorterHarmonyAccumulator,
  finalizeColePorterMetadata,
  precomputeColePorterEffectiveHarmonyBars,
} from './colePorterSlice';
import {
  accumulateMariaSchneiderHarmonyDiagnostics,
  createMariaSchneiderHarmonyAccumulator,
  finalizeMariaSchneiderMetadata,
  precomputeMariaSchneiderEffectiveHarmonyBars,
} from './mariaSchneiderSlice';
import {
  accumulateBacharachHarmonyDiagnostics,
  createBacharachHarmonyAccumulator,
  finalizeBacharachMetadata,
  precomputeBacharachEffectiveHarmonyBars,
} from './bacharachSlice';
import {
  accumulateDonaldFagenHarmonyDiagnostics,
  createDonaldFagenHarmonyAccumulator,
  finalizeDonaldFagenMetadata,
  precomputeDonaldFagenEffectiveHarmonyBars,
} from './donaldFagenSlice';
import {
  accumulateEcmChamberHarmonyDiagnostics,
  createEcmChamberHarmonyAccumulator,
  finalizeEcmChamberMetadata,
  precomputeEcmChamberEffectiveHarmonyBars,
} from './ecmChamberSlice';
import {
  accumulateJobimHarmonyDiagnostics,
  createJobimHarmonyAccumulator,
  finalizeJobimMetadata,
  precomputeJobimEffectiveHarmonyBars,
} from './jobimSlice';
import {
  accumulateHerbieHancockHarmonyDiagnostics,
  createHerbieHancockHarmonyAccumulator,
  finalizeHerbieHancockMetadata,
  precomputeHerbieHancockEffectiveHarmonyBars,
} from './herbieHancockSlice';
import {
  accumulateSondheimHarmonyDiagnostics,
  createSondheimHarmonyAccumulator,
  finalizeSondheimMetadata,
  precomputeSondheimEffectiveHarmonyBars,
} from './sondheimSlice';
import {
  accumulateKateBushHarmonyDiagnostics,
  createKateBushHarmonyAccumulator,
  finalizeKateBushMetadata,
  precomputeKateBushEffectiveHarmonyBars,
} from './kateBushSlice';
import {
  accumulateTheloniousMonkHarmonyDiagnostics,
  createTheloniousMonkHarmonyAccumulator,
  finalizeTheloniousMonkMetadata,
  precomputeTheloniousMonkEffectiveHarmonyBars,
} from './theloniousMonkSlice';
import {
  accumulateAndrewHillHarmonyDiagnostics,
  createAndrewHillHarmonyAccumulator,
  finalizeAndrewHillMetadata,
  precomputeAndrewHillEffectiveHarmonyBars,
} from './andrewHillSlice';
import {
  accumulateCharlieParkerHarmonyDiagnostics,
  createCharlieParkerHarmonyAccumulator,
  finalizeCharlieParkerMetadata,
  precomputeCharlieParkerEffectiveHarmonyBars,
} from './charlieParkerSlice';
import { activityScoreForBar, HIGH_ACTIVITY } from './activityScore';
import {
  emitDuoSwingBassBar,
  emitDuoBassAuthorityMomentBar,
  emitDuoBassIdentityBar7,
  emitMelodicBassBar,
  emitDuoBassQuarterStrideBar,
  emitDuoPhraseModeBar,
  echoGuitarToBass,
  scrubBassFirstAttackIfRoot,
  breakMeasureContourLocally,
  duoPhraseModeForPairIndex,
  measureIsDenseEvenEighthWalk,
  ensureBassBarHitsThirdOrSeventh,
  ensureSlashBassPitchPresentInMeasure,
  nudgeDuoBassPhraseEndTone,
  enforceFrankZappaBassBeatCommitment,
  type BassSectionRole,
  type DuoPhraseBehaviourMode,
} from './bassMelodicLines';
import { contourFingerprint, phraseTwoBarFingerprint, rhythmFingerprint } from './bassLineFingerprints';
import { duoGuitarSwingStaggerBump, guitarBarIsBusy } from './duoSwingPhrasing';
import {
  applyDuoGoldenPhraseEngineStage3Anticipation,
  applyDuoGoldenPhraseEngineStage4MotifRhythm,
  duoGoldenPathPhraseIntentAtBar,
} from '../phrase/phraseBuilder';
import {
  computeEnsembleStagger,
  emitGuitarDuoIdentityBar7,
  emitGuitarPhraseBar,
  getDuoPhraseIntent,
  applyTuningVoicingMapToChordTones,
  guitarChordTonesInRange,
  liftToneToRange,
  resolvePhraseEndForDuo,
  type PhraseIntent,
} from './guitarPhraseAuthority';
import { momentTagForBar } from './duoNarrativeMoments';
import { planEcmTextureBars, type EcmBarTexture } from '../ecm/ecmTextureEngine';
import {
  augmentEcmChamberTexturePlan,
  applyEcmChamberPhraseEdgeSpaceToParts,
} from '../ecm/ecmChamberArrangementPolicy';
import { finalizeAndSealDuoScoreBarMath } from '../score-integrity/duoBarMathFinalize';
import { isProtectedBar } from '../score-integrity/identityLock';
import {
  assertHookBarsUnchangedSinceSnapshot,
  snapshotGuitarHookBars,
  type HookBarNoteIdentity,
} from '../score-integrity/protectedHookBarInvariant';
import { applyDuoPitchVariationToGuitar } from './duoPitchVariationPass';
import { applyECMShapingPass } from './ecmShapingPass';
import { applyDuoOrchestrationPass } from './duoOrchestrationPass';
import { applyEcmIdentityCellPass } from './identityCell';
import {
  normalizeMeasureToEighthBeatGrid,
  snapAttackBeatToGrid,
  validateScoreDuoAttackGrid,
  debugPrintDuoAttackGridIfEnabled,
} from '../score-integrity/duoEighthBeatGrid';
import {
  buildSongModeHookRuntime,
  SONG_MODE_HOOK_RETURN_BAR,
  SONG_MODE_MOTIF_BAR_9,
  SONG_MODE_MOTIF_BAR_17,
} from './songModeHookIdentity';
import { recomputeSongModeHookMotifShapesFromScore } from '../motif/songModeMotifEngineV2';
import { extractMotifAssetsFromCoreMotifs } from '../motif-plus/motifExtractor';
import { planMotifReuse } from '../motif-plus/motifReusePlanner';
import { applySongModePhraseEngineV1, applySongModePhraseEndLandingRepair } from './songModePhraseEngineV1';
import {
  applyBassMotifEcho,
  applyPhraseEngineV2,
  buildMotifPool,
  seedPoolFromHookIdentity,
} from './phraseEngineV2';
import { applySongModeMelodicContinuityPass } from './songModeMelodicContinuity';
import { applySongModeGuitarDensityFloor } from './songModeGuitarDensityFloor';
import { enforceSongModeGuitarDensity } from './songModeGuitarDensityEnforcer';
import { applySongModeRhythmOverlayC1 } from './songModeRhythmOverlayC1';
import { applySongwriterKeysCompPresentation } from './songwriterKeysCompPass';
import { applySongModeFagenKeysCompV15 } from './fagenKeysCompV15';
import { applyJamesBrownFunkOverlay } from './jamesBrownFunkOverlay';
import { applySongModeHookRhythmLayerC4, applySongModeOstinatoC4 } from './songModeOstinatoC4';
import { applySongModeOstinatoC5, applyC5DensityLayer } from './songModeOstinatoC5';
import { applySongModeControlC5 } from './songModeControlC5';
import { applySongModeExpressionC6 } from './songModeExpressionC6';
import { applySongModeSpaceC7 } from './songModeSpaceC7';
import { applyIndieArtPopPhaseADeepening } from '../song-mode/indieArtPopPhaseA';
import { applySongModeStyleEngineToScore } from '../song-mode/songModeStyleEngine';
import { getSonicYouthTextureStateAtBar } from '../song-mode/sonicYouthSlice';
import { normalizeStyleProfileId } from '../song-mode/songModeStyleProfile';
import { normalizeSongwriterStyleKey } from '../song-mode/songwriterStyleProfiles';
import {
  buildExportPartTransposeSemitonesFromResolvedAlternateTuning,
  formatAlternateGuitarTuningExportLine,
  styleProfileSupportsAlternateGuitarTuning,
} from '../song-mode/alternateGuitarTunings';
import { buildResolvedTuningVoicingContext } from '../song-mode/alternateGuitarTuningVoicingMaps';
import {
  applySlonimskyToMelodyLine,
  buildDuoBarSlonimskyContext,
  mapDuoPhraseIntentToSlonimskyContext,
  resolveAllowedOutsideLevelForSlonimsky,
  type SlonimskyContext,
  type SlonimskyNote,
} from '../slonimsky/slonimskyEngine';
import { applyBarryHarris } from '../style-modules/barry-harris/moduleApply';
import { ensureRhythmIntentResolvedIntoMetadata } from '../rhythmIntentResolve';
import {
  consecutiveChordStreakEndingAtBar,
  isLateClosingSlice,
} from './lateClosingSectionDuo';
import {
  assertPhaseACheckpointA,
  injectPhaseAGuitarVoice2Probe,
  logGuitarVoice2Checkpoint,
} from './phaseAGuitarPolyphonyProbe';
import { enforceVoice2BassRegisterSeparation18_2B_4 } from './guitarVoice2WybleLayer';
import { isGuitarMelodyVoiceNote } from '../score-integrity/guitarVoiceMelody';
import { validateBarryHarrisConformance } from '../style-modules/barry-harris/moduleValidation';
import type { ZappaImitationReceipt } from '../solo/soloTypes';
import {
  applyWayneShorterChorusBridgeMotifDevelopment,
  buildPhraseFingerprint,
  classifyVariationType,
  computeMotifAuthorityScore,
  defaultMotifAuthorityPlan,
  nudgeReturnPhraseTowardFingerprint,
  type MotifAuthorityLevel,
  type MotifAuthorityPlan,
  type MotifDevelopmentSummary,
  type MotifPhraseRange,
} from '../motif/motifAuthorityV1';
import { buildPhrase } from '../phrase/phraseBuilder';
import type { SongModeLeadSheetMelodyAnchor } from '../song-mode/songModeLeadSheetAdapter';
import { DEFAULT_LEADSHEET_PERFORMANCE_BLEND } from '../lead-sheet/leadSheetPerformanceRendering';

const DUO_DEFAULT_STYLE_STACK: StyleStack = {
  primary: 'barry_harris',
  secondary: 'metheny',
  colour: 'triad_pairs',
  weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
};

const GUITAR_FLOOR_FOR_SEPARATION = 60;

/** Optional alternate-tuning voicing map on top of `guitarChordTonesInRange` (pilot: `new_standard` only in registry). */
function duoChordTonesWithOptionalTuningMap(
  chord: string,
  low: number,
  high: number,
  context: CompositionContext,
  bar: number,
  partRole: 'guitar' | 'guitar_2',
  chordToneOpts: ChordTonesOptions | undefined,
  salt: number
) {
  const base = guitarChordTonesInRange(chord, low, high, chordToneOpts);
  const voicingCtx = buildResolvedTuningVoicingContext(context.generationMetadata?.alternateGuitarTuning, partRole);
  return applyTuningVoicingMapToChordTones(base, chord, low, high, voicingCtx, context.seed, bar, salt);
}

/** Indie route name is historical; eligibility matches `styleProfileSupportsAlternateGuitarTuning` / `runGoldenPath` `isIndieArtPopDualGuitarRoute`. */
function shouldUseIndieArtPopDualGuitarRoute(context: CompositionContext): boolean {
  const sp = normalizeStyleProfileId(context.generationMetadata?.styleProfile);
  return (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    styleProfileSupportsAlternateGuitarTuning(sp) &&
    context.generationMetadata?.alternateGuitarTuning?.mode === 'separate'
  );
}

/** Inline Slonimsky bar fill only when alternate-tuning metadata is actually active (not merely ECM-style profile). */
function isAlternateGuitarTuningPilotActive(gen: GenerationMetadata | undefined): boolean {
  const t = gen?.alternateGuitarTuning;
  if (!t) return false;
  if (t.mode === 'separate') return true;
  if (t.mode === 'shared' && t.shared?.presetId !== undefined && t.shared.presetId !== 'standard') return true;
  return false;
}

/** Time / voice / pitch ordering so same-beat voice-2 chord stacks sit adjacent for MusicXML `<chord/>` grouping. */
function sortIndieGuitar2MeasureEventsForExport(events: ScoreEvent[]): ScoreEvent[] {
  return [...events].sort((a, b) => {
    const beatA = a.kind === 'note' || a.kind === 'rest' || a.kind === 'chord' ? a.startBeat : 0;
    const beatB = b.kind === 'note' || b.kind === 'rest' || b.kind === 'chord' ? b.startBeat : 0;
    if (beatA !== beatB) return beatA - beatB;
    const vA = (a as NoteEvent | RestEvent | ChordEvent).voice ?? 1;
    const vB = (b as NoteEvent | RestEvent | ChordEvent).voice ?? 1;
    if (vA !== vB) return vA - vB;
    if (a.kind !== b.kind) {
      if (a.kind === 'rest') return 1;
      if (b.kind === 'rest') return -1;
      if (a.kind === 'note' && b.kind === 'chord') return -1;
      if (a.kind === 'chord' && b.kind === 'note') return 1;
      return 0;
    }
    if (a.kind === 'note' && b.kind === 'note') return a.pitch - b.pitch;
    if (a.kind === 'chord' && b.kind === 'chord') {
      return (a.pitches[0] ?? 0) - (b.pitches[0] ?? 0);
    }
    return 0;
  });
}

function remapBassPartToElectricGuitar2ForIndieArtPop(bass: PartModel): PartModel {
  const remappedMeasures: MeasureModel[] = bass.measures.map((m) => ({
    ...m,
    events: m.events.map((e) => {
      if (e.kind !== 'note') return e;
      const p = Math.max(43, e.pitch + 12);
      return { ...e, pitch: p };
    }),
  }));
  return {
    ...bass,
    id: 'guitar_2',
    name: 'Electric Guitar 2',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: remappedMeasures,
  };
}

function rootPcFromChordLabel(label: string): number | undefined {
  const h = parseChordSymbol(label).harmonyPart.trim();
  const m = h.match(/^([A-G](?:#|b)?)/i);
  if (!m) return undefined;
  return noteNameToPitchClass(m[1] ?? '');
}

function circleDistanceSemitones(a: number, b: number): number {
  return Math.min((b - a + 12) % 12, (a - b + 12) % 12);
}

/** “Large” harmony jump — e.g. new tonal area — prefers fuller 3–4 note comp. */
function isIndieGuitar2LargeHarmonyChange(prevLabel: string | null, curLabel: string): boolean {
  if (prevLabel == null) return true;
  const a = rootPcFromChordLabel(prevLabel);
  const b = rootPcFromChordLabel(curLabel);
  if (a === undefined || b === undefined) return prevLabel !== curLabel;
  return circleDistanceSemitones(a, b) >= 4;
}

function isIndieGuitar2SectionStartBar(barIndex: number, context: CompositionContext): boolean {
  return context.form.sections.some((s) => s.startBar === barIndex);
}

const INDIE_G2_SHEET_CLARITY_MIN = 48; // ~C3 — if mean pitch below this, thin 4-note grips for clarity

function indieGuitar2HarmonicRank(midi: number, tones: ReturnType<typeof guitarChordTonesInRange>): number {
  const pc = ((midi % 12) + 12) % 12;
  const tr = (x: number) => ((x % 12) + 12) % 12;
  if (tr(tones.third) === pc) return 0;
  if (tr(tones.seventh) === pc) return 1;
  if (tr(tones.fifth) === pc) return 2;
  if (tr(tones.root) === pc) return 3;
  return 4;
}

/**
 * 2–4 **unique** pitch classes (no 5+ duplicates); optional maxTarget 2–4 from light vs big bars. Prefer mid-register per PC.
 */
function normalizeIndieGuitar2CompPitches(
  raw: number[],
  tones: ReturnType<typeof guitarChordTonesInRange>,
  low: number,
  high: number,
  maxTarget: number
): number[] | null {
  const tr = (x: number) => ((x % 12) + 12) % 12;
  const byPc = new Map<number, number>();
  for (const p of raw) {
    if (!Number.isFinite(p)) continue;
    const cl = clampPitch(p, low, high);
    const pc = tr(cl);
    const prev = byPc.get(pc);
    if (prev == null || cl > prev) {
      byPc.set(pc, cl);
    }
  }
  if (byPc.size === 0) return null;
  const cap = Math.min(4, Math.max(2, maxTarget));
  const orderRank = (m: number) => indieGuitar2HarmonicRank(m, tones);
  let out = Array.from(byPc.values()).sort((a, b) => orderRank(a) - orderRank(b));
  while (out.length > 4) {
    let dropI = 0;
    for (let j = 1; j < out.length; j++) {
      if (orderRank(out[j]!) > orderRank(out[dropI]!)) dropI = j;
    }
    out = out.filter((_, j) => j !== dropI);
  }
  if (out.length < 2) {
    for (const add of [tones.third, tones.seventh, tones.fifth, tones.root]) {
      if (!Number.isFinite(add)) continue;
      const t = liftToneToRange(add, low, high);
      if (out.some((o) => tr(o) === tr(t))) continue;
      out = [...out, t];
      if (out.length >= 2) break;
    }
  }
  if (out.length < 2) return null;
  const mean = out.reduce((s, m) => s + m, 0) / out.length;
  if (mean < INDIE_G2_SHEET_CLARITY_MIN && out.length > 2) {
    out = out
      .slice()
      .sort((a, b) => a - b)
      .slice(1);
  }
  while (out.length > cap) {
    let dropI = 0;
    for (let j = 1; j < out.length; j++) {
      if (orderRank(out[j]!) > orderRank(out[dropI]!)) dropI = j;
    }
    out = out.filter((_, j) => j !== dropI);
  }
  if (out.length < 2) {
    for (const add of [tones.seventh, tones.third, tones.fifth, tones.root]) {
      if (!Number.isFinite(add)) continue;
      const t = liftToneToRange(add, low, Math.min(72, high));
      if (out.some((o) => tr(o) === tr(t))) continue;
      out = [...out, t];
      if (out.length >= 2) break;
    }
  }
  if (out.length < 2 || out.length > 4) {
    if (out.length < 2) return null;
    out = out
      .sort((a, b) => orderRank(a) - orderRank(b))
      .slice(0, Math.min(4, cap));
  }
  {
    const seenFinal = new Set<number>();
    out = out.filter((p) => {
      const pc = tr(p);
      if (seenFinal.has(pc)) return false;
      seenFinal.add(pc);
      return true;
    });
  }
  if (out.length < 2 || out.length > 4) return null;
  return out;
}

/**
 * 2–4 comp pitches: shell + colour, unique pitch classes after normalization.
 */
function pickIndieGuitar2CompPitches(
  tones: ReturnType<typeof guitarChordTonesInRange>,
  low: number,
  high: number,
  targetSize: number
): number[] | null {
  const t = Math.min(4, Math.max(2, Math.floor(targetSize)));
  const out: number[] = [];
  const seenPc = new Set<number>();
  const tr = (x: number) => ((x % 12) + 12) % 12;
  const pick = (m: number) => {
    if (!Number.isFinite(m)) return;
    const cl = clampPitch(m, low, high);
    const pc = tr(cl);
    if (seenPc.has(pc)) return;
    seenPc.add(pc);
    out.push(cl);
  };
  for (const p of [tones.third, tones.seventh, tones.fifth, tones.root]) pick(p);
  for (const add of [liftToneToRange(tones.root + 14, low, high), liftToneToRange(tones.root + 21, low, high)]) {
    if (out.length >= 4) break;
    pick(add);
  }
  return normalizeIndieGuitar2CompPitches(out, tones, low, high, t);
}

/** Whole-beat downbeats in 4/4 (0, 1, 2, 3); skips pickups and off-quarter grid. Matches quality-test `onWholeBeatGrid` epsilon. */
function indieGuitar2AnchorOnStrongBeat(startBeat: number): boolean {
  const frac = Math.abs(((startBeat % 1) + 1) % 1);
  return frac < 1e-5 || frac > 1 - 1e-5;
}

/**
 * **Indie Art Pop + separate (dual electrics), guitar_2** — `ChordEvent` comp only: **2–4 unique pitch classes**
 * (no doubles, no 5+ grips), **shell + 9/13** colour, ~mid register. Placements favour **quarters 0 & 2 (beats 1 & 3)**,
 * then 1 & 2, with **eighths** (0.5,1.5,2.5,3.5) only rarely from seed. 2–3 strums per bar. Melody is never doubled
 * in these stacks. See `docs/COMPOSER_OS_INDIE_DUAL_GUITAR_GUITAR2_COMP.md`.
 */
function forceChordalElectricGuitar2VoicingsForIndieRoute(
  part: PartModel,
  context: CompositionContext
): PartModel {
  const low = 40; // E2
  const high = 76; // E5 — realistic electric comp ceiling (voice 2 only; keeps clear of lead register)
  const chordToneOpts: ChordTonesOptions | undefined = shouldUseUserChordSemanticsForTones(context)
    ? { lockedHarmony: true }
    : undefined;
  for (const m of part.measures) {
    const chord = m.chord ?? getChordForBar(m.index, context);
    const tones = duoChordTonesWithOptionalTuningMap(
      chord,
      Math.max(low + 7, 47),
      high,
      context,
      m.index,
      'guitar_2',
      chordToneOpts,
      77130
    );
    const voice1Anchors = m.events
      .filter((e): e is NoteEvent => e.kind === 'note')
      .filter((e) => (e.voice ?? 1) === 1)
      .sort((a, b) => a.startBeat - b.startBeat);
    if (voice1Anchors.length === 0) continue;
    const prevChordLabel =
      m.index <= 1 ? null : part.measures.find((x) => x.index === m.index - 1)?.chord ?? getChordForBar(m.index - 1, context);
    const harmonyChangedFromPriorBar = m.index > 1 && prevChordLabel != null && prevChordLabel !== chord;
    const sectionStart = isIndieGuitar2SectionStartBar(m.index, context);
    const largeChange = harmonyChangedFromPriorBar && isIndieGuitar2LargeHarmonyChange(prevChordLabel, chord);
    const measureIsBig = m.index === 1 || sectionStart || largeChange;
    const minV = 2;
    const maxV = measureIsBig ? 4 : 3;
    const uN = seededUnit(context.seed, m.index, 77131);
    const maxCompThisBar = 2 + (uN < 0.42 ? 1 : 0);
    const beatKey = (x: number) => String(Math.round(x * 1000) / 1000);
    type Cand = { startBeat: number; duration: number; pr: number };
    const cands: Cand[] = [];
    for (const sb of [0, 2, 1, 3] as const) {
      cands.push({ startBeat: sb, duration: 1, pr: sb === 0 || sb === 2 ? 4.2 : 3.1 });
    }
    for (let i = 0; i < voice1Anchors.length; i++) {
      const a = voice1Anchors[i]!;
      const g = a.startBeat;
      const isInt = indieGuitar2AnchorOnStrongBeat(g);
      const firstH = i === 0 && harmonyChangedFromPriorBar;
      if (!isInt) {
        const uPick = seededUnit(context.seed, m.index, (i * 199 + 77117) & 0xfffff);
        if (firstH) {
          if (uPick > 0.12) continue;
        } else if (uPick > 0.08) continue;
      }
      let pr = 0;
      if (isInt) {
        if (g === 0 || g === 2) pr = 4;
        else if (g === 1 || g === 3) pr = 3.2;
        else pr = 2.1;
        pr += 0.05;
      } else {
        pr = firstH ? 1.1 : 0.5;
      }
      cands.push({ startBeat: g, duration: Math.max(0.5, a.duration), pr });
    }
    cands.sort((a, b) => b.pr - a.pr);
    const uniq: Cand[] = [];
    const seenB = new Set<string>();
    for (const c of cands) {
      const k = beatKey(c.startBeat);
      if (seenB.has(k)) continue;
      seenB.add(k);
      uniq.push(c);
    }
    const onGrid = uniq.filter((c) => indieGuitar2AnchorOnStrongBeat(c.startBeat));
    const offGrid = uniq.filter((c) => !indieGuitar2AnchorOnStrongBeat(c.startBeat));
    offGrid.sort((a, b) => b.pr - a.pr);
    const merged = [...onGrid, ...offGrid.slice(0, 1)].sort((a, b) => b.pr - a.pr);
    const mergedSnap: Cand[] = [];
    const seenSnapBeat = new Set<string>();
    for (const c of merged) {
      const pMod = ((c.startBeat % 4) + 4) % 4;
      const snapLocal =
        Math.abs(pMod - 0) <= Math.abs(pMod - 2) ? 0 : 2;
      const k = beatKey(snapLocal);
      if (seenSnapBeat.has(k)) continue;
      seenSnapBeat.add(k);
      mergedSnap.push({ ...c, startBeat: snapLocal });
    }
    const chosen = mergedSnap.slice(0, maxCompThisBar);
    const extra: ChordEvent[] = [];
    const trPc = (x: number) => ((x % 12) + 12) % 12;
    for (let ci = 0; ci < chosen.length; ci++) {
      const c = chosen[ci]!;
      const uSize = seededUnit(context.seed, m.index, (ci * 193 + 90217 + m.index * 13) & 0xfffff);
      const targetSize = minV + Math.floor(uSize * (maxV - minV + 1) * 0.9999999);
      let compPitches = pickIndieGuitar2CompPitches(tones, low, high, targetSize);
      if (!compPitches || compPitches.length < 2) continue;
      const seenPc = new Set<number>();
      compPitches = compPitches.filter((p) => {
        const pc = trPc(p);
        if (seenPc.has(pc)) return false;
        seenPc.add(pc);
        return true;
      });
      if (compPitches.length < 2) continue;
      const compDuration = Math.min(2, Math.max(1, Math.round(Math.min(2, Math.max(1, c.duration)))));
      extra.push({
        kind: 'chord',
        pitches: compPitches,
        startBeat: c.startBeat,
        duration: compDuration,
        voice: 2,
      } as ChordEvent);
    }
    for (const ev of extra) addEvent(m, ev);
    m.events = sortIndieGuitar2MeasureEventsForExport(m.events);
  }
  return part;
}

/**
 * Deterministic chord-tone pass: for each voice-1 single-note anchor, roll against `chordBias`;
 * on pass, add 1–2 harmony tones on voice 2 at the same startBeat/duration (MusicXML chord stack).
 * Skips beats where voice 2 already has notes (preserves shells from `forceChordalElectricGuitar2VoicingsForIndieRoute`).
 */
function applyVoiceRole(
  events: ScoreEvent[],
  chordLabel: string,
  context: CompositionContext,
  barNumber: number,
  role: DuoElectricVoiceRole,
  chordBias: number,
  voicingPartRole: 'guitar' | 'guitar_2'
): ScoreEvent[] {
  const low = 40;
  const high = 76;
  const chordToneOpts: ChordTonesOptions | undefined = shouldUseUserChordSemanticsForTones(context)
    ? { lockedHarmony: true }
    : undefined;
  const tones = duoChordTonesWithOptionalTuningMap(
    chordLabel,
    Math.max(low + 7, 47),
    high,
    context,
    barNumber,
    voicingPartRole,
    chordToneOpts,
    64500
  );
  const occupiedV2Starts = new Set(
    events
      .filter((e) => (e.kind === 'note' || e.kind === 'chord') && (e.voice ?? 1) === 2)
      .map((e) => e.startBeat)
  );
  const v1Notes = events
    .filter((e): e is NoteEvent => e.kind === 'note')
    .filter((e) => (e.voice ?? 1) === 1)
    .sort((a, b) => (a.startBeat === b.startBeat ? a.pitch - b.pitch : a.startBeat - b.startBeat));
  const extra: NoteEvent[] = [];
  for (let i = 0; i < v1Notes.length; i++) {
    const a = v1Notes[i]!;
    if (occupiedV2Starts.has(a.startBeat)) continue;
    const salt =
      (Math.round(a.startBeat * 997) + a.pitch * 31 + (role === 'chordal' ? 401 : role === 'balanced' ? 402 : 403) + i * 7) &
      0xfffff;
    const u = seededUnit(context.seed, barNumber, salt);
    if (u >= chordBias) continue;
    const chordDur = Math.min(Math.max(a.duration, 0.5), 2);
    const triadCandidates = [tones.third, tones.fifth, tones.seventh]
      .filter((p) => Number.isFinite(p))
      .map((p) => clampPitch(p, low, high))
      .filter((p, j, arr) => arr.indexOf(p) === j && p !== a.pitch);
    if (triadCandidates.length === 0) continue;
    const u2 = seededUnit(context.seed, barNumber, (salt + 9013) & 0xfffff);
    /** Balanced (guitar_1): at most 2 harmony tones; bias toward 1 so the line stays melodic. */
    const maxExtras =
      role === 'balanced'
        ? u2 < 0.55
          ? 1
          : Math.min(2, triadCandidates.length)
        : triadCandidates.length >= 2 && u2 < 0.5
          ? 2
          : 1;
    const chosen = triadCandidates.slice(0, Math.min(maxExtras, triadCandidates.length));
    for (const p of chosen) {
      extra.push(createNote(p, a.startBeat, chordDur, 2));
    }
    occupiedV2Starts.add(a.startBeat);
  }
  if (extra.length === 0) return events;
  return [...events, ...extra];
}

function applyVoiceRoleFromPartSpec(part: PartModel, context: CompositionContext): PartModel {
  const role = part.voiceRole ?? 'balanced';
  const bias = part.chordBias ?? 0.55;
  for (const m of part.measures) {
    const chord = m.chord ?? getChordForBar(m.index, context);
    /** Only suppresses the extra *single-note* v2 pass; existing `ChordEvent` stacks (full voicings) are left unchanged. */
    if (
      part.id === 'guitar_2' &&
      shouldUseIndieArtPopDualGuitarRoute(context) &&
      m.events.some((e) => e.kind === 'chord' && (e as ChordEvent).voice === 2)
    ) {
      continue;
    }
    m.events = applyVoiceRole(
      m.events,
      chord,
      context,
      m.index,
      role,
      bias,
      part.id === 'guitar_2' ? 'guitar_2' : 'guitar'
    );
  }
  return part;
}

/**
 * After `applyVoiceRoleFromPartSpec`, remove stray v2 **single** notes that start **off** the whole-beat
 * grid (0.5, 1.5, …) when the measure already has a comp `ChordEvent` (v2: chordal first; no syncopated layer on top).
 */
function stripIndieGuitar2StrayV2OffbeatSingleNotes(part: PartModel, context: CompositionContext): PartModel {
  if (part.id !== 'guitar_2' || !shouldUseIndieArtPopDualGuitarRoute(context)) return part;
  for (const m of part.measures) {
    const hasV2Chord = m.events.some((e) => e.kind === 'chord' && (e as ChordEvent).voice === 2);
    if (!hasV2Chord) continue;
    m.events = m.events.filter((e) => {
      if (e.kind !== 'note' || (e as NoteEvent).voice !== 2) return true;
      const b = (e as NoteEvent).startBeat;
      if (indieGuitar2AnchorOnStrongBeat(b)) return true;
      return false;
    });
  }
  return part;
}

/** Strong beats 1 & 3 in 4/4 (local 0 and 2). */
function indieGuitar2BeatOneOrThreeLocal(startBeat: number): boolean {
  const p = ((startBeat % 4) + 4) % 4;
  return p < 1e-5 || Math.abs(p - 2) < 1e-5;
}

/**
 * Indie dual-electric only (caller): when voice 2 has comp `ChordEvent`s, thin voice-1 anchor clutter
 * so the lower staff stays readable (max two v1 singles per measure).
 */
function thinGuitar2Voice1InChordMeasures(part: PartModel, context: CompositionContext): PartModel {
  if (part.id !== 'guitar_2') return part;
  let peakWithChord = 0;
  for (const m of part.measures) {
    const hasV2Chord = m.events.some((e) => e.kind === 'chord' && (e as ChordEvent).voice === 2);
    if (!hasV2Chord) continue;

    type Entry = { eventIndex: number; n: NoteEvent };
    const v1Entries: Entry[] = [];
    for (let ei = 0; ei < m.events.length; ei++) {
      const ev = m.events[ei]!;
      if (ev.kind !== 'note') continue;
      const vn = ev as NoteEvent;
      if ((vn.voice ?? 1) !== 1) continue;
      v1Entries.push({ eventIndex: ei, n: vn });
    }
    if (v1Entries.length <= 2) {
      peakWithChord = Math.max(peakWithChord, v1Entries.length);
      continue;
    }

    const strength = (n: NoteEvent): number => {
      const sb = n.startBeat;
      const frac = Math.abs(((sb % 1) + 1) % 1);
      const wholeBeat = frac < 1e-5 || frac > 1 - 1e-5;
      let s = n.duration * 50;
      if (wholeBeat) s += 40;
      if (indieGuitar2BeatOneOrThreeLocal(sb)) s += 120;
      return s;
    };

    const ranked = [...v1Entries].sort((a, b) => strength(a.n) - strength(b.n));
    const dropCount = ranked.length - 2;
    const dropIdx = new Set(ranked.slice(0, dropCount).map((x) => x.eventIndex));
    if (dropIdx.size === 0) continue;
    m.events = m.events.filter((_e, ei) => !dropIdx.has(ei));

    const v1After = m.events.filter((e) => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 1).length;
    peakWithChord = Math.max(peakWithChord, v1After);
  }
  context.generationMetadata.indieGuitar2ThinVoice1Peak = Math.min(2, peakWithChord);
  return part;
}

function isDuoGoldenPathPreset(presetId: string): boolean {
  return isGuitarBassDuoFamily(presetId) || presetId === 'ecm_chamber';
}

function totalBarsFromContext(context: CompositionContext): number {
  return context.form.totalBars;
}

function isMotifAuthorityScopePreset(context: CompositionContext, styleStack?: StyleStack): boolean {
  if (context.presetId === 'ecm_chamber') return true;
  const isSongModeRoute = isGuitarBassDuoFamily(context.presetId);
  if (!isSongModeRoute) return false;
  const songwriterId = context.generationMetadata?.songwriterStyleId;
  const isSongPilot =
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isSongModeMotifPilotWriter(songwriterId);
  if (!isSongPilot) return false;
  if (songwriterId === 'wayne_shorter') return styleStack?.primary === 'barry_harris';
  return true;
}

const SONG_MODE_MOTIF_PILOT_WRITERS = new Set(['wayne_shorter', 'barry_harris', 'donald_fagen', 'bacharach']);

function isSongModeMotifPilotWriter(writerId: string | undefined): boolean {
  return writerId != null && SONG_MODE_MOTIF_PILOT_WRITERS.has(writerId);
}

function resolveMotifAuthorityLevelForPilot(context: CompositionContext, styleStack?: StyleStack): MotifAuthorityLevel {
  const requested = context.generationMetadata?.motifAuthorityLevel ?? 'off';
  if (requested === 'off') return 'off';
  const songwriterId = context.generationMetadata?.songwriterStyleId;
  const isSongPilot = context.generationMetadata?.songModeHookFirstIdentity === true && isSongModeMotifPilotWriter(songwriterId);
  const isHybridPilot = isSongPilot && songwriterId === 'wayne_shorter' && styleStack?.primary === 'barry_harris';
  const isEcmPilot = context.presetId === 'ecm_chamber';
  if (requested === 'strong' && (isSongPilot || isHybridPilot || isEcmPilot)) return 'strong';
  return 'soft';
}

function makeMotifDevelopmentSummary(params: {
  level: MotifAuthorityLevel;
  pilotPathTag: string;
  coreCellEstablished: boolean;
  recurrenceCountEstimate: number;
  recurrenceSummary: string;
  transformationSummary: string[];
  motifCoherence: number;
  motifLedPrimaryIdentity?: boolean;
}): MotifDevelopmentSummary {
  return {
    motifAuthorityLevel: params.level,
    pilotPathTag: params.pilotPathTag,
    coreCellEstablished: params.coreCellEstablished,
    recurrenceCountEstimate: params.recurrenceCountEstimate,
    recurrenceSummary: params.recurrenceSummary,
    transformationSummary: params.transformationSummary,
    motifCoherence: Math.max(0, Math.min(1, params.motifCoherence)),
    motifLedPrimaryIdentity: params.motifLedPrimaryIdentity,
    experimental: true,
  };
}

/** Song-mode style labels (`verse_0`, `chorus_1`, …); letter forms (A/B) → null. */
function songSectionRoleFromFormLabel(label: string): 'verse' | 'chorus' | 'bridge' | null {
  const L = label.trim().toLowerCase();
  if (L.startsWith('verse')) return 'verse';
  if (L.startsWith('chorus')) return 'chorus';
  if (L.startsWith('bridge')) return 'bridge';
  return null;
}

function motifRangeFromFormSection(
  sec: { startBar: number; length: number },
  totalBars: number
): MotifPhraseRange | null {
  if (!Number.isFinite(sec.startBar) || !Number.isFinite(sec.length) || sec.length <= 0) return null;
  const startBar = Math.trunc(sec.startBar);
  const endBar = startBar + Math.trunc(sec.length) - 1;
  if (startBar < 1 || endBar > totalBars || startBar > endBar) return null;
  return { startBar, endBar };
}

function motifRangesOverlap(a: MotifPhraseRange, b: MotifPhraseRange): boolean {
  return !(a.endBar < b.startBar || b.endBar < a.startBar);
}

function collectGuitarNotesInBarRange(
  guitarPart: PartModel | undefined,
  range: MotifPhraseRange
): NoteEvent[] {
  if (!guitarPart?.measures?.length) return [];
  const out: NoteEvent[] = [];
  for (const m of guitarPart.measures) {
    const idx = m.index;
    if (idx < range.startBar || idx > range.endBar) continue;
    for (const ev of m.events ?? []) {
      if (ev.kind !== 'note') continue;
      const n = ev as NoteEvent;
      if ((n.voice ?? 1) !== 1) continue;
      out.push(n);
    }
  }
  return out;
}

/**
 * Wayne Shorter: align motif checkpoints with first verse / first chorus / (bridge | 2nd verse).
 * Returns null → caller uses {@link defaultMotifAuthorityPlan}.
 */
function tryWayneFormAwareMotifAuthorityPlan(
  context: CompositionContext,
  totalBars: number
): MotifAuthorityPlan | null {
  const sections = context.form?.sections;
  if (!Array.isArray(sections) || sections.length === 0) return null;

  const verses = sections.filter((s) => songSectionRoleFromFormLabel(s.label) === 'verse');
  const choruses = sections.filter((s) => songSectionRoleFromFormLabel(s.label) === 'chorus');
  const bridges = sections.filter((s) => songSectionRoleFromFormLabel(s.label) === 'bridge');

  const firstVerse = verses[0];
  const firstChorus = choruses[0];
  if (!firstVerse || !firstChorus) return null;

  const phraseA = motifRangeFromFormSection(firstVerse, totalBars);
  const phraseB = motifRangeFromFormSection(firstChorus, totalBars);
  if (!phraseA || !phraseB) return null;
  if (motifRangesOverlap(phraseA, phraseB)) return null;

  const returnSource = bridges[0] ?? verses[1];
  if (!returnSource) return null;
  const phraseReturn = motifRangeFromFormSection(returnSource, totalBars);
  if (!phraseReturn) return null;

  return {
    phraseA,
    phraseB,
    phraseReturn,
    returnThreshold: 0.54,
    variationMiddleBand: [0.28, 0.9],
  };
}

function snapshotPhrasePitches(part: PartModel, range: MotifPhraseRange): Array<{ bar: number; idx: number; pitch: number }> {
  const out: Array<{ bar: number; idx: number; pitch: number }> = [];
  for (const m of part.measures) {
    if (m.index < range.startBar || m.index > range.endBar) continue;
    for (let i = 0; i < m.events.length; i++) {
      const e = m.events[i]!;
      if (e.kind !== 'note') continue;
      out.push({ bar: m.index, idx: i, pitch: e.pitch });
    }
  }
  return out;
}

function restorePhrasePitches(part: PartModel, snapshot: Array<{ bar: number; idx: number; pitch: number }>): void {
  for (const s of snapshot) {
    const m = part.measures.find((x) => x.index === s.bar);
    if (!m) continue;
    const e = m.events[s.idx];
    if (!e || e.kind !== 'note') continue;
    (e as { pitch: number }).pitch = s.pitch;
  }
}

function sectionLabelForBar(bar: number, context: CompositionContext): string {
  const s = context.form.sections.find((sec) => bar >= sec.startBar && bar < sec.startBar + sec.length);
  return s?.label ?? 'A';
}

function rehearsalForBar(barIndex: number, context: CompositionContext): string | undefined {
  for (const m of context.rehearsalMarkPlan.marks) {
    if (m.bar === barIndex) return m.label;
  }
  return undefined;
}

/** ECM Metheny: 6–8 bar arc — fewer cadences; phrase-over-barline feel via late entries on phase 1. */
function getEcmMethenyPhraseIntent(phase: number, cycleIndex: number, seed: number): PhraseIntent {
  if (phase === 8) {
    const u = seededUnit(seed, cycleIndex, 811);
    if (u < 0.28) return 'cadence';
    if (u < 0.62) return 'answer_guitar';
    return 'guitar_lead';
  }
  if (phase === 1 && cycleIndex > 0) {
    return seededUnit(seed, cycleIndex, 812) < 0.42 ? 'answer_guitar' : 'guitar_lead';
  }
  return getDuoPhraseIntent(phase, seed + cycleIndex * 101);
}

function getEcmSchneiderPhraseIntent(phase: number, seed: number): PhraseIntent {
  if (phase === 8) {
    return seededUnit(seed, phase, 821) < 0.45 ? 'answer_guitar' : 'guitar_lead';
  }
  return getDuoPhraseIntent(phase, seed);
}

/** Avoid mid-register clustering: lift guitar when zone centres on middle C–D. */
function anchorGuitarRegister(low: number, high: number): [number, number] {
  const mid = (low + high) / 2;
  if (mid >= 60 && mid <= 66) {
    return [low + 3, Math.min(79, high + 4)];
  }
  return [low, high];
}

/** Sustained chord tones — not constant re-articulation; rhythm varies by phase for anti-loop. */
function emitEcmGuitarSustainBar(params: {
  m: MeasureModel;
  chord: string;
  low: number;
  high: number;
  seed: number;
  bar: number;
  phase: number;
  chordToneOpts?: ChordTonesOptions;
}): void {
  const { m, chord, low, high, seed, bar, phase, chordToneOpts } = params;
  const tones = guitarChordTonesInRange(chord, low, high, chordToneOpts);
  const u = seededUnit(seed, bar, 901);
  const primary = u < 0.52 ? tones.seventh : tones.third;
  const secondary = u < 0.48 ? tones.fifth : tones.root;
  const pat = phase % 3;
  if (pat === 0) {
    addEvent(m, createNote(primary, 0, 3.5));
    addEvent(m, createRest(3.5, 0.5));
  } else if (pat === 1) {
    addEvent(m, createNote(primary, 0, 2));
    addEvent(m, createRest(0, 2, 2));
    {
      const e = createNote(secondary, 2, 2, 2);
      (e as any).debugSource = (e as any).debugSource ?? 'ecm';
      addEvent(m, e);
    }
  } else {
    addEvent(m, createNote(primary, 0, 1.25));
    addEvent(m, createRest(0, 1.25, 2));
    {
      const e = createNote(secondary, 1.25, 2.75, 2);
      (e as any).debugSource = (e as any).debugSource ?? 'ecm';
      addEvent(m, e);
    }
  }
}

/** Neighbour / passing fragments with slow contrary motion vs bass register. */
function emitEcmGuitarInnerMotionBar(params: {
  m: MeasureModel;
  chord: string;
  low: number;
  high: number;
  seed: number;
  bar: number;
  chordToneOpts?: ChordTonesOptions;
}): void {
  const { m, chord, low, high, seed, bar, chordToneOpts } = params;
  const tones = guitarChordTonesInRange(chord, low, high, chordToneOpts);
  const u = seededUnit(seed, bar, 902);
  const target = u < 0.5 ? tones.third : tones.seventh;
  const pass = clampPitch(target + (seededUnit(seed, bar, 903) < 0.5 ? -1 : 1), low, high);
  const neigh = clampPitch(target + (seededUnit(seed, bar, 904) < 0.5 ? 1 : -1), low, high);
  addEvent(m, createRest(0, 0.5));
  {
    const e = createNote(neigh, 0.5, 0.5, 2);
    (e as any).debugSource = (e as any).debugSource ?? 'ecm';
    addEvent(m, e);
  }
  {
    const e = createNote(pass, 1, 1, 2);
    (e as any).debugSource = (e as any).debugSource ?? 'ecm';
    addEvent(m, e);
  }
  addEvent(m, createNote(target, 2, 1.5));
  addEvent(m, createRest(3.5, 0.5));
}

function getRegisterForBar(guitarMap: InstrumentRegisterMap, bar: number, context: CompositionContext): [number, number] {
  const label = sectionLabelForBar(bar, context);
  const plan = guitarMap.sections.find((s) => s.sectionLabel === label);
  return plan?.preferredZone ?? [55, 79];
}

function getBassRegisterForBar(bassMap: InstrumentRegisterMap, bar: number, context: CompositionContext): [number, number] {
  const label = sectionLabelForBar(bar, context);
  const plan = bassMap.sections.find((s) => s.sectionLabel === label);
  return plan?.preferredZone ?? [40, 55];
}

function getPlacementsForBar(placements: PlacedMotif[], bar: number): PlacedMotif[] {
  return placements.filter((p) => p.startBar === bar);
}

function extractVoiceOneMelodyFromPart(part: PartModel): SlonimskyNote[] {
  const out: SlonimskyNote[] = [];
  for (const measure of part.measures) {
    const barStart = (measure.index - 1) * 4;
    const notes = measure.events
      .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
      .sort((a, b) => a.startBeat - b.startBeat);
    for (const note of notes) {
      out.push({
        midi: note.pitch,
        durationBeats: note.duration,
        beat: barStart + note.startBeat,
        role: 'passing',
      });
    }
  }
  if (out.length > 0) {
    out[0]!.role = 'target';
    out[out.length - 1]!.role = 'target';
  }
  return out;
}

function applyEnhancedPitchesByBar(
  guitarPart: PartModel,
  original: SlonimskyNote[],
  enhanced: SlonimskyNote[]
): void {
  const byBar = (notes: SlonimskyNote[]): Map<number, SlonimskyNote[]> => {
    const map = new Map<number, SlonimskyNote[]>();
    for (const note of notes) {
      const bar = Math.floor(note.beat / 4) + 1;
      if (!map.has(bar)) map.set(bar, []);
      map.get(bar)!.push(note);
    }
    for (const entries of map.values()) {
      entries.sort((a, b) => a.beat - b.beat);
    }
    return map;
  };

  const originalByBar = byBar(original);
  const enhancedByBar = byBar(enhanced);
  const changedBars = new Set<number>();
  for (const [bar, nextNotes] of enhancedByBar.entries()) {
    const prevNotes = originalByBar.get(bar) ?? [];
    if (nextNotes.length !== prevNotes.length) {
      changedBars.add(bar);
      continue;
    }
    for (let i = 0; i < nextNotes.length; i++) {
      if (nextNotes[i]!.midi !== prevNotes[i]!.midi) {
        changedBars.add(bar);
        break;
      }
    }
  }

  for (const measure of guitarPart.measures) {
    if (!changedBars.has(measure.index)) continue;
    const enhancedNotes = enhancedByBar.get(measure.index);
    if (!enhancedNotes || enhancedNotes.length === 0) continue;
    const v1Events = measure.events
      .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
      .sort((a, b) => a.startBeat - b.startBeat);
    const count = Math.min(v1Events.length, enhancedNotes.length);
    for (let i = 0; i < count; i++) {
      v1Events[i]!.pitch = enhancedNotes[i]!.midi;
    }
  }
}

interface StyleHints {
  metheny?: { attackDensityReduced?: boolean; lyricalMotif?: boolean };
  bacharach?: { phraseAsymmetry?: boolean; chromaticPassingWeight?: number };
}

function readStyleHints(context: CompositionContext): StyleHints {
  const so = (context as { styleOverrides?: Record<string, unknown> }).styleOverrides;
  return {
    metheny: so?.metheny as StyleHints['metheny'],
    bacharach: so?.bacharach as StyleHints['bacharach'],
  };
}

function effectiveBarMeterMapForDuo(context: CompositionContext): BarMeterMap | undefined {
  return context.generationMetadata.barMeterMap ?? context.barMeterMap;
}

function stampMeasureBeatSpanQuarters(m: MeasureModel, context: CompositionContext): void {
  m.measureBeatSpanQuarters = resolveMeasureBeatSpanQuarters(m.index, effectiveBarMeterMapForDuo(context));
}

/** Stamp every measure in the score from context (covers merged solo parts and ensures parity with export). */
function stampAllMeasuresBeatSpansFromContext(score: ScoreModel, context: CompositionContext): void {
  const map = effectiveBarMeterMapForDuo(context);
  for (const p of score.parts) {
    for (const m of p.measures) {
      m.measureBeatSpanQuarters = resolveMeasureBeatSpanQuarters(m.index, map);
    }
  }
}

/** Quarter-beat grid — keeps MusicXML division sums stable. */
function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/** If this bar's note rhythm fingerprint matches the previous bar, nudge voice-1 attacks so adjacent bars never match. */
function duoAntiAdjacentDuplicateGuitarRhythm(m: MeasureModel, prev: MeasureModel | undefined, isDuo: boolean): void {
  if (!isDuo || !prev) return;
  if (rhythmFingerprint(m) !== rhythmFingerprint(prev) || rhythmFingerprint(m).length === 0) return;
  const shift = 0.25;
  const next: MeasureModel['events'] = [];
  next.push(createRest(0, shift, 1));
  for (const e of m.events) {
    if ((e.voice ?? 1) === 1 && (e.kind === 'note' || e.kind === 'rest')) {
      const e2 = { ...e } as (typeof m.events)[number];
      (e2 as { startBeat: number }).startBeat = qBeat((e as { startBeat: number }).startBeat + shift);
      next.push(e2);
    } else {
      next.push(e);
    }
  }
  next.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
  m.events = next;
  const v1 = m.events.filter((e) => (e.voice ?? 1) === 1 && (e.kind === 'note' || e.kind === 'rest'));
  const cap = measureBeatSpanQuartersOf(m);
  const last = v1[v1.length - 1] as { startBeat: number; duration: number } | undefined;
  if (last && last.startBeat + last.duration > cap + 1e-4) {
    last.duration = qBeat(Math.max(0, cap - last.startBeat));
  }
}

/** Late closing: if rhythm still matches previous bar (e.g. static harmony), shift attacks like guitar anti-duplicate. */
function duoBassAntiDuplicateRhythmVsAdjacent(m: MeasureModel, prev: MeasureModel): void {
  if (rhythmFingerprint(m) !== rhythmFingerprint(prev) || rhythmFingerprint(m).length === 0) return;
  const shift = 0.25;
  const next: MeasureModel['events'] = [];
  next.push(createRest(0, shift, 1));
  for (const e of m.events) {
    if (e.kind === 'note' || e.kind === 'rest') {
      const e2 = { ...e } as (typeof m.events)[number];
      (e2 as { startBeat: number }).startBeat = qBeat((e as { startBeat: number }).startBeat + shift);
      next.push(e2);
    } else {
      next.push(e);
    }
  }
  next.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
  m.events = next;
  const cap = measureBeatSpanQuartersOf(m);
  const notes = m.events.filter((e) => e.kind === 'note') as { startBeat: number; duration: number }[];
  const lastN = notes[notes.length - 1];
  if (lastN && lastN.startBeat + lastN.duration > cap + 1e-4) {
    lastN.duration = qBeat(Math.max(0, cap - lastN.startBeat));
  }
}

function lateClosingBassRhythmBreakVsPrevBar(
  m: MeasureModel,
  measures: MeasureModel[],
  b: number,
  tb: number,
  context: CompositionContext
): void {
  if (
    !isLateClosingSlice(b, tb) ||
    measures.length < 1 ||
    consecutiveChordStreakEndingAtBar(context, b) < 2
  ) {
    return;
  }
  const mPrev = measures[measures.length - 1];
  if (mPrev && rhythmFingerprint(m).length > 0 && rhythmFingerprint(m) === rhythmFingerprint(mPrev)) {
    duoBassAntiDuplicateRhythmVsAdjacent(m, mPrev);
    normalizeMeasureToEighthBeatGrid(m);
  }
}

function bassNoteCountInMeasure(m: MeasureModel): number {
  return m.events.filter((e) => e.kind === 'note').length;
}

function isWalkingQuartersPattern(measure: MeasureModel): boolean {
  const notes = [...measure.events]
    .filter((e) => e.kind === 'note')
    .sort((a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat) as NoteEvent[];
  if (notes.length !== 4) return false;
  for (const n of notes) {
    if (Math.abs(n.duration - 1) > 0.15) return false;
  }
  return true;
}

function isHalfHalfPattern(measure: MeasureModel): boolean {
  const notes = [...measure.events]
    .filter((e) => e.kind === 'note')
    .sort((a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat) as NoteEvent[];
  if (notes.length !== 2) return false;
  for (const n of notes) {
    if (Math.abs(n.duration - 2) > 0.2) return false;
  }
  return true;
}

function rewriteBassBarTwoHalvesOnBeatsOneAndThree(
  m: MeasureModel,
  rootClamped: number,
  fifth: number,
  walkLow: number,
  effectiveHigh: number
): void {
  m.events = [];
  addEvent(m, createNote(clampPitch(rootClamped, walkLow, effectiveHigh), 0, 2));
  addEvent(m, createNote(clampPitch(fifth, walkLow, effectiveHigh), 2, 2));
  normalizeMeasureToEighthBeatGrid(m);
}

/** Bass identity gate: 3 identical rhythm fingerprints in a row — break the current bar’s rhythm. */
function applyBassRhythmTripleFingerprintBreak(
  m: MeasureModel,
  measures: MeasureModel[],
  opts: {
    rootClamped: number;
    third: number;
    fifth: number;
    guide: number;
    walkLow: number;
    effectiveHigh: number;
  }
): void {
  if (measures.length < 2) return;
  const fp = rhythmFingerprint(m);
  const fpPrev = rhythmFingerprint(measures[measures.length - 1]!);
  const fpPrev2 = rhythmFingerprint(measures[measures.length - 2]!);
  if (!fp.length || fp !== fpPrev || fp !== fpPrev2) return;
  const ref = measures[measures.length - 1]!;
  const firstN = m.events.find((e) => e.kind === 'note') as NoteEvent | undefined;
  let t0 = firstN ? snapAttackBeatToGrid(firstN.startBeat) : 0;
  if (t0 < 0) t0 = 0;
  m.events = [];
  if (t0 > 0.01) {
    addEvent(m, createRest(0, t0));
  }
  const capBreak = measureBeatSpanQuartersOf(m);
  const span = capBreak - t0;
  if (span <= 0.01) return;
  if (isWalkingQuartersPattern(ref)) {
    const dHalf = Math.min(2, span);
    addEvent(m, createNote(opts.rootClamped, t0, dHalf));
    const rem = span - dHalf;
    const q1 = Math.min(1, rem);
    addEvent(m, createNote(opts.third, t0 + dHalf, q1));
    const q2 = Math.max(0, rem - q1);
    if (q2 > 0.05) {
      addEvent(m, createNote(opts.fifth, t0 + dHalf + q1, q2));
    }
  } else if (isHalfHalfPattern(ref)) {
    const pool = [opts.rootClamped, opts.fifth, opts.third, opts.guide];
    const maxSteps = Math.min(4, Math.max(0, Math.floor(span + 1e-4)));
    for (let i = 0; i < maxSteps; i++) {
      const p = clampPitch(pool[i % pool.length]!, opts.walkLow, opts.effectiveHigh);
      addEvent(m, createNote(p, t0 + i, 1));
    }
  } else {
    const dHalf = Math.min(2, span);
    addEvent(m, createNote(opts.rootClamped, t0, dHalf));
    const rem = span - dHalf;
    const q1 = Math.min(1, rem);
    addEvent(m, createNote(opts.third, t0 + dHalf, q1));
    const q2 = Math.max(0, rem - q1);
    if (q2 > 0.05) {
      addEvent(m, createNote(opts.fifth, t0 + dHalf + q1, q2));
    }
  }
  normalizeMeasureToEighthBeatGrid(m);
}

function applyBassContourFingerprintOveruseBreak(
  m: MeasureModel,
  contourHistoryForGate: string[],
  seed: number,
  bar: number,
  walkLow: number,
  effectiveHigh: number,
  chordTonePool: number[]
): void {
  const cf = contourFingerprint(m);
  if (!cf.length) return;
  if (contourHistoryForGate.filter((x) => x === cf).length < 5) return;
  breakMeasureContourLocally(m, seed + 9103, bar, {
    walkLow,
    high: effectiveHigh,
    chordTonePool,
  });
  normalizeMeasureToEighthBeatGrid(m);
}

function applyBassWalkLikeCapReplace(
  m: MeasureModel,
  measures: MeasureModel[],
  walkCap: number,
  rootClamped: number,
  fifth: number,
  walkLow: number,
  effectiveHigh: number
): void {
  const n = bassNoteCountInMeasure(m);
  if (n < 5) return;
  const priorWalk = measures.reduce((acc, mm) => acc + (bassNoteCountInMeasure(mm) >= 5 ? 1 : 0), 0);
  if (priorWalk < walkCap) return;
  rewriteBassBarTwoHalvesOnBeatsOneAndThree(m, rootClamped, fifth, walkLow, effectiveHigh);
}

function repairBassMotifEchoBars1to8(
  measures: MeasureModel[],
  guitarPart: PartModel,
  context: CompositionContext,
  bassMap: InstrumentRegisterMap
): void {
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  const guitarPcSetForBar = (bar: number): Set<number> => {
    const gm = guitarPart.measures.find((x) => x.index === bar);
    const s = new Set<number>();
    if (!gm) return s;
    for (const e of gm.events) {
      if (e.kind !== 'note' || !isGuitarMelodyVoiceNote(e)) continue;
      s.add((((e as NoteEvent).pitch % 12) + 12) % 12);
    }
    return s;
  };
  const barHasEcho = (bar: number): boolean => {
    const bm = measures.find((x) => x.index === bar);
    const g = guitarPcSetForBar(bar);
    if (!bm || g.size === 0) return false;
    for (const e of bm.events) {
      if (e.kind !== 'note') continue;
      if (g.has((((e as NoteEvent).pitch % 12) + 12) % 12)) return true;
    }
    return false;
  };
  for (let bar = 1; bar <= 8; bar++) {
    if (barHasEcho(bar)) return;
  }
  let bestBar = 1;
  let bestFlex = -1;
  for (let bar = 1; bar <= 8; bar++) {
    const chord = getChordForBar(bar, context);
    const tones = chordTonesForChordSymbolWithContext(chord, context);
    const gm = guitarPart.measures.find((x) => x.index === bar);
    let flex = 0;
    if (gm) {
      for (const e of gm.events) {
        if (e.kind !== 'note' || !isGuitarMelodyVoiceNote(e)) continue;
        const pc = (((e as NoteEvent).pitch % 12) + 12) % 12;
        const pool = [tones.root, tones.third, tones.fifth, tones.seventh].map((p) => (((p % 12) + 12) % 12) as number);
        if (pool.includes(pc)) flex++;
      }
    }
    if (flex > bestFlex) {
      bestFlex = flex;
      bestBar = bar;
    }
  }
  const bm = measures.find((x) => x.index === bestBar);
  const gm = guitarPart.measures.find((x) => x.index === bestBar);
  if (!bm || !gm) return;
  const chord = getChordForBar(bestBar, context);
  const tones = chordTonesForChordSymbolWithContext(chord, context);
  const [low, high] = getBassRegisterForBar(bassMap, bestBar, context);
  const eh = Math.min(high, 52);
  const toneMidiByPc = new Map<number, number>();
  for (const p of [tones.root, tones.third, tones.fifth, tones.seventh]) {
    const pc = (((p % 12) + 12) % 12) as number;
    if (!toneMidiByPc.has(pc)) toneMidiByPc.set(pc, p);
  }
  let chosenMidi: number | undefined;
  for (const e of gm.events) {
    if (e.kind !== 'note' || !isGuitarMelodyVoiceNote(e)) continue;
    const midi = (e as NoteEvent).pitch;
    const pc = (((midi % 12) + 12) % 12) as number;
    if (toneMidiByPc.has(pc)) {
      chosenMidi = clampPitch(toneMidiByPc.get(pc)!, low, eh);
      break;
    }
  }
  if (chosenMidi === undefined) {
    for (const e of gm.events) {
      if (e.kind !== 'note' || !isGuitarMelodyVoiceNote(e)) continue;
      const midi = (e as NoteEvent).pitch;
      const pc = (((midi % 12) + 12) % 12) as number;
      chosenMidi = clampPitch(pitchClassToBassMidi(pc, low, eh), low, eh);
      break;
    }
  }
  if (chosenMidi === undefined) return;
  const bassNotes = bm.events.filter((e): e is NoteEvent => e.kind === 'note');
  if (bassNotes.length === 0) return;
  const victim = [...bassNotes].sort((a, b) => a.startBeat - b.startBeat)[0]!;
  victim.pitch = chosenMidi;
}

/** Stronger landing on phrase-ending bars (2,4,6): extend last note toward ≥0.5 beats when possible. */
function duoBoostPhraseEndLanding(m: MeasureModel, bar: number, isDuo: boolean): void {
  if (!isDuo || bar % 2 !== 0 || bar === 8) return;
  const notes = m.events.filter((e) => e.kind === 'note') as {
    startBeat: number;
    duration: number;
  }[];
  if (notes.length === 0) return;
  let last = notes[0];
  for (const n of notes) {
    if (n.startBeat + n.duration >= last.startBeat + last.duration) last = n;
  }
  const capLanding = measureBeatSpanQuartersOf(m);
  const maxDur = qBeat(capLanding - last.startBeat);
  if (last.duration >= Math.min(0.5, maxDur)) return;
  const target = Math.min(0.5, maxDur);
  const need = target - last.duration;
  if (need <= 0) return;
  const rests = m.events.filter((e) => e.kind === 'rest') as { startBeat: number; duration: number }[];
  const r0 = rests
    .filter((r) => r.startBeat + r.duration <= last.startBeat + 1e-3)
    .sort((a, b) => b.startBeat + b.duration - (a.startBeat + a.duration))[0];
  if (r0 && r0.duration >= need + 0.15) {
    r0.duration = qBeat(r0.duration - need);
    last.duration = qBeat(Math.min(maxDur, last.duration + need));
  }
}

/**
 * Bar-4 cadence (4-bar cycle, `bar` 1-indexed): lengthen final voice-1 note toward the next attack / bar end,
 * then snap melody pitch to nearest chord tone (root/3/5/7) in register. Duo golden path: every phrase boundary (`bar % 4 === 0`).
 */
function duoEnforcePhraseEndCadence(
  m: MeasureModel,
  bar: number,
  context: CompositionContext,
  effectiveLow: number,
  effectiveHigh: number,
  songModeHook: boolean
): void {
  void songModeHook;
  if (bar % 4 !== 0) return;

  const chord = getChordForBar(bar, context);
  const tones = chordTonesForChordSymbolWithContext(chord, context);
  const v1 = m.events.filter(
    (e): e is NoteEvent => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 1
  );
  if (v1.length === 0) return;

  const maxEnd = Math.max(...v1.map((n) => n.startBeat + n.duration));
  const finals = v1.filter((n) => Math.abs(n.startBeat + n.duration - maxEnd) < 1e-5);
  if (finals.length === 0) return;

  const barCap = measureBeatSpanQuartersOf(m);
  let barrier = barCap;
  for (const n of v1) {
    if (n.startBeat > maxEnd + 1e-8 && n.startBeat < barrier) barrier = n.startBeat;
  }

  for (const n of finals) {
    const capDur = qBeat(barrier - n.startBeat);
    if (n.duration + 1e-9 < capDur) n.duration = capDur;
  }

  const candidates = [
    liftToneToRange(tones.root, effectiveLow, effectiveHigh),
    liftToneToRange(tones.third, effectiveLow, effectiveHigh),
    liftToneToRange(tones.fifth, effectiveLow, effectiveHigh),
    liftToneToRange(tones.seventh, effectiveLow, effectiveHigh),
  ];

  for (const n of finals) {
    let best = candidates[0]!;
    let bestD = Math.abs(n.pitch - best);
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i]!;
      const d = Math.abs(n.pitch - c);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    n.pitch = best;
  }
}

/** Remove rests fully covered by a note span (motif tail rounding can leave orphan rests). Per-voice only so Wyble v2 notes do not strip v1 rests. */
function collapseRestsInsideNotes(m: MeasureModel): void {
  const notes = m.events.filter((e) => e.kind === 'note') as {
    startBeat: number;
    duration: number;
    voice?: number;
  }[];
  if (notes.length === 0) return;
  m.events = m.events.filter((e) => {
    if (e.kind !== 'rest') return true;
    const r = e as { startBeat: number; duration: number; voice?: number };
    const rv = r.voice ?? 1;
    const rs = r.startBeat;
    const re = r.startBeat + r.duration;
    for (const n of notes) {
      if ((n.voice ?? 1) !== rv) continue;
      const ns = n.startBeat;
      const ne = n.startBeat + n.duration;
      if (rs >= ns - 1e-4 && re <= ne + 1e-4) return false;
    }
    return true;
  });
}

/** Drop rests that share a start time with a note on the same voice (motif rounding can create duplicate onsets). */
function dropRestsSameStartAsNote(m: MeasureModel): void {
  m.events = m.events.filter((e) => {
    if (e.kind !== 'rest') return true;
    const r = e as { startBeat: number; voice?: number };
    const rv = r.voice ?? 1;
    return !m.events.some((o) => {
      if (o === e || o.kind !== 'note') return false;
      const n = o as { startBeat: number; voice?: number };
      return (n.voice ?? 1) === rv && Math.abs(n.startBeat - r.startBeat) < 1e-4;
    });
  });
}

/** Snap to quarter-beat grid (ECM / Bacharach). Duo golden path uses `normalizeMeasureToEighthBeatGrid` for Sibelius-safe attacks. */
function normalizeMeasureQuarterGrid(m: MeasureModel): void {
  for (const e of m.events) {
    if (e.kind === 'note' || e.kind === 'rest') {
      (e as { startBeat: number }).startBeat = qBeat((e as { startBeat: number }).startBeat);
      (e as { duration: number }).duration = qBeat((e as { duration: number }).duration);
    }
  }
}

/**
 * One bar of guaranteed Bacharach signal: chromatic neighbour + 3+5 beat asymmetry, off-grid onsets.
 * Used on bar 2 (section A) and bar 6 (section B) when Bacharach is active — matches bacharachSignal / moduleValidation.
 */
function buildBacharachAnchorMeasure(
  barIndex: number,
  chord: string,
  rehearsal: string | undefined,
  low: number,
  high: number,
  context: CompositionContext
): MeasureModel {
  const m = createMeasure(barIndex, chord, rehearsal);
  stampMeasureBeatSpanQuarters(m, context);
  const tones = chordTonesForChordSymbolWithContext(chord, context);
  const target = clampPitch(tones.third, low, high);
  const pass = target - 1;
  const fifth = clampPitch(tones.fifth, low, high);
  addEvent(m, createRest(0, 0.5));
  {
    const e = createNote(pass, 0.5, 0.5, 2);
    (e as any).debugSource = (e as any).debugSource ?? 'anchor';
    addEvent(m, e);
  }
  addEvent(m, createNote(target, 1, 1));
  addEvent(m, createRest(2, 0.5));
  addEvent(m, createNote(fifth, 2.5, 1.5));
  return m;
}

const FAGEN_DOM7_ROOT_RE = /^([A-G](?:#|b)?)/i;

function harmonyPartLooksLikeDominantSeventh(harmonyPart: string): boolean {
  const h = harmonyPart.trim();
  const rm = h.match(FAGEN_DOM7_ROOT_RE);
  if (!rm) return false;
  const rest = h.slice(rm[1].length).toLowerCase();
  const minorThird = /^(m|min|dim|ø|°)/.test(rest) || /m7|m9|m11|m13/.test(rest);
  const maj7 = /maj|Δ|ma7|M7/.test(rest);
  const halfDim = /ø|m7b5|half/.test(rest);
  if (minorThird || maj7 || halfDim) return false;
  const dom =
    /^(7|9|11|13)/.test(rest) || /7alt|7#|7b|sus/.test(rest) || /13|11|9/.test(rest);
  return dom;
}

function intervalClassesMatchMajorMinorSevenDom(tones: ChordToneSet): boolean {
  const r = ((tones.root % 12) + 12) % 12;
  const t = ((tones.third % 12) + 12) % 12;
  const s = ((tones.seventh % 12) + 12) % 12;
  return (t - r + 12) % 12 === 4 && (s - r + 12) % 12 === 10;
}

/** Major third quality; excludes minor-key symbols. */
function intervalClassIsMajorThird(tones: ChordToneSet): boolean {
  const r = ((tones.root % 12) + 12) % 12;
  const t = ((tones.third % 12) + 12) % 12;
  return (t - r + 12) % 12 === 4;
}

function chordSymbolImpliesSharpEleven(harmonyPart: string): boolean {
  return /#11|#4|maj7\s*\(\s*#11\s*\)|△\s*\(\s*#11\s*\)/i.test(harmonyPart.trim());
}

function applyFagenMajorMuColourToMeasure(
  m: MeasureModel,
  bar: number,
  seed: number,
  tones: ChordToneSet,
  low: number,
  high: number,
  muBias: number,
  harmonyPart: string
): void {
  if (muBias <= 0) return;
  if (!intervalClassIsMajorThird(tones)) return;
  if (harmonyPartLooksLikeDominantSeventh(harmonyPart)) return;
  const rootPc = ((tones.root % 12) + 12) % 12;
  /** Ninth above root (same span as existing Fagen root-avoidance helpers). */
  const ninthMidi = liftToneToRange(tones.root + 14, low, high);
  let salt = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    if ((e.voice ?? 1) !== 1) continue;
    const pc = ((e.pitch % 12) + 12) % 12;
    if (pc !== rootPc) continue;
    /** Offbeat / syncopated attacks only — keep downbeats more grounded. */
    const sb = e.startBeat ?? 0;
    if (sb < 0.375) continue;
    if (seededUnit(seed, bar, 88460 + salt++) > muBias * 0.38) continue;
    e.pitch = nearestMidiPitch(
      e.pitch,
      [ninthMidi, tones.third, tones.seventh],
      low,
      high,
      previousIntervalIntoNote(m, e)
    );
  }
}

function applyFagenLydianSharpElevenNudge(
  m: MeasureModel,
  bar: number,
  seed: number,
  tones: ChordToneSet,
  low: number,
  high: number,
  lydianBias: number,
  harmonyPart: string
): void {
  if (lydianBias <= 0) return;
  if (!chordSymbolImpliesSharpEleven(harmonyPart)) return;
  if (!intervalClassIsMajorThird(tones)) return;
  const rootPc = ((tones.root % 12) + 12) % 12;
  /** Natural 11 (perfect 4th above root) — when symbol carries #11, occasionally raise by semitone toward Lydian colour. */
  const natural11Pc = (rootPc + 5) % 12;
  const sharp11Pc = (rootPc + 6) % 12;
  let salt = 0;
  let applied = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    if ((e.voice ?? 1) !== 1) continue;
    if (applied >= 2) break;
    const pc = ((e.pitch % 12) + 12) % 12;
    if (pc !== natural11Pc) continue;
    if (seededUnit(seed, bar, 88470 + salt++) > lydianBias * 0.45) continue;
    const cur = e.pitch;
    const candidates = [cur + 1, cur - 11, cur + 13];
    e.pitch = nearestMidiPitch(
      cur,
      candidates.map((c) => clampPitch(c, low, high)),
      low,
      high,
      previousIntervalIntoNote(m, e)
    );
    if (((e.pitch % 12) + 12) % 12 === sharp11Pc) applied++;
  }
}

function fagenAlteredCandidateMidis(
  tones: ChordToneSet,
  low: number,
  high: number,
  seed: number,
  bar: number
): number[] {
  const rootMidi = tones.root;
  const ext = (semi: number) => {
    const rootPc = ((rootMidi % 12) + 12) % 12;
    const pc = (rootPc + semi) % 12;
    let m = Math.floor(rootMidi / 12) * 12 + pc;
    while (m < low - 6) m += 12;
    while (m > high + 6) m -= 12;
    return clampPitch(m, low, high);
  };
  const b9 = ext(1);
  const sharp9 = ext(3);
  const thir = ext(9);
  const b13 = ext(8);
  const u = seededUnit(seed, bar, 88410);
  const nineChoice = u < 0.5 ? b9 : sharp9;
  const thirteenChoice = seededUnit(seed, bar, 88411) < 0.5 ? thir : b13;
  return [tones.third, tones.seventh, nineChoice, thirteenChoice];
}

function intervalClassWeight(semitones: number): number {
  const abs = Math.abs(semitones);
  if (abs <= 2) return 1.0;
  if (abs <= 4) return 0.55;
  if (abs <= 7) return 0.22;
  if (abs <= 9) return 0.06;
  return 0.02;
}

function previousIntervalIntoNote(
  measure: MeasureModel,
  note: NoteEvent
): { semitones: number; direction: -1 | 0 | 1 } | undefined {
  const v1 = measure.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);
  const idx = v1.indexOf(note);
  if (idx <= 0) return undefined;
  const prev = v1[idx - 1];
  if (!prev) return undefined;
  const delta = note.pitch - prev.pitch;
  return {
    semitones: Math.abs(delta),
    direction: delta > 0 ? 1 : delta < 0 ? -1 : 0,
  };
}

function nearestMidiPitch(
  target: number,
  candidates: number[],
  low: number,
  high: number,
  previousInterval?: { semitones: number; direction: -1 | 0 | 1 }
): number {
  const safe = candidates.filter((c) => Number.isFinite(c));
  if (safe.length === 0) return clampPitch(target, low, high);
  let best = clampPitch(safe[0]!, low, high);
  let bestScore = -Infinity;
  for (const c0 of safe) {
    for (const o of [-24, -12, 0, 12, 24]) {
      const c = clampPitch(c0 + o, low, high);
      const delta = c - target;
      const distance = Math.abs(delta);
      let score = intervalClassWeight(delta) / (1 + distance);
      if (
        previousInterval &&
        previousInterval.semitones > 5 &&
        previousInterval.direction !== 0 &&
        distance <= 2
      ) {
        const candidateDirection: -1 | 0 | 1 = delta > 0 ? 1 : delta < 0 ? -1 : 0;
        if (candidateDirection === -previousInterval.direction) {
          score *= 1.3;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
  }
  return best;
}

function buildSongwriterMelodyProfile(
  songwriterId: string | undefined,
  seed: number
): {
  phraseIntentBias: 'ascending' | 'descending' | 'arch' | 'neutral';
  densityBias: number;
  offbeatBias: number;
  intervalBias: 'stepwise' | 'leaping' | 'chromatic' | 'neutral';
  rhythmicFeel: 'syncopated' | 'straight' | 'laid_back' | 'neutral' | 'flowing';
} {
  void seed;
  switch (songwriterId) {
    case 'donald_fagen':
      return {
        phraseIntentBias: 'arch',
        densityBias: -0.15,
        offbeatBias: 0.7,
        intervalBias: 'chromatic',
        rhythmicFeel: 'syncopated',
      };
    case 'bacharach':
      return {
        phraseIntentBias: 'arch',
        densityBias: -0.15,
        offbeatBias: 0.3,
        intervalBias: 'leaping',
        rhythmicFeel: 'straight',
      };
    case 'wayne_shorter':
      return {
        phraseIntentBias: 'neutral',
        densityBias: -0.2,
        offbeatBias: 0.4,
        intervalBias: 'chromatic',
        rhythmicFeel: 'laid_back',
      };
    case 'barry_harris':
      return {
        phraseIntentBias: 'neutral',
        densityBias: -0.1,
        offbeatBias: 0.55,
        intervalBias: 'chromatic',
        rhythmicFeel: 'syncopated',
      };
    case 'ecm_chamber':
      return {
        phraseIntentBias: 'descending',
        densityBias: -0.25,
        offbeatBias: 0.35,
        intervalBias: 'stepwise',
        rhythmicFeel: 'laid_back',
      };
    case 'bill_evans':
      return {
        phraseIntentBias: 'descending',
        densityBias: -0.15,
        offbeatBias: 0.35,
        intervalBias: 'stepwise',
        rhythmicFeel: 'laid_back',
      };
    case 'debussy':
      return {
        phraseIntentBias: 'arch',
        densityBias: -0.1,
        offbeatBias: 0.52,
        intervalBias: 'stepwise',
        rhythmicFeel: 'flowing',
      };
    case 'duke_ellington':
      return {
        phraseIntentBias: 'arch',
        densityBias: 0.12,
        offbeatBias: 0.55,
        intervalBias: 'chromatic',
        rhythmicFeel: 'syncopated',
      };
    case 'maria_schneider':
      return {
        phraseIntentBias: 'arch',
        densityBias: 0.05,
        offbeatBias: 0.25,
        intervalBias: 'stepwise',
        rhythmicFeel: 'flowing',
      };
    case 'pat_metheny':
      return {
        phraseIntentBias: 'ascending',
        densityBias: -0.15,
        offbeatBias: 0.1,
        intervalBias: 'stepwise',
        rhythmicFeel: 'flowing',
      };
    case 'brian_wilson':
      return {
        phraseIntentBias: 'arch',
        densityBias: -0.12,
        offbeatBias: 0.64,
        intervalBias: 'leaping',
        rhythmicFeel: 'syncopated',
      };
    case 'stevie_wonder':
      return {
        phraseIntentBias: 'ascending',
        densityBias: -0.08,
        offbeatBias: 0.82,
        intervalBias: 'stepwise',
        rhythmicFeel: 'syncopated',
      };
    default:
      return {
        phraseIntentBias: 'neutral',
        densityBias: 0,
        offbeatBias: 0.5,
        intervalBias: 'neutral',
        rhythmicFeel: 'neutral',
      };
  }
}

function applyDonaldFagenGuitarBarPasses(
  m: MeasureModel,
  bar: number,
  context: CompositionContext,
  seed: number,
  low: number,
  high: number,
  biases: {
    fagenAlteredDominantBias: number;
    fagenRootAvoidanceMelody: number;
    fagenMuChordBias?: number;
    fagenLydianMajorBias?: number;
  }
): void {
  const chord = m.chord ?? getChordForBar(bar, context);
  const tones = chordTonesForChordSymbolWithContext(chord, context);
  const h = parseChordSymbol(chord).harmonyPart;
  const isDom7 =
    harmonyPartLooksLikeDominantSeventh(h) && intervalClassesMatchMajorMinorSevenDom(tones);

  if (
    biases.fagenAlteredDominantBias > 0 &&
    isDom7 &&
    seededUnit(seed, bar, 88401) > 1 - biases.fagenAlteredDominantBias
  ) {
    (m as MeasureModel & { fagenHarmonyTag?: string }).fagenHarmonyTag = 'fagen_altered';
    const alts = fagenAlteredCandidateMidis(tones, low, high, seed, bar);
    const rootPc = ((tones.root % 12) + 12) % 12;
    const fifthPc = ((tones.fifth % 12) + 12) % 12;
    let noteSalt = 0;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const v = e.voice ?? 1;
      if (v !== 1) continue;
      const pc = ((e.pitch % 12) + 12) % 12;
      if (pc !== rootPc && pc !== fifthPc) continue;
      if (seededUnit(seed, bar, 88420 + noteSalt++) > 0.55) continue;
      e.pitch = nearestMidiPitch(e.pitch, alts, low, high, previousIntervalIntoNote(m, e));
    }
  }

  if (biases.fagenRootAvoidanceMelody > 0) {
    const rootPc = ((tones.root % 12) + 12) % 12;
    const ninthMidi = liftToneToRange(tones.root + 14, low, high);
    const candidates37 = [tones.third, tones.seventh, ninthMidi];
    let salt = 0;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if ((e.voice ?? 1) !== 1) continue;
      const onStrong = e.startBeat === 0 || Math.abs(e.startBeat - 2) < 1e-4;
      if (!onStrong) continue;
      const pc = ((e.pitch % 12) + 12) % 12;
      if (pc !== rootPc) continue;
      if (seededUnit(seed, bar, 88430 + salt++) >= biases.fagenRootAvoidanceMelody) continue;
      e.pitch = nearestMidiPitch(e.pitch, candidates37, low, high, previousIntervalIntoNote(m, e));
    }
  }

  applyFagenMajorMuColourToMeasure(m, bar, seed, tones, low, high, biases.fagenMuChordBias ?? 0, h);
  applyFagenLydianSharpElevenNudge(m, bar, seed, tones, low, high, biases.fagenLydianMajorBias ?? 0, h);
}

function isChordDominantForBacharach(chord: string, context: CompositionContext): boolean {
  const c = chord.trim();
  if (!c) return false;
  const toneSet = chordTonesForChordSymbolWithContext(c, context);
  const h = parseChordSymbol(c).harmonyPart;
  return harmonyPartLooksLikeDominantSeventh(h) && intervalClassesMatchMajorMinorSevenDom(toneSet);
}

function applyBacharachGuitarBarPasses(
  m: MeasureModel,
  bar: number,
  context: CompositionContext,
  seed: number,
  low: number,
  high: number,
  biases: {
    bacharachDeceptiveCadenceRate: number;
    bacharachChromaticVoiceLeading: number;
    bacharachModalMixtureLevel: number;
    bacharachCadentialAmbiguity: number;
  }
): void {
  void biases.bacharachDeceptiveCadenceRate;
  const chordSym = m.chord ?? getChordForBar(bar, context);
  const opts = shouldUseUserChordSemanticsForTones(context) ? { lockedHarmony: true } : undefined;
  const tones = guitarChordTonesInRange(chordSym, low, high, opts);
  const isDominant = isChordDominantForBacharach(chordSym, context);

  if (biases.bacharachCadentialAmbiguity > 0 && bar % 4 === 0) {
    const rootPc = ((tones.root % 12) + 12) % 12;
    const secondMidi = liftToneToRange(tones.root + 2, low, high);
    for (const e of m.events) {
      if (e.kind !== 'note' || (e.voice ?? 1) !== 1) continue;
      const isLastBeat = e.startBeat >= 3;
      if (!isLastBeat) continue;
      const pc = ((e.pitch % 12) + 12) % 12;
      if (pc !== rootPc) continue;
      if (seededUnit(seed, bar, 99301) >= biases.bacharachCadentialAmbiguity) continue;
      const candidates = [tones.third, secondMidi];
      e.pitch = nearestMidiPitch(e.pitch, candidates, low, high, previousIntervalIntoNote(m, e));
    }
  }

  if (biases.bacharachChromaticVoiceLeading > 0) {
    const v1Notes = m.events
      .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
      .sort((a, b) => a.startBeat - b.startBeat);
    for (let i = 0; i < v1Notes.length - 1; i++) {
      const curr = v1Notes[i];
      const next = v1Notes[i + 1];
      if (!curr || !next) continue;
      const interval = Math.abs(next.pitch - curr.pitch);
      if (interval < 2 || interval > 4) continue;
      if (seededUnit(seed, bar, 99320 + i) >= biases.bacharachChromaticVoiceLeading) continue;
      const direction = next.pitch > curr.pitch ? 1 : -1;
      curr.pitch = clampPitch(curr.pitch + direction, low, high);
    }
  }

  if (biases.bacharachModalMixtureLevel > 0 && !isDominant) {
    if (seededUnit(seed, bar, 99340) < biases.bacharachModalMixtureLevel * 0.3) {
      const thirdPc = ((tones.third % 12) + 12) % 12;
      for (const e of m.events) {
        if (e.kind !== 'note' || (e.voice ?? 1) !== 1) continue;
        const pc = ((e.pitch % 12) + 12) % 12;
        if (pc !== thirdPc) continue;
        if (seededUnit(seed, bar, 99350) >= 0.5) continue;
        e.pitch = clampPitch(e.pitch - 1, low, high);
      }
    }
  }
}

function buildGuitarPart(
  context: CompositionContext,
  _guitarPlan: GuitarBehaviourPlan,
  guitarMap: InstrumentRegisterMap,
  densityPlan: DensityCurvePlan,
  rhythm: RhythmicConstraints,
  motifState: MotifTrackerState,
  interactionPlan: InteractionPlan | undefined,
  texturePlan: EcmBarTexture[] | undefined,
  styleStack?: StyleStack
): PartModel {
  const stackIds = styleStackToModuleIds(styleStack ?? DUO_DEFAULT_STYLE_STACK);
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is GuitarProfile => p.instrumentIdentity === 'clean_electric_guitar'
  ) ?? CLEAN_ELECTRIC_GUITAR;

  const chordToneOpts: ChordTonesOptions | undefined = shouldUseUserChordSemanticsForTones(context)
    ? { lockedHarmony: true }
    : undefined;

  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const isSongwriterFagen = genMeta?.songwriterStyleId === 'donald_fagen';
  const isSongwriterEcmChamber = genMeta?.songwriterStyleId === 'ecm_chamber';
  const isSongwriterJobim = genMeta?.songwriterStyleId === 'antonio_carlos_jobim';
  const isSongwriterHerbieHancock = genMeta?.songwriterStyleId === 'herbie_hancock';
  const isSongwriterSondheim = genMeta?.songwriterStyleId === 'stephen_sondheim';
  const isSongwriterKateBush = genMeta?.songwriterStyleId === 'kate_bush';
  const isSongwriterTheloniousMonk = genMeta?.songwriterStyleId === 'thelonious_monk';
  const isSongwriterAndrewHill = genMeta?.songwriterStyleId === 'andrew_hill';
  const isSongwriterCharlieParker = genMeta?.songwriterStyleId === 'charlie_parker';
  const fagenAlteredDominantBiasR =
    typeof genMeta?.fagenAlteredDominantBias === 'number' ? genMeta.fagenAlteredDominantBias : 0;
  const fagenRootAvoidanceMelodyR =
    typeof genMeta?.fagenRootAvoidanceMelody === 'number' ? genMeta.fagenRootAvoidanceMelody : 0;
  const fagenMuChordBiasR =
    typeof genMeta?.fagenMuChordBias === 'number' ? genMeta.fagenMuChordBias : 0;
  const fagenLydianMajorBiasR =
    typeof genMeta?.fagenLydianMajorBias === 'number' ? genMeta.fagenLydianMajorBias : 0;

  const isSongwriterBacharach = genMeta?.songwriterStyleId === 'bacharach';
  const bacharachDeceptiveCadenceRateR =
    typeof genMeta?.bacharachDeceptiveCadenceRate === 'number' ? genMeta.bacharachDeceptiveCadenceRate : 0;
  const bacharachChromaticVoiceLeadingR =
    typeof genMeta?.bacharachChromaticVoiceLeading === 'number' ? genMeta.bacharachChromaticVoiceLeading : 0;
  const bacharachModalMixtureLevelR =
    typeof genMeta?.bacharachModalMixtureLevel === 'number' ? genMeta.bacharachModalMixtureLevel : 0;
  const bacharachCadentialAmbiguityR =
    typeof genMeta?.bacharachCadentialAmbiguity === 'number' ? genMeta.bacharachCadentialAmbiguity : 0;

  const isSongwriterBrianWilson = genMeta?.songwriterStyleId === 'brian_wilson';
  const isSongwriterStevieWonder = genMeta?.songwriterStyleId === 'stevie_wonder';
  const isSongwriterRadiohead = genMeta?.songwriterStyleId === 'radiohead';
  const isSongwriterJamesBrown = genMeta?.songwriterStyleId === 'james_brown';
  const isSongwriterJoniMitchell = genMeta?.songwriterStyleId === 'joni_mitchell';
  const isSongwriterSonicYouth = genMeta?.songwriterStyleId === 'sonic_youth';
  const isSongwriterPatMetheny = genMeta?.songwriterStyleId === 'pat_metheny';
  const styleProf = normalizeStyleProfileId(genMeta?.styleProfile);
  const styleSonicYouthSurface = styleProf === 'STYLE_SONIC_YOUTH';
  const styleJoniMitchellSurface = styleProf === 'STYLE_JONI_MITCHELL';
  const stylePatMethenySurface = styleProf === 'STYLE_PAT_METHENY';
  const isSongwriterWayneShorter = genMeta?.songwriterStyleId === 'wayne_shorter';
  const isSongwriterFrankZappa =
    normalizeSongwriterStyleKey(String(genMeta?.songwriterStyleId ?? '')) === 'frank_zappa';
  const isSongwriterBarryHarris = genMeta?.songwriterStyleId === 'barry_harris';
  const isSongwriterBillEvans = genMeta?.songwriterStyleId === 'bill_evans';
  const isSongwriterDebussy = genMeta?.songwriterStyleId === 'debussy';
  const isSongwriterDukeEllington = genMeta?.songwriterStyleId === 'duke_ellington';
  const isSongwriterMilesDavis = genMeta?.songwriterStyleId === 'miles_davis';
  const isSongwriterBartok = genMeta?.songwriterStyleId === 'bartok';
  const isSongwriterGershwin = genMeta?.songwriterStyleId === 'gershwin';
  const isSongwriterArvoPart = genMeta?.songwriterStyleId === 'arvo_part';
  const isSongwriterSatie = genMeta?.songwriterStyleId === 'satie';
  const isSongwriterPrince = genMeta?.songwriterStyleId === 'prince';
  const isSongwriterBeatles = genMeta?.songwriterStyleId === 'beatles';
  const isSongwriterColePorter = genMeta?.songwriterStyleId === 'cole_porter';
  const isSongwriterMariaSchneider = genMeta?.songwriterStyleId === 'maria_schneider';
  const bwAccum = createBrianWilsonHarmonyAccumulator();
  const swAccum = createStevieWonderHarmonyAccumulator();
  const rhAccum = createRadioheadHarmonyAccumulator();
  const jbAccum = createJamesBrownHarmonyAccumulator();
  const jmAccum = createJoniMitchellHarmonyAccumulator();
  const syAccum = createSonicYouthHarmonyAccumulator();
  const pmAccum = createPatMethenyHarmonyAccumulator();
  const wsAccum = createWayneShorterHarmonyAccumulator();
  const fzAccum = createFrankZappaHarmonyAccumulator();
  const bhAccum = createBarryHarrisHarmonyAccumulator();
  const beAccum = createBillEvansHarmonyAccumulator();
  const dbAccum = createDebussyHarmonyAccumulator();
  const deAccum = createDukeEllingtonHarmonyAccumulator();
  const mdAccum = createMilesDavisHarmonyAccumulator();
  const bkAccum = createBartokHarmonyAccumulator();
  const ggAccum = createGershwinHarmonyAccumulator();
  const apAccum = createArvoPartHarmonyAccumulator();
  const satAccum = createSatieHarmonyAccumulator();
  const princeAccum = createPrinceHarmonyAccumulator();
  const beatlesAccum = createBeatlesHarmonyAccumulator();
  const colePorterAccum = createColePorterHarmonyAccumulator();
  const msAccum = createMariaSchneiderHarmonyAccumulator();
  const baAccum = createBacharachHarmonyAccumulator();
  const dfAccum = createDonaldFagenHarmonyAccumulator();
  const eccAccum = createEcmChamberHarmonyAccumulator();
  const ajAccum = createJobimHarmonyAccumulator();
  const hhAccum = createHerbieHancockHarmonyAccumulator();
  const shAccum = createSondheimHarmonyAccumulator();
  const kbAccum = createKateBushHarmonyAccumulator();
  const tmAccum = createTheloniousMonkHarmonyAccumulator();
  const ahAccum = createAndrewHillHarmonyAccumulator();
  const cpAccum = createCharlieParkerHarmonyAccumulator();
  const isDuoGoldenPath = isDuoGoldenPathPreset(context.presetId);
  if (isSongwriterBrianWilson && isDuoGoldenPath) {
    precomputeBrianWilsonEffectiveHarmonyBars(context);
  }
  if (isSongwriterStevieWonder && isDuoGoldenPath) {
    precomputeStevieWonderEffectiveHarmonyBars(context);
  }
  if (isSongwriterRadiohead && isDuoGoldenPath) {
    precomputeRadioheadEffectiveHarmonyBars(context);
  }
  if (isSongwriterJamesBrown && isDuoGoldenPath) {
    precomputeJamesBrownEffectiveHarmonyBars(context);
  }
  if ((isSongwriterJoniMitchell || styleJoniMitchellSurface) && isDuoGoldenPath) {
    precomputeJoniMitchellEffectiveHarmonyBars(context);
  }
  if ((isSongwriterSonicYouth || styleSonicYouthSurface) && isDuoGoldenPath) {
    precomputeSonicYouthEffectiveHarmonyBars(context);
  }
  if ((isSongwriterPatMetheny || stylePatMethenySurface) && isDuoGoldenPath) {
    precomputePatMethenyEffectiveHarmonyBars(context);
  }
  if (isSongwriterWayneShorter && isDuoGoldenPath) {
    precomputeWayneShorterEffectiveHarmonyBars(context);
  }
  if (isSongwriterFrankZappa && isDuoGoldenPath) {
    attachFrankZappaHarmonyContext(context);
  }
  if (isSongwriterBarryHarris && isDuoGoldenPath) {
    precomputeBarryHarrisEffectiveHarmonyBars(context);
  }
  if (isSongwriterBillEvans && isDuoGoldenPath) {
    precomputeBillEvansEffectiveHarmonyBars(context);
  }
  if (isSongwriterDebussy && isDuoGoldenPath) {
    precomputeDebussyEffectiveHarmonyBars(context);
  }
  if (isSongwriterDukeEllington && isDuoGoldenPath) {
    precomputeDukeEllingtonEffectiveHarmonyBars(context);
  }
  if (isSongwriterMilesDavis && isDuoGoldenPath) {
    precomputeMilesDavisEffectiveHarmonyBars(context);
  }
  if (isSongwriterBartok && isDuoGoldenPath) {
    precomputeBartokEffectiveHarmonyBars(context);
  }
  if (isSongwriterGershwin && isDuoGoldenPath) {
    precomputeGershwinEffectiveHarmonyBars(context);
  }
  if (isSongwriterArvoPart && isDuoGoldenPath) {
    precomputeArvoPartEffectiveHarmonyBars(context);
  }
  if (isSongwriterSatie && isDuoGoldenPath) {
    precomputeSatieEffectiveHarmonyBars(context);
  }
  if (isSongwriterPrince && isDuoGoldenPath) {
    precomputePrinceEffectiveHarmonyBars(context);
  }
  if (isSongwriterBeatles && isDuoGoldenPath) {
    precomputeBeatlesEffectiveHarmonyBars(context);
  }
  if (isSongwriterColePorter && isDuoGoldenPath) {
    precomputeColePorterEffectiveHarmonyBars(context);
  }
  if (isSongwriterMariaSchneider && isDuoGoldenPath) {
    precomputeMariaSchneiderEffectiveHarmonyBars(context);
  }
  if (isSongwriterBacharach && isDuoGoldenPath) {
    precomputeBacharachEffectiveHarmonyBars(context);
  }
  if (isSongwriterFagen && isDuoGoldenPath) {
    precomputeDonaldFagenEffectiveHarmonyBars(context);
  }
  if (isSongwriterEcmChamber && isDuoGoldenPath) {
    precomputeEcmChamberEffectiveHarmonyBars(context);
  }
  if (isSongwriterJobim && isDuoGoldenPath) {
    precomputeJobimEffectiveHarmonyBars(context);
  }
  if (isSongwriterHerbieHancock && isDuoGoldenPath) {
    precomputeHerbieHancockEffectiveHarmonyBars(context);
  }
  if (isSongwriterSondheim && isDuoGoldenPath) {
    precomputeSondheimEffectiveHarmonyBars(context);
  }
  if (isSongwriterKateBush && isDuoGoldenPath) {
    precomputeKateBushEffectiveHarmonyBars(context);
  }
  if (isSongwriterTheloniousMonk && isDuoGoldenPath) {
    precomputeTheloniousMonkEffectiveHarmonyBars(context);
  }
  if (isSongwriterAndrewHill && isDuoGoldenPath) {
    precomputeAndrewHillEffectiveHarmonyBars(context);
  }
  if (isSongwriterCharlieParker && isDuoGoldenPath) {
    precomputeCharlieParkerEffectiveHarmonyBars(context);
  }

  const seed = context.seed;
  const songwriterMelodyProfile = buildSongwriterMelodyProfile(
    genMeta?.songwriterStyleId as string | undefined,
    seed
  );
  const hints = readStyleHints(context);
  const measures: MeasureModel[] = [];
  const [baseLow] = profile.preferredMelodicZone;
  const effectiveBase = Math.max(baseLow, GUITAR_FLOOR_FOR_SEPARATION);
  const tb = totalBarsFromContext(context);
  const fagenAnyColourBiases =
    fagenAlteredDominantBiasR > 0 ||
    fagenRootAvoidanceMelodyR > 0 ||
    fagenMuChordBiasR > 0 ||
    fagenLydianMajorBiasR > 0;
  const anchorMidi = motifState.baseMotifs[0]?.notes[0]?.pitch;
  let consecutiveBusyGuitarBars = 0;

  const songModeHook =
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    tb === 32;
  /** Indie dual-electric remap has tight chord-density smoke gates; Stage 3 anticipation would skew comp metrics. */
  const skipPhraseEngineStage3Anticipation = shouldUseIndieArtPopDualGuitarRoute(context);
  const [zL1, zH1] = getRegisterForBar(guitarMap, 1, context);
  const lab1 = sectionLabelForBar(1, context);
  const bump1 = lab1 === 'B' ? 5 : 0;
  const stmtLow = Math.max(zL1, effectiveBase) + bump1;
  const stmtHigh = Math.min(79, zH1 + bump1);
  const [zL25, zH25] = getRegisterForBar(guitarMap, SONG_MODE_HOOK_RETURN_BAR, context);
  const lab25 = sectionLabelForBar(SONG_MODE_HOOK_RETURN_BAR, context);
  const bump25 = lab25 === 'B' ? 5 : 0;
  const retLow = Math.max(zL25, effectiveBase) + bump25;
  const retHigh = Math.min(79, zH25 + bump25);
  const [zL9, zH9] = getRegisterForBar(guitarMap, SONG_MODE_MOTIF_BAR_9, context);
  const lab9 = sectionLabelForBar(SONG_MODE_MOTIF_BAR_9, context);
  const bump9 = lab9 === 'B' ? 5 : 0;
  const bar9Low = Math.max(zL9, effectiveBase) + bump9;
  const bar9High = Math.min(79, zH9 + bump9);
  const [zL17, zH17] = getRegisterForBar(guitarMap, SONG_MODE_MOTIF_BAR_17, context);
  const lab17 = sectionLabelForBar(SONG_MODE_MOTIF_BAR_17, context);
  const bump17 = lab17 === 'B' ? 5 : 0;
  const bar17Low = Math.max(zL17, effectiveBase) + bump17;
  const bar17High = Math.min(79, zH17 + bump17);
  const registerForBar = (bar: number): [number, number] => {
    const [zL, zH] = getRegisterForBar(guitarMap, bar, context);
    const lab = sectionLabelForBar(bar, context);
    const bump = lab === 'B' ? 5 : 0;
    return [Math.max(zL, effectiveBase) + bump, Math.min(79, zH + bump)];
  };

  const hookRuntime = songModeHook
    ? buildSongModeHookRuntime({
        seed,
        context,
        registerForBar,
        statementLow: stmtLow,
        statementHigh: stmtHigh,
        returnLow: retLow,
        returnHigh: retHigh,
        bar9Low,
        bar9High,
        bar17Low,
        bar17High,
        chordToneOpts,
        getHookGuitarPart: () => ({
          id: 'guitar',
          name: 'Clean Electric Guitar',
          instrumentIdentity: profile.instrumentIdentity,
          midiProgram: profile.midiProgram,
          clef: 'treble',
          measures: [...measures],
        }),
      })
    : undefined;

  if (hookRuntime && context.generationMetadata) {
    const c = hookRuntime.cell;
    context.generationMetadata = {
      ...context.generationMetadata,
      songModeHookCellSummary: `dirs=${c.contourDirs.join(',')};var=${c.variationKind};notes=${c.noteCount}`,
      songModeCoreMotifs: hookRuntime.coreMotifs,
      songModeMotifCount: 1,
      songModePrimaryMotif: hookRuntime.primaryMotif,
      songModeStatementMotifShape: hookRuntime.statementMotifShape,
      songModeReturnMotifShapeExpected: hookRuntime.returnExpectedMotifShape,
    };
  }

  for (let b = 1; b <= tb; b++) {
    if (isSongwriterBrianWilson) {
      accumulateBrianWilsonHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        bwAccum
      );
    }
    if (isSongwriterStevieWonder) {
      accumulateStevieWonderHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        swAccum
      );
    }
    if (isSongwriterRadiohead) {
      accumulateRadioheadHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        rhAccum
      );
    }
    if (isSongwriterJamesBrown) {
      accumulateJamesBrownHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        jbAccum
      );
    }
    if (isSongwriterJoniMitchell || styleJoniMitchellSurface) {
      accumulateJoniMitchellHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        jmAccum
      );
    }
    if (isSongwriterSonicYouth || styleSonicYouthSurface) {
      accumulateSonicYouthHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        syAccum
      );
    }
    if (isSongwriterPatMetheny || stylePatMethenySurface) {
      accumulatePatMethenyHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        pmAccum
      );
    }
    if (isSongwriterWayneShorter) {
      accumulateWayneShorterHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        wsAccum
      );
    }
    if (isSongwriterFrankZappa) {
      accumulateFrankZappaHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        fzAccum
      );
    }
    if (isSongwriterBarryHarris) {
      accumulateBarryHarrisHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        bhAccum
      );
    }
    if (isSongwriterBillEvans) {
      accumulateBillEvansHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        beAccum
      );
    }
    if (isSongwriterDebussy) {
      accumulateDebussyHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        dbAccum
      );
    }
    if (isSongwriterDukeEllington) {
      accumulateDukeEllingtonHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        deAccum
      );
    }
    if (isSongwriterMilesDavis) {
      accumulateMilesDavisHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        mdAccum
      );
    }
    if (isSongwriterBartok) {
      accumulateBartokHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        bkAccum
      );
    }
    if (isSongwriterGershwin) {
      accumulateGershwinHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        ggAccum
      );
    }
    if (isSongwriterArvoPart) {
      accumulateArvoPartHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        apAccum
      );
    }
    if (isSongwriterSatie) {
      accumulateSatieHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        satAccum
      );
    }
    if (isSongwriterPrince) {
      accumulatePrinceHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        princeAccum
      );
    }
    if (isSongwriterBeatles) {
      accumulateBeatlesHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        beatlesAccum
      );
    }
    if (isSongwriterColePorter) {
      accumulateColePorterHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        colePorterAccum
      );
    }
    if (isSongwriterMariaSchneider) {
      accumulateMariaSchneiderHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        msAccum
      );
    }
    if (isSongwriterBacharach) {
      accumulateBacharachHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        baAccum
      );
    }
    if (isSongwriterFagen) {
      accumulateDonaldFagenHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        dfAccum
      );
    }
    if (isSongwriterEcmChamber) {
      accumulateEcmChamberHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        eccAccum
      );
    }
    if (isSongwriterJobim) {
      accumulateJobimHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        ajAccum
      );
    }
    if (isSongwriterHerbieHancock) {
      accumulateHerbieHancockHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        hhAccum
      );
    }
    if (isSongwriterSondheim) {
      accumulateSondheimHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        shAccum
      );
    }
    if (isSongwriterKateBush) {
      accumulateKateBushHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        kbAccum
      );
    }
    if (isSongwriterTheloniousMonk) {
      accumulateTheloniousMonkHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        tmAccum
      );
    }
    if (isSongwriterAndrewHill) {
      accumulateAndrewHillHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        ahAccum
      );
    }
    if (isSongwriterCharlieParker) {
      accumulateCharlieParkerHarmonyDiagnostics(
        b > 1 ? getChordForBar(b - 1, context) : undefined,
        getChordForBar(b, context),
        cpAccum
      );
    }
    const m = createMeasure(b, getChordForBar(b, context), rehearsalForBar(b, context));
    stampMeasureBeatSpanQuarters(m, context);
    const placements = getPlacementsForBar(motifState.placements, b);
    const ecmMode = context.generationMetadata?.ecmMode;
    const isEcmM = context.presetId === 'ecm_chamber' && ecmMode === 'ECM_METHENY_QUARTET';
    const isEcmS = context.presetId === 'ecm_chamber' && ecmMode === 'ECM_SCHNEIDER_CHAMBER';
    const isDuoGolden = isDuoGoldenPathPreset(context.presetId);
    const phase = ((b - 1) % 8) + 1;
    const tex = texturePlan?.find((t) => t.bar === b);

    let density = getDensityForBar(densityPlan, b);
    if (isEcmM) {
      if (phase <= 3) density = 'sparse';
      else if (phase === 4) density = 'medium';
      else if (phase >= 5 && phase <= 7) density = 'sparse';
      else density = 'medium';
    } else if (isEcmS) {
      const third = Math.floor(tb / 3);
      if (b <= third) density = 'sparse';
      else if (b <= 2 * third) density = 'dense';
      else density = 'sparse';
    }
    if (tex?.guitarRole === 'silence' || tex?.guitarRole === 'shadow') density = 'sparse';
    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const reduceAttack = interaction?.coupling?.guitarReduceAttack;
    const phraseBar = context.presetId === 'ecm_chamber' ? phase : b;
    const cycleIndex = Math.floor((b - 1) / 8);
    const phraseIntent: PhraseIntent =
      isEcmM
        ? getEcmMethenyPhraseIntent(phase, cycleIndex, seed)
        : isEcmS
          ? getEcmSchneiderPhraseIntent(phase, seed)
          : isDuoGolden
            ? duoGoldenPathPhraseIntentAtBar(seed, b)
            : getDuoPhraseIntent(phraseBar, seed);
    const stagger = computeEnsembleStagger(isDuoGolden ? phase : phraseBar, seed, phraseIntent);
    const swingBump = duoGuitarSwingStaggerBump(seed, b, isDuoGolden);
    /** 8-bar arc: slight stagger bias so attacks are not evenly spaced on the grid every bar. */
    const phraseShapeBump =
      isDuoGolden && (phase === 1 || phase === 2)
        ? seededUnit(seed, b, 610) * 0.12
        : isDuoGolden && (phase === 5 || phase === 6)
          ? -0.08 + seededUnit(seed, b, 611) * 0.1
          : isDuoGolden && (phase === 4 || phase === 8)
            ? seededUnit(seed, b, 612) * 0.06 - 0.03
            : 0;
    let staggerGuitar = isDuoGolden
      ? snapAttackBeatToGrid(stagger.guitar + swingBump + phraseShapeBump)
      : qBeat(stagger.guitar + swingBump);
    const phraseShapeBar = isDuoGolden ? phase : context.presetId === 'ecm_chamber' ? phase : b;
    const [zLow, zHigh] = getRegisterForBar(guitarMap, b, context);
    const lab = sectionLabelForBar(b, context);
    const sectionBump = lab === 'B' ? 5 : 0;
    let effectiveLow = Math.max(zLow, effectiveBase) + sectionBump;
    let effectiveHigh = Math.min(79, zHigh + sectionBump);
    if (isEcmM || isEcmS) {
      const anchored = anchorGuitarRegister(effectiveLow, effectiveHigh);
      effectiveLow = anchored[0];
      effectiveHigh = anchored[1];
    }
    let useOffbeat =
      (rhythm.offbeatWeight > 0.2 && (phase === 2 || phase === 4 || phase === 6 || phase === 8)) || !!reduceAttack;
    if (isEcmM || isEcmS) useOffbeat = false;
    /** 2-bar unit: bar 2 = resolution — less grid-like offbeat chatter. */
    if (isDuoGolden && b % 2 === 0) useOffbeat = false;
    const meth = isEcmM
      ? { attackDensityReduced: true, lyricalMotif: true, ...hints.metheny }
      : hints.metheny;
    const bach = hints.bacharach;

    if (hookRuntime) {
      const m = createMeasure(b, getChordForBar(b, context), rehearsalForBar(b, context));
      stampMeasureBeatSpanQuarters(m, context);
      hookRuntime.emitScheduledBar(b, m);
      normalizeMeasureToEighthBeatGrid(m);
      if (isDuoGolden && !skipPhraseEngineStage3Anticipation) {
        applyDuoGoldenPhraseEngineStage4MotifRhythm(m, seed, b);
      }
      normalizeMeasureToEighthBeatGrid(m);
      duoBoostPhraseEndLanding(m, b, true);
      duoEnforcePhraseEndCadence(m, b, context, effectiveLow, effectiveHigh, songModeHook);
      normalizeMeasureToEighthBeatGrid(m);
      if (b === 25 && context.seed === 50021) {
        const _b25AfterSecondNormalize = m.events
          .filter((e) => e.kind === 'note')
          .map((e) => e as { pitch: number; startBeat: number })
          .sort((a, b) => a.startBeat - b.startBeat)
          .map((n) => n.pitch);
        // eslint-disable-next-line no-console -- one-shot seed 50021 bar-25 snapshot; remove after capture
        console.error('[b25 after 2nd normalizeMeasureToEighthBeatGrid]', JSON.stringify(_b25AfterSecondNormalize));
      }
      if (guitarBarIsBusy(m)) consecutiveBusyGuitarBars++;
      else consecutiveBusyGuitarBars = 0;
      if (isSongwriterFagen && isDuoGolden && fagenAnyColourBiases) {
        applyDonaldFagenGuitarBarPasses(m, b, context, seed, effectiveLow, effectiveHigh, {
          fagenAlteredDominantBias: fagenAlteredDominantBiasR,
          fagenRootAvoidanceMelody: fagenRootAvoidanceMelodyR,
          fagenMuChordBias: fagenMuChordBiasR,
          fagenLydianMajorBias: fagenLydianMajorBiasR,
        });
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (isSongwriterBacharach && isDuoGolden) {
        applyBacharachGuitarBarPasses(m, b, context, seed, effectiveLow, effectiveHigh, {
          bacharachDeceptiveCadenceRate: bacharachDeceptiveCadenceRateR,
          bacharachChromaticVoiceLeading: bacharachChromaticVoiceLeadingR,
          bacharachModalMixtureLevel: bacharachModalMixtureLevelR,
          bacharachCadentialAmbiguity: bacharachCadentialAmbiguityR,
        });
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (isSongwriterBrianWilson && isDuoGolden) {
        const phaseHook = ((b - 1) % 8) + 1;
        applyBrianWilsonGuitarBarPasses(m, b, seed, effectiveLow, effectiveHigh, phaseHook);
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (isSongwriterStevieWonder && isDuoGolden) {
        applyStevieWonderGuitarBarPasses(m, b, context, seed, effectiveLow, effectiveHigh);
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (genMeta?.songwriterStyleId === 'james_brown' && isDuoGolden) {
        applyJamesBrownGuitarBarPasses(m, b, context);
        normalizeMeasureToEighthBeatGrid(m);
      }
      if ((isSongwriterSonicYouth || styleSonicYouthSurface) && isDuoGolden) {
        applySonicYouthGuitarBarPasses(m, b, context);
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (isDuoGolden && !skipPhraseEngineStage3Anticipation) {
        applyDuoGoldenPhraseEngineStage3Anticipation(m, seed, b);
        normalizeMeasureToEighthBeatGrid(m);
      }
      measures.push(m);
      continue;
    }

    if (bach && (phase === 2 || phase === 6) && context.presetId !== 'ecm_chamber') {
      const bm = buildBacharachAnchorMeasure(
        b,
        getChordForBar(b, context),
        rehearsalForBar(b, context),
        effectiveLow,
        effectiveHigh,
        context
      );
      normalizeMeasureToEighthBeatGrid(bm);
      measures.push(bm);
      continue;
    }

    const skipMotifForIdentity = isDuoGolden && phase === 7;
    if (placements.length > 0 && !skipMotifForIdentity) {
      let staggerForMotif = staggerGuitar;
      let cursor = 0;
      if (isDuoGolden && consecutiveBusyGuitarBars >= 2) {
        addEvent(m, createRest(0, 1));
        cursor = 1;
      } else if (isDuoGolden) {
        const mPrev = measures[measures.length - 1];
        const mPrev2 = measures[measures.length - 2];
        if (mPrev && mPrev2 && rhythmFingerprint(mPrev) === rhythmFingerprint(mPrev2)) {
          staggerForMotif = snapAttackBeatToGrid(staggerGuitar + 0.25 + seededUnit(seed, b, 613) * 0.25);
        }
        const firstBarOfPair = b % 2 === 1;
        const secondBarOfPair = b % 2 === 0;
        const uLead = seededUnit(seed, b, 615);
        let lead = 0;
        if (secondBarOfPair) {
          if (uLead < 0.55) lead = qBeat(0.5);
          else if (uLead < 0.82) lead = qBeat(0.25);
        } else if (firstBarOfPair) {
          if (uLead < 0.06) lead = qBeat(0.25);
        }
        if (lead > 0) {
          addEvent(m, createRest(0, lead));
          cursor = lead;
        }
      }
      const raw: { pitch: number; start: number; dur: number }[] = [];
      const barCapMotif = measureBeatSpanQuartersOf(m);
      for (const pl of placements) {
        for (const n of pl.notes) {
          let pitch = Math.max(effectiveLow, Math.min(effectiveHigh, n.pitch));
          const dur = Math.min(n.duration, Math.max(0, barCapMotif - n.startBeat));
          if (dur > 0 && n.startBeat < barCapMotif) {
            const rawStart = n.startBeat + staggerForMotif;
            raw.push({
              pitch,
              start: isDuoGolden ? snapAttackBeatToGrid(rawStart) : qBeat(rawStart),
              dur,
            });
          }
        }
      }
      raw.sort((a, b2) => a.start - b2.start);
      for (const e of raw) {
        let start = Math.max(qBeat(e.start), cursor);
        if (isDuoGolden) {
          cursor = snapAttackBeatToGrid(cursor);
          start = snapAttackBeatToGrid(start);
        }
        if (start > cursor) {
          const gap = start - cursor;
          const firstBarOfPair = b % 2 === 1;
          const minGap = firstBarOfPair && raw.length >= 2 ? 0.5 : 0.25;
          if (isDuoGolden && gap > 0 && gap < minGap - 1e-4) {
            start = snapAttackBeatToGrid(cursor);
          } else if (start > cursor) {
            addEvent(m, createRest(cursor, gap));
          }
        }
        let dur = qBeat(Math.min(e.dur, barCapMotif - start));
        if (meth?.attackDensityReduced && dur > 0.5 && tex?.guitarRole !== 'sustain_pad') {
          dur = Math.min(dur, 1.25);
        }
        dur = qBeat(Math.min(dur, barCapMotif - start));
        if (dur <= 0) continue;
        addEvent(m, createNote(e.pitch, start, dur));
        cursor = start + dur;
        if (cursor >= barCapMotif - 1e-6) break;
      }

      if (reduceAttack && cursor < barCapMotif - 1 + 1e-4) {
        addEvent(m, createRest(cursor, barCapMotif - cursor));
      } else if (cursor < barCapMotif - 1e-4) {
        const tail = barCapMotif - cursor;
        const chord = getChordForBar(b, context);
        const tones = duoChordTonesWithOptionalTuningMap(
          chord,
          effectiveLow,
          effectiveHigh,
          context,
          b,
          'guitar',
          chordToneOpts,
          26410
        );
        const endTone = resolvePhraseEndForDuo(tones, anchorMidi, effectiveLow, effectiveHigh, seed, b);
        /** Voice 1: rest through bar end; phrase-resolution tail on voice 2 (Wyble counter-line). */
        addEvent(m, createRest(cursor, tail, 1));
        const v2done = m.events.filter((e) => (e.voice ?? 1) === 2).reduce((s, e) => s + e.duration, 0);
        if (Math.abs(v2done - barCapMotif) > 1e-4) {
          if (tail >= 1.5 && seededUnit(seed, b, 5) < 0.35) {
            addEvent(m, createRest(cursor, 0.5, 2));
            {
              const e = createNote(endTone, cursor + 0.5, tail - 0.5, 2);
              (e as any).debugSource = (e as any).debugSource ?? 'phrasetail';
              addEvent(m, e);
            }
          } else {
            {
              const e = createNote(endTone, cursor, tail, 2);
              (e as any).debugSource = (e as any).debugSource ?? 'phrasetail';
              addEvent(m, e);
            }
          }
        }
      }
      collapseRestsInsideNotes(m);
      dropRestsSameStartAsNote(m);
    } else {
      let densityLevel: 'sparse' | 'medium' | 'dense' =
        density === 'very_dense' ? 'dense' : (density as 'sparse' | 'medium' | 'dense');
      if (isEcmS && tex?.densityBlend !== undefined && tex.densityBlend < 0.44) {
        densityLevel = 'sparse';
      }
      /** 2-bar phrase: bar 1 = idea (slightly fuller), bar 2 = space / resolution. */
      if (isDuoGolden && b % 2 === 0) {
        if (densityLevel === 'dense') densityLevel = 'medium';
        else if (densityLevel === 'medium') densityLevel = 'sparse';
      }
      if (isDuoGolden && b % 2 === 1 && densityLevel === 'sparse') {
        densityLevel = 'medium';
      }
      if (isDuoGolden && consecutiveBusyGuitarBars >= 2) {
        densityLevel = 'sparse';
      }
      if (isDuoGolden && phraseIntent === 'bass_lead') {
        if (densityLevel === 'dense') densityLevel = 'medium';
        if (densityLevel === 'medium') densityLevel = 'sparse';
      }
      if (isDuoGolden && phase === 7 && phraseIntent === 'guitar_lead') {
        if (densityLevel === 'sparse') densityLevel = 'medium';
      }
      if ((isEcmM || isEcmS) && tex?.guitarRole === 'silence') {
        addEvent(m, createRest(0, measureBeatSpanQuartersOf(m)));
      } else if (
        (isEcmM || isEcmS) &&
        tex &&
        (tex.guitarRole === 'sustain_pad' || tex.layeringMode === 'guitar_sustains')
      ) {
        emitEcmGuitarSustainBar({
          m,
          chord: getChordForBar(b, context),
          low: effectiveLow,
          high: effectiveHigh,
          seed,
          bar: b,
          phase,
          chordToneOpts,
        });
      } else if ((isEcmM || isEcmS) && tex?.guitarRole === 'inner_motion') {
        emitEcmGuitarInnerMotionBar({
          m,
          chord: getChordForBar(b, context),
          low: effectiveLow,
          high: effectiveHigh,
          seed,
          bar: b,
          chordToneOpts,
        });
      } else if (isDuoGolden && phase === 7) {
        emitGuitarDuoIdentityBar7({
          m,
          chord: getChordForBar(b, context),
          effectiveLow,
          effectiveHigh,
          staggerG: staggerGuitar,
          seed,
          chordToneOpts,
        });
      } else {
        // Apply songwriter melody profile
        if (songwriterMelodyProfile.rhythmicFeel === 'syncopated') {
          useOffbeat = seededUnit(seed, b, 77701) < songwriterMelodyProfile.offbeatBias;
        } else if (songwriterMelodyProfile.rhythmicFeel === 'laid_back') {
          useOffbeat = seededUnit(seed, b, 77702) < songwriterMelodyProfile.offbeatBias;
          staggerGuitar = Math.max(staggerGuitar, seededUnit(seed, b, 77703) * 0.15);
        } else if (songwriterMelodyProfile.rhythmicFeel === 'straight') {
          useOffbeat = seededUnit(seed, b, 77704) < songwriterMelodyProfile.offbeatBias;
        } else if (songwriterMelodyProfile.rhythmicFeel === 'flowing') {
          useOffbeat = seededUnit(seed, b, 77705) < songwriterMelodyProfile.offbeatBias;
          staggerGuitar = Math.max(staggerGuitar, seededUnit(seed, b, 77706) * 0.08);
        }

        if (songwriterMelodyProfile.densityBias !== 0) {
          let d =
            densityLevel === 'sparse' ? 0.35 : densityLevel === 'medium' ? 0.55 : 0.85;
          d = Math.max(0.1, Math.min(0.95, d + songwriterMelodyProfile.densityBias));
          densityLevel = d < 0.42 ? 'sparse' : d < 0.68 ? 'medium' : 'dense';
        }

        let slonimskyBarCtx: SlonimskyContext | undefined;
        if (
          isDuoGolden &&
          isAlternateGuitarTuningPilotActive(genMeta) &&
          styleProfileSupportsAlternateGuitarTuning(normalizeStyleProfileId(genMeta?.styleProfile))
        ) {
          const chordStr = getChordForBar(b, context);
          const keyPc = inferTonicPitchClassFromBar1(context) ?? 0;
          slonimskyBarCtx = buildDuoBarSlonimskyContext({
            duoIntent: phraseIntent,
            phase,
            seed,
            songwriterId: genMeta?.songwriterStyleId as string | undefined,
            ...(genMeta?.slonimskyAllowedOutsideOverride !== undefined
              ? { allowedOutsideOverride: genMeta.slonimskyAllowedOutsideOverride }
              : {}),
            totalQuarterBeats: tb * 4,
            styleProfile: normalizeStyleProfileId(genMeta?.styleProfile),
            chordSymbol: chordStr,
            keyPc,
            effectiveLow,
            effectiveHigh,
          });
        }

        emitGuitarPhraseBar({
          m,
          bar: phraseShapeBar,
          chord: getChordForBar(b, context),
          effectiveLow,
          effectiveHigh,
          density: densityLevel,
          useOffbeat: useOffbeat || isDuoGolden,
          reduceAttack: !!reduceAttack,
          intent: phraseIntent,
          staggerG: staggerGuitar,
          seed,
          methenyShortenLong: meth?.attackDensityReduced && tex?.guitarRole !== 'sustain_pad',
          anchorMidi,
          swingDuo: isDuoGolden,
          chordToneOpts,
          triadPairs: stackIds.includes('triad_pairs'),
          slonimskyCtx: slonimskyBarCtx,
        });
      }
    }

    if (isDuoGolden) {
      if (measures.length > 0) {
        duoAntiAdjacentDuplicateGuitarRhythm(m, measures[measures.length - 1], isDuoGolden);
        if (tb >= 32 && b >= 24 && measures.length >= 2) {
          const p2 = measures[measures.length - 2];
          if (
            p2 &&
            rhythmFingerprint(m).length > 0 &&
            rhythmFingerprint(m) === rhythmFingerprint(p2)
          ) {
            duoAntiAdjacentDuplicateGuitarRhythm(m, p2, isDuoGolden);
          }
        }
      }
      if (process.env.WYBLE_TRACE === '1') {
        console.warn(`[wyble-trace] bar=${b} isDuoGolden=true events=${m.events.length}`);
      }
      if (!skipPhraseEngineStage3Anticipation) {
        applyDuoGoldenPhraseEngineStage4MotifRhythm(m, seed, b);
      }
      normalizeMeasureToEighthBeatGrid(m);
      duoBoostPhraseEndLanding(m, b, true);
      duoEnforcePhraseEndCadence(m, b, context, effectiveLow, effectiveHigh, songModeHook);
      normalizeMeasureToEighthBeatGrid(m);
      if (isSongwriterFagen && fagenAnyColourBiases) {
        applyDonaldFagenGuitarBarPasses(m, b, context, seed, effectiveLow, effectiveHigh, {
          fagenAlteredDominantBias: fagenAlteredDominantBiasR,
          fagenRootAvoidanceMelody: fagenRootAvoidanceMelodyR,
          fagenMuChordBias: fagenMuChordBiasR,
          fagenLydianMajorBias: fagenLydianMajorBiasR,
        });
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (isSongwriterBacharach && isDuoGolden) {
        applyBacharachGuitarBarPasses(m, b, context, seed, effectiveLow, effectiveHigh, {
          bacharachDeceptiveCadenceRate: bacharachDeceptiveCadenceRateR,
          bacharachChromaticVoiceLeading: bacharachChromaticVoiceLeadingR,
          bacharachModalMixtureLevel: bacharachModalMixtureLevelR,
          bacharachCadentialAmbiguity: bacharachCadentialAmbiguityR,
        });
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (isSongwriterBrianWilson && isDuoGolden) {
        applyBrianWilsonGuitarBarPasses(m, b, seed, effectiveLow, effectiveHigh, phase);
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (isSongwriterStevieWonder && isDuoGolden) {
        applyStevieWonderGuitarBarPasses(m, b, context, seed, effectiveLow, effectiveHigh);
        normalizeMeasureToEighthBeatGrid(m);
      }
      if ((isSongwriterSonicYouth || styleSonicYouthSurface) && isDuoGolden) {
        applySonicYouthGuitarBarPasses(m, b, context);
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (!skipPhraseEngineStage3Anticipation) {
        applyDuoGoldenPhraseEngineStage3Anticipation(m, seed, b);
        normalizeMeasureToEighthBeatGrid(m);
      }
      if (guitarBarIsBusy(m)) consecutiveBusyGuitarBars++;
      else consecutiveBusyGuitarBars = 0;
    } else {
      normalizeMeasureQuarterGrid(m);
    }
    measures.push(m);
  }

  if (isSongwriterFagen && fagenAnyColourBiases && context.generationMetadata) {
    const bits: string[] = [];
    if (fagenAlteredDominantBiasR > 0) bits.push('altered dominant extensions (where dom7)');
    if (fagenRootAvoidanceMelodyR > 0) bits.push('strong-beat root diversion');
    if (fagenMuChordBiasR > 0) bits.push('major-family 9th colour on syncopated attacks');
    if (fagenLydianMajorBiasR > 0) bits.push('#11 phrase nudge when symbol implies Lydian');
    context.generationMetadata = {
      ...context.generationMetadata,
      fagenJazzPopColourPassesReceipt: `Guitar (duo): ${bits.join('; ')} — biased jazz-pop shaping, not an imitation of any artist.`,
    };
  }

  if (isSongwriterBrianWilson && context.generationMetadata) {
    finalizeBrianWilsonPetSoundsMetadata(context.generationMetadata, bwAccum);
  }

  if (isSongwriterStevieWonder && context.generationMetadata) {
    finalizeStevieWonderMetadata(context.generationMetadata, swAccum);
  }

  if (isSongwriterRadiohead && context.generationMetadata) {
    finalizeRadioheadMetadata(context.generationMetadata, rhAccum);
  }

  if (isSongwriterJamesBrown && context.generationMetadata) {
    finalizeJamesBrownMetadata(context.generationMetadata, jbAccum);
  }

  if ((isSongwriterJoniMitchell || styleJoniMitchellSurface) && context.generationMetadata) {
    finalizeJoniMitchellMetadata(context.generationMetadata, jmAccum);
  }

  if ((isSongwriterSonicYouth || styleSonicYouthSurface) && context.generationMetadata) {
    finalizeSonicYouthMetadata(context.generationMetadata, syAccum);
  }

  if ((isSongwriterPatMetheny || stylePatMethenySurface) && context.generationMetadata) {
    finalizePatMethenyMetadata(context.generationMetadata, pmAccum);
  }

  if (isSongwriterWayneShorter && context.generationMetadata) {
    finalizeWayneShorterMetadata(context.generationMetadata, wsAccum);
  }

  if (isSongwriterFrankZappa && context.generationMetadata) {
    finalizeFrankZappaMetadata(context.generationMetadata, fzAccum);
    const solo = generateZappaSolo(context, context.generationMetadata.zappaSoloOptions);
    applyZappaSoloToMetadata(context.generationMetadata, solo);
  }

  if (isSongwriterBarryHarris && context.generationMetadata) {
    finalizeBarryHarrisMetadata(context.generationMetadata, bhAccum);
  }

  if (isSongwriterBillEvans && context.generationMetadata) {
    finalizeBillEvansMetadata(context.generationMetadata, beAccum);
  }

  if (isSongwriterDebussy && context.generationMetadata) {
    finalizeDebussyMetadata(context.generationMetadata, dbAccum);
  }

  if (isSongwriterDukeEllington && context.generationMetadata) {
    finalizeDukeEllingtonMetadata(context.generationMetadata, deAccum);
  }

  if (isSongwriterMilesDavis && context.generationMetadata) {
    finalizeMilesDavisMetadata(context.generationMetadata, mdAccum);
  }

  if (isSongwriterBartok && context.generationMetadata) {
    finalizeBartokMetadata(context.generationMetadata, bkAccum);
  }

  if (isSongwriterGershwin && context.generationMetadata) {
    finalizeGershwinMetadata(context.generationMetadata, ggAccum);
  }

  if (isSongwriterArvoPart && context.generationMetadata) {
    finalizeArvoPartMetadata(context.generationMetadata, apAccum);
  }

  if (isSongwriterSatie && context.generationMetadata) {
    finalizeSatieMetadata(context.generationMetadata, satAccum);
  }

  if (isSongwriterPrince && context.generationMetadata) {
    finalizePrinceMetadata(context.generationMetadata, princeAccum);
  }

  if (isSongwriterBeatles && context.generationMetadata) {
    finalizeBeatlesMetadata(context.generationMetadata, beatlesAccum);
  }

  if (isSongwriterColePorter && context.generationMetadata) {
    finalizeColePorterMetadata(context.generationMetadata, colePorterAccum);
  }

  if (isSongwriterMariaSchneider && context.generationMetadata) {
    finalizeMariaSchneiderMetadata(context.generationMetadata, msAccum);
  }

  if (isSongwriterBacharach && context.generationMetadata) {
    finalizeBacharachMetadata(context.generationMetadata, baAccum);
  }

  if (isSongwriterFagen && context.generationMetadata) {
    finalizeDonaldFagenMetadata(context.generationMetadata, dfAccum);
  }

  if (isSongwriterEcmChamber && context.generationMetadata) {
    finalizeEcmChamberMetadata(context.generationMetadata, eccAccum);
  }

  if (isSongwriterJobim && context.generationMetadata) {
    finalizeJobimMetadata(context.generationMetadata, ajAccum);
  }

  if (isSongwriterHerbieHancock && context.generationMetadata) {
    finalizeHerbieHancockMetadata(context.generationMetadata, hhAccum);
  }

  if (isSongwriterSondheim && context.generationMetadata) {
    finalizeSondheimMetadata(context.generationMetadata, shAccum);
  }

  if (isSongwriterKateBush && context.generationMetadata) {
    finalizeKateBushMetadata(context.generationMetadata, kbAccum);
  }

  if (isSongwriterTheloniousMonk && context.generationMetadata) {
    finalizeTheloniousMonkMetadata(context.generationMetadata, tmAccum);
  }

  if (isSongwriterAndrewHill && context.generationMetadata) {
    finalizeAndrewHillMetadata(context.generationMetadata, ahAccum);
  }

  if (isSongwriterCharlieParker && context.generationMetadata) {
    finalizeCharlieParkerMetadata(context.generationMetadata, cpAccum);
  }

  return {
    id: 'guitar',
    /** MusicXML export uses piano part-list / GM 1 when **`songModePresentAsPianoComp`** (`<part-name>Piano</part-name>`, etc.). */
    name: isSongwriterFrankZappa ? 'Piano' : 'Clean Electric Guitar',
    instrumentIdentity: profile.instrumentIdentity,
    /** GM Acoustic Grand (0-based); MusicXML piano branch writes `<midi-program>1</midi-program>`. */
    midiProgram: isSongwriterFrankZappa ? 0 : profile.midiProgram,
    clef: 'treble',
    ...(isSongwriterFrankZappa ? { songModePresentAsPianoComp: true as const } : {}),
    measures,
  };
}

function firstGuitarPitchInBar(guitar: PartModel, bar: number): number | undefined {
  const m = guitar.measures.find((x) => x.index === bar);
  const ev = m?.events.find((e) => e.kind === 'note');
  return ev ? (ev as { pitch: number }).pitch : undefined;
}

function lastGuitarNoteEndInBar(m: MeasureModel | undefined): number | undefined {
  if (!m) return undefined;
  let best = -1;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as { startBeat: number; duration: number };
    best = Math.max(best, n.startBeat + n.duration);
  }
  return best < 0 ? undefined : best;
}

function tagMomentBarsOnParts(parts: PartModel[]): void {
  for (const p of parts) {
    for (const m of p.measures) {
      const ph = ((m.index - 1) % 8) + 1;
      m.momentTag = momentTagForBar(ph);
    }
  }
}

/**
 * Metheny ECM: 6–8 bar arc per cycle — rise (1→2), suspend (3–5), fall (6–8).
 * Motif bar 6: interval expansion + rhythmic augmentation + register shift vs bar 1.
 * Bar 7: suspended line; bar 8: often unresolved (no bar-contained loop).
 */
function applyEcmMethenyMotifDevelopment(
  guitar: PartModel,
  seed: number,
  totalBars: number,
  context: CompositionContext
): void {
  for (let cycle = 0; cycle < totalBars / 8; cycle++) {
    const srcBar = cycle * 8 + 1;
    const bar2 = cycle * 8 + 2;
    const bar6 = cycle * 8 + 6;
    const bar7 = cycle * 8 + 7;
    const bar8 = cycle * 8 + 8;
    const mSrc = guitar.measures.find((x) => x.index === srcBar);
    const m2 = guitar.measures.find((x) => x.index === bar2);
    const mTgt = guitar.measures.find((x) => x.index === bar6);
    const m7 = guitar.measures.find((x) => x.index === bar7);
    const m8 = guitar.measures.find((x) => x.index === bar8);
    if (!mSrc || !mTgt) continue;
    const ordered = [...mSrc.events]
      .filter((e) => e.kind === 'note')
      .sort(
        (a, b2) => (a as { startBeat: number }).startBeat - (b2 as { startBeat: number }).startBeat
      ) as { pitch: number; startBeat: number; duration: number }[];
    if (ordered.length < 2) continue;
    const src = ordered.slice(0, Math.min(4, ordered.length));
    const expand = cycle * 2 + (seed % 3);
    const intervals: number[] = [];
    for (let i = 1; i < src.length; i++) {
      const raw = src[i].pitch - src[i - 1].pitch;
      const sign = raw >= 0 ? 1 : -1;
      intervals.push(raw + sign * Math.min(expand, 4));
    }
    const regShift = 5 + cycle * 3 + (seed % 5);
    const aug = 1.15 + (cycle % 3) * 0.12;
    const rhythms = [1.0 * aug, 0.75 * aug, 1.25 * aug, 1.0 * aug];
    mTgt.events = [];
    let t = 0;
    let pitch = src[0].pitch + regShift;
    const capMethenyTgt = measureBeatSpanQuartersOf(mTgt);
    for (let i = 0; i < src.length && t < capMethenyTgt - 1e-4; i++) {
      const rawDur = Math.min(rhythms[i % rhythms.length], capMethenyTgt - t);
      const dur = qBeat(rawDur);
      if (dur <= 0) break;
      addEvent(mTgt, createNote(pitch, t, dur));
      t += dur;
      if (i < intervals.length) pitch += intervals[i];
    }
    if (t < capMethenyTgt - 1e-4) addEvent(mTgt, createRest(t, capMethenyTgt - t));
    normalizeMeasureQuarterGrid(mTgt);
    collapseRestsInsideNotes(mTgt);
    dropRestsSameStartAsNote(mTgt);

    // Rise: bar 2 slightly higher last note vs bar 1 tail
    if (m2) {
      const n2 = [...m2.events].filter((e) => e.kind === 'note') as {
        pitch: number;
        startBeat: number;
        duration: number;
      }[];
      if (n2.length > 0) {
        const last = n2.reduce((a, b) =>
          a.startBeat + a.duration >= b.startBeat + b.duration ? a : b
        );
        last.pitch = clampPitch(last.pitch + 2, 55, 79);
        normalizeMeasureQuarterGrid(m2);
      }
    }

    // Suspend: bar 7 long tone + pick-up over barline feel (late entry)
    if (m7) {
      const chord = m7.chord ?? getChordForBar(bar7, context);
      const tones = chordTonesForChordSymbolWithContext(chord, context);
      const sus = clampPitch(tones.seventh + 12, 60, 79);
      m7.events = [];
      addEvent(m7, createRest(0, 1));
      addEvent(m7, createNote(sus, 1, 3));
      normalizeMeasureQuarterGrid(m7);
      collapseRestsInsideNotes(m7);
    }

    // Fall / open: bar 8 — often unresolved colour (7th or 9th hold), not cadence loop
    if (m8 && seededUnit(seed, cycle, 920) < 0.58) {
      const chord = m8.chord ?? 'Gmaj7';
      const tones = chordTonesForChordSymbolWithContext(chord, context);
      const openTone = seededUnit(seed, cycle, 921) < 0.5 ? tones.seventh : tones.third;
      const hi = clampPitch(openTone + 12, 58, 79);
      m8.events = [];
      addEvent(m8, createNote(hi, 0, 2.5));
      addEvent(m8, createRest(2.5, 1.5));
      normalizeMeasureQuarterGrid(m8);
      collapseRestsInsideNotes(m8);
    }
  }
}

/** Schneider ECM: smoothed velocity envelope; A2 suspended — guitar slightly brighter, bass softer. */
function applyEcmSchneiderDensityEnvelope(score: ScoreModel, totalBars: number): ScoreModel {
  const third = Math.max(1, Math.floor(totalBars / 3));
  const rawVel = (bar: number): number => {
    if (bar <= third) return 40 + Math.round((bar / third) * 18);
    if (bar <= 2 * third) return 56 + Math.round(((bar - third) / third) * 24);
    const rel = totalBars - 2 * third;
    return 78 - Math.round(((bar - 2 * third) / Math.max(1, rel)) * 20);
  };
  const smoothVel = (bar: number): number => {
    const a = rawVel(bar);
    const p = bar > 1 ? rawVel(bar - 1) : a;
    const n = bar < totalBars ? rawVel(bar + 1) : a;
    return Math.round(0.28 * p + 0.44 * a + 0.28 * n);
  };
  return {
    ...score,
    parts: score.parts.map((p) => ({
      ...p,
      measures: p.measures.map((m) => ({
        ...m,
        events: m.events.map((e) => {
          if (e.kind !== 'note') return e;
          const base = smoothVel(m.index);
          const jitter = (m.index + (p.id?.length ?? 0)) % 5;
          let v = base + jitter;
          const inA2 = m.index > 2 * third;
          if (inA2 && p.instrumentIdentity === 'clean_electric_guitar') v = Math.min(127, v + 6);
          if (inA2 && p.instrumentIdentity === 'acoustic_upright_bass') v = Math.max(22, v - 10);
          return { ...e, velocity: Math.min(127, Math.max(1, v)) };
        }),
      })),
    })),
  };
}

/** Bar 4: bass supports peak — two half notes (same shape as overlap thinning; does not touch bass engine module). */
function simplifyBassAtPeakBar(
  context: CompositionContext,
  bassPart: PartModel,
  bassMap: InstrumentRegisterMap,
  bar: number,
  walkLow: number,
  bassCeiling: number
): void {
  const chord = getChordForBar(bar, context);
  const tones = chordTonesForChordSymbolWithContext(chord, context);
  const parsed = parseChordSymbol(chord);
  const root = tones.root;
  const [low, high] = getBassRegisterForBar(bassMap, bar, context);
  const effectiveHigh = Math.min(high, bassCeiling);
  const rootClamped = clampPitch(root, Math.max(walkLow, low), Math.min(effectiveHigh, high));
  const firstHalf =
    parsed.slashBassPc !== undefined
      ? pitchClassToBassMidi(parsed.slashBassPc, walkLow, effectiveHigh)
      : rootClamped;
  const fifth = clampPitch(rootClamped + 5, walkLow, effectiveHigh);
  const m = bassPart.measures.find((x) => x.index === bar);
  if (!m) return;
  const cap = measureBeatSpanQuartersOf(m);
  const half = qBeat(cap / 2);
  m.events = [];
  addEvent(m, createNote(firstHalf, 0, half));
  addEvent(m, createNote(fifth, half, qBeat(Math.max(0, cap - half))));
  normalizeMeasureToEighthBeatGrid(m);
}

/** When both parts are in high activity on a non-climax bar, thin bass to two half notes (bar math preserved). */
function resolveOverlapInDuoScore(
  context: CompositionContext,
  guitarPart: PartModel,
  bassPart: PartModel,
  bassMap: InstrumentRegisterMap,
  walkLow: number,
  bassCeiling: number
): void {
  const tb = totalBarsFromContext(context);
  const climax = new Set<number>();
  for (let b = 1; b <= tb; b++) {
    const ph = ((b - 1) % 8) + 1;
    if (ph === 4 || ph === 8) climax.add(b);
  }
  for (let b = 1; b <= tb; b++) {
    if (climax.has(b)) continue;
    if (activityScoreForBar(guitarPart, b) < HIGH_ACTIVITY || activityScoreForBar(bassPart, b) < HIGH_ACTIVITY) continue;
    const chord = getChordForBar(b, context);
    const tones = chordTonesForChordSymbolWithContext(chord, context);
    const parsed = parseChordSymbol(chord);
    const root = tones.root;
    const [low, high] = getBassRegisterForBar(bassMap, b, context);
    const effectiveHigh = Math.min(high, bassCeiling);
    const rootClamped = clampPitch(root, Math.max(walkLow, low), Math.min(effectiveHigh, high));
    const firstHalf =
      parsed.slashBassPc !== undefined
        ? pitchClassToBassMidi(parsed.slashBassPc, walkLow, effectiveHigh)
        : rootClamped;
    const fifth = clampPitch(rootClamped + 5, walkLow, effectiveHigh);
    const m = bassPart.measures.find((x) => x.index === b);
    if (!m) continue;
    const cap = measureBeatSpanQuartersOf(m);
    m.events = [];
    const pat = (context.seed + b * 17) % 3;
    if (pat === 0) {
      const h = qBeat(cap / 2);
      addEvent(m, createNote(firstHalf, 0, h));
      addEvent(m, createNote(fifth, h, qBeat(Math.max(0, cap - h))));
    } else if (pat === 1) {
      const d0 = qBeat(cap * (1.5 / 4));
      addEvent(m, createNote(firstHalf, 0, d0));
      addEvent(m, createNote(fifth, d0, qBeat(Math.max(0, cap - d0))));
    } else {
      const d0 = qBeat(cap * (2.5 / 4));
      addEvent(m, createNote(firstHalf, 0, d0));
      addEvent(m, createNote(fifth, d0, qBeat(Math.max(0, cap - d0))));
    }
    normalizeMeasureToEighthBeatGrid(m);
  }
}

function finalizeDuoBassExpressiveBar(params: {
  m: MeasureModel;
  bar: number;
  duoGoldenBass: boolean;
  rootClamped: number;
  third: number;
  fifth: number;
  seventh: number;
  walkLow: number;
  effectiveHigh: number;
  seed: number;
  evenEighthStreak: { n: number };
  slashBassPc?: number;
}): void {
  const {
    m,
    bar,
    duoGoldenBass,
    rootClamped,
    third,
    fifth,
    seventh,
    walkLow,
    effectiveHigh,
    seed,
    evenEighthStreak,
    slashBassPc,
  } = params;
  if (!duoGoldenBass) return;
  ensureBassBarHitsThirdOrSeventh(m, third, seventh, walkLow, effectiveHigh, slashBassPc);
  nudgeDuoBassPhraseEndTone(m, bar, rootClamped, third, fifth, seventh, walkLow, effectiveHigh, seed, slashBassPc);
  /** Harmonic commitment: phrase-end nudge must not erase slash bass; re-assert after nudge. */
  if (slashBassPc !== undefined) {
    const slashBassPitch = pitchClassToBassMidi(slashBassPc, walkLow, effectiveHigh);
    ensureSlashBassPitchPresentInMeasure(m, slashBassPitch, walkLow, effectiveHigh, { seed, bar });
  }
  if (measureIsDenseEvenEighthWalk(m)) evenEighthStreak.n += 1;
  else evenEighthStreak.n = 0;
}

/**
 * After orchestration / leap enforcement, re-assert slash bass pitch class in each bar (same register math as build).
 * Behavioural fix for slash warnings when later passes alter bass notes.
 */
function repairSlashBassHonourInDuoScore(
  context: CompositionContext,
  bassPart: PartModel,
  bassMap: InstrumentRegisterMap,
  walkLow: number,
  bassCeiling: number
): void {
  const seed = context.seed;
  const isDuoPreset = isGuitarBassDuoFamily(context.presetId);
  for (const m of bassPart.measures) {
    const chord = m.chord ?? getChordForBar(m.index, context);
    const parsed = parseChordSymbol(chord);
    if (parsed.slashBassPc === undefined) continue;
    const [low, high] = getBassRegisterForBar(bassMap, m.index, context);
    const phase = ((m.index - 1) % 8) + 1;
    let duoRegLow = Math.max(walkLow, low);
    let duoRegHigh = Math.min(high, bassCeiling);
    if (isDuoPreset) {
      if (phase <= 2) duoRegHigh = Math.min(duoRegHigh, walkLow + 12);
      else if (phase <= 4) duoRegHigh = Math.min(duoRegHigh + 4, 58);
      else if (phase <= 6) {
        duoRegLow = duoRegLow + 1;
        duoRegHigh = Math.min(duoRegHigh + 3, 57);
      }
    }
    const effectiveHigh = isDuoPreset ? duoRegHigh : Math.min(high, bassCeiling);
    const slashBassPitch = pitchClassToBassMidi(parsed.slashBassPc, walkLow, effectiveHigh);
    ensureSlashBassPitchPresentInMeasure(m, slashBassPitch, walkLow, effectiveHigh, { seed, bar: m.index });
  }
}

type GuitarPhraseContour = 'asc' | 'desc' | 'static';

type BassBehaviourPlanWithStyle = BassBehaviourPlan & { style?: string };

function readBassPlanStyle(plan: BassBehaviourPlan): 'melodic' | 'sparse' | undefined {
  const st = (plan as BassBehaviourPlanWithStyle).style;
  if (st === 'melodic') return 'melodic';
  if (st === 'sparse') return 'sparse';
  return undefined;
}

function collectBarMidiNotes(guitarPart: PartModel, bar: number): number[] {
  const m = guitarPart.measures.find((x) => x.index === bar);
  if (!m) return [];
  const out: number[] = [];
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    out.push((e as NoteEvent).pitch);
  }
  return out;
}

function avgPitchBars(guitarPart: PartModel, from: number, to: number): number | undefined {
  let sum = 0;
  let n = 0;
  for (let b = from; b <= to; b++) {
    for (const p of collectBarMidiNotes(guitarPart, b)) {
      sum += p;
      n++;
    }
  }
  return n === 0 ? undefined : sum / n;
}

/** Per 8-bar unit: compare mean MIDI of bars 1–4 vs 5–8 of that phrase. */
function computePhraseGuitarContours(guitarPart: PartModel, totalBars: number): GuitarPhraseContour[] {
  const nPhrases = Math.max(1, Math.ceil(totalBars / 8));
  const out: GuitarPhraseContour[] = [];
  for (let ph = 0; ph < nPhrases; ph++) {
    const phraseStart = ph * 8 + 1;
    const phraseEnd = Math.min((ph + 1) * 8, totalBars);
    const firstEnd = Math.min(phraseStart + 3, phraseEnd);
    const secondStart = phraseStart + 4;
    if (secondStart > phraseEnd) {
      out.push('static');
      continue;
    }
    const a1 = avgPitchBars(guitarPart, phraseStart, firstEnd);
    const a2 = avgPitchBars(guitarPart, secondStart, phraseEnd);
    if (a1 === undefined || a2 === undefined) {
      out.push('static');
      continue;
    }
    const d = a2 - a1;
    if (d > 1.5) out.push('asc');
    else if (d < -1.5) out.push('desc');
    else out.push('static');
  }
  return out;
}

function buildBassPart(
  context: CompositionContext,
  bassPlan: BassBehaviourPlan,
  bassMap: InstrumentRegisterMap,
  motifState: MotifTrackerState,
  guitarPart: PartModel,
  interactionPlan: InteractionPlan | undefined,
  texturePlan: EcmBarTexture[] | undefined,
  phraseGuitarContours: GuitarPhraseContour[]
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;

  const [walkLow, walkHigh] = profile.preferredWalkingZone;
  const bassCeiling = Math.min(walkHigh, 52);
  const seed = context.seed;
  const measures: MeasureModel[] = [];
  const tb = totalBarsFromContext(context);
  let prevBassPitch: number | undefined = walkLow;
  let prevBarContour = '';
  let sameContourStreak = 0;
  const phraseHistory: string[] = [];
  let phraseRetryAttempt = 0;
  let phraseRewindTotal = 0;
  /** Max bass phrase rewinds per score — bounds memory/time if fingerprint logic mis-fires (ECM uses a tighter cap than duo). */
  const phraseRewindTotalCap = context.presetId === 'ecm_chamber' ? 24 : 80;
  /** Hard ceiling on `for (b…)` body executions: forward progress through `tb` bars plus rewinds (each rewind costs extra iterations). */
  const ECM_BASS_MAX_BAR_LOOP_ITERATIONS = tb + phraseRewindTotalCap + 64;
  let ecmBassBarLoopIterations = 0;
  const completedPhraseModes: DuoPhraseBehaviourMode[] = [];
  const evenEighthStreak = { n: 0 };
  const bassPlanStyle = readBassPlanStyle(bassPlan);
  const walkCap = tb >= 16 ? 6 : 4;
  const contourHistoryForGate: string[] = [];
  const probeEcmBass = context.presetId === 'ecm_chamber' && process.env?.COMPOSER_OS_DEBUG_ECM_BASS === '1';
  const ecmLoopGuardEnabled = context.presetId === 'ecm_chamber';
  let lastAppendedBar: number | undefined;
  let sameBarAppendCount = 0;
  const registerMeasureAppend = (bar: number): void => {
    if (!ecmLoopGuardEnabled) return;
    if (lastAppendedBar === bar) sameBarAppendCount++;
    else {
      lastAppendedBar = bar;
      sameBarAppendCount = 1;
    }
    if (sameBarAppendCount > 8 && process.env?.NODE_ENV !== 'production') {
      throw new Error(
        `ECM bass loop guard: appended ${sameBarAppendCount} measures at bar ${bar} without advancing.`
      );
    }
  };
  const bassEventsSoFar = () => measures.reduce((sum, mm) => sum + mm.events.length, 0);
  const logBassProbe = (
    phase: string,
    b: number,
    extras?: Record<string, string | number | boolean | undefined>
  ): void => {
    if (!probeEcmBass || typeof process === 'undefined' || typeof process.memoryUsage !== 'function') return;
    const mu = process.memoryUsage();
    const extraFields = extras
      ? Object.entries(extras)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(' ')
      : '';
    console.log(
      `[ECM_BASS_PROBE] phase=${phase} b=${b} phraseRetryAttempt=${phraseRetryAttempt} phraseRewindTotal=${phraseRewindTotal} ` +
        `measures=${measures.length} bassEvents=${bassEventsSoFar()} phraseHistoryLen=${phraseHistory.length} completedPhraseModesLen=${completedPhraseModes.length} ` +
        `heapUsed=${mu.heapUsed} heapTotal=${mu.heapTotal} rss=${mu.rss}${extraFields ? ` ${extraFields}` : ''}`
    );
  };
  logBassProbe('enter_buildBassPart', 1, { tb });

  for (let b = 1; b <= tb; ) {
    if (ecmLoopGuardEnabled) {
      ecmBassBarLoopIterations++;
      if (ecmBassBarLoopIterations > ECM_BASS_MAX_BAR_LOOP_ITERATIONS) {
        throw new Error(
          `ECM bass bar-loop guard: exceeded ${ECM_BASS_MAX_BAR_LOOP_ITERATIONS} iterations (tb=${tb}, phraseRewindCap=${phraseRewindTotalCap}). Possible runaway rewind / stall.`
        );
      }
    }
    logBassProbe('start_bar_loop', b);
    const chord = getChordForBar(b, context);
    const tones = chordTonesForChordSymbolWithContext(chord, context);
    const parsed = parseChordSymbol(chord);
    const root = tones.root;
    const m = createMeasure(b, chord, rehearsalForBar(b, context));
    stampMeasureBeatSpanQuarters(m, context);
    const [low, high] = getBassRegisterForBar(bassMap, b, context);
    const phase = ((b - 1) % 8) + 1;
    const phraseNumber = Math.floor((b - 1) / 8) + 1;
    const phraseContourIdx = Math.min(
      Math.max(phraseNumber - 1, 0),
      Math.max(phraseGuitarContours.length - 1, 0)
    );
    const guitarPhraseContour = phraseGuitarContours[phraseContourIdx] ?? 'static';
    const isDuoPreset = isGuitarBassDuoFamily(context.presetId);
    let duoRegLow = Math.max(walkLow, low);
    let duoRegHigh = Math.min(high, bassCeiling);
    if (isDuoPreset) {
      if (phase <= 2) duoRegHigh = Math.min(duoRegHigh, walkLow + 12);
      else if (phase <= 4) duoRegHigh = Math.min(duoRegHigh + 4, 58);
      else if (phase <= 6) {
        duoRegLow = duoRegLow + 1;
        duoRegHigh = Math.min(duoRegHigh + 3, 57);
      }
    }
    const effectiveHigh = isDuoPreset ? duoRegHigh : Math.min(high, bassCeiling);
    const effectiveLow = isDuoPreset ? duoRegLow : Math.max(walkLow, low);
    const rootClamped = clampPitch(root, effectiveLow, Math.min(effectiveHigh, high));
    const slashBassPitch =
      parsed.slashBassPc !== undefined
        ? pitchClassToBassMidi(parsed.slashBassPc, walkLow, effectiveHigh)
        : undefined;
    const guide = clampPitch(pickGuideTone(tones, b, seed), walkLow, effectiveHigh);
    const fifth = clampPitch(rootClamped + 5, walkLow, effectiveHigh);
    const third = clampPitch(tones.third, walkLow, effectiveHigh);
    const seventh = clampPitch(tones.seventh, walkLow, effectiveHigh);

    const ecmMode = context.generationMetadata?.ecmMode;
    const tex = texturePlan?.find((t) => t.bar === b);
    if (context.presetId === 'ecm_chamber' && ecmMode === 'ECM_METHENY_QUARTET') {
      logBassProbe('before_bar_generation', b, { branch: 'ECM_METHENY_QUARTET' });
      const pitch = slashBassPitch !== undefined ? slashBassPitch : rootClamped;
      if (tex?.bassRole === 'inner_motion') {
        const p2 = clampPitch(pitch + (seededUnit(seed, b, 905) < 0.5 ? 2 : 5), walkLow, effectiveHigh);
        addEvent(m, createNote(pitch, 0, 2));
        addEvent(m, createNote(p2, 2, 2));
        prevBassPitch = p2;
      } else {
        addEvent(m, createNote(pitch, 0, 4));
        prevBassPitch = pitch;
      }
      normalizeMeasureQuarterGrid(m);
      logBassProbe('after_bar_generation', b, { branch: 'ECM_METHENY_QUARTET', generatedEvents: m.events.length });
      logBassProbe('before_measure_push', b, { branch: 'ECM_METHENY_QUARTET' });
      measures.push(m);
      registerMeasureAppend(b);
      logBassProbe('after_measure_push', b, { branch: 'ECM_METHENY_QUARTET' });
      b++;
      continue;
    }

    if (context.presetId === 'ecm_chamber' && ecmMode === 'ECM_SCHNEIDER_CHAMBER') {
      logBassProbe('before_bar_generation', b, { branch: 'ECM_SCHNEIDER_CHAMBER' });
      const p1 = slashBassPitch !== undefined ? slashBassPitch : rootClamped;
      const step = (seed + b) % 3 === 0 ? 1 : 2;
      const p2 = clampPitch(p1 + step, walkLow, effectiveHigh);
      if (tex?.bassRole === 'sustain_pad' && tex.guitarRole === 'lead') {
        addEvent(m, createNote(p1, 0, measureBeatSpanQuartersOf(m)));
        normalizeMeasureQuarterGrid(m);
        logBassProbe('after_bar_generation', b, { branch: 'ECM_SCHNEIDER_CHAMBER', generatedEvents: m.events.length });
        logBassProbe('before_measure_push', b, { branch: 'ECM_SCHNEIDER_CHAMBER' });
        measures.push(m);
        registerMeasureAppend(b);
        logBassProbe('after_measure_push', b, { branch: 'ECM_SCHNEIDER_CHAMBER' });
        prevBassPitch = p1;
        b++;
        continue;
      }
      if (tex?.guitarRole === 'sustain_pad' && tex.bassRole === 'inner_motion') {
        const p2a = clampPitch(p1 + 1, walkLow, effectiveHigh);
        addEvent(m, createNote(p1, 0, 2));
        addEvent(m, createNote(p2a, 2, 2));
        normalizeMeasureQuarterGrid(m);
        logBassProbe('after_bar_generation', b, { branch: 'ECM_SCHNEIDER_CHAMBER', generatedEvents: m.events.length });
        logBassProbe('before_measure_push', b, { branch: 'ECM_SCHNEIDER_CHAMBER' });
        measures.push(m);
        registerMeasureAppend(b);
        logBassProbe('after_measure_push', b, { branch: 'ECM_SCHNEIDER_CHAMBER' });
        prevBassPitch = p2a;
        b++;
        continue;
      }
      const split = b % 2 === 0 ? 2 : 2.25;
      const capSchneider = measureBeatSpanQuartersOf(m);
      addEvent(m, createNote(p1, 0, split));
      addEvent(m, createNote(p2, split, capSchneider - split));
      normalizeMeasureQuarterGrid(m);
      logBassProbe('after_bar_generation', b, { branch: 'ECM_SCHNEIDER_CHAMBER', generatedEvents: m.events.length });
      logBassProbe('before_measure_push', b, { branch: 'ECM_SCHNEIDER_CHAMBER' });
      measures.push(m);
      registerMeasureAppend(b);
      logBassProbe('after_measure_push', b, { branch: 'ECM_SCHNEIDER_CHAMBER' });
      prevBassPitch = p2;
      b++;
      continue;
    }

    const phraseBar = context.presetId === 'ecm_chamber' ? phase : b;
    const duoGoldenBass = isGuitarBassDuoFamily(context.presetId);
    const pairIdx = Math.floor((b - 1) / 2);
    const duoPhraseMode: DuoPhraseBehaviourMode | undefined = duoGoldenBass
      ? duoPhraseModeForPairIndex(seed, pairIdx, completedPhraseModes)
      : undefined;
    const s = duoGoldenBass ? seed + phraseRetryAttempt * 18457 + b * 31 : seed;
    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const simplify = interaction?.coupling?.bassSimplify;
    const phraseIntent = duoGoldenBass
      ? duoGoldenPathPhraseIntentAtBar(seed, b)
      : getDuoPhraseIntent(phraseBar, seed);
    const stagger = computeEnsembleStagger(duoGoldenBass ? phase : phraseBar, duoGoldenBass ? s : seed, phraseIntent);
    const placements = getPlacementsForBar(motifState.placements, b);
    let firstStart = stagger.bass;
    if (
      interaction?.coupling?.bassDeferToGuitar &&
      !simplify &&
      (phraseIntent === 'guitar_lead' ||
        phraseIntent === 'development' ||
        phraseIntent === 'return')
    ) {
      firstStart = Math.max(firstStart, qBeat(0.5 + seededUnit(s, b, 188) * 0.35));
    }
    firstStart = qBeat(firstStart + (seededUnit(s, b, 701) - 0.5) * 0.14);

    if (duoGoldenBass && phraseIntent === 'answer_bass') {
      firstStart = qBeat(Math.max(firstStart, 1 + seededUnit(s, b, 704) * 0.85));
    }
    if (duoGoldenBass && (phraseIntent === 'answer_guitar' || phraseIntent === 'contrast')) {
      firstStart = qBeat(Math.min(firstStart, 0.75 + seededUnit(s, b, 705) * 0.35));
    }

    /** V3.3 — guitar-answer bar: bass enters slightly later (less mechanical lockstep). */
    if (duoGoldenBass && phase === 6) {
      firstStart = qBeat(firstStart + 0.12 + seededUnit(s, b, 733) * 0.12);
    }

    if (b > 1) {
      const gPrev = guitarPart.measures.find((x) => x.index === b - 1);
      const gEnd = lastGuitarNoteEndInBar(gPrev);
      if (gEnd !== undefined && gEnd >= 2.5) {
        firstStart = Math.min(firstStart, qBeat(0.25 + seededUnit(s, b, 702) * 0.75));
      }
    }

    if (duoGoldenBass) {
      firstStart = snapAttackBeatToGrid(firstStart);
    }

    if (duoGoldenBass && b >= 3) {
      const m1 = measures[measures.length - 1];
      const m2 = measures[measures.length - 2];
      if (m1 && m2 && rhythmFingerprint(m1) === rhythmFingerprint(m2)) {
        firstStart = snapAttackBeatToGrid(firstStart + 0.25 + seededUnit(s, b, 776) * 0.25);
        if (
          isLateClosingSlice(b, tb) &&
          consecutiveChordStreakEndingAtBar(context, b) >= 2
        ) {
          firstStart = snapAttackBeatToGrid(firstStart + 0.2 + seededUnit(s, b, 777) * 0.35);
        }
      }
    }
    if (duoGoldenBass && b >= 4 && isLateClosingSlice(b, tb)) {
      const m1 = measures[measures.length - 1];
      const m2 = measures[measures.length - 2];
      const m3 = measures[measures.length - 3];
      if (
        m1 &&
        m2 &&
        m3 &&
        rhythmFingerprint(m1) === rhythmFingerprint(m2) &&
        rhythmFingerprint(m2) === rhythmFingerprint(m3) &&
        rhythmFingerprint(m1).length > 0
      ) {
        firstStart = snapAttackBeatToGrid(firstStart + 0.35 + seededUnit(s, b, 778) * 0.35);
      }
    }

    const gAct = activityScoreForBar(guitarPart, b);
    const guitarActivityHot = gAct >= HIGH_ACTIVITY;

    let guitarEchoSource = firstGuitarPitchInBar(guitarPart, b);
    if (placements.length > 0 && placements[0].notes.length > 0 && !simplify) {
      guitarEchoSource = clampPitch(placements[0].notes[0].pitch - 12, walkLow, effectiveHigh);
    }

    let section: BassSectionRole = 'A';
    if (duoGoldenBass) {
      if (phase === 8) section = 'cadence';
      else if (phase >= 5 && phase <= 6) section = 'A_prime';
      else if (phase >= 3 && phase <= 4) section = 'B';
    } else {
      if (phraseBar === 8) section = 'cadence';
      else if (phraseBar >= 5) section = 'B';
    }

    let forceBassSupportSparse = duoGoldenBass && (phase === 1 || phase === 2);
    const guitarSparse = duoGoldenBass && gAct < HIGH_ACTIVITY * 0.55;
    if (duoGoldenBass && guitarSparse && !simplify) {
      forceBassSupportSparse = false;
    }
    const thinForOverlap = duoGoldenBass && guitarActivityHot && (phase < 5 || phase > 6);
    let simplifyForDuo = simplify || thinForOverlap || forceBassSupportSparse;
    if (duoGoldenBass && guitarActivityHot) {
      simplifyForDuo = true;
    }
    if (
      duoGoldenBass &&
      isLateClosingSlice(b, tb) &&
      consecutiveChordStreakEndingAtBar(context, b) >= 3 &&
      !guitarActivityHot
    ) {
      simplifyForDuo = false;
    }

    if (duoGoldenBass && bassPlanStyle === 'melodic' && !simplify) {
      simplifyForDuo = false;
    }
    if (duoGoldenBass && bassPlanStyle === 'sparse') {
      simplifyForDuo = true;
    }

    if (duoGoldenBass && !simplifyForDuo) {
      const gm = guitarPart.measures.find((x) => x.index === b);
      const gNotes = gm?.events.filter((e) => e.kind === 'note') as { startBeat: number }[] | undefined;
      let gMin = 99;
      if (gNotes && gNotes.length > 0) {
        for (const n of gNotes) gMin = Math.min(gMin, n.startBeat);
      }
      if (gMin < 0.25 && firstStart < 0.25) {
        firstStart = snapAttackBeatToGrid(firstStart + 0.25 + seededUnit(s, b, 788) * 0.25);
      }
    }

    if (duoGoldenBass && phase === 7) {
      logBassProbe('before_bar_generation', b, { branch: 'phase7_identity' });
      const supportMode = seededUnit(s, b, 807) < 0.52;
      emitDuoBassIdentityBar7({
        m,
        supportMode,
        rootClamped,
        third,
        fifth,
        guide,
        walkLow,
        effectiveHigh,
        firstStart,
        seed: s,
        bar: b,
        slashBassPitch,
      });
      ensureSlashBassPitchPresentInMeasure(m, slashBassPitch, walkLow, effectiveHigh, { seed: s, bar: b });
      scrubBassFirstAttackIfRoot(m, b, s, rootClamped, third, guide, fifth, walkLow, effectiveHigh, {
        slashBassPitch,
      });
      normalizeMeasureToEighthBeatGrid(m);
      {
        const chordTonePool = [rootClamped, third, fifth, seventh, guide];
        if (slashBassPitch !== undefined) chordTonePool.push(slashBassPitch);
        applyBassContourFingerprintOveruseBreak(
          m,
          contourHistoryForGate,
          s,
          b,
          walkLow,
          effectiveHigh,
          chordTonePool
        );
        applyBassRhythmTripleFingerprintBreak(m, measures, {
          rootClamped,
          third,
          fifth,
          guide,
          walkLow,
          effectiveHigh,
        });
        applyBassWalkLikeCapReplace(m, measures, walkCap, rootClamped, fifth, walkLow, effectiveHigh);
      }
      finalizeDuoBassExpressiveBar({
        m,
        bar: b,
        duoGoldenBass,
        rootClamped,
        third,
        fifth,
        seventh,
        walkLow,
        effectiveHigh,
        seed: s,
        evenEighthStreak,
        slashBassPc: parsed.slashBassPc,
      });
      lateClosingBassRhythmBreakVsPrevBar(m, measures, b, tb, context);
      {
        const cfp = contourFingerprint(m);
        if (cfp.length) contourHistoryForGate.push(cfp);
      }
      const lastBass7 = [...m.events].reverse().find((e) => e.kind === 'note') as { pitch: number } | undefined;
      if (lastBass7) prevBassPitch = lastBass7.pitch;
      logBassProbe('after_bar_generation', b, { branch: 'phase7_identity', generatedEvents: m.events.length });
      logBassProbe('before_measure_push', b, { branch: 'phase7_identity' });
      measures.push(m);
      logBassProbe('after_measure_push', b, { branch: 'phase7_identity' });
      if (b >= 2) {
        const key = phraseTwoBarFingerprint(measures[measures.length - 2], measures[measures.length - 1]);
        if (
          phraseHistory.slice(-3).includes(key) &&
          phraseRetryAttempt < 3 &&
          phraseRewindTotal < phraseRewindTotalCap
        ) {
          logBassProbe('before_phrase_rewind', b, { key });
          const removed = measures.slice(-2);
          const removedEvents = removed.reduce((sum, mm) => sum + mm.events.length, 0);
          measures.splice(-2);
          phraseRetryAttempt++;
          phraseRewindTotal++;
          console.log(
            `[ECM_BASS_PROBE] phase=rewind_event b=${b} removedMeasures=${removed.length} removedEvents=${removedEvents} ` +
              `phraseHistoryLen=${phraseHistory.length} completedPhraseModesLen=${completedPhraseModes.length}`
          );
          b -= 1;
          const last = measures[measures.length - 1];
          if (last) {
            const lastN = [...last.events].reverse().find((e) => e.kind === 'note') as { pitch: number } | undefined;
            prevBassPitch = lastN?.pitch ?? walkLow;
            prevBarContour = contourFingerprint(last);
          } else {
            prevBassPitch = walkLow;
            prevBarContour = '';
          }
          sameContourStreak = 0;
          if (duoGoldenBass && b % 2 === 0 && completedPhraseModes.length > 0) completedPhraseModes.pop();
          logBassProbe('after_phrase_rewind', b, { key });
          continue;
        }
        phraseRetryAttempt = 0;
        phraseHistory.push(key);
        if (phraseHistory.length > 3) phraseHistory.shift();
        if (duoGoldenBass && b % 2 === 0 && duoPhraseMode !== undefined) {
          completedPhraseModes.push(duoPhraseMode);
          if (completedPhraseModes.length > 3) completedPhraseModes.shift();
        }
      }
      b++;
      continue;
    }

    if (duoGoldenBass && (phase === 3 || phase === 4)) {
      logBassProbe('before_bar_generation', b, { branch: 'phase34_authority' });
      emitDuoBassAuthorityMomentBar({
        m,
        rootClamped,
        third,
        fifth,
        seventh,
        guide,
        walkLow,
        effectiveHigh,
        firstStart,
        seed: s,
        bar: b,
        slashBassPitch,
      });
      ensureSlashBassPitchPresentInMeasure(m, slashBassPitch, walkLow, effectiveHigh, { seed: s, bar: b });
      scrubBassFirstAttackIfRoot(m, b, s, rootClamped, third, guide, fifth, walkLow, effectiveHigh, {
        slashBassPitch,
      });
      normalizeMeasureToEighthBeatGrid(m);
      {
        const chordTonePool = [rootClamped, third, fifth, seventh, guide];
        if (slashBassPitch !== undefined) chordTonePool.push(slashBassPitch);
        applyBassContourFingerprintOveruseBreak(
          m,
          contourHistoryForGate,
          s,
          b,
          walkLow,
          effectiveHigh,
          chordTonePool
        );
        applyBassRhythmTripleFingerprintBreak(m, measures, {
          rootClamped,
          third,
          fifth,
          guide,
          walkLow,
          effectiveHigh,
        });
        applyBassWalkLikeCapReplace(m, measures, walkCap, rootClamped, fifth, walkLow, effectiveHigh);
      }
      finalizeDuoBassExpressiveBar({
        m,
        bar: b,
        duoGoldenBass,
        rootClamped,
        third,
        fifth,
        seventh,
        walkLow,
        effectiveHigh,
        seed: s,
        evenEighthStreak,
        slashBassPc: parsed.slashBassPc,
      });
      lateClosingBassRhythmBreakVsPrevBar(m, measures, b, tb, context);
      {
        const cfp = contourFingerprint(m);
        if (cfp.length) contourHistoryForGate.push(cfp);
      }
      const lastBassA = [...m.events].reverse().find((e) => e.kind === 'note') as { pitch: number } | undefined;
      if (lastBassA) prevBassPitch = lastBassA.pitch;
      logBassProbe('after_bar_generation', b, { branch: 'phase34_authority', generatedEvents: m.events.length });
      logBassProbe('before_measure_push', b, { branch: 'phase34_authority' });
      measures.push(m);
      logBassProbe('after_measure_push', b, { branch: 'phase34_authority' });
      if (b >= 2) {
        const key = phraseTwoBarFingerprint(measures[measures.length - 2], measures[measures.length - 1]);
        if (
          phraseHistory.slice(-3).includes(key) &&
          phraseRetryAttempt < 3 &&
          phraseRewindTotal < phraseRewindTotalCap
        ) {
          logBassProbe('before_phrase_rewind', b, { key });
          const removed = measures.slice(-2);
          const removedEvents = removed.reduce((sum, mm) => sum + mm.events.length, 0);
          measures.splice(-2);
          phraseRetryAttempt++;
          phraseRewindTotal++;
          console.log(
            `[ECM_BASS_PROBE] phase=rewind_event b=${b} removedMeasures=${removed.length} removedEvents=${removedEvents} ` +
              `phraseHistoryLen=${phraseHistory.length} completedPhraseModesLen=${completedPhraseModes.length}`
          );
          b -= 1;
          const last = measures[measures.length - 1];
          if (last) {
            const lastN = [...last.events].reverse().find((e) => e.kind === 'note') as { pitch: number } | undefined;
            prevBassPitch = lastN?.pitch ?? walkLow;
            prevBarContour = contourFingerprint(last);
          } else {
            prevBassPitch = walkLow;
            prevBarContour = '';
          }
          sameContourStreak = 0;
          if (duoGoldenBass && b % 2 === 0 && completedPhraseModes.length > 0) completedPhraseModes.pop();
          logBassProbe('after_phrase_rewind', b, { key });
          continue;
        }
        phraseRetryAttempt = 0;
        phraseHistory.push(key);
        if (phraseHistory.length > 3) phraseHistory.shift();
        if (duoGoldenBass && b % 2 === 0 && duoPhraseMode !== undefined) {
          completedPhraseModes.push(duoPhraseMode);
          if (completedPhraseModes.length > 3) completedPhraseModes.shift();
        }
      }
      b++;
      continue;
    }
    let swingBassMode = (s + b * 11) % 10 < 2;
    logBassProbe('before_bar_generation', b, { branch: 'default' });
    if (duoGoldenBass && phraseRetryAttempt > 0) {
      swingBassMode = phraseRetryAttempt % 2 === 1 ? true : (s + b * 11 + phraseRetryAttempt * 7) % 10 < 4;
    }
    const swingModes = ['offbeat', 'anticipate', 'hold'] as const;

    if (simplifyForDuo) {
      let t0 = firstStart;
      if (duoGoldenBass && (phase === 1 || phase === 2)) {
        t0 = qBeat(Math.max(t0, phase === 2 ? 0.35 : 0.2));
      }
      if (duoGoldenBass) t0 = snapAttackBeatToGrid(t0);
      if (t0 > 0) {
        addEvent(m, createRest(0, t0));
      }
      const span = measureBeatSpanQuartersOf(m) - t0;
      const firstNote =
        slashBassPitch === undefined
          ? rootClamped
          : seededUnit(s, b, 8810) < 0.5
            ? slashBassPitch
            : seededUnit(s, b, 8811) < 0.52
              ? rootClamped
              : approachFromBelow(clampPitch(slashBassPitch, walkLow, effectiveHigh), walkLow, effectiveHigh);
      const pickMod = (b + s) % 5;
      const secondPitchPick =
        duoGoldenBass && (pickMod === 0 || pickMod === 2)
          ? third
          : duoGoldenBass && pickMod === 1
            ? guide
            : duoGoldenBass && pickMod === 3
              ? fifth
              : duoGoldenBass
                ? seventh
                : (b + s) % 3 === 0
                  ? fifth
                  : (b + s) % 3 === 1
                    ? third
                    : guide;
      if (duoGoldenBass && span > 0 && duoPhraseMode !== undefined) {
        let effectiveMode: DuoPhraseBehaviourMode = duoPhraseMode;
        if (evenEighthStreak.n >= 2 && (duoPhraseMode === 'stepwise' || duoPhraseMode === 'pedal')) {
          effectiveMode = 'rhythmic';
        }
        if (phraseRetryAttempt > 0 && phraseRetryAttempt % 2 === 0) {
          effectiveMode = phraseRetryAttempt % 4 === 0 ? 'leap' : 'rhythmic';
        }
        emitDuoPhraseModeBar({
          m,
          mode: effectiveMode,
          t0,
          span,
          seed: s,
          bar: b,
          walkLow,
          effectiveHigh,
          rootClamped,
          third,
          fifth,
          seventh,
          guide,
          slashBassPitch,
          phraseRetryAttempt,
        });
      } else if (span > 0) {
        const strideKey = s + b * 17;
        let useQuarterStride = phase >= 5 ? strideKey % 3 === 0 : strideKey % 3 !== 0;
        if (phraseRetryAttempt > 0) {
          useQuarterStride = !useQuarterStride;
        }
        if (bassPlanStyle === 'sparse') {
          useQuarterStride = false;
        }
        if (useQuarterStride) {
          const gmEcho = guitarPart.measures.find((x) => x.index === b);
          const gPitches =
            gmEcho?.events.filter((e) => e.kind === 'note').map((e) => (e as { pitch: number }).pitch) ?? [];
          const pool: number[] = [];
          if (slashBassPitch !== undefined) {
            pool.push(clampPitch(slashBassPitch, walkLow, effectiveHigh));
          }
          for (const gp of gPitches.slice(0, 2)) {
            pool.push(echoGuitarToBass(gp, walkLow, effectiveHigh));
          }
          pool.push(
            firstNote,
            clampPitch(secondPitchPick, walkLow, effectiveHigh),
            clampPitch(third, walkLow, effectiveHigh),
            clampPitch(fifth, walkLow, effectiveHigh),
            clampPitch(guide, walkLow, effectiveHigh)
          );
          const guitarPitchClassesInBar = new Set(
            gPitches.map((gp) => (((gp % 12) + 12) % 12) as number)
          );
          emitDuoBassQuarterStrideBar({
            m,
            t0,
            span,
            seed: s,
            bar: b,
            walkLow,
            effectiveHigh,
            pitches: pool,
            guitarPitchClassesInBar,
          });
        } else {
          const frac = 0.5;
          let half = Math.round(span * frac * 4) / 4;
          half = qBeat(Math.min(Math.max(half, 0.5), span - 0.5));
          const half2 = qBeat(span - half);
          addEvent(m, createNote(firstNote, t0, half));
          addEvent(m, createNote(clampPitch(secondPitchPick, walkLow, effectiveHigh), t0 + half, half2));
        }
      } else {
        const frac = 0.5;
        let half = Math.round(span * frac * 4) / 4;
        half = qBeat(Math.min(Math.max(half, 0.5), span - 0.5));
        const half2 = qBeat(span - half);
        addEvent(m, createNote(firstNote, t0, half));
        addEvent(m, createNote(clampPitch(secondPitchPick, walkLow, effectiveHigh), t0 + half, half2));
      }
    } else if (duoGoldenBass && swingBassMode) {
      emitDuoSwingBassBar({
        m,
        mode: swingModes[(s + b * 3 + phraseRetryAttempt * 2) % 3],
        rootClamped,
        third,
        fifth,
        guide,
        walkLow,
        effectiveHigh,
        firstStart,
        seed: s,
        bar: b,
        slashBassPitch,
      });
    } else {
      emitMelodicBassBar({
        m,
        bar: b,
        seed: s,
        rootClamped,
        third,
        fifth,
        seventh,
        guide,
        walkLow,
        effectiveHigh,
        firstStart,
        section,
        guitarFirstPitchInBar: guitarEchoSource,
        prevBassPitch,
        guitarActivityHot,
        slashBassPitch,
        duoSteadyWalking: false,
        motionHint:
          duoGoldenBass && isLateClosingSlice(b, tb) && consecutiveChordStreakEndingAtBar(context, b) >= 2
            ? 'leap'
            : duoGoldenBass && (phase === 1 || phase === 2)
              ? 'step'
              : duoGoldenBass && (phase === 5 || phase === 6)
                ? 'leap'
                : duoGoldenBass && duoPhraseMode === 'stepwise'
                  ? 'step'
                  : duoGoldenBass && duoPhraseMode === 'leap'
                    ? 'leap'
                    : duoGoldenBass && duoPhraseMode === 'rhythmic'
                      ? 'mixed'
                      : duoGoldenBass
                        ? 'mixed'
                        : undefined,
        densityHint:
          duoGoldenBass && isLateClosingSlice(b, tb) && consecutiveChordStreakEndingAtBar(context, b) >= 2
            ? 'dense'
            : duoGoldenBass && (phase === 1 || phase === 2)
              ? 'sparse'
              : duoGoldenBass && (phase === 5 || phase === 6)
                ? 'dense'
                : duoGoldenBass && duoPhraseMode === 'pedal'
                  ? 'sparse'
                  : duoGoldenBass && duoPhraseMode === 'stepwise'
                    ? 'sparse'
                    : duoGoldenBass && duoPhraseMode === 'rhythmic'
                      ? 'dense'
                      : 'normal',
        phraseRhythmVariant: phraseRetryAttempt % 3,
        phraseBehaviourMode: duoGoldenBass ? duoPhraseMode : undefined,
        bassPhraseRetryAttempt: phraseRetryAttempt,
        guideToneBias:
          duoGoldenBass && isLateClosingSlice(b, tb) && consecutiveChordStreakEndingAtBar(context, b) >= 3
            ? 1.28
            : duoGoldenBass && isLateClosingSlice(b, tb) && consecutiveChordStreakEndingAtBar(context, b) >= 2
              ? 1.2
              : phraseBar <= 4
                ? 1.06
                : 1.12,
        guitarPhraseContour,
      });
    }

    if (duoGoldenBass) {
      ensureSlashBassPitchPresentInMeasure(m, slashBassPitch, walkLow, effectiveHigh, { seed: s, bar: b });
      scrubBassFirstAttackIfRoot(m, b, s, rootClamped, third, guide, fifth, walkLow, effectiveHigh, {
        slashBassPitch,
      });
      normalizeMeasureToEighthBeatGrid(m);
    } else {
      normalizeMeasureQuarterGrid(m);
    }

    if (duoGoldenBass) {
      const fp = contourFingerprint(m);
      if (fp.length > 0) {
        if (fp === prevBarContour) {
          sameContourStreak++;
        } else {
          sameContourStreak = 1;
        }
        const contourBreakThreshold = isLateClosingSlice(b, tb) ? 2 : 3;
        let attempts = 0;
        logBassProbe('before_contour_retry_loop', b, { contourBreakThreshold, sameContourStreak, attempts });
        while (sameContourStreak >= contourBreakThreshold && attempts < 2) {
          const pool = [rootClamped, third, fifth, seventh, guide].filter((p) => typeof p === 'number');
          if (slashBassPitch !== undefined) pool.push(slashBassPitch);
          breakMeasureContourLocally(m, s + attempts * 10007, b, {
            walkLow,
            high: effectiveHigh,
            chordTonePool: pool,
          });
          const fp2 = contourFingerprint(m);
          if (fp2 !== prevBarContour) {
            sameContourStreak = 1;
            break;
          }
          attempts++;
        }
        logBassProbe('after_contour_retry_loop', b, { contourBreakThreshold, sameContourStreak, attempts });
        prevBarContour = contourFingerprint(m);
      }
    }

    if (duoGoldenBass) {
      const chordTonePool = [rootClamped, third, fifth, seventh, guide];
      if (slashBassPitch !== undefined) chordTonePool.push(slashBassPitch);
      applyBassContourFingerprintOveruseBreak(
        m,
        contourHistoryForGate,
        s,
        b,
        walkLow,
        effectiveHigh,
        chordTonePool
      );
      applyBassRhythmTripleFingerprintBreak(m, measures, {
        rootClamped,
        third,
        fifth,
        guide,
        walkLow,
        effectiveHigh,
      });
      applyBassWalkLikeCapReplace(m, measures, walkCap, rootClamped, fifth, walkLow, effectiveHigh);
    }

    finalizeDuoBassExpressiveBar({
      m,
      bar: b,
      duoGoldenBass,
      rootClamped,
      third,
      fifth,
      seventh,
      walkLow,
      effectiveHigh,
      seed: s,
      evenEighthStreak,
      slashBassPc: parsed.slashBassPc,
    });

    lateClosingBassRhythmBreakVsPrevBar(m, measures, b, tb, context);

    if (duoGoldenBass) {
      const cfp = contourFingerprint(m);
      if (cfp.length) contourHistoryForGate.push(cfp);
    }

    const lastBass = [...m.events].reverse().find((e) => e.kind === 'note') as { pitch: number } | undefined;
    if (lastBass) prevBassPitch = lastBass.pitch;
    logBassProbe('after_bar_generation', b, { branch: 'default', generatedEvents: m.events.length });

    logBassProbe('before_measure_push', b, { branch: 'default' });
    measures.push(m);
    logBassProbe('after_measure_push', b, { branch: 'default' });
    if (duoGoldenBass && b >= 2) {
      const key = phraseTwoBarFingerprint(measures[measures.length - 2], measures[measures.length - 1]);
      if (
        phraseHistory.slice(-3).includes(key) &&
        phraseRetryAttempt < 3 &&
        phraseRewindTotal < phraseRewindTotalCap
      ) {
        logBassProbe('before_phrase_rewind', b, { key });
        const removed = measures.slice(-2);
        const removedEvents = removed.reduce((sum, mm) => sum + mm.events.length, 0);
        measures.splice(-2);
        phraseRetryAttempt++;
        phraseRewindTotal++;
        console.log(
          `[ECM_BASS_PROBE] phase=rewind_event b=${b} removedMeasures=${removed.length} removedEvents=${removedEvents} ` +
            `phraseHistoryLen=${phraseHistory.length} completedPhraseModesLen=${completedPhraseModes.length}`
        );
        b -= 1;
        const last = measures[measures.length - 1];
        if (last) {
          const lastN = [...last.events].reverse().find((e) => e.kind === 'note') as { pitch: number } | undefined;
          prevBassPitch = lastN?.pitch ?? walkLow;
          prevBarContour = contourFingerprint(last);
        } else {
          prevBassPitch = walkLow;
          prevBarContour = '';
        }
        sameContourStreak = 0;
        if (duoGoldenBass && b % 2 === 0 && completedPhraseModes.length > 0) completedPhraseModes.pop();
        logBassProbe('after_phrase_rewind', b, { key });
        continue;
      }
      phraseRetryAttempt = 0;
      phraseHistory.push(key);
      if (phraseHistory.length > 3) phraseHistory.shift();
      if (duoGoldenBass && b % 2 === 0 && duoPhraseMode !== undefined) {
        completedPhraseModes.push(duoPhraseMode);
        if (completedPhraseModes.length > 3) completedPhraseModes.shift();
      }
    }
    b++;
  }

  repairBassMotifEchoBars1to8(measures, guitarPart, context, bassMap);
  logBassProbe('before_return_bass', tb, { totalMeasures: measures.length, totalEvents: bassEventsSoFar() });

  if (context.generationMetadata?.songwriterStyleId === 'frank_zappa') {
    let anyViol = false;
    for (const mm of measures) {
      const barIdx = mm.index;
      const ch = getChordForBar(barIdx, context);
      const nextCh = barIdx < tb ? getChordForBar(barIdx + 1, context) : undefined;
      const r = enforceFrankZappaBassBeatCommitment({
        m: mm,
        chord: ch,
        nextChord: nextCh,
        walkLow,
        walkHigh: bassCeiling,
      });
      if (r.violated) anyViol = true;
    }
    if (anyViol && context.generationMetadata) {
      context.generationMetadata.frankZappaBassBeatCommitmentViolated = true;
    }
  }

  return {
    id: 'bass',
    name: GUITAR_BASS_DUO_BASS_PART_NAME,
    instrumentIdentity: profile.instrumentIdentity,
    midiProgram: profile.midiProgram,
    clef: 'bass',
    measures,
  };
}

/**
 * A″ / closing bars: under repeated harmony, lift phrase endings toward a rise → peak → resolution arc.
 * Pitch-only; chord symbols unchanged (locked harmony stays authoritative).
 */
function applyLateClosingGuitarContourNudge(guitar: PartModel, context: CompositionContext): void {
  const tb = totalBarsFromContext(context);
  if (!isLateClosingSlice(24, tb)) return;
  const seed = context.seed;
  const low = 55;
  const high = 79;
  for (let bar = 24; bar <= tb; bar++) {
    if (consecutiveChordStreakEndingAtBar(context, bar) < 2) continue;
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    const chord = getChordForBar(bar, context);
    const tones = guitarChordTonesInRange(chord, low, high);
    const pool = [tones.root, tones.third, tones.fifth, tones.seventh];
    let bestI = -1;
    let bestEnd = -1;
    for (let i = 0; i < m.events.length; i++) {
      const e = m.events[i];
      if (e.kind !== 'note') continue;
      const n = e as { pitch: number; startBeat: number; duration: number };
      const end = n.startBeat + n.duration;
      if (end >= bestEnd) {
        bestEnd = end;
        bestI = i;
      }
    }
    if (bestI < 0) continue;
    const cur = (m.events[bestI] as { pitch: number }).pitch;
    const pcEq = (a: number, b: number) => ((a % 12) + 12) % 12 === ((b % 12) + 12) % 12;
    const inPool = (p: number) => pool.some((t) => pcEq(t, p));
    const up1 = cur + 1;
    const up2 = cur + 2;
    if (bar <= 28) {
      const pick = seededUnit(seed, bar, 924) < 0.52 ? up1 : up2;
      if (inPool(pick)) (m.events[bestI] as { pitch: number }).pitch = pick;
      else if (inPool(up1)) (m.events[bestI] as { pitch: number }).pitch = up1;
    } else if (bar <= 30) {
      const pick = seededUnit(seed, bar, 926) < 0.48 ? up2 : up1;
      if (inPool(pick)) (m.events[bestI] as { pitch: number }).pitch = pick;
      else if (inPool(up1)) (m.events[bestI] as { pitch: number }).pitch = up1;
    } else {
      const third = tones.third;
      if (cur > third + 5 && seededUnit(seed, bar, 925) < 0.62) {
        (m.events[bestI] as { pitch: number }).pitch = liftToneToRange(third, low, high);
      }
    }
  }
}

/** If phrase-ending pitch classes are too uniform, retarget bar 5 last note (phrase authority gate). */
function nudgeDuoGuitarPhraseEndsForVariety(guitar: PartModel, context: CompositionContext): void {
  const tb = totalBarsFromContext(context);
  const lastPcs: number[] = [];
  for (let bar = 1; bar <= tb; bar++) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    let best: { pitch: number; startBeat: number; duration: number } | undefined;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as { pitch: number; startBeat: number; duration: number };
      if (!best || n.startBeat + n.duration >= best.startBeat + best.duration) best = n;
    }
    if (best) lastPcs.push(best.pitch % 12);
  }
  if (new Set(lastPcs).size >= 3) return;
  const chord = getChordForBar(5, context);
  const tones = chordTonesForChordSymbolWithContext(chord, context);
  const low = 55;
  const high = 79;
  const candidates = [
    liftToneToRange(tones.third, low, high),
    liftToneToRange(tones.seventh, low, high),
    liftToneToRange(tones.fifth, low, high),
  ];
  const used = new Set(lastPcs);
  const alt = candidates.find((c) => !used.has(c % 12)) ?? liftToneToRange(tones.seventh, low, high);
  const m5 = guitar.measures.find((x) => x.index === 5);
  if (!m5) return;
  let bestI = -1;
  let bestEnd = -1;
  for (let i = 0; i < m5.events.length; i++) {
    const e = m5.events[i];
    if (e.kind !== 'note') continue;
    const n = e as { pitch: number; startBeat: number; duration: number };
    const end = n.startBeat + n.duration;
    if (end >= bestEnd) {
      bestEnd = end;
      bestI = i;
    }
  }
  if (bestI >= 0) (m5.events[bestI] as { pitch: number }).pitch = alt;
}

function applySongModeLeadSheetAnchorStart(guitar: PartModel, context: CompositionContext): boolean {
  if (!isGuitarBassDuoFamily(context.presetId)) return false;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return false;
  const songwriterId = context.generationMetadata?.songwriterStyleId;
  if (songwriterId !== 'donald_fagen' && songwriterId !== 'barry_harris') return false;
  const anchors = context.generationMetadata?.songModeLeadSheetMelodyAnchors as
    | SongModeLeadSheetMelodyAnchor[]
    | undefined;
  if (!anchors || anchors.length === 0) return false;
  const firstAnchor = [...anchors].sort((a, b) => a.bar - b.bar)[0];
  if (!firstAnchor) return false;
  const measure = guitar.measures.find((m) => m.index === Math.max(1, firstAnchor.bar));
  if (!measure) return false;
  const firstNote = measure.events.find((e) => e.kind === 'note') as NoteEvent | undefined;
  if (!firstNote) return false;
  firstNote.pitch = clampPitch(firstAnchor.midi, 55, 79);
  return true;
}

/** Nudge generated guitar MIDI velocities bar-wise toward imported LeadSheet dynamic contour (Song Mode + LeadSheet only). */
function applySongModeImportedLeadSheetVelocityNudges(guitar: PartModel, context: CompositionContext): void {
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  if (context.generationMetadata?.songModeLeadSheetInputApplied !== true) return;

  const blendRaw =
    context.generationMetadata?.songModeLeadSheetPerformanceBlend ?? DEFAULT_LEADSHEET_PERFORMANCE_BLEND;
  const blend = Math.min(1, Math.max(0, blendRaw));
  if (blend <= 0) return;

  const anchors = context.generationMetadata?.songModeLeadSheetMelodyAnchors as
    | SongModeLeadSheetMelodyAnchor[]
    | undefined;
  if (!anchors?.length) return;

  const byBar = new Map<number, number>();
  for (const a of anchors) {
    if (typeof a.velocityHint === 'number' && Number.isFinite(a.velocityHint)) {
      byBar.set(a.bar, Math.round(a.velocityHint));
    }
  }
  if (byBar.size === 0) return;

  const strength = 0.62 * blend;

  for (const m of guitar.measures) {
    const hint = byBar.get(m.index);
    if (hint === undefined) continue;
    for (const ev of m.events) {
      if (ev.kind !== 'note') continue;
      const n = ev as NoteEvent;
      const cur = n.velocity ?? 80;
      n.velocity = Math.round(Math.min(127, Math.max(1, cur + (hint - cur) * strength)));
    }
  }
}

/**
 * Guitar–Bass Duo (single-line): bounded duration stretch from imported phrase-connection hints when
 * LeadSheet expression strength is on. Used by `songModeLeadSheetInput` unit tests; safe to call from
 * the phrase-first path if product later wires the same metadata.
 */
export function applySingleLineImportedExpressionConnectionNudges(
  guitarPart: PartModel,
  context: CompositionContext
): void {
  if (context.presetId !== GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID) return;
  if (context.generationMetadata?.songModeLeadSheetInputApplied !== true) return;
  const raw = context.generationMetadata?.songModeLeadSheetExpressionStrength;
  const strength = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
  const anchors = context.generationMetadata?.songModeLeadSheetMelodyAnchors as SongModeLeadSheetMelodyAnchor[] | undefined;
  let conn = 0;
  for (const a of anchors ?? []) {
    if (typeof a.connectionHint === 'number' && Number.isFinite(a.connectionHint)) {
      conn = Math.max(conn, Math.min(1, a.connectionHint));
    }
  }
  if (conn <= 0 || strength <= 0) return;
  const scale = 1 + conn * strength * 0.12;
  for (const m of guitarPart.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if ((n.voice ?? 1) !== 1) continue;
      n.duration *= scale;
    }
  }
}

export interface GoldenPathPlans {
  sections: import('../section-roles/sectionRoleTypes').SectionWithRole[];
  guitarMap: InstrumentRegisterMap;
  bassMap: InstrumentRegisterMap;
  densityPlan: DensityCurvePlan;
  guitarBehaviour: GuitarBehaviourPlan;
  bassBehaviour: BassBehaviourPlan;
  rhythmConstraints: RhythmicConstraints;
  motifState: MotifTrackerState;
  styleStack?: StyleStack;
  interactionPlan?: InteractionPlan;
  scoreTitle: string;
}

export interface GenerateGoldenPathDuoScoreOpts {
  /** Export tempo in BPM forwarded from API/runGoldenPath (fallback 120 only when omitted). */
  bpm?: number;
  /** Pitch-only mutation on guitar melody before bar-math seal (after expressive pass). */
  variationEnabled?: boolean;
  /** ECM chamber: post-variation aesthetic pass (default on; set false for A/B tests). */
  ecmShapingEnabled?: boolean;
  /** Duo / ECM: section contrast + register / phrase arc (default on). */
  orchestrationEnabled?: boolean;
  /** ECM chamber: A1→B→A2 identity cell coherence (default on). */
  identityCellEnabled?: boolean;
}

type DuoScoreProbe = {
  parts: number;
  measures: number;
  events: number;
  roughObjects: number;
};

function estimateDuoScoreProbe(score: ScoreModel | undefined): DuoScoreProbe | null {
  if (!score) return null;
  let measures = 0;
  let events = 0;
  let roughObjects = 1;
  for (const p of score.parts) {
    roughObjects += 1;
    measures += p.measures.length;
    roughObjects += p.measures.length;
    for (const m of p.measures) {
      events += m.events.length;
      roughObjects += m.events.length;
    }
  }
  return { parts: score.parts.length, measures, events, roughObjects };
}

function logEcmInternalPhaseProbe(
  enabled: boolean,
  phase: string,
  score?: ScoreModel,
  extras?: Record<string, string | number | boolean | undefined>
): void {
  if (!enabled || typeof process === 'undefined' || typeof process.memoryUsage !== 'function') return;
  const mu = process.memoryUsage();
  const size = estimateDuoScoreProbe(score);
  const sizeFields = size
    ? ` parts=${size.parts} measures=${size.measures} events=${size.events} roughObjects=${size.roughObjects}`
    : '';
  const extraFields = extras
    ? Object.entries(extras)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ')
    : '';
  console.log(
    `[ECM_PHASE_PROBE] phase=${phase} heapUsed=${mu.heapUsed} heapTotal=${mu.heapTotal} rss=${mu.rss}${sizeFields}${extraFields ? ` ${extraFields}` : ''}`
  );
}

/** Frank Zappa Phase 3 — narrow wide bass–melody spans when motion is parallel; guarantee ≥1 contrary gesture per form section. */
function applyFrankZappaImpliedInnerVoicePass(score: ScoreModel, context: CompositionContext): void {
  const md = context.generationMetadata;
  if (!md || md.songwriterStyleId !== 'frank_zappa') return;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) return;
  const tb = totalBarsFromContext(context);
  const nudgeBars: number[] = [];
  const contraryDone: string[] = [];

  const bassMeanPitch = (bar: number): number | undefined => {
    const m = bass.measures.find((x) => x.index === bar);
    if (!m) return undefined;
    const notes = m.events.filter((e) => e.kind === 'note') as { pitch: number }[];
    if (!notes.length) return undefined;
    return notes.reduce((s, n) => s + n.pitch, 0) / notes.length;
  };

  const guitarTopMelodyEvent = (bar: number): { pitch: number } | undefined => {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) return undefined;
    const notes = m.events.filter(
      (e) => e.kind === 'note' && isGuitarMelodyVoiceNote(e)
    ) as { pitch: number }[];
    if (!notes.length) return undefined;
    let best = notes[0]!;
    for (const n of notes) if (n.pitch > best.pitch) best = n;
    return best;
  };

  for (let b = 2; b <= tb; b++) {
    const gt = guitarTopMelodyEvent(b);
    const gPrev = guitarTopMelodyEvent(b - 1);
    const bs = bassMeanPitch(b);
    const bsPrev = bassMeanPitch(b - 1);
    if (!gt || !gPrev || bs === undefined || bsPrev === undefined) continue;
    const gap = gt.pitch - bs;
    const dMel = gt.pitch - gPrev.pitch;
    const dBs = bs - bsPrev;
    const parallel = dMel * dBs > 0 && Math.abs(dMel) >= 0.75 && Math.abs(dBs) >= 0.75;
    if (gap > 12 && parallel) {
      gt.pitch = Math.max(40, Math.min(88, gt.pitch - 2));
      nudgeBars.push(b);
    }
  }

  const form = context.form;
  if (form?.sections?.length) {
    const countContraryGestures = (lo: number, hi: number): number => {
      let c = 0;
      for (let b = Math.max(2, lo); b <= hi; b++) {
        const gt = guitarTopMelodyEvent(b);
        const gPrev = guitarTopMelodyEvent(b - 1);
        const bs = bassMeanPitch(b);
        const bsPrev = bassMeanPitch(b - 1);
        if (!gt || !gPrev || bs === undefined || bsPrev === undefined) continue;
        const dMel = gt.pitch - gPrev.pitch;
        const dBs = bs - bsPrev;
        if (dMel * dBs < 0 && Math.abs(dMel) > 0.75 && Math.abs(dBs) > 0.75) c++;
      }
      return c;
    };

    const nudgeGuitarForContraryAt = (mid: number): boolean => {
      const gCur = guitarTopMelodyEvent(mid);
      const gPrev = guitarTopMelodyEvent(mid - 1);
      const bs = bassMeanPitch(mid);
      const bsPrev = bassMeanPitch(mid - 1);
      if (!gCur || !gPrev || bs === undefined || bsPrev === undefined) return false;
      const dBs = bs - bsPrev;
      gCur.pitch = Math.max(40, Math.min(88, gCur.pitch + (dBs >= 0 ? -2 : 2)));
      return true;
    };

    for (const sec of form.sections) {
      const lo = sec.startBar;
      const hi = sec.startBar + sec.length - 1;
      const picks = [
        Math.min(hi, Math.max(lo, Math.floor((lo + hi) / 2))),
        Math.min(hi, lo + 1),
        Math.min(hi, Math.max(lo, hi - 1)),
      ];
      let attempt = 0;
      while (countContraryGestures(lo, hi) < 2 && attempt < picks.length) {
        const mid = picks[attempt]!;
        if (mid >= 2 && nudgeGuitarForContraryAt(mid)) contraryDone.push(sec.label.trim());
        attempt++;
      }
    }
  }

  if (md.frankZappaDiagnostics) {
    md.frankZappaDiagnostics = {
      ...md.frankZappaDiagnostics,
      zappaInnerVoiceNudgeBars: nudgeBars,
      zappaContraryMotionSections: contraryDone,
    };
  }
}

/** Frank Zappa Phase 4 — guitar↔bass imitation (anchor echo) + one register-swap bar per section. */
function applyFrankZappaPhase4GuitarBassAndRegister(
  context: CompositionContext,
  guitar: PartModel,
  bass: PartModel,
  tb: number,
  walkLow: number,
  bassCeiling: number
): void {
  const md = context.generationMetadata;
  const form = context.form;
  if (!md || md.songwriterStyleId !== 'frank_zappa' || !form?.sections?.length) return;
  const seed = context.seed;
  const sections: ZappaImitationReceipt['sections'] = [];

  for (let si = 0; si < form.sections.length; si++) {
    const sec = form.sections[si]!;
    const lo = sec.startBar;
    const hi = Math.min(tb, sec.startBar + sec.length - 1);
    const delayBeats = seededUnit(seed, 961 + si) < 0.5 ? 1 : 2;
    const bassLeads = seededUnit(seed, 962 + si) < 0.42;

    const swapPick = lo + Math.floor(seededUnit(seed, 963 + si) * Math.max(1, hi - lo + 1));
    const swapBarClamped = Math.min(hi, Math.max(lo, swapPick));
    const gSwap = guitar.measures.find((m) => m.index === swapBarClamped);
    const bSwap = bass.measures.find((m) => m.index === swapBarClamped);
    if (gSwap && bSwap) {
      for (const e of gSwap.events) {
        if (e.kind === 'note' && isGuitarMelodyVoiceNote(e)) {
          (e as NoteEvent).pitch = Math.max(40, Math.min(88, (e as NoteEvent).pitch - 12));
        }
      }
      for (const e of bSwap.events) {
        if (e.kind === 'note') {
          (e as NoteEvent).pitch = clampPitch((e as NoteEvent).pitch + 12, walkLow, Math.min(72, bassCeiling + 12));
        }
      }
      gSwap.events.sort(
        (a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat
      );
      bSwap.events.sort(
        (a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat
      );
    }

    const bassAnticipatesGuitar = seededUnit(seed, 968 + si) < 0.38;

    const emitGuitarEchoesBass = (echoBar: number, bnoteLimit: number): void => {
      const bm0 = bass.measures.find((m) => m.index === lo);
      if (!bm0) return;
      const bnotes = bm0.events
        .filter((e) => e.kind === 'note')
        .sort((a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat) as NoteEvent[];
      if (bnotes.length === 0) return;
      const gm = guitar.measures.find((m) => m.index === echoBar);
      if (!gm) return;
      const span = measureBeatSpanQuartersOf(gm);
      let added = 0;
      for (const bn of bnotes.slice(0, bnoteLimit)) {
        const st = bn.startBeat + delayBeats;
        if (st >= span - 0.05) continue;
        const pitch = Math.max(40, Math.min(88, bn.pitch + 12));
        addEvent(
          gm,
          createNote(pitch, st, Math.min(bn.duration, span - st), 1, `zappa_imitation:${sec.label.trim()}`)
        );
        added++;
      }
      if (added > 0) {
        gm.events.sort((a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat);
        sections.push({
          sectionLabel: sec.label.trim(),
          mode: 'guitar_echoes_bass',
          anchorBars: [lo, Math.min(lo + 1, hi)],
          delayBeats,
          echoBar,
        });
      }
    };

    const emitBassEchoesGuitar = (echoBar: number, gnoteLimit: number, anticipate: boolean): void => {
      const collected: NoteEvent[] = [];
      for (const bb of [lo, lo + 1]) {
        if (bb > hi) continue;
        const gm = guitar.measures.find((m) => m.index === bb);
        if (!gm) continue;
        for (const e of gm.events) {
          if (e.kind === 'note' && isGuitarMelodyVoiceNote(e)) collected.push(e as NoteEvent);
        }
      }
      collected.sort((a, b) => a.startBeat - b.startBeat);
      if (collected.length === 0) return;
      const bm = bass.measures.find((m) => m.index === echoBar);
      if (!bm) return;
      const span = measureBeatSpanQuartersOf(bm);
      let added = 0;
      const off = delayBeats + (anticipate ? -1 : 0);
      for (const gn of collected.slice(0, gnoteLimit)) {
        const st = Math.max(0, gn.startBeat + off);
        if (st >= span - 0.05) continue;
        const pitch = clampPitch(gn.pitch - 12, walkLow, bassCeiling);
        addEvent(bm, createNote(pitch, st, Math.min(gn.duration, span - st)));
        added++;
      }
      if (added > 0) {
        bm.events.sort((a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat);
        sections.push({
          sectionLabel: sec.label.trim(),
          mode: 'bass_echoes_guitar',
          anchorBars: [lo, Math.min(lo + 1, hi)],
          delayBeats,
          echoBar,
        });
      }
    };

    /** Primary + secondary imitation each section (more guitar↔bass dialogue). */
    const echoPrimaryGuitar = Math.min(hi, lo + 1);
    const echoPrimaryBass = Math.min(hi, lo + (seededUnit(seed, 964 + si) < 0.55 ? 1 : 2));

    /** Avoid stacking both imitation passes in the same measure when the section is short. */
    const distinctEchoBar = (primary: number, preferred: number): number | null => {
      let b = Math.min(hi, Math.max(lo, preferred));
      if (b !== primary) return b;
      if (primary + 1 <= hi) return primary + 1;
      if (primary - 1 >= lo) return primary - 1;
      return null;
    };

    if (bassLeads) {
      emitGuitarEchoesBass(echoPrimaryGuitar, 4);
      const echoSecondaryBass = distinctEchoBar(echoPrimaryGuitar, Math.min(hi, lo + 2 + (si % 2)));
      if (echoSecondaryBass !== null) {
        emitBassEchoesGuitar(echoSecondaryBass, 2, bassAnticipatesGuitar);
      }
    } else {
      emitBassEchoesGuitar(echoPrimaryBass, 5, bassAnticipatesGuitar);
      const echoSecondaryGuitar = distinctEchoBar(echoPrimaryBass, Math.min(hi, lo + 1 + (si % 2)));
      if (echoSecondaryGuitar !== null) {
        emitGuitarEchoesBass(echoSecondaryGuitar, 2);
      }
    }
  }

  if (sections.length > 0 && md.frankZappaDiagnostics) {
    md.frankZappaDiagnostics = {
      ...md.frankZappaDiagnostics,
      zappaImitationReceipt: { sections },
    };
  }
}

/**
 * Generate golden path duo score. `context` must already include any `applyStyleStack` transforms.
 */
export function generateGoldenPathDuoScore(
  context: CompositionContext,
  plans: GoldenPathPlans,
  opts?: GenerateGoldenPathDuoScoreOpts
): ScoreModel {
  const tb = totalBarsFromContext(context);
  const probeEcm = context.presetId === 'ecm_chamber' && process.env?.COMPOSER_OS_DEBUG_ECM_PHASE === '1';
  logEcmInternalPhaseProbe(probeEcm, 'enter_generateGoldenPathDuoScore', undefined, { tb });
  const sp = context.generationMetadata?.styleProfile;
  const isEcmStyle = sp === 'STYLE_ECM' || sp === 'STYLE_ECM_CHAMBER';
  let texturePlan: EcmBarTexture[] | undefined =
    (context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode)
      ? planEcmTextureBars(tb, context.generationMetadata.ecmMode, context.seed)
      : (isGuitarBassDuoFamily(context.presetId) && isEcmStyle)
        ? planEcmTextureBars(tb, 'ECM_METHENY_QUARTET', context.seed)
        : undefined;
  if (context.presetId === 'ecm_chamber' && texturePlan && context.generationMetadata?.ecmMode) {
    texturePlan = augmentEcmChamberTexturePlan(texturePlan, tb, context.seed, context.generationMetadata.ecmMode);
  }

  let guitarPart: PartModel;
  let bassPart: PartModel;
  /** Wayne chorus/bridge motif-development receipts (sparse; merged into motifDevelopmentSummary). */
  let wayneSectionMotifReceipts: string[] = [];

  if (context.presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID) {
    const built = buildPhraseFirstDuoScore(context);
    guitarPart = built.guitarPart;
    bassPart = built.bassPart;
    plans.motifState = built.motifState;
  } else {
    logEcmInternalPhaseProbe(probeEcm, 'before_buildPianoPart');
    guitarPart = buildGuitarPart(
      context,
      plans.guitarBehaviour,
      plans.guitarMap,
      plans.densityPlan,
      plans.rhythmConstraints,
      plans.motifState,
      plans.interactionPlan,
      texturePlan,
      plans.styleStack
    );
    logEcmInternalPhaseProbe(probeEcm, 'after_buildPianoPart');
    wayneSectionMotifReceipts = applyWayneShorterChorusBridgeMotifDevelopment(guitarPart, {
      songwriterStyleId: context.generationMetadata?.songwriterStyleId,
      sections: context.form.sections,
      totalBars: tb,
      seed: context.seed,
    });
    if (
      context.generationMetadata?.songModeHookFirstIdentity === true &&
      isGuitarBassDuoFamily(context.presetId) &&
      tb === 32
    ) {
      applySongModePhraseEngineV1(guitarPart, context);
    }
    if (context.generationMetadata?.songModeHookFirstIdentity) {
      guitarPart.measures = enforceSongModeGuitarDensity(
        guitarPart.measures,
        0.6,
        0.75,
        context.seed
      );

      const songwriterId = context.generationMetadata?.songwriterStyleId;
      const outsideLevel: 0 | 1 | 2 = resolveAllowedOutsideLevelForSlonimsky(songwriterId);
      const slonimskyCtx: SlonimskyContext = {
        keyPc: 0,
        chordType: 'dominant',
        functionalStrength: 'medium',
        allowedOutsideLevel: outsideLevel,
        phraseIntent: 'build',
        basePitch: 62,
        maxBeats: 2,
        skipInterpolation: true,
      };
      const melodyLine = extractVoiceOneMelodyFromPart(guitarPart);
      const chords = context.lockedHarmonyBarsRaw ?? [];
      const enhanced = applySlonimskyToMelodyLine(melodyLine, chords, slonimskyCtx, context.seed);
      applyEnhancedPitchesByBar(guitarPart, melodyLine, enhanced);
    } else if (
      styleProfileSupportsAlternateGuitarTuning(
        normalizeStyleProfileId(context.generationMetadata?.styleProfile)
      ) &&
      isGuitarBassDuoFamily(context.presetId) &&
      context.generationMetadata
    ) {
      const refBar = Math.min(8, Math.max(1, tb));
      const duoIntent = duoGoldenPathPhraseIntentAtBar(context.seed, refBar);
      const phase = ((refBar - 1) % 8) + 1;
      const slonimskyCtx = mapDuoPhraseIntentToSlonimskyContext({
        duoIntent,
        phase,
        seed: context.seed,
        songwriterId: context.generationMetadata.songwriterStyleId,
        totalQuarterBeats: tb * 4,
        styleProfile: normalizeStyleProfileId(context.generationMetadata?.styleProfile),
        keyPc: inferTonicPitchClassFromBar1(context) ?? 0,
      });
      const melodyLine = extractVoiceOneMelodyFromPart(guitarPart);
      const chords = context.lockedHarmonyBarsRaw ?? [];
      const enhanced = applySlonimskyToMelodyLine(melodyLine, chords, slonimskyCtx, context.seed);
      applyEnhancedPitchesByBar(guitarPart, melodyLine, enhanced);
    }
    const leadSheetAnchorApplied = applySongModeLeadSheetAnchorStart(guitarPart, context);
    if (leadSheetAnchorApplied) {
      context.generationMetadata.songModeLeadSheetAnchorStartApplied = true;
    }
    applySongModeImportedLeadSheetVelocityNudges(guitarPart, context);
    if (isGuitarBassDuoFamily(context.presetId)) {
      nudgeDuoGuitarPhraseEndsForVariety(guitarPart, context);
      applyLateClosingGuitarContourNudge(guitarPart, context);
      const phaseABars = injectPhaseAGuitarVoice2Probe(guitarPart, context);
      logGuitarVoice2Checkpoint('A', guitarPart);
      assertPhaseACheckpointA(guitarPart, phaseABars);
    }
    const motifAuthorityEligible = isMotifAuthorityScopePreset(context, plans.styleStack);
    const motifAuthorityLevel = resolveMotifAuthorityLevelForPilot(context, plans.styleStack);
    const motifAuthorityActive = motifAuthorityEligible && motifAuthorityLevel !== 'off';
    if (motifAuthorityEligible && context.generationMetadata) {
      const songwriterId = context.generationMetadata.songwriterStyleId;
      context.songwriterStyleId = songwriterId;
      const isSongPilot = context.generationMetadata.songModeHookFirstIdentity === true && isSongModeMotifPilotWriter(songwriterId);
      const isHybridPilot = isSongPilot && songwriterId === 'wayne_shorter' && plans.styleStack?.primary === 'barry_harris';
      const isEcmPilot = context.presetId === 'ecm_chamber';
      const pilotPathTag = isHybridPilot
        ? 'hybrid_shorter_melody_barry_harmony'
        : isSongPilot
          ? `song_mode_${songwriterId ?? 'unknown'}`
          : isEcmPilot
            ? 'ecm_chamber'
            : 'non_pilot';
      context.generationMetadata = {
        ...context.generationMetadata,
        motifAuthorityLevel,
      };
      if (!motifAuthorityActive) {
        context.generationMetadata = {
          ...context.generationMetadata,
          motifDevelopmentSummary: makeMotifDevelopmentSummary({
            level: 'off',
            pilotPathTag,
            coreCellEstablished: false,
            recurrenceCountEstimate: 0,
            recurrenceSummary: 'No motif-development guarantee in this run.',
            transformationSummary: [...wayneSectionMotifReceipts, 'none-guaranteed'],
            motifCoherence: 0,
          }),
        };
      } else {
        const motifPlan =
          songwriterId === 'wayne_shorter'
            ? tryWayneFormAwareMotifAuthorityPlan(context, tb) ?? defaultMotifAuthorityPlan(tb)
            : defaultMotifAuthorityPlan(tb);
        if (songwriterId === 'wayne_shorter') {
          const phraseARange = motifPlan.phraseA;
          const phraseANotes = collectGuitarNotesInBarRange(guitarPart, phraseARange);
          const waynePhraseABuilt = buildPhrase('phraseA', phraseARange, phraseANotes, 'tonic');
          context.waynePhraseAFingerprint = waynePhraseABuilt.rhythmFingerprint;
        }
        const phraseAFingerprint = buildPhraseFingerprint(guitarPart, motifPlan.phraseA);
        context.generationMetadata = {
          ...context.generationMetadata,
          motifPlan,
          motifFingerprint: phraseAFingerprint,
        };

        // Checkpoint 2: development phrase should be variation, not copy or drift.
        let developmentSimilarity = 0;
        let variationType: 'copy' | 'variation' | 'drifted' | undefined;
        let literalPenalty = 0;
        let driftPenalty = 0;
        if (motifPlan.phraseB) {
          const phraseBFingerprint = buildPhraseFingerprint(guitarPart, motifPlan.phraseB);
          const devScore = computeMotifAuthorityScore(phraseAFingerprint, phraseBFingerprint);
          developmentSimilarity = devScore.motifAuthorityScore;
          variationType = classifyVariationType(devScore);
          literalPenalty = devScore.literalCopyPenalty;
          driftPenalty = devScore.overDriftPenalty;
          context.generationMetadata = {
            ...context.generationMetadata,
            motifPlan: {
              ...motifPlan,
              developmentSimilarity: devScore.motifAuthorityScore,
            },
            variationType,
            literalCopyPenalty: devScore.literalCopyPenalty,
            overDriftPenalty: devScore.overDriftPenalty,
          };
        }

        // Checkpoint 3: return phrase scored and optionally refined with one bounded nudge pass.
        let returnCoherence = 0;
        let returnNudgeAttempted = false;
        let returnNudgeApplied = false;
        if (motifPlan.phraseReturn) {
          const returnOriginalFingerprint = buildPhraseFingerprint(guitarPart, motifPlan.phraseReturn);
          const returnOriginalScore = computeMotifAuthorityScore(phraseAFingerprint, returnOriginalFingerprint);
          let chosen = returnOriginalScore;
          const shouldRefineReturn =
            motifAuthorityLevel === 'strong' ||
            returnOriginalScore.motifAuthorityScore < motifPlan.returnThreshold;
          if (shouldRefineReturn) {
            returnNudgeAttempted = true;
            const snapshot = snapshotPhrasePitches(guitarPart, motifPlan.phraseReturn);
            nudgeReturnPhraseTowardFingerprint(guitarPart, motifPlan.phraseReturn, phraseAFingerprint, {
              songwriterStyleId: context.songwriterStyleId,
              waynePhraseAFingerprint: context.waynePhraseAFingerprint,
            });
            const returnRefinedFingerprint = buildPhraseFingerprint(guitarPart, motifPlan.phraseReturn);
            const returnRefinedScore = computeMotifAuthorityScore(phraseAFingerprint, returnRefinedFingerprint);
            if (returnRefinedScore.motifAuthorityScore >= returnOriginalScore.motifAuthorityScore) {
              chosen = returnRefinedScore;
              returnNudgeApplied = true;
            } else {
              restorePhrasePitches(guitarPart, snapshot);
            }
          }
          context.generationMetadata = {
            ...context.generationMetadata,
            returnSimilarity: chosen.motifAuthorityScore,
            motifAuthorityScore: chosen.motifAuthorityScore,
            literalCopyPenalty: chosen.literalCopyPenalty,
            overDriftPenalty: chosen.overDriftPenalty,
          };
          returnCoherence = chosen.motifAuthorityScore;
        }
        const recurrenceCountEstimate = motifPlan.phraseReturn ? 2 : motifPlan.phraseB ? 1 : 0;
        const recurrenceSummary = motifPlan.phraseReturn
          ? 'Core cell statement and return phrases were compared for recurrence.'
          : 'Core cell recurrence assessed in opening/development phrases only.';
        const transformationSummary = [
          ...wayneSectionMotifReceipts,
          variationType ? `development:${variationType}` : 'development:unavailable',
          returnNudgeAttempted ? 'return:anchor_nudge_attempted' : 'return:anchor_nudge_skipped',
          returnNudgeAttempted
            ? returnNudgeApplied
              ? 'return:anchor_nudge_applied'
              : 'return:anchor_nudge_reverted_or_unchanged'
            : 'return:anchor_nudge_not_applicable',
        ];
        const motifCoherence = returnCoherence || developmentSimilarity || 0;
        // Minimal evidence rule for hybrid identity claim: non-trivial recurrence plus coherence.
        const motifLedPrimaryIdentity =
          isHybridPilot && recurrenceCountEstimate >= 2 && motifCoherence >= 0.54 ? true : undefined;
        context.generationMetadata = {
          ...context.generationMetadata,
          motifDevelopmentSummary: makeMotifDevelopmentSummary({
            level: motifAuthorityLevel,
            pilotPathTag,
            coreCellEstablished: phraseAFingerprint.intervalContour.length > 0,
            recurrenceCountEstimate,
            recurrenceSummary,
            transformationSummary,
            motifCoherence,
            motifLedPrimaryIdentity,
          }),
        };
        void literalPenalty;
        void driftPenalty;
      }
    }
    if (context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode === 'ECM_METHENY_QUARTET') {
      logEcmInternalPhaseProbe(probeEcm, 'before_metheny_development');
      applyEcmMethenyMotifDevelopment(guitarPart, context.seed, tb, context);
      logEcmInternalPhaseProbe(probeEcm, 'after_metheny_development');
    }
    if (!(context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode === 'ECM_METHENY_QUARTET')) {
      logEcmInternalPhaseProbe(probeEcm, 'before_metheny_development');
      logEcmInternalPhaseProbe(probeEcm, 'after_metheny_development');
    }
    const phraseGuitarContours = computePhraseGuitarContours(guitarPart, tb);
    logEcmInternalPhaseProbe(probeEcm, 'before_buildBassPart');
    bassPart = buildBassPart(
      context,
      plans.bassBehaviour,
      plans.bassMap,
      plans.motifState,
      guitarPart,
      plans.interactionPlan,
      texturePlan,
      phraseGuitarContours
    );
    logEcmInternalPhaseProbe(probeEcm, 'after_buildBassPart');
    if (context.presetId === 'ecm_chamber' || (isGuitarBassDuoFamily(context.presetId) && isEcmStyle)) {
      applyEcmChamberPhraseEdgeSpaceToParts(guitarPart, bassPart, tb, context.seed);
    }
  }
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;
  const [walkLow] = profile.preferredWalkingZone;
  const bassCeiling = Math.min(profile.preferredWalkingZone[1], 52);
  tagMomentBarsOnParts([guitarPart, bassPart]);
  if (context.presetId !== 'ecm_chamber' && context.presetId !== GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID) {
    simplifyBassAtPeakBar(context, bassPart, plans.bassMap, 4, walkLow, bassCeiling);
    resolveOverlapInDuoScore(context, guitarPart, bassPart, plans.bassMap, walkLow, bassCeiling);
  }
  if (context.generationMetadata?.songwriterStyleId === 'frank_zappa') {
    applyFrankZappaPhase4GuitarBassAndRegister(context, guitarPart, bassPart, tb, walkLow, bassCeiling);
  }
  const useIndieDualGuitar = shouldUseIndieArtPopDualGuitarRoute(context);
  if (
    isGuitarBassDuoFamily(context.presetId) &&
    context.presetId !== 'ecm_chamber' &&
    !useIndieDualGuitar
  ) {
    /**
     * Wyble-style V2/bass register coupling is for true guitar–bass duo. The Indie + separate
     * tunings path remaps the bass part to Electric Guitar 2; running this pass first forces
     * guitar inner-voice + bass geometry that is no longer the requested dual-electric product.
     */
    console.log(
      '[DualTuning] enforceVoice2BassRegisterSeparation18_2B_4 (Wyble-style V2/bass) running (dual-indie route false)',
      JSON.stringify({ presetId: context.presetId, hasWybleLayout: !!context.generationMetadata?.wybleVoiceLayout })
    );
    enforceVoice2BassRegisterSeparation18_2B_4(guitarPart, bassPart, context);
  } else if (isGuitarBassDuoFamily(context.presetId) && useIndieDualGuitar) {
    console.log('[DualTuning] route selected indie_dual_electric (skip enforceVoice2BassRegisterSeparation18_2B_4)');
  }

  const bpm = opts?.bpm ?? 120;
  const feelProfile =
    context.presetId === 'ecm_chamber'
      ? { swingRatio: 1, tempoFeel: 'medium' as const, driftTotalBeats: 0.06 }
      : buildFeelProfileFromTempo(bpm);
  if (useIndieDualGuitar) {
    console.log(
      '[DualTuning] remapBassPartToElectricGuitar2ForIndieArtPop',
      JSON.stringify({ bassIdBefore: bassPart.id, instrumentBefore: bassPart.instrumentIdentity })
    );
    bassPart = remapBassPartToElectricGuitar2ForIndieArtPop(bassPart);
    bassPart = forceChordalElectricGuitar2VoicingsForIndieRoute(bassPart, context);
    for (let bi = 1; bi <= tb; bi++) {
      const gm = guitarPart.measures.find((x) => x.index === bi);
      const bm = bassPart.measures.find((x) => x.index === bi);
      if (!gm || !bm) continue;
      const leadNotes = gm.events.filter((e): e is NoteEvent => e.kind === 'note').length;
      if (leadNotes === 0) continue;
      if (leadNotes < 4) continue;
      const chOnly = bm.events.filter((e): e is ChordEvent => e.kind === 'chord' && e.voice === 2);
      if (chOnly.length <= 1) continue;
      const ranked = [...chOnly].sort((a, b) => {
        const pa = indieGuitar2BeatOneOrThreeLocal(a.startBeat) ? 1 : 0;
        const pb = indieGuitar2BeatOneOrThreeLocal(b.startBeat) ? 1 : 0;
        if (pb !== pa) return pb - pa;
        return a.startBeat - b.startBeat;
      });
      const keeper = ranked[0]!;
      bm.events = bm.events.filter((e) => {
        if (e.kind !== 'chord' || (e as ChordEvent).voice !== 2) return true;
        const ch = e as ChordEvent;
        if (ch.startBeat !== keeper.startBeat || ch.pitches.length !== keeper.pitches.length) return false;
        return ch.pitches.every((p, i) => p === keeper.pitches[i]!);
      });
      bm.events = sortIndieGuitar2MeasureEventsForExport(bm.events);
    }
    for (let bi = 2; bi <= tb; bi++) {
      if (seededUnit(context.seed, bi, 99111) >= 0.25) continue;
      const bm = bassPart.measures.find((x) => x.index === bi);
      if (!bm) continue;
      bm.events = bm.events.filter((e) => !(e.kind === 'chord' && (e as ChordEvent).voice === 2));
      bm.events = sortIndieGuitar2MeasureEventsForExport(bm.events);
    }
    bassPart = thinGuitar2Voice1InChordMeasures(bassPart, context);
    {
      const lowCad = 40;
      const highCad = 76;
      const chordToneOptsCad: ChordTonesOptions | undefined = shouldUseUserChordSemanticsForTones(context)
        ? { lockedHarmony: true }
        : undefined;
      for (const m of bassPart.measures) {
        if (m.index < 4 || m.index % 4 !== 0) continue;
        const phraseStart = m.index - 3;
        const durs: number[] = [];
        for (let bi = phraseStart; bi <= m.index; bi++) {
          const mm = bassPart.measures.find((x) => x.index === bi);
          if (!mm) continue;
          for (const ev of mm.events) {
            if (ev.kind !== 'note') continue;
            const vn = ev as NoteEvent;
            if ((vn.voice ?? 1) !== 1) continue;
            durs.push(vn.duration);
          }
        }
        const med =
          durs.length === 0
            ? 1
            : [...durs].sort((a, b) => a - b)[Math.floor(durs.length / 2)]!;
        let bestI = -1;
        let bestEnd = -1;
        for (let ei = 0; ei < m.events.length; ei++) {
          const ev = m.events[ei]!;
          if (ev.kind !== 'note') continue;
          const vn = ev as NoteEvent;
          if ((vn.voice ?? 1) !== 1) continue;
          const end = vn.startBeat + vn.duration;
          if (end >= bestEnd) {
            bestEnd = end;
            bestI = ei;
          }
        }
        if (bestI < 0) continue;
        const n = m.events[bestI] as NoteEvent;
        const chordSym = m.chord ?? getChordForBar(m.index, context);
        const tones = guitarChordTonesInRange(chordSym, Math.max(lowCad + 7, 47), highCad, chordToneOptsCad);
        let sb = n.startBeat;
        if (!indieGuitar2BeatOneOrThreeLocal(sb)) {
          const p = ((sb % 4) + 4) % 4;
          sb = Math.abs(p - 2) <= Math.abs(p - 0) ? 2 : 0;
        }
        let dur = Math.max(n.duration, med * 1.25, 1.5);
        dur = Math.min(dur, measureBeatSpanQuartersOf(m) - sb);
        const pools = [tones.root, tones.third, tones.fifth, tones.seventh].filter((x) => Number.isFinite(x));
        let bestP = n.pitch;
        let bd = Infinity;
        for (const p of pools) {
          const cl = clampPitch(p, lowCad, highCad);
          const d = Math.abs(cl - n.pitch);
          if (d < bd) {
            bd = d;
            bestP = cl;
          }
        }
        m.events[bestI] = { ...n, startBeat: sb, duration: dur, pitch: bestP };
        m.events = sortIndieGuitar2MeasureEventsForExport(m.events);
      }
    }
    guitarPart.voiceRole = 'balanced';
    guitarPart.chordBias = 0.55;
    bassPart.voiceRole = 'chordal';
    bassPart.chordBias = 0.8;
    applyVoiceRoleFromPartSpec(guitarPart, context);
    applyVoiceRoleFromPartSpec(bassPart, context);
    bassPart = stripIndieGuitar2StrayV2OffbeatSingleNotes(bassPart, context);
  }
  console.log(
    '[DualTuning] route selected',
    JSON.stringify({
      dualGuitarIndieRoute: useIndieDualGuitar,
      gate: {
        songModeHook: context.generationMetadata?.songModeHookFirstIdentity === true,
        presetId: context.presetId,
        styleProfile: normalizeStyleProfileId(context.generationMetadata?.styleProfile),
        metadataAltMode: context.generationMetadata?.alternateGuitarTuning?.mode ?? null,
      },
    })
  );
  const rawScore = createScore(plans.scoreTitle, [guitarPart, bassPart], {
    tempo: bpm,
    feelProfile,
  });
  if (useIndieDualGuitar) {
    const alt = context.generationMetadata?.alternateGuitarTuning;
    if (alt?.mode === 'separate') {
      const byId: Record<string, string> = {};
      const w1 = formatAlternateGuitarTuningExportLine(alt.guitar1);
      const w2 = formatAlternateGuitarTuningExportLine(alt.guitar2);
      if (w1) byId.guitar = w1;
      if (w2) byId.guitar_2 = w2;
      if (Object.keys(byId).length > 0) rawScore.exportMeasure1TuningWordsByPartId = byId;
    }
  }
  {
    const transposeByPart = buildExportPartTransposeSemitonesFromResolvedAlternateTuning(
      context.generationMetadata?.alternateGuitarTuning
    );
    if (transposeByPart && Object.keys(transposeByPart).length > 0) {
      rawScore.exportPartTransposeSemitones = transposeByPart;
    }
  }
  logEcmInternalPhaseProbe(probeEcm, 'after_initial_score_setup', rawScore);
  if (isGuitarBassDuoFamily(context.presetId)) {
    rawScore.duoRhythmSnap = 'eighth_beats';
  }
  const articulationOn = context.presetId !== 'ecm_chamber';
  let afterPerf = applyPerformancePass(rawScore, { applyArticulation: articulationOn });
  logEcmInternalPhaseProbe(probeEcm, 'before_ecm_texture', afterPerf);
  logEcmInternalPhaseProbe(probeEcm, 'after_ecm_texture', afterPerf);
  logEcmInternalPhaseProbe(probeEcm, 'before_schneider_density', afterPerf);
  if (context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode === 'ECM_SCHNEIDER_CHAMBER') {
    afterPerf = applyEcmSchneiderDensityEnvelope(afterPerf, tb);
  }
  logEcmInternalPhaseProbe(probeEcm, 'after_schneider_density', afterPerf);
  // Last non-finalize transforms: articulation / velocity / feel metadata only (no rhythm after seal).
  let afterExpressive = applyExpressiveDuoFeel(afterPerf, {
    ecmEvenEighths: context.presetId === 'ecm_chamber',
  });
  if (opts?.variationEnabled === true) {
    applyDuoPitchVariationToGuitar(afterExpressive, context, context.seed);
  }
  logEcmInternalPhaseProbe(probeEcm, 'before_ecm_shaping', afterExpressive);
  if (context.presetId === 'ecm_chamber' && opts?.ecmShapingEnabled !== false) {
    applyECMShapingPass(afterExpressive, context, context.seed);
  }
  logEcmInternalPhaseProbe(probeEcm, 'after_ecm_shaping', afterExpressive);
  logEcmInternalPhaseProbe(probeEcm, 'before_identity_cell', afterExpressive);
  if (context.presetId === 'ecm_chamber' && opts?.identityCellEnabled !== false) {
    applyEcmIdentityCellPass(afterExpressive, context, context.seed);
  }
  logEcmInternalPhaseProbe(probeEcm, 'after_identity_cell', afterExpressive);
  if (
    (isGuitarBassDuoFamily(context.presetId) || context.presetId === 'ecm_chamber') &&
    opts?.orchestrationEnabled !== false &&
    context.presetId !== GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID
  ) {
    applyDuoOrchestrationPass(afterExpressive, context, context.seed);
  }
  if (context.harmonyContext) {
    assertGuitarScoreMatchesHarmonyContext(afterExpressive, context, 'after_applyDuoOrchestrationPass');
  }
  /** Song Mode: velocity-only style layer must run before `finalizeAndSealDuoScoreBarMath` freezes events. */
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId)
  ) {
    const sp = context.generationMetadata.styleProfile ?? 'STYLE_ECM';
    const spNorm = normalizeStyleProfileId(sp);
    applySongModeStyleEngineToScore(afterExpressive, context.seed, sp, {
      sonicYouthTextureAtBar:
        spNorm === 'STYLE_SONIC_YOUTH' ? (bar) => getSonicYouthTextureStateAtBar(context, bar) : undefined,
    });
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    tb === 32
  ) {
    ensureRhythmIntentResolvedIntoMetadata(context.generationMetadata as GenerationMetadata, context.seed);
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId)
  ) {
    applyBarryHarris(context, afterExpressive);
  }
  applySongwriterKeysCompPresentation(afterExpressive, context);
  applySongModeFagenKeysCompV15(afterExpressive, context);
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    tb === 32
  ) {
    const gPhraseV2 =
      afterExpressive.parts.find((p) => p.id === 'guitar') ??
      afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (gPhraseV2) {
      let motifPool = buildMotifPool(afterExpressive, {
        seed: context.seed,
        generationId: context.generationMetadata?.generatedAt,
      });
      const mdHook = context.generationMetadata as GenerationMetadata & {
        songModeHookIdentity?: SongModeHookIdentity;
      };
      if (mdHook.songModeHookIdentity) {
        motifPool = seedPoolFromHookIdentity(motifPool, mdHook.songModeHookIdentity);
      }
      const guitarPhraseV2 = applyPhraseEngineV2(gPhraseV2, motifPool);
      const pi = afterExpressive.parts.indexOf(gPhraseV2);
      if (pi >= 0) afterExpressive.parts[pi] = guitarPhraseV2;
      const bPhraseV2 = afterExpressive.parts.find((p) => p.id === 'bass');
      if (bPhraseV2) {
        const bassPhraseV2 = applyBassMotifEcho(bPhraseV2, motifPool);
        const bi = afterExpressive.parts.indexOf(bPhraseV2);
        if (bi >= 0) afterExpressive.parts[bi] = bassPhraseV2;
      }
    }
  }
  let songModeHookBarsPostFinalize: Map<number, HookBarNoteIdentity[]> | undefined;
  /**
   * No mid-pipeline hook-bar identity assert here (pre-overlay vs post-melodic): later Song Mode passes
   * (melodic continuity, density floor, phrase landing repair) may re-resolve pitches via
   * chord-tone policy when songwriter/style profile implies shorterMode — legitimately diverging from the
   * guitar line as first laid down before those passes. Regression protection for protected hook bars
   * remains: snapshot after `finalizeAndSealDuoScoreBarMath` + `assertHookBarsUnchangedSinceSnapshot` below.
   */
  applySongModeRhythmOverlayC1(afterExpressive, context);
  applyJamesBrownFunkOverlay(afterExpressive, context);
  applySongModeOstinatoC4(afterExpressive, context);
  applySongModeHookRhythmLayerC4(afterExpressive, context);
  applySongModeOstinatoC5(afterExpressive, context, { blendStart: 1, blendLength: 8, fromFeel: 'stable', toFeel: 'balanced', c5Strength: (context.generationMetadata?.blendStrength ?? 'medium') });
  applySongModeControlC5(afterExpressive, context);
  applySongModeExpressionC6(afterExpressive, context);
  applySongModeSpaceC7(afterExpressive, context);
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    styleProfileSupportsAlternateGuitarTuning(normalizeStyleProfileId(context.generationMetadata.styleProfile))
  ) {
    applyIndieArtPopPhaseADeepening(afterExpressive, context, plans.sections);
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    tb === 32
  ) {
    const gSong = afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (gSong) {
      applySongModeMelodicContinuityPass(gSong, context);
      applySongModePhraseEndLandingRepair(gSong, context);
      applySongModeGuitarDensityFloor(gSong, context);
      applySongModePhraseEndLandingRepair(gSong, context);
    }
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId)
  ) {
    const coreMotifs = context.generationMetadata.songModeCoreMotifs;
    if (coreMotifs && coreMotifs.length > 0) {
      const assets = extractMotifAssetsFromCoreMotifs(coreMotifs);
      const suggestions = assets.flatMap((a) => planMotifReuse(a, 'song_mode'));
      context.generationMetadata.motifReuseSuggestions = suggestions;
    }
  }
  // Final authority: exact 4/4 per voice, overlaps removed, bass monophonic; then strict validation; then freeze rhythm tree.
  {
    const rawHook = (context.generationMetadata as any)?.songwriterHookRepetitionBias ?? 0.5;
    afterExpressive._hookRepetitionBias =
      context.generationMetadata?.songModeHookFirstIdentity === true &&
      isGuitarBassDuoFamily(context.presetId) &&
      tb === 32
        ? Math.max(0.62, rawHook)
        : rawHook;
  }
  if (context.presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID) {
    applyPhraseFirstSingleLineMonophony(afterExpressive);
  }
  if (isGuitarBassDuoFamily(context.presetId) && context.presetId !== 'ecm_chamber') {
    const bassForSlash = afterExpressive.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    if (bassForSlash) {
      repairSlashBassHonourInDuoScore(context, bassForSlash, plans.bassMap, walkLow, bassCeiling);
    }
  }
  if (context.harmonyContext) {
    assertGuitarScoreMatchesHarmonyContext(afterExpressive, context, 'after_repairSlashBassHonourInDuoScore');
  }
  applyDuoWybleBassAnchorBar1Nudge(afterExpressive, context);
  if (shouldUseIndieArtPopDualGuitarRoute(context)) {
    const gIndie = afterExpressive.parts.find((p) => p.id === 'guitar');
    if (gIndie) {
      gIndie.songModePresentAsPianoComp = false;
      gIndie.name = 'Clean Electric Guitar';
      gIndie.midiProgram = CLEAN_ELECTRIC_GUITAR.midiProgram;
    }
    const g2PreSeal = afterExpressive.parts.find((p) => p.id === 'guitar_2');
    if (g2PreSeal) {
      stripIndieGuitar2StrayV2OffbeatSingleNotes(g2PreSeal, context);
      thinGuitar2Voice1InChordMeasures(g2PreSeal, context);
      for (const mm of g2PreSeal.measures) {
        mm.events = sortIndieGuitar2MeasureEventsForExport(mm.events);
      }
    }
  }
  if (context.generationMetadata?.songwriterStyleId === 'frank_zappa' && context.generationMetadata) {
    const md = context.generationMetadata;
    if (!md.soloLine) {
      const solo = generateZappaSolo(context, md.zappaSoloOptions);
      applyZappaSoloToMetadata(md, solo);
    }
    if (md.soloLine) {
      afterExpressive = mergeZappaSoloPart(afterExpressive, md.soloLine);
    }
    applyFrankZappaImpliedInnerVoicePass(afterExpressive, context);
  }
  if (context.generationMetadata?.songwriterStyleId === 'frank_zappa' && context.generationMetadata) {
    validateBarryHarrisConformance(afterExpressive, context.generationMetadata);
  }
  stampAllMeasuresBeatSpansFromContext(afterExpressive, context);
  finalizeAndSealDuoScoreBarMath(afterExpressive);
  {
    const gPostFin = afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (gPostFin) logGuitarVoice2Checkpoint('post-finalize', gPostFin);
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    tb === 32
  ) {
    const gPost = afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (gPost) {
      songModeHookBarsPostFinalize = snapshotGuitarHookBars(gPost, [1, 25]);
    }
  }
  const c5StrengthFinal = (context.generationMetadata as any)?.blendStrength ?? 'medium';
  if (c5StrengthFinal !== 'medium') {
    const guitarFinal = afterExpressive.parts.find((p) => p.id === 'guitar');
    if (guitarFinal) {
      for (const m of guitarFinal.measures) {
        if (isProtectedBar(m.index, context)) continue;
        applyC5DensityLayer(m, c5StrengthFinal, context.seed, 0, m.index);
      }
    }
  }
  if (isGuitarBassDuoFamily(context.presetId)) {
    debugPrintDuoAttackGridIfEnabled(afterExpressive, 'post-seal');
    const gridCheck = validateScoreDuoAttackGrid(afterExpressive);
    if (!gridCheck.valid) {
      throw new Error(`Duo attack grid validation failed: ${gridCheck.errors.join('; ')}`);
    }
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    tb === 32
  ) {
    const guitar = afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (guitar && context.generationMetadata) {
      const rec = recomputeSongModeHookMotifShapesFromScore(guitar, context);
      if (rec) {
        context.generationMetadata = {
          ...context.generationMetadata,
          songModeStatementMotifShape: rec.statementMotifShape,
          songModeReturnMotifShapeExpected: rec.returnExpectedMotifShape,
        };
      }
    }
  }
  if (songModeHookBarsPostFinalize) {
    const gEnd = afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (gEnd) {
      assertHookBarsUnchangedSinceSnapshot(songModeHookBarsPostFinalize, gEnd);
    }
  }
  const wybleRec = wybleConsumptionReceiptForDuoFamily(context.presetId, context.generationMetadata?.wybleVoiceLayout);
  afterExpressive.wybleConsumptionReceipt = wybleRec;
  context.generationMetadata = {
    ...context.generationMetadata,
    wybleConsumptionReceipt: wybleRec,
  };
  logEcmInternalPhaseProbe(probeEcm, 'before_return_score', afterExpressive);
  if (context.harmonyContext) {
    assertGuitarScoreMatchesHarmonyContext(afterExpressive, context, 'before_return_generateGoldenPathDuoScore');
  }
  return afterExpressive;
}
