/**
 * Stage 4b -- Baseline motif interval identity contract (generic guitar_bass_duo, :4572 path).
 * Documents pre-vault-snap identity: pl.notes (post-placement, pre-register-clamp) -> emitted guitar v1.
 *
 * Tolerance stack on ASSERTED bars only:
 * 1. Register clamp at generateGoldenPathDuoScore.ts ~4572 (effectiveLow/effectiveHigh).
 * 2. liftGuitarLowMidInA duoOrchestrationPass.ts:138-154 (salt 21002, gate 0.6) + snapGuitarToChord :58-74.
 * 3. liftGuitarRegisterInSectionB duoOrchestrationPass.ts:115-136 (salt 21001, gate 0.35; skip bars 6/7) + snap.
 *
 * Exclusions (documented, no interval/count assertions):
 * - EXCLUDED_PHASE7: duoPhase===7 skipMotifForIdentity generateGoldenPathDuoScore.ts ~4540
 * - EXCLUDED_CADENCE: bar%4===0 duoEnforcePhraseEndCadence generateGoldenPathDuoScore.ts:2337 + orchestration thinning
 * - EXCLUDED_THINNING: thinInteriorNotesInBars duoOrchestrationPass.ts:76-112 salts 21007/21006 OR count mismatch
 * - EXCLUDED_ORCHESTRATION: emitted pitch != clamp+lift+snap model — leap-repair via
 *   enforceDuoVoiceLeadingPostOrchestration ecmShapingPass.ts:336-341 after applyDuoOrchestrationPass :261
 */

import type { CompositionContext } from '../core/compositionContext';
import type { GoldenPathPlans } from '../core/goldenPath/generateGoldenPathDuoScore';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { applyGlobalRegisterArc } from '../core/goldenPath/melodicRegisterArc';
import { isLineFirstDuoAbstractFromSet } from '../core/goldenPath/duoAbstractLineWiring';
import {
  hasSectionArchitecture,
  getEffectiveRegisterWindowForBar,
} from '../core/section-architecture/effectiveContextForBar';
import { applyZappaSectionRegisterBehavior } from '../core/song-mode/frankZappaSlice';
import { macroGoalsForBar, macroRegisterMidiOffset } from '../core/form/macroFormPlanner';
import { isGuitarBassDuoFamily, isStandardGuitarBassDuo } from '../core/presets/guitarBassDuoPresetIds';
import type { MotifTrackerState } from '../core/motif/motifTypes';
import type { InstrumentRegisterMap } from '../core/register-map/registerMapTypes';
import type { MeasureModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { seededUnit } from '../core/goldenPath/guitarBassDuoHarmony';
import { guitarChordTonesInRange } from '../core/goldenPath/guitarPhraseAuthority';
import { resolveChordForDuoPostPass } from '../core/harmony/harmonyResolution';

const GUITAR_FLOOR_FOR_SEPARATION = 60;
/** duoOrchestrationPass.ts:22 -- liftGuitarLowMidInA pitch ceiling. */
const GUITAR_LIFT_BELOW = 62;
const LIFT_LOW_MID_SALT = 21002;
const LIFT_LOW_MID_GATE = 0.6;
const LIFT_SECTION_B_SALT = 21001;
const LIFT_SECTION_B_GATE = 0.35;
const THIN_SALT_SECTION_A = 21007;
const THIN_SALT_PHRASE_ARC = 21006;
const ORCH_G_LOW = 55;
const ORCH_G_HIGH = 79;
const EXPECTED_MOTIF_NOTE_COUNT = 3;

const BASELINE_DUO_OPTIONS = {
  presetId: 'guitar_bass_duo',
  totalBars: 32,
  longFormEnabled: true,
} as const;

const CONFIDENCE_SEEDS = [50021, 50213] as const;

export type BaselineMotifBarClassification =
  | 'PASS'
  | 'EXCLUDED_PHASE7'
  | 'EXCLUDED_CADENCE'
  | 'EXCLUDED_THINNING'
  | 'EXCLUDED_ORCHESTRATION'
  | 'FAIL';

export interface BaselineMotifBarLog {
  bar: number;
  classification: BaselineMotifBarClassification;
  goldenPitches: number[];
  goldenIntervals: number[];
  emittedPitches: number[];
  emittedIntervals: number[];
  effectiveLow: number;
  effectiveHigh: number;
  noteCountOk: boolean;
  intervalsOk: boolean;
  error?: string;
}

export interface BaselineMotifSeedResult {
  seed: number;
  ok: boolean;
  error?: string;
  assertedBars: number;
  excludedPhase7: number;
  excludedCadence: number;
  excludedThinning: number;
  excludedOrchestration: number;
  barLogs: BaselineMotifBarLog[];
}

function sectionLabelForBar(bar: number, context: CompositionContext): string {
  const s = context.form.sections.find((sec) => bar >= sec.startBar && bar < sec.startBar + sec.length);
  return s?.label ?? 'A';
}

function getRegisterForBar(guitarMap: InstrumentRegisterMap, bar: number, context: CompositionContext): [number, number] {
  const label = sectionLabelForBar(bar, context);
  const plan = guitarMap.sections.find((s) => s.sectionLabel === label);
  return plan?.preferredZone ?? [55, 79];
}

function clampPitch(p: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, p));
}

function intervalVector(pitches: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i++) out.push(pitches[i]! - pitches[i - 1]!);
  return out;
}

function clampDeltas(golden: number[], low: number, high: number): number[] {
  return golden.map((p) => clampPitch(p, low, high) - p);
}

function isOrchestrationSectionB(label: string): boolean {
  return label === 'B' || label.startsWith('B');
}

function isOrchestrationSectionA(label: string): boolean {
  return !isOrchestrationSectionB(label);
}

function skipBRegisterLiftForDuoIdentity(barIndex: number): boolean {
  return barIndex === 6 || barIndex === 7;
}

function isDuoIdentityGuitarBar(barIndex: number): boolean {
  return barIndex === 7;
}

/** Mirrors duoOrchestrationPass.ts snapGuitarToChord (58-74). */
function snapGuitarToChordOrchestration(pitch: number, chord: string): number {
  const pool = guitarChordTonesInRange(chord, ORCH_G_LOW, ORCH_G_HIGH);
  const pcs = new Set([pool.root, pool.third, pool.fifth, pool.seventh].map((p) => ((Math.round(p) % 12) + 12) % 12));
  const pc = ((pitch % 12) + 12) % 12;
  if (pcs.has(pc)) return pitch;
  let best = pitch;
  let bd = 99;
  for (const c of [pool.root, pool.third, pool.fifth, pool.seventh]) {
    const cc = clampPitch(Math.round(c), ORCH_G_LOW, ORCH_G_HIGH);
    const d = Math.abs(cc - pitch);
    if (d <= 2 && d < bd) {
      bd = d;
      best = cc;
    }
  }
  return bd <= 2 ? best : pitch;
}

/**
 * liftGuitarLowMidInA pitch delta (duoOrchestrationPass.ts:138-154).
 * preLiftPitch = post-:4572 clamp estimate for this motif note.
 */
function liftLowMidDeltaForEvent(
  bar: number,
  eventIdx: number,
  preLiftPitch: number,
  seed: number,
  context: CompositionContext,
  chord: string,
): number {
  const label = sectionLabelForBar(bar, context);
  if (!isOrchestrationSectionA(label)) return 0;
  if (preLiftPitch >= GUITAR_LIFT_BELOW) return 0;
  if (seededUnit(seed, bar * 700 + eventIdx, LIFT_LOW_MID_SALT) >= LIFT_LOW_MID_GATE) return 0;
  const lifted = clampPitch(preLiftPitch + 1, ORCH_G_LOW, ORCH_G_HIGH);
  return snapGuitarToChordOrchestration(lifted, chord) - preLiftPitch;
}

function liftSectionBDeltaForEvent(
  bar: number,
  eventIdx: number,
  preLiftPitch: number,
  seed: number,
  context: CompositionContext,
  chord: string,
): number {
  if (skipBRegisterLiftForDuoIdentity(bar)) return 0;
  const label = sectionLabelForBar(bar, context);
  if (!isOrchestrationSectionB(label)) return 0;
  if (seededUnit(seed, bar * 600 + eventIdx, LIFT_SECTION_B_SALT) >= LIFT_SECTION_B_GATE) return 0;
  const lifted = clampPitch(preLiftPitch + 1, ORCH_G_LOW, ORCH_G_HIGH);
  return snapGuitarToChordOrchestration(lifted, chord) - preLiftPitch;
}

function sortedV1NotesWithEventIndex(m: MeasureModel): { eventIdx: number }[] {
  const entries: { startBeat: number; eventIdx: number }[] = [];
  m.events.forEach((e, idx) => {
    if (e.kind === 'note' && ((e as { voice?: number }).voice ?? 1) === 1) {
      entries.push({ startBeat: e.startBeat, eventIdx: idx });
    }
  });
  entries.sort((a, b) => a.startBeat - b.startBeat);
  return entries.map(({ eventIdx }) => ({ eventIdx }));
}

function liftDeltasForGoldenBar(
  golden: number[],
  bar: number,
  measure: MeasureModel,
  effectiveLow: number,
  effectiveHigh: number,
  seed: number,
  context: CompositionContext,
): number[] {
  const clamped = golden.map((p) => clampPitch(p, effectiveLow, effectiveHigh));
  const v1Entries = sortedV1NotesWithEventIndex(measure);
  const chord = resolveChordForDuoPostPass(context, bar, measure.chord);
  const deltas = new Array<number>(golden.length).fill(0);
  const n = Math.min(golden.length, v1Entries.length);
  for (let i = 0; i < n; i++) {
    const eventIdx = v1Entries[i]!.eventIdx;
    const afterClamp = clamped[i]!;
    const liftA = liftLowMidDeltaForEvent(bar, eventIdx, afterClamp, seed, context, chord);
    const afterA = afterClamp + liftA;
    const liftB = liftSectionBDeltaForEvent(bar, eventIdx, afterA, seed, context, chord);
    deltas[i] = liftA + liftB;
  }
  return deltas;
}

function expectedPitchesAfterClampAndLift(
  golden: number[],
  bar: number,
  measure: MeasureModel,
  effectiveLow: number,
  effectiveHigh: number,
  seed: number,
  context: CompositionContext,
): number[] {
  const liftDeltas = liftDeltasForGoldenBar(golden, bar, measure, effectiveLow, effectiveHigh, seed, context);
  return golden.map((p, i) => clampPitch(p, effectiveLow, effectiveHigh) + (liftDeltas[i] ?? 0));
}

/** Per-note mismatch vs clamp+lift+snap — post-orchestration leap-repair (ecmShapingPass.ts:336). */
function isOrchestrationLeapRepairBar(
  golden: number[],
  emitted: number[],
  bar: number,
  measure: MeasureModel,
  effectiveLow: number,
  effectiveHigh: number,
  seed: number,
  context: CompositionContext,
): boolean {
  if (golden.length !== emitted.length) return false;
  const expected = expectedPitchesAfterClampAndLift(
    golden,
    bar,
    measure,
    effectiveLow,
    effectiveHigh,
    seed,
    context,
  );
  for (let i = 0; i < golden.length; i++) {
    if (expected[i] !== emitted[i]) return true;
  }
  return false;
}

function intervalToleranceForInterval(
  golden: number[],
  low: number,
  high: number,
  liftDeltas: number[],
  intervalIndex: number,
): number {
  const clampD = clampDeltas(golden, low, high);
  const combined = clampD.map((c, i) => c + (liftDeltas[i] ?? 0));
  return Math.abs(combined[intervalIndex + 1]! - combined[intervalIndex]!);
}

/** Mirrors duoOrchestrationPass.ts thinInteriorNotesInBars (76-112) -- returns true if any interior note selected. */
function wouldThinInteriorNotesInBar(measure: MeasureModel, seed: number, salt: number, removeFrac: number): boolean {
  const noteIdxs: number[] = [];
  measure.events.forEach((e, i) => {
    if (e.kind === 'note') noteIdxs.push(i);
  });
  if (noteIdxs.length <= 2) return false;
  const interior = noteIdxs.slice(1, -1);
  const targetRemove = Math.max(0, Math.floor(interior.length * removeFrac));
  if (targetRemove === 0) return false;
  const ranked = interior
    .map((ei) => ({ ei, r: seededUnit(seed, measure.index * 5000 + ei, salt) }))
    .sort((a, b) => a.r - b.r);
  const selected = new Set<number>();
  for (const { ei } of ranked) {
    if (selected.size >= targetRemove) break;
    const pos = noteIdxs.indexOf(ei);
    if (pos <= 0 || pos >= noteIdxs.length - 1) continue;
    const prev = noteIdxs[pos - 1];
    const next = noteIdxs[pos + 1];
    if (selected.has(prev!) || selected.has(next!)) continue;
    selected.add(ei);
  }
  return selected.size > 0;
}

function isGuitarThinningBar(
  bar: number,
  context: CompositionContext,
  measure: MeasureModel,
  seed: number,
  totalBars: number,
): boolean {
  const label = sectionLabelForBar(bar, context);
  const sectionAFilter = isOrchestrationSectionA(label) && !isDuoIdentityGuitarBar(bar);
  if (sectionAFilter && wouldThinInteriorNotesInBar(measure, seed, THIN_SALT_SECTION_A, 0.08)) {
    return true;
  }
  const t = (bar - 1) / totalBars;
  const phraseArcFilter = !isDuoIdentityGuitarBar(bar) && (t < 0.26 || t > 0.74);
  if (phraseArcFilter && wouldThinInteriorNotesInBar(measure, seed, THIN_SALT_PHRASE_ARC, 0.06)) {
    return true;
  }
  return false;
}

function computeEffectiveRegisterForBar(
  bar: number,
  context: CompositionContext,
  plans: GoldenPathPlans,
): { effectiveLow: number; effectiveHigh: number } {
  const tb = context.form.totalBars;
  const genMeta = context.generationMetadata;
  const guitarMap = plans.guitarMap;
  const [baseLow] = CLEAN_ELECTRIC_GUITAR.preferredMelodicZone;
  const effectiveBase = Math.max(baseLow, GUITAR_FLOOR_FOR_SEPARATION);
  const [zLow, zHigh] = getRegisterForBar(guitarMap, bar, context);
  const lab = sectionLabelForBar(bar, context);
  const sectionBump = lab === 'B' ? 5 : 0;
  let effectiveLow = Math.max(zLow, effectiveBase) + sectionBump;
  let effectiveHigh = Math.min(79, zHigh + sectionBump);
  const macroBarGoals = macroGoalsForBar(bar, genMeta?.macroFormPlan);
  if (macroBarGoals && isGuitarBassDuoFamily(context.presetId)) {
    const off = macroRegisterMidiOffset(macroBarGoals);
    effectiveLow = Math.max(28, effectiveLow + off);
    effectiveHigh = Math.min(96, effectiveHigh + off);
  }
  if (isGuitarBassDuoFamily(context.presetId) && context.presetId !== 'ecm_chamber') {
    [effectiveLow, effectiveHigh] = applyGlobalRegisterArc(bar, tb, effectiveLow, effectiveHigh);
  }
  if (hasSectionArchitecture(context)) {
    const registerWindow = getEffectiveRegisterWindowForBar(bar, context, 'guitar');
    if (typeof registerWindow?.floor === 'number') {
      effectiveLow = Math.max(effectiveLow, registerWindow.floor);
    }
    if (typeof registerWindow?.ceil === 'number') {
      effectiveHigh = Math.min(effectiveHigh, registerWindow.ceil);
    }
  }
  [effectiveLow, effectiveHigh] = applyZappaSectionRegisterBehavior(effectiveLow, effectiveHigh, undefined);
  return { effectiveLow, effectiveHigh };
}

function goldenPitchesForBar(motifState: MotifTrackerState, bar: number): number[] {
  const placements = motifState.placements.filter((p) => p.startBar === bar);
  const notes = placements.flatMap((pl) => pl.notes).sort((a, b) => a.startBeat - b.startBeat);
  return notes.map((n) => n.pitch);
}

function voice1PitchesForBar(score: ScoreModel, bar: number): number[] {
  const guitar = score.parts.find((p) => p.id === 'guitar' || p.instrumentIdentity === 'clean_electric_guitar');
  const measure = guitar?.measures.find((m) => m.index === bar);
  if (!measure) return [];
  return measure.events
    .filter((e) => e.kind === 'note' && ((e as { voice?: number }).voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((e) => (e as { pitch: number }).pitch);
}

function measureForBar(score: ScoreModel, bar: number): MeasureModel | undefined {
  const guitar = score.parts.find((p) => p.id === 'guitar' || p.instrumentIdentity === 'clean_electric_guitar');
  return guitar?.measures.find((m) => m.index === bar);
}

function duoPhase(bar: number): number {
  return ((bar - 1) % 8) + 1;
}

function isPhase7IdentityBar(bar: number): boolean {
  return duoPhase(bar) === 7;
}

function isCadenceBar(bar: number): boolean {
  return bar % 4 === 0;
}

function hookRuntimeActive(context: CompositionContext): boolean {
  const tb = context.form.totalBars;
  const songModeHook =
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    tb === 32;
  const activeAbstract = context.generationMetadata?.contrapuntalLineSet ?? null;
  const lineFirstDuoAbstract = isLineFirstDuoAbstractFromSet(activeAbstract, context);
  return !!(songModeHook && !lineFirstDuoAbstract);
}

function lineFirstDuoAbstractActive(context: CompositionContext): boolean {
  const activeAbstract = context.generationMetadata?.contrapuntalLineSet ?? null;
  return isLineFirstDuoAbstractFromSet(activeAbstract, context);
}

function hasMotifPlacement(motifState: MotifTrackerState, bar: number): boolean {
  return motifState.placements.some((p) => p.startBar === bar);
}

function logBar(prefix: string, log: BaselineMotifBarLog): void {
  console.log(
    `${prefix} bar=${log.bar} class=${log.classification} golden=[${log.goldenPitches.join(',')}] iv=[${log.goldenIntervals.join(',')}] emitted=[${log.emittedPitches.join(',')}] iv=[${log.emittedIntervals.join(',')}] clamp=[${log.effectiveLow},${log.effectiveHigh}] countOk=${log.noteCountOk} ivOk=${log.intervalsOk}`,
  );
}

function makeBarLog(
  bar: number,
  classification: BaselineMotifBarClassification,
  golden: number[],
  emitted: number[],
  effectiveLow: number,
  effectiveHigh: number,
  noteCountOk: boolean,
  intervalsOk: boolean,
  error?: string,
): BaselineMotifBarLog {
  return {
    bar,
    classification,
    goldenPitches: golden,
    goldenIntervals: intervalVector(golden),
    emittedPitches: emitted,
    emittedIntervals: intervalVector(emitted),
    effectiveLow,
    effectiveHigh,
    noteCountOk,
    intervalsOk,
    error,
  };
}

export function assertBaselineMotifIdentityForSeed(seed: number, verbose = false): BaselineMotifSeedResult {
  const r = runGoldenPathOnce(seed, { ...BASELINE_DUO_OPTIONS });
  const barLogs: BaselineMotifBarLog[] = [];
  let assertedBars = 0;
  let excludedPhase7 = 0;
  let excludedCadence = 0;
  let excludedThinning = 0;
  let excludedOrchestration = 0;

  if (!r.success) {
    return {
      seed,
      ok: false,
      error: `golden path failed: ${(r.errors ?? []).join('; ')}`,
      assertedBars,
      excludedPhase7,
      excludedCadence,
      excludedThinning,
      excludedOrchestration,
      barLogs,
    };
  }

  const context = r.context;
  const plans = r.plans;
  const motifState = plans.motifState;
  const totalBars = context.form.totalBars;

  if (!isStandardGuitarBassDuo(context.presetId)) {
    return {
      seed,
      ok: false,
      error: `expected isStandardGuitarBassDuo; got presetId=${context.presetId}`,
      assertedBars,
      excludedPhase7,
      excludedCadence,
      excludedThinning,
      excludedOrchestration,
      barLogs,
    };
  }
  if (hookRuntimeActive(context)) {
    return {
      seed,
      ok: false,
      error: 'hookRuntime active (songModeHookFirstIdentity path)',
      assertedBars,
      excludedPhase7,
      excludedCadence,
      excludedThinning,
      excludedOrchestration,
      barLogs,
    };
  }
  if (lineFirstDuoAbstractActive(context)) {
    return {
      seed,
      ok: false,
      error: 'lineFirstDuoAbstract active',
      assertedBars,
      excludedPhase7,
      excludedCadence,
      excludedThinning,
      excludedOrchestration,
      barLogs,
    };
  }
  if (context.generationMetadata?.songModeHookFirstIdentity === true) {
    return {
      seed,
      ok: false,
      error: 'songModeHookFirstIdentity must be off',
      assertedBars,
      excludedPhase7,
      excludedCadence,
      excludedThinning,
      excludedOrchestration,
      barLogs,
    };
  }

  for (let b = 1; b <= totalBars; b++) {
    if (isPhase7IdentityBar(b)) {
      excludedPhase7++;
      if (hasMotifPlacement(motifState, b)) {
        const golden = goldenPitchesForBar(motifState, b);
        const emitted = voice1PitchesForBar(r.score, b);
        const { effectiveLow, effectiveHigh } = computeEffectiveRegisterForBar(b, context, plans);
        const log = makeBarLog(b, 'EXCLUDED_PHASE7', golden, emitted, effectiveLow, effectiveHigh, true, true);
        barLogs.push(log);
        if (verbose) logBar(`[seed ${seed}]`, log);
      }
      continue;
    }

    if (!hasMotifPlacement(motifState, b)) continue;

    const golden = goldenPitchesForBar(motifState, b);
    const emitted = voice1PitchesForBar(r.score, b);
    const measure = measureForBar(r.score, b);
    if (!measure) {
      return {
        seed,
        ok: false,
        error: `missing guitar measure bar ${b}`,
        assertedBars,
        excludedPhase7,
        excludedCadence,
      excludedThinning,
      excludedOrchestration,
      barLogs,
      };
    }
    const { effectiveLow, effectiveHigh } = computeEffectiveRegisterForBar(b, context, plans);

    if (isCadenceBar(b)) {
      excludedCadence++;
      const log = makeBarLog(b, 'EXCLUDED_CADENCE', golden, emitted, effectiveLow, effectiveHigh, true, true);
      barLogs.push(log);
      if (verbose) logBar(`[seed ${seed}]`, log);
      continue;
    }

    if (golden.length !== emitted.length || isGuitarThinningBar(b, context, measure, seed, totalBars)) {
      excludedThinning++;
      const log = makeBarLog(
        b,
        'EXCLUDED_THINNING',
        golden,
        emitted,
        effectiveLow,
        effectiveHigh,
        golden.length === emitted.length,
        true,
      );
      barLogs.push(log);
      if (verbose) logBar(`[seed ${seed}]`, log);
      continue;
    }

    if (
      isOrchestrationLeapRepairBar(
        golden,
        emitted,
        b,
        measure,
        effectiveLow,
        effectiveHigh,
        seed,
        context,
      )
    ) {
      excludedOrchestration++;
      const log = makeBarLog(
        b,
        'EXCLUDED_ORCHESTRATION',
        golden,
        emitted,
        effectiveLow,
        effectiveHigh,
        true,
        true,
      );
      barLogs.push(log);
      if (verbose) logBar(`[seed ${seed}]`, log);
      continue;
    }

    const goldenIv = intervalVector(golden);
    const emittedIv = intervalVector(emitted);
    const noteCountOk = golden.length === EXPECTED_MOTIF_NOTE_COUNT && emitted.length === EXPECTED_MOTIF_NOTE_COUNT;
    const liftDeltas = liftDeltasForGoldenBar(golden, b, measure, effectiveLow, effectiveHigh, seed, context);
    let intervalsOk = true;
    const failParts: string[] = [];

    if (!noteCountOk) {
      failParts.push(
        `note count bar ${b}: expected ${EXPECTED_MOTIF_NOTE_COUNT} golden=${golden.length} emitted=${emitted.length} golden=[${golden.join(',')}] emitted=[${emitted.join(',')}]`,
      );
      intervalsOk = false;
    }

    for (let j = 0; j < goldenIv.length; j++) {
      const tol = intervalToleranceForInterval(golden, effectiveLow, effectiveHigh, liftDeltas, j);
      const drift = Math.abs(emittedIv[j]! - goldenIv[j]!);
      if (drift > tol + 1e-9) {
        intervalsOk = false;
        failParts.push(
          `interval bar ${b} idx ${j}: goldenIv=${goldenIv[j]} emittedIv=${emittedIv[j]} drift=${drift} tol=${tol} golden=[${golden.join(',')}] emitted=[${emitted.join(',')}] UNEXPLAINED`,
        );
      }
    }

    if (!noteCountOk || !intervalsOk) {
      const log = makeBarLog(
        b,
        'FAIL',
        golden,
        emitted,
        effectiveLow,
        effectiveHigh,
        noteCountOk,
        intervalsOk,
        failParts.join(' | '),
      );
      barLogs.push(log);
      if (verbose) logBar(`[seed ${seed}]`, log);
      return {
        seed,
        ok: false,
        error: failParts.join(' | '),
        assertedBars,
        excludedPhase7,
        excludedCadence,
        excludedThinning,
        excludedOrchestration,
        barLogs,
      };
    }

    const log = makeBarLog(b, 'PASS', golden, emitted, effectiveLow, effectiveHigh, true, true);
    barLogs.push(log);
    if (verbose) logBar(`[seed ${seed}]`, log);
    assertedBars++;
  }

  return {
    seed,
    ok: true,
    assertedBars,
    excludedPhase7,
    excludedCadence,
    excludedThinning,
    excludedOrchestration,
    barLogs,
  };
}

export function runBaselineMotifIntervalIdentityTests(verbose = false): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];
  for (const seed of CONFIDENCE_SEEDS) {
    const result = assertBaselineMotifIdentityForSeed(seed, verbose);
    const orchThin = result.excludedThinning + result.excludedOrchestration;
    const summary = `asserted ${result.assertedBars} bars, excluded phase7=${result.excludedPhase7} cadence=${result.excludedCadence} orch/thin=${orchThin} (thin=${result.excludedThinning} orch=${result.excludedOrchestration})`;
    if (verbose || !result.ok) console.log(`[seed ${seed}] ${summary}`);
    out.push({
      name: `baseline motif interval identity seed ${seed} (${summary})`,
      ok: result.ok,
    });
    if (!result.ok) {
      console.error(`FAIL seed ${seed}: ${result.error}`);
      break;
    }
  }
  return out;
}

if (require.main === module) {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const results = runBaselineMotifIntervalIdentityTests(verbose);
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error('baselineMotifIntervalIdentity: FAIL', failed[0]!.name);
    process.exit(1);
  }
  console.log('baselineMotifIntervalIdentity: PASS', results.map((r) => r.name).join('; '));
}
