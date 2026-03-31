/**
 * Composer OS V2 — Golden path duo score generator
 * Motif-driven melody, style-influenced, section-aware (Guitar–Bass Duo).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { chordTonesForChordSymbolWithContext, shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import { getChordForBar } from '../harmony/harmonyResolution';
import { parseChordSymbol, pitchClassToBassMidi, type ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
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
import type { StyleStack } from '../style-modules/styleModuleTypes';
import type { InteractionPlan } from '../interaction/interactionTypes';
import { getInteractionForBar } from '../interaction/interactionPlanner';
import { applyPerformancePass } from '../performance/performancePass';
import { applyExpressiveDuoFeel, buildFeelProfileFromTempo } from './expressiveDuoFeel';
import { pickGuideTone, clampPitch, seededUnit } from './guitarBassDuoHarmony';
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
import { contourFingerprint, phraseTwoBarFingerprint } from './bassLineFingerprints';
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
import { applySongModePhraseEngineV1 } from './songModePhraseEngineV1';
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

const GUITAR_FLOOR_FOR_SEPARATION = 60;

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
    addEvent(m, createNote(secondary, 2, 2));
  } else {
    addEvent(m, createNote(primary, 0, 1.25));
    addEvent(m, createNote(secondary, 1.25, 2.75));
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
  addEvent(m, createNote(neigh, 0.5, 0.5));
  addEvent(m, createNote(pass, 1, 1));
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
  return plan?.preferredZone ?? [36, 55];
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

/** Remove rests fully covered by a note span (motif tail rounding can leave orphan rests). */
function collapseRestsInsideNotes(m: MeasureModel): void {
  const notes = m.events.filter((e) => e.kind === 'note') as { startBeat: number; duration: number }[];
  if (notes.length === 0) return;
  m.events = m.events.filter((e) => {
    if (e.kind !== 'rest') return true;
    const r = e as { startBeat: number; duration: number };
    const rs = r.startBeat;
    const re = r.startBeat + r.duration;
    for (const n of notes) {
      const ns = n.startBeat;
      const ne = n.startBeat + n.duration;
      if (rs >= ns - 1e-4 && re <= ne + 1e-4) return false;
    }
    return true;
  });
}

/** Drop rests that share a start time with a note (motif rounding can create duplicate onsets). */
function dropRestsSameStartAsNote(m: MeasureModel): void {
  m.events = m.events.filter((e) => {
    if (e.kind !== 'rest') return true;
    const r = e as { startBeat: number };
    return !m.events.some(
      (o) => o !== e && o.kind === 'note' && Math.abs((o as { startBeat: number }).startBeat - r.startBeat) < 1e-4
    );
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
  addEvent(m, createNote(pass, 0.5, 0.5));
  addEvent(m, createNote(target, 1, 1));
  addEvent(m, createRest(2, 0.5));
  addEvent(m, createNote(fifth, 2.5, 1.5));
  return m;
}

function buildGuitarPart(
  context: CompositionContext,
  _guitarPlan: GuitarBehaviourPlan,
  guitarMap: InstrumentRegisterMap,
  densityPlan: DensityCurvePlan,
  rhythm: RhythmicConstraints,
  motifState: MotifTrackerState,
  interactionPlan: InteractionPlan | undefined,
  texturePlan: EcmBarTexture[] | undefined
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is GuitarProfile => p.instrumentIdentity === 'clean_electric_guitar'
  ) ?? CLEAN_ELECTRIC_GUITAR;

  const chordToneOpts: ChordTonesOptions | undefined = shouldUseUserChordSemanticsForTones(context)
    ? { lockedHarmony: true }
    : undefined;

  const seed = context.seed;
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
    const isDuoGolden = context.presetId === 'guitar_bass_duo' && !isEcmM && !isEcmS;
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
    const staggerGuitar = isDuoGolden
      ? snapAttackBeatToGrid(stagger.guitar + swingBump)
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
      let cursor = 0;
      if (isDuoGolden && consecutiveBusyGuitarBars >= 2) {
        addEvent(m, createRest(0, 1));
        cursor = 1;
      }
      const raw: { pitch: number; start: number; dur: number }[] = [];
      for (const pl of placements) {
        for (const n of pl.notes) {
          let pitch = Math.max(effectiveLow, Math.min(effectiveHigh, n.pitch));
          const dur = Math.min(n.duration, Math.max(0, 4 - n.startBeat));
          if (dur > 0 && n.startBeat < 4) {
            const rawStart = n.startBeat + stagger.guitar + swingBump;
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
          addEvent(m, createRest(cursor, start - cursor));
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
        if (isDuoGolden) {
          const c0 = snapAttackBeatToGrid(cursor);
          if (tail >= 1.5 && seededUnit(seed, b, 5) < 0.35) {
            addEvent(m, createRest(c0, 0.5));
            addEvent(m, createNote(endTone, snapAttackBeatToGrid(c0 + 0.5), tail - 0.5));
          } else {
            addEvent(m, createNote(endTone, c0, tail));
          }
        } else if (tail >= 1.5 && seededUnit(seed, b, 5) < 0.35) {
          addEvent(m, createRest(cursor, 0.5));
          addEvent(m, createNote(endTone, cursor + 0.5, tail - 0.5));
        } else {
          addEvent(m, createNote(endTone, cursor, tail));
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
        });
      }
    }

    if (isDuoGolden) {
      normalizeMeasureToEighthBeatGrid(m);
      duoBoostPhraseEndLanding(m, b, true);
      normalizeMeasureToEighthBeatGrid(m);
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
  nudgeDuoBassPhraseEndTone(m, bar, rootClamped, third, fifth, seventh, walkLow, effectiveHigh, seed);
  if (measureIsDenseEvenEighthWalk(m)) evenEighthStreak.n += 1;
  else evenEighthStreak.n = 0;
}

function buildBassPart(
  context: CompositionContext,
  _bassPlan: BassBehaviourPlan,
  bassMap: InstrumentRegisterMap,
  motifState: MotifTrackerState,
  guitarPart: PartModel,
  interactionPlan: InteractionPlan | undefined,
  texturePlan: EcmBarTexture[] | undefined
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

  for (let b = 1; b <= tb; ) {
    const chord = getChordForBar(b, context);
    const tones = chordTonesForChordSymbolWithContext(chord, context);
    const parsed = parseChordSymbol(chord);
    const root = tones.root;
    const m = createMeasure(b, chord, rehearsalForBar(b, context));
    const [low, high] = getBassRegisterForBar(bassMap, b, context);
    const phase = ((b - 1) % 8) + 1;
    const isDuoPreset = context.presetId === 'guitar_bass_duo';
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
    const duoGoldenBass = context.presetId === 'guitar_bass_duo';
    const pairIdx = Math.floor((b - 1) / 2);
    const duoPhraseMode: DuoPhraseBehaviourMode | undefined = duoGoldenBass
      ? duoPhraseModeForPairIndex(seed, pairIdx, completedPhraseModes)
      : undefined;
    const s = duoGoldenBass ? seed + phraseRetryAttempt * 18457 + b * 31 : seed;
    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const simplify = interaction?.coupling?.bassSimplify;
    const phraseIntent = duoGoldenBass ? getDuoPhraseIntentV31(phase) : getDuoPhraseIntent(phraseBar, seed);
    const stagger = computeEnsembleStagger(duoGoldenBass ? phase : phraseBar, duoGoldenBass ? s : seed, phraseIntent);
    const placements = getPlacementsForBar(motifState.placements, b);
    let firstStart = stagger.bass;
    if (interaction?.coupling?.bassDeferToGuitar && !simplify && phraseIntent === 'guitar_lead') {
      firstStart = Math.max(firstStart, qBeat(0.5 + seededUnit(s, b, 188) * 0.35));
    }
    firstStart = qBeat(firstStart + (seededUnit(s, b, 701) - 0.5) * 0.14);

    if (duoGoldenBass && phraseIntent === 'answer_bass') {
      firstStart = qBeat(Math.max(firstStart, 1 + seededUnit(s, b, 704) * 0.85));
    }
    if (duoGoldenBass && phraseIntent === 'answer_guitar') {
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

    const forceBassSupportSparse = duoGoldenBass && (phase === 1 || phase === 2);
    const thinForOverlap = duoGoldenBass && guitarActivityHot && (phase < 5 || phase > 6);
    const simplifyForDuo = simplify || thinForOverlap || forceBassSupportSparse;

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
      ensureSlashBassPitchPresentInMeasure(m, slashBassPitch, walkLow, effectiveHigh);
      scrubBassFirstAttackIfRoot(m, b, s, rootClamped, third, guide, fifth, walkLow, effectiveHigh, {
        slashBassPitch,
      });
      normalizeMeasureToEighthBeatGrid(m);
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
      ensureSlashBassPitchPresentInMeasure(m, slashBassPitch, walkLow, effectiveHigh);
      scrubBassFirstAttackIfRoot(m, b, s, rootClamped, third, guide, fifth, walkLow, effectiveHigh, {
        slashBassPitch,
      });
      normalizeMeasureToEighthBeatGrid(m);
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
      const firstNote = slashBassPitch !== undefined ? slashBassPitch : rootClamped;
      const secondPitchPick =
        duoGoldenBass && (b + s) % 3 === 0
          ? fifth
          : duoGoldenBass && (b + s) % 3 === 1
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
        guideToneBias: phraseBar <= 4 ? 1.06 : 1.12,
        slashBassPitch,
        duoSteadyWalking: false,
        motionHint:
          duoGoldenBass && (phase === 1 || phase === 2)
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
          duoGoldenBass && (phase === 1 || phase === 2)
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
      });
    }

    if (duoGoldenBass) {
      ensureSlashBassPitchPresentInMeasure(m, slashBassPitch, walkLow, effectiveHigh);
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
        let attempts = 0;
        while (sameContourStreak >= 3 && attempts < 2) {
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

  return {
    id: 'bass',
    name: GUITAR_BASS_DUO_BASS_PART_NAME,
    instrumentIdentity: profile.instrumentIdentity,
    midiProgram: profile.midiProgram,
    clef: 'bass',
    measures,
  };
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
  const texturePlan =
    context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode
      ? planEcmTextureBars(tb, context.generationMetadata.ecmMode, context.seed)
      : undefined;

  const guitarPart = buildGuitarPart(
    context,
    plans.guitarBehaviour,
    plans.guitarMap,
    plans.densityPlan,
    plans.rhythmConstraints,
    plans.motifState,
    plans.interactionPlan,
    texturePlan
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
  }
  if (context.presetId === 'ecm_chamber' && context.generationMetadata?.ecmMode === 'ECM_METHENY_QUARTET') {
    applyEcmMethenyMotifDevelopment(guitarPart, context.seed, tb, context);
  }
  const bassPart = buildBassPart(
    context,
    plans.bassBehaviour,
    plans.bassMap,
    plans.motifState,
    guitarPart,
    plans.interactionPlan,
    texturePlan
  );
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;
  const [walkLow] = profile.preferredWalkingZone;
  const bassCeiling = Math.min(profile.preferredWalkingZone[1], 52);
  tagMomentBarsOnParts([guitarPart, bassPart]);
  if (context.presetId !== 'ecm_chamber') {
    simplifyBassAtPeakBar(context, bassPart, plans.bassMap, 4, walkLow, bassCeiling);
    resolveOverlapInDuoScore(context, guitarPart, bassPart, plans.bassMap, walkLow, bassCeiling);
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
  if (context.presetId === 'guitar_bass_duo') {
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
    (context.presetId === 'guitar_bass_duo' || context.presetId === 'ecm_chamber') &&
    opts?.orchestrationEnabled !== false
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
  afterExpressive._hookRepetitionBias = (context.generationMetadata as any)?.songwriterHookRepetitionBias ?? 0.5;
  finalizeAndSealDuoScoreBarMath(afterExpressive);
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
  if (context.presetId === 'guitar_bass_duo') {
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
  return afterExpressive;
}
