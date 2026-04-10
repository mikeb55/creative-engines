/**
 * Composer OS V2 — Golden path duo score generator
 * Motif-driven melody, style-influenced, section-aware (Guitar–Bass Duo).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { chordTonesForChordSymbolWithContext, shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import { getChordForBar } from '../harmony/harmonyResolution';
import { parseChordSymbol, pitchClassToBassMidi, type ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import type { ScoreModel, PartModel, MeasureModel, NoteEvent } from '../score-model/scoreModelTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID, isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { applyPhraseFirstSingleLineMonophony, buildPhraseFirstDuoScore } from './duoSingleLinePhraseFirstPipeline';
import { createMeasure, createNote, createRest, addEvent, createScore } from '../score-model/scoreEventBuilder';
import type { GuitarProfile, BassProfile } from '../instrument-profiles/instrumentProfileTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS, BASS_HARD_RANGE_HIGH, BASS_HARD_RANGE_LOW } from '../instrument-profiles/uprightBassProfile';
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
  type BassSectionRole,
  type DuoPhraseBehaviourMode,
} from './bassMelodicLines';
import { contourFingerprint, phraseTwoBarFingerprint, rhythmFingerprint } from './bassLineFingerprints';
import { duoGuitarSwingStaggerBump, guitarBarIsBusy } from './duoSwingPhrasing';
import {
  computeEnsembleStagger,
  emitGuitarDuoIdentityBar7,
  emitGuitarPhraseBar,
  getDuoPhraseIntent,
  getDuoPhraseIntentV31,
  guitarChordTonesInRange,
  liftToneToRange,
  resolvePhraseEndForDuo,
  type PhraseIntent,
} from './guitarPhraseAuthority';
import { momentTagForBar } from './duoNarrativeMoments';
import { planEcmTextureBars, type EcmBarTexture } from '../ecm/ecmTextureEngine';
import { finalizeAndSealDuoScoreBarMath } from '../score-integrity/duoBarMathFinalize';
import { isProtectedBar } from '../score-integrity/identityLock';
import {
  assertHookBarIdentityUnchanged,
  assertHookBarsUnchangedSinceSnapshot,
  snapshotGuitarHookBarIdentity,
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
import { applySongModeMelodicContinuityPass } from './songModeMelodicContinuity';
import { applySongModeGuitarDensityFloor } from './songModeGuitarDensityFloor';
import { applySongModeRhythmOverlayC1 } from './songModeRhythmOverlayC1';
import { applyJamesBrownFunkOverlay } from './jamesBrownFunkOverlay';
import { applySongModeHookRhythmLayerC4, applySongModeOstinatoC4 } from './songModeOstinatoC4';
import { applySongModeOstinatoC5, applyC5DensityLayer } from './songModeOstinatoC5';
import { applySongModeControlC5 } from './songModeControlC5';
import { applySongModeExpressionC6 } from './songModeExpressionC6';
import { applySongModeSpaceC7 } from './songModeSpaceC7';
import { applySongModeStyleEngineToScore } from '../song-mode/songModeStyleEngine';
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

const DUO_DEFAULT_STYLE_STACK: StyleStack = {
  primary: 'barry_harris',
  secondary: 'metheny',
  colour: 'triad_pairs',
  weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
};

const GUITAR_FLOOR_FOR_SEPARATION = 60;

function isDuoGoldenPathPreset(presetId: string): boolean {
  return (
    presetId === 'guitar_bass_duo' ||
    presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID ||
    presetId === 'ecm_chamber'
  );
}

function totalBarsFromContext(context: CompositionContext): number {
  return context.form.totalBars;
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

/** Last-chance clamp: all passes must honour upright bass hard range (same as register validation). */
function clampAllBassNotesToValidatorHardRange(score: ScoreModel): void {
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return;
  for (const m of bass.measures) {
    for (let i = 0; i < m.events.length; i++) {
      const e = m.events[i]!;
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      const np = clampPitch(n.pitch, BASS_HARD_RANGE_LOW, BASS_HARD_RANGE_HIGH);
      if (np !== n.pitch) {
        m.events[i] = { ...n, pitch: np };
      }
    }
  }
}

function getPlacementsForBar(placements: PlacedMotif[], bar: number): PlacedMotif[] {
  return placements.filter((p) => p.startBar === bar);
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
  const last = v1[v1.length - 1] as { startBeat: number; duration: number } | undefined;
  if (last && last.startBeat + last.duration > 4 + 1e-4) {
    last.duration = qBeat(Math.max(0, 4 - last.startBeat));
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
  const notes = m.events.filter((e) => e.kind === 'note') as { startBeat: number; duration: number }[];
  const lastN = notes[notes.length - 1];
  if (lastN && lastN.startBeat + lastN.duration > 4 + 1e-4) {
    lastN.duration = qBeat(Math.max(0, 4 - lastN.startBeat));
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
  const span = 4 - t0;
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
    for (let i = 0; i < 4; i++) {
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
  const maxDur = qBeat(4 - last.startBeat);
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

function nearestMidiPitch(target: number, candidates: number[], low: number, high: number): number {
  const safe = candidates.filter((c) => Number.isFinite(c));
  if (safe.length === 0) return clampPitch(target, low, high);
  let best = clampPitch(safe[0]!, low, high);
  let bestDist = Infinity;
  for (const c0 of safe) {
    for (const o of [-24, -12, 0, 12, 24]) {
      const c = clampPitch(c0 + o, low, high);
      const d = Math.abs(c - target);
      if (d < bestDist) {
        bestDist = d;
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
  rhythmicFeel: 'syncopated' | 'straight' | 'laid_back' | 'neutral';
} {
  void seed;
  switch (songwriterId) {
    case 'donald_fagen':
      return {
        phraseIntentBias: 'arch',
        densityBias: 0.1,
        offbeatBias: 0.7,
        intervalBias: 'chromatic',
        rhythmicFeel: 'syncopated',
      };
    case 'bacharach':
      return {
        phraseIntentBias: 'arch',
        densityBias: -0.1,
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
    case 'bill_evans':
      return {
        phraseIntentBias: 'descending',
        densityBias: -0.15,
        offbeatBias: 0.35,
        intervalBias: 'stepwise',
        rhythmicFeel: 'laid_back',
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
  biases: { fagenAlteredDominantBias: number; fagenRootAvoidanceMelody: number }
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
      e.pitch = nearestMidiPitch(e.pitch, alts, low, high);
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
      e.pitch = nearestMidiPitch(e.pitch, candidates37, low, high);
    }
  }
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
      e.pitch = nearestMidiPitch(e.pitch, candidates, low, high);
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
  const fagenAlteredDominantBiasR =
    typeof genMeta?.fagenAlteredDominantBias === 'number' ? genMeta.fagenAlteredDominantBias : 0;
  const fagenRootAvoidanceMelodyR =
    typeof genMeta?.fagenRootAvoidanceMelody === 'number' ? genMeta.fagenRootAvoidanceMelody : 0;

  const isSongwriterBacharach = genMeta?.songwriterStyleId === 'bacharach';
  const bacharachDeceptiveCadenceRateR =
    typeof genMeta?.bacharachDeceptiveCadenceRate === 'number' ? genMeta.bacharachDeceptiveCadenceRate : 0;
  const bacharachChromaticVoiceLeadingR =
    typeof genMeta?.bacharachChromaticVoiceLeading === 'number' ? genMeta.bacharachChromaticVoiceLeading : 0;
  const bacharachModalMixtureLevelR =
    typeof genMeta?.bacharachModalMixtureLevel === 'number' ? genMeta.bacharachModalMixtureLevel : 0;
  const bacharachCadentialAmbiguityR =
    typeof genMeta?.bacharachCadentialAmbiguity === 'number' ? genMeta.bacharachCadentialAmbiguity : 0;

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
  const anchorMidi = motifState.baseMotifs[0]?.notes[0]?.pitch;
  let consecutiveBusyGuitarBars = 0;

  const songModeHook =
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    context.presetId === 'guitar_bass_duo' &&
    tb === 32;
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
    const m = createMeasure(b, getChordForBar(b, context), rehearsalForBar(b, context));
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
            ? getDuoPhraseIntentV31(phase)
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
      hookRuntime.emitScheduledBar(b, m);
      normalizeMeasureToEighthBeatGrid(m);
      duoBoostPhraseEndLanding(m, b, true);
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
      if (
        isSongwriterFagen &&
        isDuoGolden &&
        (fagenAlteredDominantBiasR > 0 || fagenRootAvoidanceMelodyR > 0)
      ) {
        applyDonaldFagenGuitarBarPasses(m, b, context, seed, effectiveLow, effectiveHigh, {
          fagenAlteredDominantBias: fagenAlteredDominantBiasR,
          fagenRootAvoidanceMelody: fagenRootAvoidanceMelodyR,
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
      for (const pl of placements) {
        for (const n of pl.notes) {
          let pitch = Math.max(effectiveLow, Math.min(effectiveHigh, n.pitch));
          const dur = Math.min(n.duration, Math.max(0, 4 - n.startBeat));
          if (dur > 0 && n.startBeat < 4) {
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
        let dur = qBeat(Math.min(e.dur, 4 - start));
        if (meth?.attackDensityReduced && dur > 0.5 && tex?.guitarRole !== 'sustain_pad') {
          dur = Math.min(dur, 1.25);
        }
        dur = qBeat(Math.min(dur, 4 - start));
        if (dur <= 0) continue;
        addEvent(m, createNote(e.pitch, start, dur));
        cursor = start + dur;
        if (cursor >= 4 - 1e-6) break;
      }

      if (reduceAttack && cursor < 3) {
        addEvent(m, createRest(cursor, 4 - cursor));
      } else if (cursor < 4 - 1e-4) {
        const tail = 4 - cursor;
        const chord = getChordForBar(b, context);
        const tones = guitarChordTonesInRange(chord, effectiveLow, effectiveHigh, chordToneOpts);
        const endTone = resolvePhraseEndForDuo(tones, anchorMidi, effectiveLow, effectiveHigh, seed, b);
        /** Voice 1: rest through bar end; phrase-resolution tail on voice 2 (Wyble counter-line). */
        addEvent(m, createRest(cursor, tail, 1));
        const v2done = m.events.filter((e) => (e.voice ?? 1) === 2).reduce((s, e) => s + e.duration, 0);
        if (Math.abs(v2done - 4) > 1e-4) {
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
        addEvent(m, createRest(0, 4));
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
        }

        if (songwriterMelodyProfile.densityBias !== 0) {
          let d =
            densityLevel === 'sparse' ? 0.35 : densityLevel === 'medium' ? 0.55 : 0.85;
          d = Math.max(0.1, Math.min(0.95, d + songwriterMelodyProfile.densityBias));
          densityLevel = d < 0.42 ? 'sparse' : d < 0.68 ? 'medium' : 'dense';
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
      console.warn(`[wyble-trace] bar=${b} isDuoGolden=true events=${m.events.length}`);
      normalizeMeasureToEighthBeatGrid(m);
      duoBoostPhraseEndLanding(m, b, true);
      normalizeMeasureToEighthBeatGrid(m);
      if (
        isSongwriterFagen &&
        (fagenAlteredDominantBiasR > 0 || fagenRootAvoidanceMelodyR > 0)
      ) {
        applyDonaldFagenGuitarBarPasses(m, b, context, seed, effectiveLow, effectiveHigh, {
          fagenAlteredDominantBias: fagenAlteredDominantBiasR,
          fagenRootAvoidanceMelody: fagenRootAvoidanceMelodyR,
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
      if (guitarBarIsBusy(m)) consecutiveBusyGuitarBars++;
      else consecutiveBusyGuitarBars = 0;
    } else {
      normalizeMeasureQuarterGrid(m);
    }
    measures.push(m);
  }

  return {
    id: 'guitar',
    name: 'Clean Electric Guitar',
    instrumentIdentity: profile.instrumentIdentity,
    midiProgram: profile.midiProgram,
    clef: 'treble',
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
    for (let i = 0; i < src.length && t < 4 - 1e-4; i++) {
      const rawDur = Math.min(rhythms[i % rhythms.length], 4 - t);
      const dur = qBeat(rawDur);
      if (dur <= 0) break;
      addEvent(mTgt, createNote(pitch, t, dur));
      t += dur;
      if (i < intervals.length) pitch += intervals[i];
    }
    if (t < 4 - 1e-4) addEvent(mTgt, createRest(t, 4 - t));
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
  m.events = [];
  addEvent(m, createNote(firstHalf, 0, 2));
  addEvent(m, createNote(fifth, 2, 2));
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
    m.events = [];
    const pat = (context.seed + b * 17) % 3;
    if (pat === 0) {
      addEvent(m, createNote(firstHalf, 0, 2));
      addEvent(m, createNote(fifth, 2, 2));
    } else if (pat === 1) {
      addEvent(m, createNote(firstHalf, 0, 1.5));
      addEvent(m, createNote(fifth, 1.5, 2.5));
    } else {
      addEvent(m, createNote(firstHalf, 0, 2.5));
      addEvent(m, createNote(fifth, 2.5, 1.5));
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
  let prevBassPitch: number | undefined = walkLow;
  let prevBarContour = '';
  let sameContourStreak = 0;
  const phraseHistory: string[] = [];
  let phraseRetryAttempt = 0;
  let phraseRewindTotal = 0;
  const completedPhraseModes: DuoPhraseBehaviourMode[] = [];
  const evenEighthStreak = { n: 0 };
  const tb = totalBarsFromContext(context);
  const bassPlanStyle = readBassPlanStyle(bassPlan);
  const walkCap = tb >= 16 ? 6 : 4;
  const contourHistoryForGate: string[] = [];

  for (let b = 1; b <= tb; ) {
    const chord = getChordForBar(b, context);
    const tones = chordTonesForChordSymbolWithContext(chord, context);
    const parsed = parseChordSymbol(chord);
    const root = tones.root;
    const m = createMeasure(b, chord, rehearsalForBar(b, context));
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
      measures.push(m);
      continue;
    }

    if (context.presetId === 'ecm_chamber' && ecmMode === 'ECM_SCHNEIDER_CHAMBER') {
      const p1 = slashBassPitch !== undefined ? slashBassPitch : rootClamped;
      const step = (seed + b) % 3 === 0 ? 1 : 2;
      const p2 = clampPitch(p1 + step, walkLow, effectiveHigh);
      if (tex?.bassRole === 'sustain_pad' && tex.guitarRole === 'lead') {
        addEvent(m, createNote(p1, 0, 4));
        normalizeMeasureQuarterGrid(m);
        measures.push(m);
        prevBassPitch = p1;
        continue;
      }
      if (tex?.guitarRole === 'sustain_pad' && tex.bassRole === 'inner_motion') {
        const p2a = clampPitch(p1 + 1, walkLow, effectiveHigh);
        addEvent(m, createNote(p1, 0, 2));
        addEvent(m, createNote(p2a, 2, 2));
        normalizeMeasureQuarterGrid(m);
        measures.push(m);
        prevBassPitch = p2a;
        continue;
      }
      const split = b % 2 === 0 ? 2 : 2.25;
      addEvent(m, createNote(p1, 0, split));
      addEvent(m, createNote(p2, split, 4 - split));
      normalizeMeasureQuarterGrid(m);
      measures.push(m);
      prevBassPitch = p2;
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
      ? getDuoPhraseIntentV31(phase, phraseNumber)
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
      measures.push(m);
      if (b >= 2) {
        const key = phraseTwoBarFingerprint(measures[measures.length - 2], measures[measures.length - 1]);
        if (
          phraseHistory.slice(-3).includes(key) &&
          phraseRetryAttempt < 3 &&
          phraseRewindTotal < 80
        ) {
          measures.splice(-2);
          phraseRetryAttempt++;
          phraseRewindTotal++;
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
      measures.push(m);
      if (b >= 2) {
        const key = phraseTwoBarFingerprint(measures[measures.length - 2], measures[measures.length - 1]);
        if (
          phraseHistory.slice(-3).includes(key) &&
          phraseRetryAttempt < 3 &&
          phraseRewindTotal < 80
        ) {
          measures.splice(-2);
          phraseRetryAttempt++;
          phraseRewindTotal++;
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
      const span = 4 - t0;
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

    measures.push(m);
    if (duoGoldenBass && b >= 2) {
      const key = phraseTwoBarFingerprint(measures[measures.length - 2], measures[measures.length - 1]);
      if (
        phraseHistory.slice(-3).includes(key) &&
        phraseRetryAttempt < 3 &&
        phraseRewindTotal < 80
      ) {
        measures.splice(-2);
        phraseRetryAttempt++;
        phraseRewindTotal++;
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
  /** Pitch-only mutation on guitar melody before bar-math seal (after expressive pass). */
  variationEnabled?: boolean;
  /** ECM chamber: post-variation aesthetic pass (default on; set false for A/B tests). */
  ecmShapingEnabled?: boolean;
  /** Duo / ECM: section contrast + register / phrase arc (default on). */
  orchestrationEnabled?: boolean;
  /** ECM chamber: A1→B→A2 identity cell coherence (default on). */
  identityCellEnabled?: boolean;
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
  const isEcmStyle = context.generationMetadata?.styleProfile === 'STYLE_ECM';
  const texturePlan =
    (context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode)
      ? planEcmTextureBars(tb, context.generationMetadata.ecmMode, context.seed)
      : (context.presetId === 'guitar_bass_duo' && isEcmStyle)
      ? planEcmTextureBars(tb, 'ECM_METHENY_QUARTET', context.seed)
      : undefined;

  let guitarPart: PartModel;
  let bassPart: PartModel;

  if (context.presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID) {
    const built = buildPhraseFirstDuoScore(context);
    guitarPart = built.guitarPart;
    bassPart = built.bassPart;
    plans.motifState = built.motifState;
  } else {
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
    if (
      context.generationMetadata?.songModeHookFirstIdentity === true &&
      context.presetId === 'guitar_bass_duo' &&
      tb === 32
    ) {
      applySongModePhraseEngineV1(guitarPart, context);
    }
    if (context.presetId === 'guitar_bass_duo') {
      nudgeDuoGuitarPhraseEndsForVariety(guitarPart, context);
      applyLateClosingGuitarContourNudge(guitarPart, context);
      const phaseABars = injectPhaseAGuitarVoice2Probe(guitarPart, context);
      logGuitarVoice2Checkpoint('A', guitarPart);
      assertPhaseACheckpointA(guitarPart, phaseABars);
    }
    if (context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode === 'ECM_METHENY_QUARTET') {
      applyEcmMethenyMotifDevelopment(guitarPart, context.seed, tb, context);
    }
    const phraseGuitarContours = computePhraseGuitarContours(guitarPart, tb);
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
  if (isGuitarBassDuoFamily(context.presetId) && context.presetId !== 'ecm_chamber') {
    enforceVoice2BassRegisterSeparation18_2B_4(guitarPart, bassPart, context);
  }

  const bpm = 120;
  const feelProfile =
    context.presetId === 'ecm_chamber'
      ? { swingRatio: 1, tempoFeel: 'medium' as const, driftTotalBeats: 0.06 }
      : buildFeelProfileFromTempo(bpm);
  const rawScore = createScore(plans.scoreTitle, [guitarPart, bassPart], {
    tempo: bpm,
    feelProfile,
  });
  if (context.presetId === 'guitar_bass_duo' || context.presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID) {
    rawScore.duoRhythmSnap = 'eighth_beats';
  }
  const articulationOn = context.presetId !== 'ecm_chamber';
  let afterPerf = applyPerformancePass(rawScore, { applyArticulation: articulationOn });
  if (context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode === 'ECM_SCHNEIDER_CHAMBER') {
    afterPerf = applyEcmSchneiderDensityEnvelope(afterPerf, tb);
  }
  // Last non-finalize transforms: articulation / velocity / feel metadata only (no rhythm after seal).
  const afterExpressive = applyExpressiveDuoFeel(afterPerf, {
    ecmEvenEighths: context.presetId === 'ecm_chamber',
  });
  if (opts?.variationEnabled === true) {
    applyDuoPitchVariationToGuitar(afterExpressive, context, context.seed);
  }
  if (context.presetId === 'ecm_chamber' && opts?.ecmShapingEnabled !== false) {
    applyECMShapingPass(afterExpressive, context, context.seed);
  }
  if (context.presetId === 'ecm_chamber' && opts?.identityCellEnabled !== false) {
    applyEcmIdentityCellPass(afterExpressive, context, context.seed);
  }
  if (
    (isGuitarBassDuoFamily(context.presetId) || context.presetId === 'ecm_chamber') &&
    opts?.orchestrationEnabled !== false &&
    context.presetId !== GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID
  ) {
    applyDuoOrchestrationPass(afterExpressive, context, context.seed);
  }
  /** Song Mode: velocity-only style layer must run before `finalizeAndSealDuoScoreBarMath` freezes events. */
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    context.presetId === 'guitar_bass_duo'
  ) {
    const sp = context.generationMetadata.styleProfile ?? 'STYLE_ECM';
    applySongModeStyleEngineToScore(afterExpressive, context.seed, sp);
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    context.presetId === 'guitar_bass_duo' &&
    tb === 32
  ) {
    ensureRhythmIntentResolvedIntoMetadata(context.generationMetadata as GenerationMetadata, context.seed);
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    context.presetId === 'guitar_bass_duo'
  ) {
    applyBarryHarris(context, afterExpressive);
  }
  let songModeHookBar1PreOverlays: HookBarNoteIdentity[] | undefined;
  let songModeHookBarsPostFinalize: Map<number, HookBarNoteIdentity[]> | undefined;
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    context.presetId === 'guitar_bass_duo' &&
    tb === 32
  ) {
    const gSnap = afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (gSnap) {
      songModeHookBar1PreOverlays = snapshotGuitarHookBarIdentity(gSnap, 1);
    }
  }
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
    context.presetId === 'guitar_bass_duo' &&
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
    songModeHookBar1PreOverlays &&
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    context.presetId === 'guitar_bass_duo' &&
    tb === 32
  ) {
    const gPreFin = afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (gPreFin) {
      assertHookBarIdentityUnchanged(songModeHookBar1PreOverlays, gPreFin, 1);
    }
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    context.presetId === 'guitar_bass_duo'
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
    const fagenMuChordBias = (context.generationMetadata as any)?.fagenMuChordBias ?? 0;
    const fagenAlteredDominantBias = (context.generationMetadata as any)?.fagenAlteredDominantBias ?? 0;
    const fagenRootAvoidanceMelody = (context.generationMetadata as any)?.fagenRootAvoidanceMelody ?? 0;
    const rawHook = (context.generationMetadata as any)?.songwriterHookRepetitionBias ?? 0.5;
    const fagenNoOp =
      1 +
      0 *
        (fagenMuChordBias + fagenAlteredDominantBias + fagenRootAvoidanceMelody);
    afterExpressive._hookRepetitionBias =
      (context.generationMetadata?.songModeHookFirstIdentity === true &&
      context.presetId === 'guitar_bass_duo' &&
      tb === 32
        ? Math.max(0.62, rawHook)
        : rawHook) * fagenNoOp;
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
  clampAllBassNotesToValidatorHardRange(afterExpressive);
  finalizeAndSealDuoScoreBarMath(afterExpressive);
  {
    const gPostFin = afterExpressive.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (gPostFin) logGuitarVoice2Checkpoint('post-finalize', gPostFin);
  }
  if (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    context.presetId === 'guitar_bass_duo' &&
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
    context.presetId === 'guitar_bass_duo' &&
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
  return afterExpressive;
}
