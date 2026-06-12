/**
 * Bartok CLE two-stage pitch scorer (default duo path).
 * Authority: docs/bartok_pitch_spec.md
 */

import type { CompositionContext } from '../compositionContext';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type {
  AbstractLineSet,
  DensityEnvelope,
  ImitationEvent,
  LineRole,
  LineRoleTag,
  NoteEvent,
} from './abstractLineSet';
import { bartokAccentFitScore } from './bartokPitchScoringAccent';
import {
  BARTOK_PITCH_ADDITIVE_OFFSET,
  BARTOK_PITCH_AXIS_FUNCTIONS,
  BARTOK_PITCH_AXIS_TRANSITION,
  BARTOK_PITCH_BEAM_WIDTH,
  BARTOK_PITCH_CELL_LIBRARY,
  BARTOK_PITCH_COLLECTIONS,
  BARTOK_PITCH_ENSEMBLE_MULTIPLIERS,
  BARTOK_PITCH_ENSEMBLE_WEIGHTS,
  BARTOK_PITCH_IMITATION_INTERVAL,
  BARTOK_PITCH_IMITATION_PRIORS,
  BARTOK_PITCH_LEAP_WINDOW,
  BARTOK_PITCH_MIN_VERTICAL_GAP,
  BARTOK_PITCH_OCTATONIC_DEVELOPMENTAL,
  BARTOK_PITCH_SHORTLIST_SIZE,
  BARTOK_PITCH_SOPRANO_LEAP_CAP,
  BARTOK_PITCH_STRUCTURAL_PRIORITY,
  BARTOK_PITCH_SUBSTREAM_SALTS,
  BARTOK_PITCH_TENOR_DELAY_BARS,
  BARTOK_PITCH_TENOR_PHASE,
  BARTOK_PITCH_TUPLE_COUNT,
  BARTOK_PITCH_VOICE_COLLECTION_BIAS,
  BARTOK_PITCH_VOICE_EXPONENTS,
  BARTOK_PITCH_VOICE_MIDI_RANGE,
  BARTOK_PITCH_INVERSION_ENSEMBLE_SUSTAIN_MIN,
  BARTOK_PITCH_INVERSION_SIGN_MIN_FRACTION,
  BARTOK_PITCH_INVERSION_SIGN_PENALTY,
  BARTOK_PITCH_INVERSION_SPOT_NEUTRAL_CAP,
  BARTOK_PITCH_INVERSION_SUSTAIN_MIN_FRACTION,
  BARTOK_PITCH_INVERSION_SUSTAIN_PEAK,
  BARTOK_PITCH_INVERSION_WINDOW_MAX_NOTES,
  BARTOK_PITCH_INVERSION_WINDOW_MIN_NOTES,
  BARTOK_PITCH_CLIMAX_APPROACH_HALF_WIDTH,
  BARTOK_PITCH_CLIMAX_CELL_BOOST,
  BARTOK_PITCH_CLIMAX_CELL_IDS,
  BARTOK_PITCH_CLIMAX_CENTER_T,
  BARTOK_PITCH_CLIMAX_CONTOUR_CALM_BOOST,
  BARTOK_PITCH_CLIMAX_CONTRACTION_BOOST,
  BARTOK_PITCH_CLIMAX_INTERVAL_CONTENT_BOOST,
  BARTOK_PITCH_CLIMAX_INTERVAL_MINOR3_SEMITONES,
  BARTOK_PITCH_CLIMAX_INTERVAL_TRITONE_SEMITONES,
  BARTOK_PITCH_CLIMAX_REGISTER_BOOST_MAX,
  BARTOK_PITCH_CLIMAX_REGISTER_PENALTY_MIN,
  BARTOK_PITCH_EARLY_PHRASE_MAX_T,
  BARTOK_PITCH_PHRASE_SLOTS,
  BARTOK_PITCH_SPREAD_EARLY_MAX_SEMITONES,
  BARTOK_PITCH_SPREAD_POST_CLIMAX_TARGET_SEMITONES,
  BARTOK_PITCH_SPREAD_TARGET_MIN_SEMITONES,
  BARTOK_PITCH_SPREAD_TARGET_PEAK_SEMITONES,
  type BartokCollectionSpec,
  type BartokScorerExponentDim,
} from './bartokPitchScoringConfig';
import type {
  BartokActiveFunction,
  BartokCollectionId,
  BartokImitationMode,
  BartokPitchCandidateTrace,
  BartokPitchScoringTrace,
  BartokPitchScoringSlotRef,
  BartokPitchTupleTrace,
  BartokTransformationKind,
  CellLibraryEntry,
} from './bartokPitchScoringTypes';

const VOICE_ORDER: readonly LineRole[] = ["soprano", "alto", "tenor", "bass"];

const AXIS_PCS: Readonly<Record<BartokActiveFunction, readonly number[]>> = {
  tonic_axis: [0, 7, 5],
  dominant_axis: [7, 2, 11],
  subdominant_axis: [5, 3, 10],
};

type VoiceMidiState = Record<LineRole, number | null>;

type PhraseState = {
  cell: CellLibraryEntry;
  activeFunction: BartokActiveFunction;
  collectionId: BartokCollectionId;
  imitationMode: BartokImitationMode;
};

function rng01(seed: number, salt: number): number {
  let x = Math.imul(seed + salt * 7919, 1103515245) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  return (x % 100000) / 100000;
}

function rootPcFromBarSymbol(symbol: string): number {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(/^([A-G](?:#|b)?)/i);
  const name = m?.[1] ?? "C";
  const key = name.charAt(0).toUpperCase() + name.slice(1);
  return noteNameToPitchClass(key) ?? 0;
}

function pcRelativeToTonic(midi: number, tonicPc: number): number {
  return ((midi % 12) - tonicPc + 12) % 12;
}

function weightedPick<T extends { weight: number }>(items: readonly T[], seed: number, salt: number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng01(seed, salt) * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

function pickImitationMode(seed: number, phraseIndex: number): BartokImitationMode {
  const items = (Object.keys(BARTOK_PITCH_IMITATION_PRIORS) as BartokImitationMode[]).map((id) => ({
    id,
    weight: BARTOK_PITCH_IMITATION_PRIORS[id],
  }));
  return weightedPick(items, seed, 17 + phraseIndex).id;
}

function pickCell(seed: number, phraseIndex: number): CellLibraryEntry {
  const items = BARTOK_PITCH_CELL_LIBRARY.map((c) => ({ item: c, weight: c.priorWeight }));
  return weightedPick(items, seed, BARTOK_PITCH_SUBSTREAM_SALTS.shortlist + phraseIndex).item;
}

function pickCollection(seed: number, phraseIndex: number, developmental: boolean): BartokCollectionId {
  const items = BARTOK_PITCH_COLLECTIONS.map((c) => ({
    id: c.id,
    weight: c.id === "octatonic" && developmental ? BARTOK_PITCH_OCTATONIC_DEVELOPMENTAL : c.baseWeight,
  }));
  return weightedPick(items, seed, 31 + phraseIndex).id;
}

function pickNextAxis(
  seed: number,
  phraseIndex: number,
  prev: BartokActiveFunction,
  streak: number,
): BartokActiveFunction {
  const row = { ...BARTOK_PITCH_AXIS_TRANSITION[prev] };
  if (streak >= 2) row[prev] = 0;
  const items = BARTOK_PITCH_AXIS_FUNCTIONS.map((fn) => ({ fn, weight: row[fn] }));
  const total = items.reduce((s, i) => s + i.weight, 0);
  const normalized = total > 0 ? items : BARTOK_PITCH_AXIS_FUNCTIONS.map((fn) => ({ fn, weight: 1 }));
  const pick = weightedPick(
    normalized.map((i) => ({ ...i, weight: i.weight / (total || normalized.length) })),
    seed,
    BARTOK_PITCH_SUBSTREAM_SALTS.axisTransition + phraseIndex,
  );
  return pick.fn;
}

function collectionSpec(id: BartokCollectionId): BartokCollectionSpec {
  return BARTOK_PITCH_COLLECTIONS.find((c) => c.id === id)!;
}


function collectionFit(midi: number, tonicPc: number, role: LineRole, collId: BartokCollectionId, developmental: boolean): number {
  const spec = collectionSpec(collId);
  const rel = pcRelativeToTonic(midi, tonicPc);
  const pcW = spec.pcWeights[rel] ?? spec.othersWeight;
  const base = collId === "octatonic" && developmental ? BARTOK_PITCH_OCTATONIC_DEVELOPMENTAL : spec.baseWeight;
  return pcW * base * BARTOK_PITCH_VOICE_COLLECTION_BIAS[role][collId];
}

function axisFit(midi: number, tonicPc: number, fn: BartokActiveFunction): number {
  const rel = pcRelativeToTonic(midi, tonicPc);
  const pcs = AXIS_PCS[fn];
  if (pcs.includes(rel)) return 1;
  const dist = Math.min(...pcs.map((p) => Math.min(Math.abs(rel - p), 12 - Math.abs(rel - p))));
  return Math.max(0.35, 1 - dist * 0.12);
}

function cellFit(prev: number | null, midi: number, cell: CellLibraryEntry, slotInPhrase: number): number {
  if (prev == null || slotInPhrase === 0) return 0.85;
  const expected = cell.intervals[(slotInPhrase - 1) % 4] ?? 0;
  return Math.max(0.2, 1 - Math.abs(midi - prev - expected) * 0.08);
}

type BassAltoImitationCtx = {
  phrase: PhraseState;
  slotInPhrase: number;
  tonicPc: number;
  sopranoMidi: number;
  sopranoPrev: number | null;
  globalSlotIndex: number;
  sopranoHistory: readonly number[];
  altoHistory: readonly number[];
  bassHistory: readonly number[];
};

type InversionWindowResult = {
  fraction: number;
  signOkFraction: number;
  intervalCount: number;
};

function sourceMotifInterval(ctx: BassAltoImitationCtx): number {
  if (ctx.slotInPhrase > 0 && ctx.sopranoPrev != null) {
    return ctx.sopranoMidi - ctx.sopranoPrev;
  }
  if (ctx.globalSlotIndex >= 4) {
    const prevPhraseSoprano = ctx.sopranoHistory[ctx.globalSlotIndex - 4];
    if (prevPhraseSoprano != null) return ctx.sopranoMidi - prevPhraseSoprano;
  }
  return ctx.phrase.cell.intervals[0] ?? 0;
}

function expectedResponseInterval(
  mode: BartokImitationMode,
  sourceInterval: number,
  phrase: PhraseState,
  slotInPhrase: number,
): number {
  switch (mode) {
    case 'strict_transposition':
      return sourceInterval;
    case 'strict_interval_cycle':
      return slotInPhrase === 0
        ? phrase.cell.intervals[0] ?? sourceInterval
        : phrase.cell.intervals[(slotInPhrase - 1) % 4] ?? sourceInterval;
    case 'inversional_imitation':
      return -sourceInterval;
    case 'contrary_axis_response':
      return -sourceInterval;
    case 'free_counterpoint_with_motif_echo':
      return slotInPhrase === 0
        ? phrase.cell.intervals[0] ?? sourceInterval
        : phrase.cell.intervals[(slotInPhrase - 1) % 4] ?? sourceInterval;
  }
}

function expectedResponseMidi(prev: number | null, expectedInterval: number, role: LineRole): number | null {
  if (prev == null) return null;
  const { min, max } = BARTOK_PITCH_VOICE_MIDI_RANGE[role];
  const target = prev + expectedInterval;
  if (target < min || target > max) return null;
  return target;
}

function classifyTransformation(
  mode: BartokImitationMode,
  actualInterval: number,
  expectedInterval: number,
  sourceInterval: number,
): BartokTransformationKind {
  if (Math.abs(actualInterval - expectedInterval) <= 1) {
    switch (mode) {
      case 'inversional_imitation':
        return 'inversional';
      case 'contrary_axis_response':
        return 'contrary_axis';
      case 'strict_interval_cycle':
        return 'interval_cycle';
      case 'strict_transposition':
        return 'transposition';
      case 'free_counterpoint_with_motif_echo':
        return 'motif_echo';
    }
  }
  if (
    (mode === 'inversional_imitation' || mode === 'contrary_axis_response') &&
    sourceInterval !== 0 &&
    actualInterval !== 0 &&
    Math.sign(actualInterval) === Math.sign(sourceInterval)
  ) {
    return 'parallel_penalty';
  }
  return 'neutral';
}

function sopranoIntervalAtSlot(
  k: number,
  sopranoHistory: readonly number[],
  phrase: PhraseState,
): number | null {
  const sop = sopranoHistory[k];
  if (sop == null) return null;
  const slotInPhrase = k % 4;
  if (slotInPhrase > 0) {
    const prev = sopranoHistory[k - 1];
    if (prev == null) return null;
    return sop - prev;
  }
  if (k >= 4) {
    const prevPhraseSoprano = sopranoHistory[k - 4];
    if (prevPhraseSoprano != null) return sop - prevPhraseSoprano;
  }
  return phrase.cell.intervals[0] ?? 0;
}

function voiceMidiAtSlot(
  role: 'alto' | 'bass',
  k: number,
  globalSlotIndex: number,
  candidateMidi: number,
  altoHistory: readonly number[],
  bassHistory: readonly number[],
): number | null {
  if (k === globalSlotIndex) return candidateMidi;
  const history = role === 'alto' ? altoHistory : bassHistory;
  const midi = history[k];
  return midi == null ? null : midi;
}

function voiceIntervalAtSlot(
  role: 'alto' | 'bass',
  k: number,
  globalSlotIndex: number,
  candidateMidi: number,
  altoHistory: readonly number[],
  bassHistory: readonly number[],
): number | null {
  if (k <= 0) return null;
  const midi = voiceMidiAtSlot(role, k, globalSlotIndex, candidateMidi, altoHistory, bassHistory);
  const prev = voiceMidiAtSlot(role, k - 1, globalSlotIndex, candidateMidi, altoHistory, bassHistory);
  if (midi == null || prev == null) return null;
  return midi - prev;
}

function computeInversionWindowScore(
  role: 'alto' | 'bass',
  candidateMidi: number,
  ctx: BassAltoImitationCtx,
): InversionWindowResult | null {
  const mode = ctx.phrase.imitationMode;
  if (mode !== 'inversional_imitation' && mode !== 'contrary_axis_response') return null;

  const phraseStart = ctx.globalSlotIndex - ctx.slotInPhrase;
  const notesInPhrase = ctx.slotInPhrase + 1;
  const windowNotes = Math.min(BARTOK_PITCH_INVERSION_WINDOW_MAX_NOTES, notesInPhrase);
  let windowStart = ctx.globalSlotIndex - windowNotes + 1;
  if (windowStart < phraseStart) windowStart = phraseStart;
  const effectiveNotes = ctx.globalSlotIndex - windowStart + 1;
  const intervalCount = effectiveNotes - 1;
  if (intervalCount < 1) {
    return { fraction: 0, signOkFraction: 0, intervalCount: 0 };
  }

  let hits = 0;
  let signOk = 0;
  let evaluated = 0;
  for (let k = windowStart + 1; k <= ctx.globalSlotIndex; k++) {
    const source = sopranoIntervalAtSlot(k, ctx.sopranoHistory, ctx.phrase);
    const actual = voiceIntervalAtSlot(
      role,
      k,
      ctx.globalSlotIndex,
      candidateMidi,
      ctx.altoHistory,
      ctx.bassHistory,
    );
    if (source == null || actual == null) continue;
    const slotInPhrase = k % 4;
    const expected = expectedResponseInterval(mode, source, ctx.phrase, slotInPhrase);
    evaluated += 1;
    const kind = classifyTransformation(mode, actual, expected, source);
    if (kind === 'inversional' || kind === 'contrary_axis') hits += 1;
    if (source !== 0 && actual !== 0 && Math.sign(actual) !== Math.sign(source)) signOk += 1;
  }

  if (evaluated === 0) {
    return { fraction: 0, signOkFraction: 0, intervalCount: 0 };
  }
  return {
    fraction: hits / evaluated,
    signOkFraction: signOk / evaluated,
    intervalCount,
  };
}

function inversionWindowImitationBoost(window: InversionWindowResult): number | null {
  if (window.intervalCount < BARTOK_PITCH_INVERSION_WINDOW_MIN_NOTES - 1) return null;
  if (window.fraction < BARTOK_PITCH_INVERSION_SUSTAIN_MIN_FRACTION) return null;
  const span = 1 - BARTOK_PITCH_INVERSION_SUSTAIN_MIN_FRACTION;
  const t = span > 0 ? (window.fraction - BARTOK_PITCH_INVERSION_SUSTAIN_MIN_FRACTION) / span : 1;
  let windowScore =
    BARTOK_PITCH_INVERSION_SPOT_NEUTRAL_CAP +
    (BARTOK_PITCH_INVERSION_SUSTAIN_PEAK - BARTOK_PITCH_INVERSION_SPOT_NEUTRAL_CAP) * Math.min(1, Math.max(0, t));
  if (window.signOkFraction < BARTOK_PITCH_INVERSION_SIGN_MIN_FRACTION) {
    windowScore *= BARTOK_PITCH_INVERSION_SIGN_PENALTY;
  }
  return windowScore;
}

function imitationFit(
  role: LineRole,
  midi: number,
  prev: number | null,
  leadMidi: number | null,
  bassAltoCtx?: BassAltoImitationCtx,
): number {
  if (role === 'tenor') {
    if (leadMidi == null) return 0.7;
    return Math.max(0.25, 1 - Math.abs(midi - (leadMidi + BARTOK_PITCH_IMITATION_INTERVAL)) * 0.1);
  }
  if (role !== 'alto' && role !== 'bass') return 0.7;
  if (prev == null || !bassAltoCtx) return 0.85;

  const source = sourceMotifInterval(bassAltoCtx);
  const expected = expectedResponseInterval(
    bassAltoCtx.phrase.imitationMode,
    source,
    bassAltoCtx.phrase,
    bassAltoCtx.slotInPhrase,
  );
  const actual = midi - prev;
  const mode = bassAltoCtx.phrase.imitationMode;
  const penaltyRate = mode === 'free_counterpoint_with_motif_echo' ? 0.05 : 0.08;
  let score = Math.max(0.2, 1 - Math.abs(actual - expected) * penaltyRate);

  if (
    (mode === 'inversional_imitation' || mode === 'contrary_axis_response') &&
    source !== 0 &&
    actual !== 0 &&
    Math.sign(actual) === Math.sign(source)
  ) {
    score = Math.min(score, 0.28);
  }
  if (mode === 'inversional_imitation' || mode === 'contrary_axis_response') {
    const window = computeInversionWindowScore(role, midi, bassAltoCtx);
    if (window) {
      const boost = inversionWindowImitationBoost(window);
      if (boost != null) {
        score = Math.max(score, boost);
      } else if (window.intervalCount < BARTOK_PITCH_INVERSION_WINDOW_MIN_NOTES - 1) {
        score = Math.min(score, BARTOK_PITCH_INVERSION_SPOT_NEUTRAL_CAP);
      }
    }
  }
  if (mode === 'strict_transposition' && Math.abs(actual - source) <= 1) {
    score = Math.max(score, 0.9);
  }
  if (mode === 'strict_interval_cycle' && Math.abs(actual - expected) <= 1) {
    score = Math.max(score, 0.88);
  }

  return score;
}

function bassAltoImitationConsistency(
  role: 'alto' | 'bass',
  tuple: Record<LineRole, number>,
  prevVoice: number | null,
  ctx: BassAltoImitationCtx,
): number {
  return imitationFit(role, tuple[role], prevVoice, null, ctx);
}

function verticalFit(role: LineRole, midi: number, tuple: Record<LineRole, number>): number {
  const idx = VOICE_ORDER.indexOf(role);
  for (let j = 0; j < idx; j++) if (tuple[VOICE_ORDER[j]!]! - midi < BARTOK_PITCH_MIN_VERTICAL_GAP) return 0.15;
  for (let j = idx + 1; j < VOICE_ORDER.length; j++) if (midi - tuple[VOICE_ORDER[j]!]! < BARTOK_PITCH_MIN_VERTICAL_GAP) return 0.15;
  return 1;
}

function phrasePositionT(slotInPhrase: number): number {
  if (BARTOK_PITCH_PHRASE_SLOTS <= 1) return 0;
  return slotInPhrase / (BARTOK_PITCH_PHRASE_SLOTS - 1);
}

function climaxBellWeight(t: number): number {
  const hw = BARTOK_PITCH_CLIMAX_APPROACH_HALF_WIDTH;
  if (hw <= 0) return t === BARTOK_PITCH_CLIMAX_CENTER_T ? 1 : 0;
  const d = Math.abs(t - BARTOK_PITCH_CLIMAX_CENTER_T) / hw;
  return Math.max(0, 1 - d);
}

function climaxDimensionMultipliers(args: {
  role: LineRole;
  midi: number;
  prev: number | null;
  tuple: Record<LineRole, number>;
  slotInPhrase: number;
  phrase: PhraseState;
  globalSlotIndex: number;
  sopranoHistory: readonly number[];
  bassHistory: readonly number[];
}): { cellMul: number; registerMul: number; contourMul: number } {
  const t = phrasePositionT(args.slotInPhrase);
  const bell = climaxBellWeight(t);
  const spread = args.tuple.soprano - args.tuple.bass;
  const prevSpread =
    args.globalSlotIndex > 0
      ? (args.sopranoHistory[args.globalSlotIndex - 1] ?? args.tuple.soprano) -
        (args.bassHistory[args.globalSlotIndex - 1] ?? args.tuple.bass)
      : spread;

  let cellMul = 1;
  let registerMul = 1;
  let contourMul = 1;

  if (bell > 0) {
    if (BARTOK_PITCH_CLIMAX_CELL_IDS.has(args.phrase.cell.cellId)) {
      cellMul *= 1 + bell * (BARTOK_PITCH_CLIMAX_CELL_BOOST - 1);
    }
    if (args.prev != null) {
      const step = Math.abs(args.midi - args.prev);
      if (
        step === BARTOK_PITCH_CLIMAX_INTERVAL_TRITONE_SEMITONES ||
        step === BARTOK_PITCH_CLIMAX_INTERVAL_MINOR3_SEMITONES
      ) {
        cellMul *= 1 + bell * (BARTOK_PITCH_CLIMAX_INTERVAL_CONTENT_BOOST - 1);
      }
    }
  }

  if (args.role === 'soprano' || args.role === 'bass') {
    if (t < BARTOK_PITCH_EARLY_PHRASE_MAX_T && spread > BARTOK_PITCH_SPREAD_EARLY_MAX_SEMITONES) {
      registerMul = BARTOK_PITCH_CLIMAX_REGISTER_PENALTY_MIN;
    } else if (bell > 0) {
      const targetSpread =
        BARTOK_PITCH_SPREAD_TARGET_MIN_SEMITONES +
        bell * (BARTOK_PITCH_SPREAD_TARGET_PEAK_SEMITONES - BARTOK_PITCH_SPREAD_TARGET_MIN_SEMITONES);
      const spreadFit = Math.max(
        0,
        1 - Math.abs(spread - targetSpread) / BARTOK_PITCH_SPREAD_TARGET_PEAK_SEMITONES,
      );
      registerMul = 1 + bell * spreadFit * (BARTOK_PITCH_CLIMAX_REGISTER_BOOST_MAX - 1);
    } else if (t > BARTOK_PITCH_CLIMAX_CENTER_T) {
      const spreadFit = Math.max(
        0,
        1 -
          Math.abs(spread - BARTOK_PITCH_SPREAD_POST_CLIMAX_TARGET_SEMITONES) /
            BARTOK_PITCH_SPREAD_TARGET_PEAK_SEMITONES,
      );
      registerMul = 1 + spreadFit * (BARTOK_PITCH_CLIMAX_REGISTER_BOOST_MAX - 1) * 0.5;
      if (spread < prevSpread) {
        registerMul *= BARTOK_PITCH_CLIMAX_CONTRACTION_BOOST;
      }
    }
  }

  if (t > BARTOK_PITCH_CLIMAX_CENTER_T) {
    if (args.prev != null && Math.abs(args.midi - args.prev) <= 2) {
      contourMul = BARTOK_PITCH_CLIMAX_CONTOUR_CALM_BOOST;
    }
    if (spread < prevSpread) {
      contourMul *= BARTOK_PITCH_CLIMAX_CONTRACTION_BOOST;
    }
  }

  return { cellMul, registerMul, contourMul };
}

function voiceDimensions(
  role: LineRole,
  midi: number,
  prev: number | null,
  tuple: Record<LineRole, number>,
  ctx: {
    tonicPc: number;
    phrase: PhraseState;
    slotInPhrase: number;
    beatIndexInBar: number;
    developmental: boolean;
    leadMidi: number | null;
    globalSlotIndex: number;
    sopranoHistory: readonly number[];
    altoHistory: readonly number[];
    bassHistory: readonly number[];
  },
): Record<BartokScorerExponentDim, number> {
  const sopranoPrev = ctx.globalSlotIndex > 0 ? ctx.sopranoHistory[ctx.globalSlotIndex - 1] ?? null : null;
  const bassAltoCtx: BassAltoImitationCtx = {
    phrase: ctx.phrase,
    slotInPhrase: ctx.slotInPhrase,
    tonicPc: ctx.tonicPc,
    sopranoMidi: tuple.soprano,
    sopranoPrev,
    globalSlotIndex: ctx.globalSlotIndex,
    sopranoHistory: ctx.sopranoHistory,
    altoHistory: ctx.altoHistory,
    bassHistory: ctx.bassHistory,
  };
  const accent = Math.min(1.2, bartokAccentFitScore(ctx.beatIndexInBar, "symmetric") / 1.2);
  const climax = climaxDimensionMultipliers({
    role,
    midi,
    prev,
    tuple,
    slotInPhrase: ctx.slotInPhrase,
    phrase: ctx.phrase,
    globalSlotIndex: ctx.globalSlotIndex,
    sopranoHistory: ctx.sopranoHistory,
    bassHistory: ctx.bassHistory,
  });
  const contourBase = prev == null ? 0.8 : Math.max(0.45, 1 - Math.abs(midi - prev) * 0.06);
  const registerBase = (() => {
    const { min, max } = BARTOK_PITCH_VOICE_MIDI_RANGE[role];
    const d = Math.abs(midi - (min + max) / 2) / ((max - min) / 2);
    return Math.max(0.4, 1 - d * 0.35);
  })();
  return {
    axis: axisFit(midi, ctx.tonicPc, ctx.phrase.activeFunction),
    collection: collectionFit(midi, ctx.tonicPc, role, ctx.phrase.collectionId, ctx.developmental) / 1.4,
    cell: cellFit(prev, midi, ctx.phrase.cell, ctx.slotInPhrase) * climax.cellMul,
    imitation: imitationFit(role, midi, prev, ctx.leadMidi, bassAltoCtx),
    accent,
    vertical: verticalFit(role, midi, tuple),
    contour: contourBase * climax.contourMul,
    register: registerBase * climax.registerMul,
  };
}

function combineVoiceScore(role: LineRole, dims: Record<BartokScorerExponentDim, number>): number {
  const exp = BARTOK_PITCH_VOICE_EXPONENTS[role];
  let s = 0;
  (Object.keys(exp) as BartokScorerExponentDim[]).forEach((k) => (s += dims[k] * exp[k]));
  return s;
}

function intervalClass(a: number, b: number): number {
  return Math.abs((a - b) % 12);
}

function ensembleScore(
  tuple: Record<LineRole, number>,
  prevTuple: Record<LineRole, number> | null,
  phrase: PhraseState,
  tonicPc: number,
  prevVoice: VoiceMidiState,
  sopranoHistory: readonly number[],
  altoHistory: readonly number[],
  bassHistory: readonly number[],
  globalSlotIndex: number,
  slotInPhrase: number,
): { score: number; factors: Record<string, number> } {
  const mids = VOICE_ORDER.map((r) => tuple[r]);
  const spacingBalance = VOICE_ORDER.every((r, i) => i === 0 || mids[i - 1]! - mids[i]! >= BARTOK_PITCH_MIN_VERTICAL_GAP) ? 1 : 0.2;
  const icSet = new Set<number>();
  for (let i = 0; i < mids.length; i++) for (let j = i + 1; j < mids.length; j++) icSet.add(intervalClass(mids[i]!, mids[j]!));
  const verticalIntervalProfile = Math.min(1, icSet.size / 5);
  const axisHits = mids.filter((m) => AXIS_PCS[phrase.activeFunction].includes(pcRelativeToTonic(m, tonicPc))).length;
  const axisCoverage = axisHits / 4;
  const sopranoPrev = globalSlotIndex > 0 ? sopranoHistory[globalSlotIndex - 1] ?? null : null;
  const bassAltoCtx: BassAltoImitationCtx = {
    phrase,
    slotInPhrase,
    tonicPc,
    sopranoMidi: tuple.soprano,
    sopranoPrev,
    globalSlotIndex,
    sopranoHistory,
    altoHistory,
    bassHistory,
  };
  const tenorTarget = tuple.soprano + BARTOK_PITCH_IMITATION_INTERVAL;
  const tenorConsistency = Math.max(0.3, 1 - Math.abs(tuple.tenor - tenorTarget) * 0.06);
  const altoConsistency = bassAltoImitationConsistency('alto', tuple, prevVoice.alto, bassAltoCtx);
  const bassConsistency = bassAltoImitationConsistency('bass', tuple, prevVoice.bass, bassAltoCtx);
  const imitationConsistency = (tenorConsistency + altoConsistency + bassConsistency) / 3;
  let antiParallelPenalty = 1;
  if (prevTuple) {
    for (const role of VOICE_ORDER) {
      const pPrev = prevTuple[role];
      const pNow = tuple[role];
      if (pPrev == null) continue;
      const icP = intervalClass(pPrev, prevTuple.soprano);
      const icN = intervalClass(pNow, tuple.soprano);
      const dirP = Math.sign(pPrev - prevTuple.soprano);
      const dirN = Math.sign(pNow - tuple.soprano);
      if (dirP !== 0 && dirP === dirN && (icP === 7 || icP === 0) && icP === icN) antiParallelPenalty *= BARTOK_PITCH_ENSEMBLE_MULTIPLIERS.exposedParallelPerfect;
    }
  }
  let mult = 1;
  if (axisHits >= 3) mult *= BARTOK_PITCH_ENSEMBLE_MULTIPLIERS.sonorityThreePlusAxisPcs;
  const pcs = new Set(mids.map((m) => pcRelativeToTonic(m, tonicPc)));
  const isTriad = pcs.size === 3 && pcs.has(0) && pcs.has(4) && pcs.has(7);
  if (pcs.size >= 4 && !isTriad) mult *= BARTOK_PITCH_ENSEMBLE_MULTIPLIERS.collectionCompletionNonTriad;
  if (Math.abs(tuple.tenor - tenorTarget) <= 1) mult *= BARTOK_PITCH_ENSEMBLE_MULTIPLIERS.successfulInversionalAnswer;
  const source = sourceMotifInterval(bassAltoCtx);
  const expected = expectedResponseInterval(phrase.imitationMode, source, phrase, slotInPhrase);
  for (const role of ['alto', 'bass'] as const) {
    const prev = prevVoice[role];
    if (prev == null) continue;
    const window = computeInversionWindowScore(role, tuple[role], bassAltoCtx);
    if (
      !window ||
      window.intervalCount < BARTOK_PITCH_INVERSION_WINDOW_MIN_NOTES - 1 ||
      window.fraction < BARTOK_PITCH_INVERSION_ENSEMBLE_SUSTAIN_MIN
    ) {
      continue;
    }
    const actual = tuple[role] - prev;
    const kind = classifyTransformation(phrase.imitationMode, actual, expected, source);
    if (kind === 'inversional' || kind === 'contrary_axis') {
      mult *= BARTOK_PITCH_ENSEMBLE_MULTIPLIERS.successfulInversionalAnswer;
    }
  }
  const w = BARTOK_PITCH_ENSEMBLE_WEIGHTS;
  const base =
    verticalIntervalProfile * w.verticalIntervalProfile +
    axisCoverage * w.axisCoverage +
    imitationConsistency * w.imitationConsistency +
    antiParallelPenalty * w.antiParallelPenalty +
    spacingBalance * w.spacingBalance;
  return { score: base * mult, factors: { verticalIntervalProfile, axisCoverage, imitationConsistency, antiParallelPenalty, spacingBalance, ensembleMultiplier: mult } };
}

function enumerateRaw(role: LineRole, prev: number | null, fixed: boolean, fixedMidi?: number): number[] {
  if (fixed && fixedMidi != null) return [fixedMidi];
  const { min, max } = BARTOK_PITCH_VOICE_MIDI_RANGE[role];
  const window = role === "soprano" ? BARTOK_PITCH_SOPRANO_LEAP_CAP : BARTOK_PITCH_LEAP_WINDOW[role];
  const center = prev ?? Math.floor((min + max) / 2);
  const lo = Math.max(min, center - window);
  const hi = Math.min(max, center + window);
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) out.push(m);
  return out;
}

function transformationTargetMidis(
  role: LineRole,
  prev: number | null,
  scorerCtx: Parameters<typeof voiceDimensions>[4],
  sopranoProxy: number,
): number[] {
  if (role !== 'alto' && role !== 'bass') return [];
  const sopranoPrev =
    scorerCtx.globalSlotIndex > 0 ? scorerCtx.sopranoHistory[scorerCtx.globalSlotIndex - 1] ?? null : null;
  const bassAltoCtx: BassAltoImitationCtx = {
    phrase: scorerCtx.phrase,
    slotInPhrase: scorerCtx.slotInPhrase,
    tonicPc: scorerCtx.tonicPc,
    sopranoMidi: sopranoProxy,
    sopranoPrev,
    globalSlotIndex: scorerCtx.globalSlotIndex,
    sopranoHistory: scorerCtx.sopranoHistory,
    altoHistory: scorerCtx.altoHistory,
    bassHistory: scorerCtx.bassHistory,
  };
  const source = sourceMotifInterval(bassAltoCtx);
  const expected = expectedResponseInterval(
    scorerCtx.phrase.imitationMode,
    source,
    scorerCtx.phrase,
    scorerCtx.slotInPhrase,
  );
  const target = expectedResponseMidi(prev, expected, role);
  return target == null ? [] : [target];
}

function enumerateWithTransformationTargets(
  role: LineRole,
  prev: number | null,
  scorerCtx: Parameters<typeof voiceDimensions>[4],
  sopranoProxy: number,
): number[] {
  const raw = enumerateRaw(role, prev, false, undefined);
  if (role !== 'alto' && role !== 'bass') return raw;
  const targets = transformationTargetMidis(role, prev, scorerCtx, sopranoProxy);
  if (targets.length === 0) return raw;
  const merged = new Set(raw);
  for (const t of targets) merged.add(t);
  return [...merged].sort((a, b) => a - b);
}

/** When cantus locks soprano, ensure lower-voice raw pools include spacing-feasible midis (slot-0 only). */
function augmentRawForCantusFeasibility(
  role: LineRole,
  raw: readonly number[],
  cantusMidi: number,
): number[] {
  if (role === 'soprano') return [...raw];
  const roleIdx = VOICE_ORDER.indexOf(role);
  const upperBound = cantusMidi - roleIdx * BARTOK_PITCH_MIN_VERTICAL_GAP;
  const { min, max } = BARTOK_PITCH_VOICE_MIDI_RANGE[role];
  const merged = new Set(raw);
  const hi = Math.min(max, upperBound);
  for (let m = hi; m >= Math.max(min, hi - 8); m--) merged.add(m);
  return [...merged].sort((a, b) => a - b);
}

function ensureTransformationTargetsInShortlist(
  role: LineRole,
  list: ShortlistEntry[],
  prev: number | null,
  seed: number,
  slotIndex: number,
  scorerCtx: Parameters<typeof voiceDimensions>[4],
  tupleSeed: Record<LineRole, number>,
): ShortlistEntry[] {
  const targets = transformationTargetMidis(role, prev, scorerCtx, tupleSeed.soprano);
  if (targets.length === 0) return list;
  let out = [...list];
  for (const target of targets) {
    if (out.some((e) => e.midi === target)) continue;
    const dims = voiceDimensions(role, target, prev, tupleSeed, scorerCtx);
    const voiceScore = combineVoiceScore(role, dims);
    const tieBreakKey = Math.floor(
      rng01(seed, BARTOK_PITCH_SUBSTREAM_SALTS.shortlist + slotIndex * 17 + target) * 1_000_000,
    );
    const entry: ShortlistEntry = { midi: target, voiceScore, dims, tieBreakKey };
    out.push(entry);
    out.sort((a, b) => {
      if (b.voiceScore !== a.voiceScore) return b.voiceScore - a.voiceScore;
      if (a.midi !== b.midi) return a.midi - b.midi;
      return a.tieBreakKey - b.tieBreakKey;
    });
    if (out.length > BARTOK_PITCH_SHORTLIST_SIZE) {
      out = out.slice(0, BARTOK_PITCH_SHORTLIST_SIZE);
    }
    if (!out.some((e) => e.midi === target)) {
      out = out.slice(0, BARTOK_PITCH_SHORTLIST_SIZE - 1);
      out.push(entry);
      out.sort((a, b) => {
        if (b.voiceScore !== a.voiceScore) return b.voiceScore - a.voiceScore;
        if (a.midi !== b.midi) return a.midi - b.midi;
        return a.tieBreakKey - b.tieBreakKey;
      });
    }
  }
  return out.slice(0, BARTOK_PITCH_SHORTLIST_SIZE);
}

type ShortlistEntry = { midi: number; voiceScore: number; dims: Record<BartokScorerExponentDim, number>; tieBreakKey: number };

function buildShortlist(
  role: LineRole,
  raw: readonly number[],
  prev: number | null,
  seed: number,
  slotIndex: number,
  scorerCtx: Parameters<typeof voiceDimensions>[3],
  tupleSeed: Record<LineRole, number>,
): ShortlistEntry[] {
  const scored = raw.map((midi, i) => {
    const dims = voiceDimensions(role, midi, prev, tupleSeed, scorerCtx);
    const voiceScore = combineVoiceScore(role, dims);
    const tieBreakKey = Math.floor(rng01(seed, BARTOK_PITCH_SUBSTREAM_SALTS.shortlist + slotIndex * 17 + i) * 1_000_000);
    return { midi, voiceScore, dims, tieBreakKey };
  });
  scored.sort((a, b) => {
    if (b.voiceScore !== a.voiceScore) return b.voiceScore - a.voiceScore;
    if (a.midi !== b.midi) return a.midi - b.midi;
    return a.tieBreakKey - b.tieBreakKey;
  });
  return scored.slice(0, BARTOK_PITCH_SHORTLIST_SIZE);
}

function isTransformationalTuplePick(
  pick: { mids: Record<LineRole, number> },
  phrase: PhraseState,
  slotInPhrase: number,
  prevVoice: VoiceMidiState,
  sopranoHistory: readonly number[],
  altoHistory: readonly number[],
  bassHistory: readonly number[],
  globalSlotIndex: number,
  tonicPc: number,
): boolean {
  const sopranoPrev = globalSlotIndex > 0 ? sopranoHistory[globalSlotIndex - 1] ?? null : null;
  const ctx: BassAltoImitationCtx = {
    phrase,
    slotInPhrase,
    tonicPc,
    sopranoMidi: pick.mids.soprano,
    sopranoPrev,
    globalSlotIndex,
    sopranoHistory,
    altoHistory,
    bassHistory,
  };
  const source = sourceMotifInterval(ctx);
  const expected = expectedResponseInterval(phrase.imitationMode, source, phrase, slotInPhrase);
  for (const role of ['alto', 'bass'] as const) {
    const prev = prevVoice[role];
    if (prev == null) continue;
    const actual = pick.mids[role] - prev;
    const kind = classifyTransformation(phrase.imitationMode, actual, expected, source);
    if (
      kind === 'inversional' ||
      kind === 'contrary_axis' ||
      kind === 'interval_cycle' ||
      kind === 'transposition'
    ) {
      return true;
    }
  }
  return false;
}

function compareTuple(a: { finalScore: number; tieMidi: number; tieBreakKey: number }, b: { finalScore: number; tieMidi: number; tieBreakKey: number }): number {
  if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
  if (a.tieMidi !== b.tieMidi) return a.tieMidi - b.tieMidi;
  return a.tieBreakKey - b.tieBreakKey;
}

function altoOnsetBarFraction(barIndex: number, beatIndexInBar: number): number {
  return barIndex + BARTOK_PITCH_ADDITIVE_OFFSET.alto + beatIndexInBar * 0.25;
}

function bassOnsetBarFraction(barIndex: number, beatIndexInBar: number): number {
  return barIndex + BARTOK_PITCH_ADDITIVE_OFFSET.bass + beatIndexInBar * 0.25;
}

/** Bass emission rhythm only — does not affect tuple scoring or enumeration. */
const BARTOK_BASS_EMIT_CYCLE_3_2_3: readonly boolean[] = [true, true, true, false, false, true, true, true];
const BARTOK_BASS_EMIT_CYCLE_2_3_3: readonly boolean[] = [true, true, false, false, true, true, true, false];

function shouldEmitBassAtSlot(globalSlotIndex: number, seed: number): boolean {
  const phraseIndex = Math.floor(globalSlotIndex / 4);
  const cycle = rng01(seed, 9193 + phraseIndex) >= 0.5 ? BARTOK_BASS_EMIT_CYCLE_2_3_3 : BARTOK_BASS_EMIT_CYCLE_3_2_3;
  return cycle[globalSlotIndex % 8] ?? false;
}


export function buildBartokScoredLineSet(
  context: CompositionContext,
  lengthBars: number,
  seed: number,
  cantusFirmusMidiBySlot?: readonly number[],
): { lineSet: AbstractLineSet; trace: BartokPitchScoringTrace } {
  const policy = getVoiceRuleBundle("bartok").contrapuntalLinePolicy!;
  const dissonanceProfile = policy.dissonanceProfile;
  const normalizedSeed = Math.abs(seed) | 0;
  const totalSlots = lengthBars * 4;
  const developmentalPhraseStart = Math.floor(totalSlots / 4 / 2);
  const phraseImitationModes: BartokImitationMode[] = [];

  const voices: AbstractLineSet["voices"] = (VOICE_ORDER as LineRole[]).map((role) => ({
    role,
    tags:
      role === "soprano"
        ? (["melodic_lead"] as LineRoleTag[])
        : role === "tenor"
          ? (["canonic_follower", "rhythmic_anchor"] as LineRoleTag[])
          : role === "bass"
            ? (["bass_anchor"] as LineRoleTag[])
            : (["harmonic_fill"] as LineRoleTag[]),
    notes: [] as NoteEvent[],
  }));
  const byRole = Object.fromEntries(voices.map((v) => [v.role, v])) as Record<LineRole, (typeof voices)[0]>;

  const state: VoiceMidiState = { soprano: null, alto: null, tenor: null, bass: null };
  let axisStreak = 0;
  let prevAxis: BartokActiveFunction = "tonic_axis";
  let phrase: PhraseState = {
    cell: pickCell(normalizedSeed, 0),
    activeFunction: "tonic_axis",
    collectionId: pickCollection(normalizedSeed, 0, false),
    imitationMode: pickImitationMode(normalizedSeed, 0),
  };
  phraseImitationModes.push(phrase.imitationMode);

  const traceSlots: BartokPitchTupleTrace[] = [];
  const sopranoHistory: number[] = [];
  const altoHistory: number[] = [];
  const bassHistory: number[] = [];
  let prevTuple: Record<LineRole, number> | null = null;

  for (let g = 0; g < totalSlots; g++) {
    const barIndex = Math.floor(g / 4);
    const beatIndexInBar = g % 4;
    const slot: BartokPitchScoringSlotRef = {
      globalSlotIndex: g,
      barIndex,
      beatIndexInBar,
      slotInPhrase: g % 4,
      phraseIndex: Math.floor(g / 4),
      kind: "soprano_quarter",
    };
    const tonicPc = rootPcFromBarSymbol(resolveBarSymbol(context, barIndex + 1).symbol);

    if (slot.slotInPhrase === 0) {
      const phraseIndex = slot.phraseIndex;
      const developmental = phraseIndex >= developmentalPhraseStart;
      const phraseMode = pickImitationMode(normalizedSeed, phraseIndex);
      phrase = {
        cell: pickCell(normalizedSeed, phraseIndex),
        activeFunction: pickNextAxis(normalizedSeed, phraseIndex, prevAxis, axisStreak),
        collectionId: pickCollection(normalizedSeed, phraseIndex, developmental),
        imitationMode: phraseMode,
      };
      if (phraseIndex >= phraseImitationModes.length) {
        phraseImitationModes.push(phraseMode);
      } else {
        phraseImitationModes[phraseIndex] = phraseMode;
      }
      if (phrase.activeFunction === prevAxis) axisStreak++;
      else axisStreak = 1;
      prevAxis = phrase.activeFunction;
    }

    const developmental = slot.phraseIndex >= developmentalPhraseStart;
    const leadMidi = g >= 4 ? sopranoHistory[g - 4] ?? null : null;

    const scorerCtx = {
      tonicPc,
      phrase,
      slotInPhrase: slot.slotInPhrase,
      beatIndexInBar,
      developmental,
      leadMidi,
      globalSlotIndex: g,
      sopranoHistory,
      altoHistory,
      bassHistory,
    };
    const tupleSeed: Record<LineRole, number> = {
      soprano: state.soprano ?? 60 + (normalizedSeed % 12),
      alto: state.alto ?? state.soprano ?? 55,
      tenor: state.tenor ?? (leadMidi != null ? leadMidi + BARTOK_PITCH_IMITATION_INTERVAL : 48),
      bass: state.bass ?? 40,
    };

    const shortlists = VOICE_ORDER.map((role) => {
      const prev = state[role];
      const raw =
        role === 'soprano' && cantusFirmusMidiBySlot != null
          ? enumerateRaw('soprano', prev, true, cantusFirmusMidiBySlot[g])
          : role === 'alto' || role === 'bass'
            ? enumerateWithTransformationTargets(role, prev, scorerCtx, tupleSeed.soprano)
            : enumerateRaw(role, prev, false, undefined);
      const rawForShortlist =
        cantusFirmusMidiBySlot != null && role !== 'soprano'
          ? augmentRawForCantusFeasibility(role, raw, cantusFirmusMidiBySlot[g]!)
          : raw;
      const base = buildShortlist(role, rawForShortlist, prev, normalizedSeed, g, scorerCtx, tupleSeed);
      return role === 'alto' || role === 'bass'
        ? ensureTransformationTargetsInShortlist(role, base, prev, normalizedSeed, g, scorerCtx, tupleSeed)
        : base;
    });

    type TuplePick = {
      mids: Record<LineRole, number>;
      finalScore: number;
      factors: Record<string, number>;
      traces: BartokPitchCandidateTrace[];
      tieMidi: number;
      tieBreakKey: number;
    };

    const tuples: TuplePick[] = [];
    for (const s of shortlists[0]!) for (const a of shortlists[1]!) for (const t of shortlists[2]!) for (const b of shortlists[3]!) {
      const mids: Record<LineRole, number> = { soprano: s.midi, alto: a.midi, tenor: t.midi, bass: b.midi };
      if (VOICE_ORDER.some((r, i) => i > 0 && mids[VOICE_ORDER[i - 1]!]! - mids[r]! < BARTOK_PITCH_MIN_VERTICAL_GAP)) continue;
      let voiceSum = 0;
      const traces: BartokPitchCandidateTrace[] = [];
      for (const role of VOICE_ORDER) {
        const sl = role === "soprano" ? s : role === "alto" ? a : role === "tenor" ? t : b;
        const dims = voiceDimensions(role, sl.midi, state[role], mids, scorerCtx);
        const voiceScore = combineVoiceScore(role, dims);
        voiceSum += voiceScore;
        traces.push({
          role,
          candidateMidi: sl.midi,
          shortlistRank: shortlists[VOICE_ORDER.indexOf(role)]!.findIndex((x) => x.midi === sl.midi),
          voiceScore,
          dimensions: dims,
          tieBreakKey: sl.tieBreakKey,
        });
      }
      const ens = ensembleScore(
        mids,
        prevTuple,
        phrase,
        tonicPc,
        state,
        sopranoHistory,
        altoHistory,
        bassHistory,
        g,
        slot.slotInPhrase,
      );
      tuples.push({
        mids,
        finalScore: voiceSum + ens.score,
        factors: ens.factors,
        traces,
        tieMidi: mids.soprano,
        tieBreakKey: Math.floor(rng01(normalizedSeed, BARTOK_PITCH_SUBSTREAM_SALTS.beam + g) * 1_000_000),
      });
    }

    tuples.sort(compareTuple);
    const beam = tuples.slice(0, BARTOK_PITCH_BEAM_WIDTH);
    const bestScore = beam[0]?.finalScore ?? 0;
    const tied = beam.filter((t) => Math.abs(t.finalScore - bestScore) < 1e-9);
    tied.sort((x, y) => (x.tieMidi !== y.tieMidi ? x.tieMidi - y.tieMidi : x.tieBreakKey - y.tieBreakKey));
    const chosen = tied[0] ?? beam[0];
    if (!chosen) continue;

    const prevVoiceForTrace: VoiceMidiState = { ...state };

    let bestNonTransformational = -Infinity;
    for (const t of tuples) {
      if (
        isTransformationalTuplePick(
          t,
          phrase,
          slot.slotInPhrase,
          prevVoiceForTrace,
          sopranoHistory,
          altoHistory,
          bassHistory,
          g,
          tonicPc,
        )
      ) {
        continue;
      }
      if (t.finalScore > bestNonTransformational) bestNonTransformational = t.finalScore;
    }
    const marginVsNonTransformational =
      bestNonTransformational > -Infinity ? chosen.finalScore - bestNonTransformational : undefined;

    for (const role of VOICE_ORDER) state[role] = chosen.mids[role];
    sopranoHistory[g] = chosen.mids.soprano;
    altoHistory[g] = chosen.mids.alto;
    bassHistory[g] = chosen.mids.bass;
    prevTuple = { ...chosen.mids };

    const sopranoPrev = g > 0 ? sopranoHistory[g - 1] ?? null : null;
    const traceBassAltoCtx: BassAltoImitationCtx = {
      phrase,
      slotInPhrase: slot.slotInPhrase,
      tonicPc,
      sopranoMidi: chosen.mids.soprano,
      sopranoPrev,
      globalSlotIndex: g,
      sopranoHistory,
      altoHistory,
      bassHistory,
    };
    const sourceInterval = sourceMotifInterval(traceBassAltoCtx);
    const expectedInterval = expectedResponseInterval(phrase.imitationMode, sourceInterval, phrase, slot.slotInPhrase);
    const transformationByRole: Partial<Record<'alto' | 'bass', BartokTransformationKind>> = {};
    for (const role of ['alto', 'bass'] as const) {
      const prevVoice = prevVoiceForTrace[role];
      if (prevVoice == null) continue;
      const actual = chosen.mids[role] - prevVoice;
      transformationByRole[role] = classifyTransformation(
        phrase.imitationMode,
        actual,
        expectedInterval,
        sourceInterval,
      );
    }

    traceSlots.push({
      slot,
      candidates: chosen.traces,
      tupleCount: BARTOK_PITCH_TUPLE_COUNT,
      beamWidth: BARTOK_PITCH_BEAM_WIDTH,
      finalScore: chosen.finalScore,
      ensembleFactors: chosen.factors,
      chosenMidiByRole: chosen.mids,
      activeFunction: phrase.activeFunction,
      collectionId: phrase.collectionId,
      cellId: phrase.cell.cellId,
      phraseImitationMode: phrase.imitationMode,
      sourceMotifInterval: sourceInterval,
      transformationByRole,
      marginVsNonTransformational,
    });

    const off = barIndex + BARTOK_PITCH_ADDITIVE_OFFSET.soprano + beatIndexInBar * 0.25;
    byRole.soprano.notes.push({ pitchMidi: chosen.mids.soprano, durationBars: 0.25, offsetBars: off });
    const tenOff = barIndex + BARTOK_PITCH_TENOR_DELAY_BARS + BARTOK_PITCH_ADDITIVE_OFFSET.tenor + beatIndexInBar * 0.25 + BARTOK_PITCH_TENOR_PHASE;
    if (tenOff < lengthBars + 0.999) byRole.tenor.notes.push({ pitchMidi: chosen.mids.tenor, durationBars: 0.25, offsetBars: tenOff });
    byRole.alto.notes.push({
      pitchMidi: chosen.mids.alto,
      durationBars: 0.25,
      offsetBars: altoOnsetBarFraction(barIndex, beatIndexInBar),
    });
    if (shouldEmitBassAtSlot(g, normalizedSeed)) {
      byRole.bass.notes.push({
        pitchMidi: chosen.mids.bass,
        durationBars: 0.5,
        offsetBars: bassOnsetBarFraction(barIndex, beatIndexInBar),
      });
    }
  }

  const imitationMap: ImitationEvent[] = [{
    sourceVoice: "soprano",
    imitatingVoice: "tenor",
    delayBars: BARTOK_PITCH_TENOR_DELAY_BARS,
    intervalSemitones: BARTOK_PITCH_IMITATION_INTERVAL,
    type: "strict",
  }];

  const densityEnvelope: DensityEnvelope = {
    segments: [{ startBar: 1, endBar: lengthBars, density: lengthBars > 8 ? "dense" : "sparse" }],
  };

  const lineSet: AbstractLineSet = {
    voices,
    cadenceTags: [{ positionBars: lengthBars, type: "modal", strength: "medium" }],
    densityEnvelope,
    imitationMap,
    dissonanceProfile: { ...dissonanceProfile },
    sourceMode: "chords_only",
    lengthBars,
    styleSourceVrbId: "bartok",
  };

  const trace: BartokPitchScoringTrace = {
    seed: normalizedSeed,
    lengthBars,
    styleSourceVrbId: "bartok",
    imitationMode: phraseImitationModes[0] ?? pickImitationMode(normalizedSeed, 0),
    phraseImitationModes,
    slots: traceSlots,
    phraseAxisStreak: axisStreak,
  };

  return { lineSet, trace };
}

