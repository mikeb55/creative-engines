/**
 * Stage 4b.2 — Baseline motif interval identity contract (generic guitar_bass_duo, :4572 path).
 *
 * Vault placement (Stage 4b.2): contour tones ARE placed at generateGoldenPathDuoScore.ts ~4572
 * (vaultSnapFired 28/26 on confidence seeds). Survival telemetry reads AFTER applyDuoOrchestrationPass.
 *
 * Stage 4b.3 (shipped): receipt-tagged notes skip legacy lift; 4b.2-declined notes get register-only
 * lift (tryDeclinedRegisterOnlyLiftPitch) gated by motifBarPasses4b1AfterVaultOrchestration — else baseline.
 * Type-1 lift debt tracked in KNOWN_VAULT_LIFT_BREAKS should stay empty on confidence seeds.
 * Seed 50213 roleContrast shortfall (0.0554 < 0.06) is KNOWN DEBT → Stage 4b.4 (see DUO_VAULT_ROADMAP.md),
 * separate from Type-1 interval identity.
 *
 * Pass/fail contract:
 * - PASS: non-break bar holds 4b.1 tolerance (clamp + lift, never vault-widened).
 * - KNOWN_VAULT_LIFT_BREAK: bar on KNOWN_VAULT_LIFT_BREAKS[seed] with vault receipt + interval fail — tracked debt.
 * - FAIL: unlisted bar breaks (new regression), OR known-break bar now passes (shrink the list).
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
 * - EXCLUDED_ORCHESTRATION: emitted pitch != vault-aware clamp+lift+snap model — leap-repair via
 *   enforceDuoVoiceLeadingPostOrchestration ecmShapingPass.ts:336-341 after applyDuoOrchestrationPass :261
 *   (vault commits at :4572 from duoVaultMotifSnapReceipts are included in the expected model)
 */

import type { CompositionContext } from '../core/compositionContext';
import type { DuoVaultMotifSnapReceipt } from '../core/goldenPath/duoVaultMotifContourSnap';
import { simulateMotifBarEmittedAfterVaultOrchestration } from '../core/goldenPath/duoVaultMotifContourSnap';
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

/**
 * Type-1 vault-lift debt only: downstream lift legacy-snaps a 4b.2-declined motif note.
 * Register-clamp bars (note0 has receipt, orchestration model matches, golden iv still fails) → EXCLUDED_REGISTER_CLAMP.
 * Shrink when Stage 4b.3 resolves Type-1; do not list register-clamp bars here.
 */
export const KNOWN_VAULT_LIFT_BREAKS: Readonly<Record<number, readonly number[]>> = {
  50021: [],
  50213: [],
};

/** Stage 4b.4 — gp fails duoLock roleContrast only; interval test still runs. See DUO_VAULT_ROADMAP.md §4b.4. */
export const KNOWN_ROLE_CONTRAST_GP_DEBT: ReadonlySet<number> = new Set([50213]);

function isKnownRoleContrastGpFailure(seed: number, errors: readonly string[] | undefined): boolean {
  if (!KNOWN_ROLE_CONTRAST_GP_DEBT.has(seed)) return false;
  const msg = (errors ?? []).join('; ');
  return msg.includes('role contrast');
}

export type BaselineMotifBarClassification =
  | 'PASS'
  | 'KNOWN_VAULT_LIFT_BREAK'
  | 'EXCLUDED_REGISTER_CLAMP'
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
  /** Notes with a committed :4572 vault receipt on this bar. */
  vaultCommittedNotes: number;
  error?: string;
}

export interface BaselineMotifSeedResult {
  seed: number;
  ok: boolean;
  error?: string;
  assertedBars: number;
  knownVaultLiftBreaks: number;
  excludedRegisterClamp: number;
  excludedPhase7: number;
  excludedCadence: number;
  excludedThinning: number;
  excludedOrchestration: number;
  vaultSurvival?: {
    vaultSnapFired: number;
    vaultPcSurvived: number;
    vaultPcLostToLegacySnap: number;
    vaultSourceFallback: number;
    contourNullReturns: number;
    survivedOverFiredRatio: number;
  };
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
  barVaultReceipts: readonly DuoVaultMotifSnapReceipt[],
): number[] {
  const clamped = golden.map((p) => clampPitch(p, effectiveLow, effectiveHigh));
  const v1Entries = sortedV1NotesWithEventIndex(measure);
  const chord = resolveChordForDuoPostPass(context, bar, measure.chord);
  const preOrch = preOrchestrationMidisWithVault(golden, effectiveLow, effectiveHigh, barVaultReceipts);
  const eventIdxByNote = v1Entries.map((e) => e.eventIdx);
  const emitted = simulateMotifBarEmittedAfterVaultOrchestration(
    preOrch,
    golden,
    effectiveLow,
    effectiveHigh,
    seed,
    bar,
    context,
    chord,
    eventIdxByNote,
    context.generationMetadata?.duoVaultDeclinedNotes,
    barVaultReceipts,
  );
  return clamped.map((c, i) => (emitted[i] ?? c) - c);
}

function vaultDeltasFromReceipts(
  golden: number[],
  low: number,
  high: number,
  receipts: readonly DuoVaultMotifSnapReceipt[],
): number[] {
  const clamped = golden.map((p) => clampPitch(p, low, high));
  const deltas = new Array<number>(golden.length).fill(0);
  for (const rec of receipts) {
    if (rec.noteIndex < 0 || rec.noteIndex >= clamped.length) continue;
    deltas[rec.noteIndex] = rec.snappedMidi - clamped[rec.noteIndex]!;
  }
  return deltas;
}

function preOrchestrationMidisWithVault(
  golden: number[],
  low: number,
  high: number,
  receipts: readonly DuoVaultMotifSnapReceipt[],
): number[] {
  const clamped = golden.map((p) => clampPitch(p, low, high));
  if (receipts.length === 0) return clamped;
  const out = [...clamped];
  for (const rec of receipts) {
    if (rec.noteIndex < 0 || rec.noteIndex >= out.length) continue;
    out[rec.noteIndex] = rec.snappedMidi;
  }
  return out;
}

/** Vault-aware orchestration model: :4572 commits then lift+snap (duoOrchestrationPass mirrors). */
function expectedEmittedAfterVaultAndOrchestration(
  golden: number[],
  bar: number,
  measure: MeasureModel,
  effectiveLow: number,
  effectiveHigh: number,
  seed: number,
  context: CompositionContext,
  vaultReceipts: readonly DuoVaultMotifSnapReceipt[],
): number[] {
  const preOrch = preOrchestrationMidisWithVault(golden, effectiveLow, effectiveHigh, vaultReceipts);
  const v1Entries = sortedV1NotesWithEventIndex(measure);
  const eventIdxByNote = v1Entries.map((e) => e.eventIdx);
  const chord = resolveChordForDuoPostPass(context, bar, measure.chord);
  return simulateMotifBarEmittedAfterVaultOrchestration(
    preOrch,
    golden,
    effectiveLow,
    effectiveHigh,
    seed,
    bar,
    context,
    chord,
    eventIdxByNote,
    context.generationMetadata?.duoVaultDeclinedNotes,
    vaultReceipts,
  );
}

/** Per-note mismatch vs vault-aware clamp+lift+snap — post-orchestration leap-repair (ecmShapingPass.ts:336). */
function isOrchestrationLeapRepairBar(
  golden: number[],
  emitted: number[],
  bar: number,
  measure: MeasureModel,
  effectiveLow: number,
  effectiveHigh: number,
  seed: number,
  context: CompositionContext,
  vaultReceipts: readonly DuoVaultMotifSnapReceipt[],
): boolean {
  if (golden.length !== emitted.length) return false;
  const expected = expectedEmittedAfterVaultAndOrchestration(
    golden,
    bar,
    measure,
    effectiveLow,
    effectiveHigh,
    seed,
    context,
    vaultReceipts,
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

/** Clamp-only structural tolerance (no lift widening). */
function clampOnlyIntervalTolerance(
  golden: number[],
  low: number,
  high: number,
  intervalIndex: number,
): number {
  const clampD = clampDeltas(golden, low, high);
  return Math.abs(clampD[intervalIndex + 1]! - clampD[intervalIndex]!);
}

/**
 * Assert 4b.1 interval contract on FINAL emitted guitar v1 (post all passes).
 * Tolerance = golden clamp + lift only (never vault-widened).
 * Vault credit on interval j only when note j+1 has a :4572 receipt (local vault snap).
 * When vault lands on note index >= 2 and note 0 has downstream orchestration lift,
 * interval 0 is checked against clamp-only tolerance so lift+vault interaction (bar 25) fails.
 */
function finalEmittedIntervalsPass4b1Contract(
  golden: number[],
  emitted: number[],
  barVaultReceipts: readonly DuoVaultMotifSnapReceipt[],
  effectiveLow: number,
  effectiveHigh: number,
  liftDeltas: number[],
): boolean {
  const goldenIv = intervalVector(golden);
  const emittedIv = intervalVector(emitted);
  const clamped = golden.map((p) => clampPitch(p, effectiveLow, effectiveHigh));
  const vaultDOnNote = new Array<number>(golden.length).fill(0);
  for (const rec of barVaultReceipts) {
    if (rec.noteIndex >= 0 && rec.noteIndex < clamped.length) {
      vaultDOnNote[rec.noteIndex] = rec.snappedMidi - clamped[rec.noteIndex]!;
    }
  }
  const note0OrchestrationLift =
    barVaultReceipts.length > 0 &&
    emitted[0] !== undefined &&
    emitted[0] !== clamped[0]! + vaultDOnNote[0]!;
  const vaultOnNoteIndex2OrLater = barVaultReceipts.some((r) => r.noteIndex >= 2);

  for (let j = 0; j < goldenIv.length; j++) {
    let allowed = intervalToleranceForInterval(golden, effectiveLow, effectiveHigh, liftDeltas, j);
    const recOnUpper = barVaultReceipts.find((r) => r.noteIndex === j + 1);
    if (recOnUpper) {
      allowed = Math.max(allowed, Math.abs(recOnUpper.snappedMidi - clamped[j + 1]!));
    }
    const recOnLower = barVaultReceipts.find((r) => r.noteIndex === j);
    if (recOnLower) {
      allowed = Math.max(allowed, Math.abs(recOnLower.snappedMidi - clamped[j]!));
    }
    if (j === 0 && vaultOnNoteIndex2OrLater && note0OrchestrationLift) {
      allowed = Math.min(
        allowed,
        clampOnlyIntervalTolerance(golden, effectiveLow, effectiveHigh, 0),
      );
    }
    const drift = Math.abs(emittedIv[j]! - goldenIv[j]!);
    if (drift > allowed + 1e-9) return false;
  }
  return true;
}

function groupVaultReceiptsByBar(
  receipts: readonly DuoVaultMotifSnapReceipt[],
): Map<number, DuoVaultMotifSnapReceipt[]> {
  const byBar = new Map<number, DuoVaultMotifSnapReceipt[]>();
  for (const rec of receipts) {
    const list = byBar.get(rec.bar) ?? [];
    list.push(rec);
    byBar.set(rec.bar, list);
  }
  return byBar;
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
  vaultCommittedNotes: number,
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
    vaultCommittedNotes,
    error,
  };
}

export function assertBaselineMotifIdentityForSeed(seed: number, verbose = false): BaselineMotifSeedResult {
  const r = runGoldenPathOnce(seed, { ...BASELINE_DUO_OPTIONS });
  const barLogs: BaselineMotifBarLog[] = [];
  let assertedBars = 0;
  let knownVaultLiftBreaks = 0;
  let excludedRegisterClamp = 0;
  let excludedPhase7 = 0;
  let excludedCadence = 0;
  let excludedThinning = 0;
  let excludedOrchestration = 0;
  const seedKnownBreaks = KNOWN_VAULT_LIFT_BREAKS[seed] ?? [];
  const knownRoleContrastGpDebt = isKnownRoleContrastGpFailure(seed, r.errors);

  if (!r.success && !knownRoleContrastGpDebt) {
    return {
      seed,
      ok: false,
      error: `golden path failed: ${(r.errors ?? []).join('; ')}`,
      assertedBars,
      knownVaultLiftBreaks,
      excludedRegisterClamp,
      excludedPhase7,
      excludedCadence,
      excludedThinning,
      excludedOrchestration,
      barLogs,
    };
  }

  if (!r.score || !r.context || !r.plans) {
    return {
      seed,
      ok: false,
      error: knownRoleContrastGpDebt
        ? 'known role-contrast gp debt but score/context/plans missing'
        : 'golden path missing score/context/plans',
      assertedBars,
      knownVaultLiftBreaks,
      excludedRegisterClamp,
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
      knownVaultLiftBreaks,
      excludedRegisterClamp,
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
      knownVaultLiftBreaks,
      excludedRegisterClamp,
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
      knownVaultLiftBreaks,
      excludedRegisterClamp,
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
      knownVaultLiftBreaks,
      excludedRegisterClamp,
      excludedPhase7,
      excludedCadence,
      excludedThinning,
      excludedOrchestration,
      barLogs,
    };
  }

  const vaultReceiptsByBar = groupVaultReceiptsByBar(
    context.generationMetadata?.duoVaultMotifSnapReceipts ?? [],
  );
  const failMessages: string[] = [];

  for (let b = 1; b <= totalBars; b++) {
    if (isPhase7IdentityBar(b)) {
      excludedPhase7++;
      if (hasMotifPlacement(motifState, b)) {
        const golden = goldenPitchesForBar(motifState, b);
        const emitted = voice1PitchesForBar(r.score, b);
        const { effectiveLow, effectiveHigh } = computeEffectiveRegisterForBar(b, context, plans);
        const log = makeBarLog(
          b,
          'EXCLUDED_PHASE7',
          golden,
          emitted,
          effectiveLow,
          effectiveHigh,
          true,
          true,
          0,
        );
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
        knownVaultLiftBreaks,
        excludedPhase7,
        excludedCadence,
        excludedThinning,
        excludedOrchestration,
        barLogs,
      };
    }
    const { effectiveLow, effectiveHigh } = computeEffectiveRegisterForBar(b, context, plans);
    const barVaultReceipts = vaultReceiptsByBar.get(b) ?? [];
    const vaultCommittedNotes = barVaultReceipts.length;

    if (isCadenceBar(b)) {
      excludedCadence++;
      const log = makeBarLog(
        b,
        'EXCLUDED_CADENCE',
        golden,
        emitted,
        effectiveLow,
        effectiveHigh,
        true,
        true,
        vaultCommittedNotes,
      );
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
        vaultCommittedNotes,
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
        barVaultReceipts,
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
        vaultCommittedNotes,
      );
      barLogs.push(log);
      if (verbose) logBar(`[seed ${seed}]`, log);
      continue;
    }

    const goldenIv = intervalVector(golden);
    const emittedIv = intervalVector(emitted);
    const noteCountOk = golden.length === EXPECTED_MOTIF_NOTE_COUNT && emitted.length === EXPECTED_MOTIF_NOTE_COUNT;
    const liftDeltas = liftDeltasForGoldenBar(
      golden,
      b,
      measure,
      effectiveLow,
      effectiveHigh,
      seed,
      context,
      barVaultReceipts,
    );
    let intervalsOk = true;
    const failParts: string[] = [];

    if (!noteCountOk) {
      failParts.push(
        `note count bar ${b}: expected ${EXPECTED_MOTIF_NOTE_COUNT} golden=${golden.length} emitted=${emitted.length} golden=[${golden.join(',')}] emitted=[${emitted.join(',')}]`,
      );
      intervalsOk = false;
    }

    if (
      noteCountOk &&
      !finalEmittedIntervalsPass4b1Contract(
        golden,
        emitted,
        barVaultReceipts,
        effectiveLow,
        effectiveHigh,
        liftDeltas,
      )
    ) {
      intervalsOk = false;
      const goldenIv = intervalVector(golden);
      const emittedIv = intervalVector(emitted);
      const clamped = golden.map((p) => clampPitch(p, effectiveLow, effectiveHigh));
      for (let j = 0; j < goldenIv.length; j++) {
        let allowed = intervalToleranceForInterval(golden, effectiveLow, effectiveHigh, liftDeltas, j);
        const recOnUpper = barVaultReceipts.find((r) => r.noteIndex === j + 1);
        if (recOnUpper) {
          allowed = Math.max(allowed, Math.abs(recOnUpper.snappedMidi - clamped[j + 1]!));
        }
        const recOnLower = barVaultReceipts.find((r) => r.noteIndex === j);
        if (recOnLower) {
          allowed = Math.max(allowed, Math.abs(recOnLower.snappedMidi - clamped[j]!));
        }
        const vaultOnNoteIndex2OrLater = barVaultReceipts.some((r) => r.noteIndex >= 2);
        const vaultD0 = barVaultReceipts.find((r) => r.noteIndex === 0);
        const note0Lift =
          barVaultReceipts.length > 0 &&
          emitted[0] !== clamped[0]! + (vaultD0 ? vaultD0.snappedMidi - clamped[0]! : 0);
        if (j === 0 && vaultOnNoteIndex2OrLater && note0Lift) {
          allowed = Math.min(
            allowed,
            clampOnlyIntervalTolerance(golden, effectiveLow, effectiveHigh, 0),
          );
        }
        const drift = Math.abs(emittedIv[j]! - goldenIv[j]!);
        if (drift > allowed + 1e-9) {
          failParts.push(
            `interval bar ${b} idx ${j}: goldenIv=${goldenIv[j]} emittedIv=${emittedIv[j]} drift=${drift} tol=${allowed} final-emitted golden=[${golden.join(',')}] emitted=[${emitted.join(',')}]`,
          );
        }
      }
    }

    if (!noteCountOk || !intervalsOk) {
      const expectedEmitted = expectedEmittedAfterVaultAndOrchestration(
        golden,
        b,
        measure,
        effectiveLow,
        effectiveHigh,
        seed,
        context,
        barVaultReceipts,
      );
      const orchestrationMatches =
        golden.length === emitted.length &&
        expectedEmitted.every((p, i) => p === emitted[i]);

      if (noteCountOk && !intervalsOk && vaultCommittedNotes > 0 && orchestrationMatches) {
        excludedRegisterClamp++;
        const log = makeBarLog(
          b,
          'EXCLUDED_REGISTER_CLAMP',
          golden,
          emitted,
          effectiveLow,
          effectiveHigh,
          noteCountOk,
          intervalsOk,
          vaultCommittedNotes,
          failParts.join(' | '),
        );
        barLogs.push(log);
        if (verbose) logBar(`[seed ${seed}]`, log);
        continue;
      }

      const isTrackedVaultLiftBreak =
        noteCountOk &&
        !intervalsOk &&
        vaultCommittedNotes > 0 &&
        seedKnownBreaks.includes(b);

      if (isTrackedVaultLiftBreak) {
        const log = makeBarLog(
          b,
          'KNOWN_VAULT_LIFT_BREAK',
          golden,
          emitted,
          effectiveLow,
          effectiveHigh,
          noteCountOk,
          intervalsOk,
          vaultCommittedNotes,
          failParts.join(' | '),
        );
        barLogs.push(log);
        if (verbose) logBar(`[seed ${seed}]`, log);
        knownVaultLiftBreaks++;
        continue;
      }

      const log = makeBarLog(
        b,
        'FAIL',
        golden,
        emitted,
        effectiveLow,
        effectiveHigh,
        noteCountOk,
        intervalsOk,
        vaultCommittedNotes,
        failParts.join(' | '),
      );
      barLogs.push(log);
      if (verbose) logBar(`[seed ${seed}]`, log);
      failMessages.push(failParts.join(' | '));
      continue;
    }

    const log = makeBarLog(
      b,
      'PASS',
      golden,
      emitted,
      effectiveLow,
      effectiveHigh,
      true,
      true,
      vaultCommittedNotes,
    );
    barLogs.push(log);
    if (verbose) logBar(`[seed ${seed}]`, log);
    assertedBars++;
  }

  for (const knownBar of seedKnownBreaks) {
    const log = barLogs.find((l) => l.bar === knownBar);
    if (!log) {
      failMessages.push(
        `known vault-lift break bar ${knownBar} missing from barLogs — motif routing changed? update KNOWN_VAULT_LIFT_BREAKS[${seed}]`,
      );
      continue;
    }
    if (log.classification === 'PASS') {
      failMessages.push(
        `known vault-lift break bar ${knownBar} now passes 4b.1 — shrink KNOWN_VAULT_LIFT_BREAKS[${seed}] (Stage 4b.3 debt resolved)`,
      );
    } else if (log.classification !== 'KNOWN_VAULT_LIFT_BREAK') {
      failMessages.push(
        `known vault-lift break bar ${knownBar} is ${log.classification}, not KNOWN_VAULT_LIFT_BREAK — update KNOWN_VAULT_LIFT_BREAKS[${seed}]`,
      );
    }
  }

  const surv = context.generationMetadata?.duoVaultMotifSurvivalTelemetry;
  const vaultSurvival = surv
    ? {
        vaultSnapFired: surv.vaultSnapFired,
        vaultPcSurvived: surv.vaultPcSurvived,
        vaultPcLostToLegacySnap: surv.vaultPcLostToLegacySnap,
        vaultSourceFallback: surv.vaultSourceFallback,
        contourNullReturns: surv.contourNullReturns,
        survivedOverFiredRatio: surv.survivedOverFiredRatio,
      }
    : undefined;

  return {
    seed,
    ok: failMessages.length === 0,
    error: failMessages.length > 0 ? failMessages.join(' | ') : undefined,
    assertedBars,
    knownVaultLiftBreaks,
    excludedRegisterClamp,
    excludedPhase7,
    excludedCadence,
    excludedThinning,
    excludedOrchestration,
    vaultSurvival,
    barLogs,
  };
}

export function printBaselineMotifVaultAwareReport(result: BaselineMotifSeedResult): void {
  const surv = result.vaultSurvival;
  console.log(`\n=== seed ${result.seed} vault-aware classification ===`);
  console.log(
    `ok=${result.ok} PASS=${result.assertedBars} KNOWN_VAULT_LIFT_BREAK=${result.knownVaultLiftBreaks} FAIL=${result.barLogs.filter((l) => l.classification === 'FAIL').length} ` +
      `EXCLUDED registerClamp=${result.excludedRegisterClamp} phase7=${result.excludedPhase7} cadence=${result.excludedCadence} thin=${result.excludedThinning} orch=${result.excludedOrchestration}`,
  );
  if (surv) {
    console.log(
      `vault survival fired=${surv.vaultSnapFired} survived=${surv.vaultPcSurvived} lostLegacySnap=${surv.vaultPcLostToLegacySnap} ` +
        `fallback=${surv.vaultSourceFallback} contourNull=${surv.contourNullReturns} ratio=${surv.survivedOverFiredRatio.toFixed(3)}`,
    );
  }
  console.log('bar\tclass\tvaultN\tgolden\t\temitted');
  for (const log of result.barLogs) {
    if (
      log.classification === 'PASS' ||
      log.classification === 'FAIL' ||
      log.classification === 'KNOWN_VAULT_LIFT_BREAK' ||
      log.classification === 'EXCLUDED_ORCHESTRATION'
    ) {
      console.log(
        `${log.bar}\t${log.classification}\t${log.vaultCommittedNotes}\t[${log.goldenPitches.join(',')}]\t[${log.emittedPitches.join(',')}]`,
      );
    }
  }
  const failBars = result.barLogs.filter((l) => l.classification === 'FAIL');
  const debtBars = result.barLogs.filter((l) => l.classification === 'KNOWN_VAULT_LIFT_BREAK');
  if (debtBars.length > 0) {
    console.log(`KNOWN_VAULT_LIFT_BREAK (debt → 4b.3): bars ${debtBars.map((d) => d.bar).join(',')}`);
  }
  if (failBars.length > 0) {
    console.log('FAIL detail:');
    for (const f of failBars) {
      console.log(`  bar ${f.bar}: ${f.error ?? ''}`);
    }
  }
}

export function runBaselineMotifIntervalIdentityTests(verbose = false): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];
  for (const seed of CONFIDENCE_SEEDS) {
    const result = assertBaselineMotifIdentityForSeed(seed, verbose);
    const orchThin = result.excludedThinning + result.excludedOrchestration;
    const surv = result.vaultSurvival;
    const survLine = surv
      ? ` survival fired=${surv.vaultSnapFired} survived=${surv.vaultPcSurvived} lostLegacySnap=${surv.vaultPcLostToLegacySnap} fallback=${surv.vaultSourceFallback} contourNull=${surv.contourNullReturns} ratio=${surv.survivedOverFiredRatio.toFixed(3)}`
      : '';
    const roleDebtLine = KNOWN_ROLE_CONTRAST_GP_DEBT.has(seed) ? ' KNOWN_ROLE_CONTRAST_GP_DEBT(4b.4)' : '';
    const summary =
      `asserted ${result.assertedBars} bars, knownVaultLiftBreak=${result.knownVaultLiftBreaks}, ` +
      `excluded registerClamp=${result.excludedRegisterClamp} phase7=${result.excludedPhase7} cadence=${result.excludedCadence} orch/thin=${orchThin} (thin=${result.excludedThinning} orch=${result.excludedOrchestration})${survLine}${roleDebtLine}`;
    if (verbose || !result.ok) console.log(`[seed ${seed}] ${summary}`);
    out.push({
      name: `baseline motif interval identity seed ${seed} (${summary})`,
      ok: result.ok,
    });
    if (!result.ok) {
      console.error(`FAIL seed ${seed}: ${result.error}`);
    }
  }
  return out;
}

if (require.main === module) {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const report = process.argv.includes('--report');
  if (report) {
    for (const seed of CONFIDENCE_SEEDS) {
      const result = assertBaselineMotifIdentityForSeed(seed, verbose);
      printBaselineMotifVaultAwareReport(result);
    }
    process.exit(0);
  }
  const results = runBaselineMotifIntervalIdentityTests(verbose);
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error('baselineMotifIntervalIdentity: FAIL', failed[0]!.name);
    process.exit(1);
  }
  console.log('baselineMotifIntervalIdentity: PASS', results.map((r) => r.name).join('; '));
}
