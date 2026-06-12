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

function pickImitationMode(seed: number): BartokImitationMode {
  const items = (Object.keys(BARTOK_PITCH_IMITATION_PRIORS) as BartokImitationMode[]).map((id) => ({
    id,
    weight: BARTOK_PITCH_IMITATION_PRIORS[id],
  }));
  return weightedPick(items, seed, 17).id;
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

function imitationFit(role: LineRole, midi: number, leadMidi: number | null): number {
  if (role !== "tenor" || leadMidi == null) return 0.7;
  return Math.max(0.25, 1 - Math.abs(midi - (leadMidi + BARTOK_PITCH_IMITATION_INTERVAL)) * 0.1);
}

function verticalFit(role: LineRole, midi: number, tuple: Record<LineRole, number>): number {
  const idx = VOICE_ORDER.indexOf(role);
  for (let j = 0; j < idx; j++) if (tuple[VOICE_ORDER[j]!]! - midi < BARTOK_PITCH_MIN_VERTICAL_GAP) return 0.15;
  for (let j = idx + 1; j < VOICE_ORDER.length; j++) if (midi - tuple[VOICE_ORDER[j]!]! < BARTOK_PITCH_MIN_VERTICAL_GAP) return 0.15;
  return 1;
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
  },
): Record<BartokScorerExponentDim, number> {
  const accent = Math.min(1.2, bartokAccentFitScore(ctx.beatIndexInBar, "symmetric") / 1.2);
  return {
    axis: axisFit(midi, ctx.tonicPc, ctx.phrase.activeFunction),
    collection: collectionFit(midi, ctx.tonicPc, role, ctx.phrase.collectionId, ctx.developmental) / 1.4,
    cell: cellFit(prev, midi, ctx.phrase.cell, ctx.slotInPhrase),
    imitation: imitationFit(role, midi, ctx.leadMidi),
    accent,
    vertical: verticalFit(role, midi, tuple),
    contour: prev == null ? 0.8 : Math.max(0.45, 1 - Math.abs(midi - prev) * 0.06),
    register: (() => {
      const { min, max } = BARTOK_PITCH_VOICE_MIDI_RANGE[role];
      const d = Math.abs(midi - (min + max) / 2) / ((max - min) / 2);
      return Math.max(0.4, 1 - d * 0.35);
    })(),
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
): { score: number; factors: Record<string, number> } {
  const mids = VOICE_ORDER.map((r) => tuple[r]);
  const spacingBalance = VOICE_ORDER.every((r, i) => i === 0 || mids[i - 1]! - mids[i]! >= BARTOK_PITCH_MIN_VERTICAL_GAP) ? 1 : 0.2;
  const icSet = new Set<number>();
  for (let i = 0; i < mids.length; i++) for (let j = i + 1; j < mids.length; j++) icSet.add(intervalClass(mids[i]!, mids[j]!));
  const verticalIntervalProfile = Math.min(1, icSet.size / 5);
  const axisHits = mids.filter((m) => AXIS_PCS[phrase.activeFunction].includes(pcRelativeToTonic(m, tonicPc))).length;
  const axisCoverage = axisHits / 4;
  const tenorTarget = tuple.soprano + BARTOK_PITCH_IMITATION_INTERVAL;
  const imitationConsistency = Math.max(0.3, 1 - Math.abs(tuple.tenor - tenorTarget) * 0.06);
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
): { lineSet: AbstractLineSet; trace: BartokPitchScoringTrace } {
  const policy = getVoiceRuleBundle("bartok").contrapuntalLinePolicy!;
  const dissonanceProfile = policy.dissonanceProfile;
  const normalizedSeed = Math.abs(seed) | 0;
  const totalSlots = lengthBars * 4;
  const developmentalPhraseStart = Math.floor(totalSlots / 4 / 2);
  const imitationMode = pickImitationMode(normalizedSeed);

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
    imitationMode,
  };

  const traceSlots: BartokPitchTupleTrace[] = [];
  const sopranoHistory: number[] = [];
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
      phrase = {
        cell: pickCell(normalizedSeed, phraseIndex),
        activeFunction: pickNextAxis(normalizedSeed, phraseIndex, prevAxis, axisStreak),
        collectionId: pickCollection(normalizedSeed, phraseIndex, developmental),
        imitationMode,
      };
      if (phrase.activeFunction === prevAxis) axisStreak++;
      else axisStreak = 1;
      prevAxis = phrase.activeFunction;
    }

    const developmental = slot.phraseIndex >= developmentalPhraseStart;
    const leadMidi = g >= 4 ? sopranoHistory[g - 4] ?? null : null;

    const scorerCtx = { tonicPc, phrase, slotInPhrase: slot.slotInPhrase, beatIndexInBar, developmental, leadMidi };
    const tupleSeed: Record<LineRole, number> = {
      soprano: state.soprano ?? 60 + (normalizedSeed % 12),
      alto: state.alto ?? state.soprano ?? 55,
      tenor: state.tenor ?? (leadMidi != null ? leadMidi + BARTOK_PITCH_IMITATION_INTERVAL : 48),
      bass: state.bass ?? 40,
    };

    const shortlists = VOICE_ORDER.map((role) => {
      const prev = state[role];
      return buildShortlist(role, enumerateRaw(role, prev, false, undefined), prev, normalizedSeed, g, scorerCtx, tupleSeed);
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
      const ens = ensembleScore(mids, prevTuple, phrase, tonicPc);
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

    for (const role of VOICE_ORDER) state[role] = chosen.mids[role];
    sopranoHistory[g] = chosen.mids.soprano;
    prevTuple = { ...chosen.mids };

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
    imitationMode,
    slots: traceSlots,
    phraseAxisStreak: axisStreak,
  };

  return { lineSet, trace };
}

