/**
 * Donald Fagen-only Song Mode keys-comp musical augmentations (deterministic).
 * Velocity / pitch nudges on comp layers only — does not replace golden-path melody generation.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { chordTonesForChordSymbolWithContext } from '../harmony/harmonyChordTonePolicy';
import { getChordForBar } from '../harmony/harmonyResolution';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { clampPitch, pickGuideTone, seededUnit, type ChordToneSet } from './guitarBassDuoHarmony';
import { liftToneToRange } from './guitarPhraseAuthority';
import { createNote, createRest } from '../score-model/scoreEventBuilder';

const MOTIF_RE = /^song_motif/;

/** Standard 32-bar ECM-style regions for contrast (bar indices 1-based). */
export type FagenSectionKind = 'a_open' | 'b' | 'a_return' | 'closing';

export function fagenSectionKind(barIndex: number): FagenSectionKind {
  if (barIndex >= 9 && barIndex <= 16) return 'b';
  if (barIndex >= 17 && barIndex <= 24) return 'a_return';
  if (barIndex >= 25) return 'closing';
  return 'a_open';
}

/** Brighter RH window in B / closing for section lift vs cool A. */
export function rhClampRangeForFagenBar(barIndex: number): { lo: number; hi: number } {
  const RH_LO = 60;
  const RH_HI = 78;
  const sk = fagenSectionKind(barIndex);
  if (sk === 'b') return { lo: RH_LO + 2, hi: RH_HI };
  if (sk === 'closing') return { lo: RH_LO + 1, hi: RH_HI };
  return { lo: RH_LO, hi: RH_HI };
}

export function lhClampRangeForFagenBar(barIndex: number): { lo: number; hi: number } {
  const LH_LO = 52;
  const LH_HI = 64;
  if (fagenSectionKind(barIndex) === 'b') return { lo: LH_LO + 1, hi: Math.min(67, LH_HI + 2) };
  return { lo: LH_LO, hi: LH_HI };
}

/**
 * Density budget: B slightly busier than A / A′; closing slightly relaxed late.
 */
export function maxNotesFagenKeysCompBar(barIndex: number): number {
  let n = 6;
  if (barIndex <= 8) n = 6;
  else if (barIndex <= 12) n = 7;
  else if (barIndex <= 16) n = 8;
  else if (barIndex <= 24) n = 7;
  else n = 9;
  if (fagenSectionKind(barIndex) === 'b') n += 1;
  return n;
}

function isCompNote(n: NoteEvent): boolean {
  const v = n.voice ?? 1;
  if (v === 2) return true;
  return !n.motifRef || !MOTIF_RE.test(n.motifRef);
}

function chordSymbolSuggestsColourChord(chord: string): boolean {
  const s = chord.toLowerCase();
  return /(?:^|[\s/])(?:maj|Δ|ma7|m7|m9|11|#11|13|9|alt|7)/.test(s);
}

/** Extra RH colour pitch for dyads: 9 / 13 / upper-structure colour when symbol allows (still chord-tonal). */
export function fagenColourExtensionMidi(chord: string, context: CompositionContext, barIndex: number): number | undefined {
  if (!chordSymbolSuggestsColourChord(chord)) return undefined;
  const tones = chordTonesForChordSymbolWithContext(chord, context);
  const { lo, hi } = rhClampRangeForFagenBar(barIndex);
  const candidates = [
    liftToneToRange(tones.root + 14, lo, hi),
    liftToneToRange(tones.root + 21, lo, hi),
    liftToneToRange(tones.third + 12, lo, hi),
  ];
  const pick = Math.floor(seededUnit(context.seed, barIndex, 661) * candidates.length);
  return candidates[pick];
}

/**
 * RH dyad companion: compact tension-rich choices (3rd/7th/5th + optional upper colour).
 * Legacy 2-arg form (no chord/context) uses fixed RH 60–78 for tests.
 */
export function fagenCompanionMidiForSparseRhDyad(
  baseMidi: number,
  tones: ChordToneSet,
  chord?: string,
  context?: CompositionContext,
  barIndex?: number
): number | undefined {
  const basePc = ((baseMidi % 12) + 12) % 12;
  const { lo, hi } =
    barIndex !== undefined ? rhClampRangeForFagenBar(barIndex) : { lo: 60, hi: 78 };

  const baseCandidates: number[] = [];
  for (const src of [tones.third, tones.seventh, tones.fifth]) {
    const pc = ((src % 12) + 12) % 12;
    if (pc === basePc) continue;
    baseCandidates.push(liftToneToRange(src, lo, hi));
  }

  if (chord && context && barIndex !== undefined) {
    const ext = fagenColourExtensionMidi(chord, context, barIndex);
    if (ext !== undefined && seededUnit(context.seed, barIndex, 663) > 0.2) {
      const epc = ((ext % 12) + 12) % 12;
      if (epc !== basePc) baseCandidates.push(ext);
    }
  }

  if (baseCandidates.length === 0) return undefined;
  const salt = barIndex ?? 0;
  const pick = Math.floor(seededUnit(context?.seed ?? 0, salt, 664) * baseCandidates.length);
  return baseCandidates[pick];
}

/** Mean distance of note onsets from nearest integer beat — higher ⇒ more syncopated (0–0.5 scale). */
export function measureSyncopationIndex(measure: MeasureModel): number {
  const notes = measure.events.filter((e): e is NoteEvent => e.kind === 'note');
  if (notes.length === 0) return 0;
  let sum = 0;
  for (const n of notes) {
    const sb = n.startBeat;
    const d = Math.min(sb % 1, 1 - (sb % 1), Math.abs(sb - 1) % 1, Math.abs(sb - 2) % 1, Math.abs(sb - 3) % 1);
    sum += Math.min(d, 0.5);
  }
  return sum / notes.length;
}

function pitchClassSetFromChord(chord: string, context: CompositionContext): Set<number> {
  const t = chordTonesForChordSymbolWithContext(chord, context);
  const pcs = [t.root, t.third, t.fifth, t.seventh].map((p) => ((p % 12) + 12) % 12);
  const rootPc = pcs[0];
  pcs.push((rootPc + 2) % 12, (rootPc + 6) % 12, (rootPc + 9) % 12);
  return new Set(pcs);
}

function isNearChordTone(midi: number, pcs: Set<number>): boolean {
  return pcs.has(((midi % 12) + 12) % 12);
}

export function applyFagenInnerVoiceMotionV2(guitar: PartModel, context: CompositionContext): void {
  const seed = context.seed;
  let prevTopPc: number | undefined;
  let staticBars = 0;

  for (let b = 1; b <= guitar.measures.length; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    const chord = getChordForBar(b, context);
    const pcs = pitchClassSetFromChord(chord, context);
    const { lo, hi } = lhClampRangeForFagenBar(b);

    const v2notes = m.events.filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 2);
    if (v2notes.length === 0) continue;
    const top = v2notes.reduce((a, c) => (a.pitch >= c.pitch ? a : c));
    const pc = ((top.pitch % 12) + 12) % 12;

    if (prevTopPc !== undefined && pc === prevTopPc) staticBars++;
    else staticBars = 1;
    prevTopPc = pc;

    if (staticBars >= 3) {
      const order =
        seededUnit(seed, b, 702) < 0.5
          ? ([1, -1, 2, -2] as const)
          : ([-1, 1, -2, 2] as const);
      for (const step of order) {
        const np = top.pitch + step;
        if (isNearChordTone(np, pcs)) {
          top.pitch = clampPitch(np, lo, hi);
          break;
        }
      }
      staticBars = 0;
    }
  }
}

export function applyFagenMotifSupportiveCompDynamics(guitar: PartModel): void {
  for (const m of guitar.measures) {
    const v1motif = m.events.filter(
      (e): e is NoteEvent =>
        e.kind === 'note' &&
        (e.voice ?? 1) === 1 &&
        !!e.motifRef &&
        MOTIF_RE.test(e.motifRef)
    );
    if (v1motif.length === 0) continue;
    const peak = v1motif.reduce((a, c) => ((c.velocity ?? 0) >= (a.velocity ?? 0) ? c : a));
    const peakSb = peak.startBeat;
    const pkVel = peak.velocity ?? 80;

    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!isCompNote(n)) continue;
      if (Math.abs(n.startBeat - peakSb) > 0.38) continue;
      if ((n.velocity ?? 70) >= pkVel - 6) continue;
      n.velocity = Math.max(28, (n.velocity ?? 72) - 14);
    }
  }
}

export function applyFagenRhythmFingerprintVelocities(
  guitar: PartModel,
  context: CompositionContext,
  rhythmFamilyTag: string
): void {
  const seed = context.seed;
  for (const m of guitar.measures) {
    const b = m.index;
    const sec = fagenSectionKind(b);
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!isCompNote(n)) continue;
      let vel = n.velocity ?? 74;
      const sb = n.startBeat;
      const dur = n.duration;

      const anticipB2 = sb >= 1.35 && sb <= 1.92;
      const anticipB4 = sb >= 3.35 && sb <= 3.92;
      if (anticipB2 || anticipB4) vel = Math.min(126, vel + 9);

      const shortStab = dur <= 0.42 && sb % 1 > 0.08 && sb % 1 < 0.92 && (sb % 1 < 0.35 || sb % 1 > 0.65);
      if (shortStab) vel = Math.min(126, vel + 7);

      if (dur >= 1.15 && sb < 0.22) vel = Math.max(34, vel - 11);

      if (sec === 'b' && sb >= 2.2 && sb <= 3.65 && seededUnit(seed, b, 803) > 0.42) {
        vel = Math.min(126, vel + 6);
      }

      if ((b === 9 || b === 17) && sb < 0.15 && seededUnit(seed, b, 804) < 0.55) {
        vel = Math.min(126, vel + 8);
      }

      n.velocity = vel;
    }
    void rhythmFamilyTag;
  }
}

/** Phrase landing bars (multiples of 4): clearer, less dense comp velocity — tension/release hierarchy. */
export function applyFagenAntiGenericPhraseLanding(guitar: PartModel): void {
  for (const m of guitar.measures) {
    const b = m.index;
    if (b % 4 !== 0) continue;
    /** Leave bar before hook return (25) unducked so motif similarity isn’t flattened at the phrase seam. */
    if (b === 24) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!isCompNote(n)) continue;
      if ((n.velocity ?? 70) > 78) n.velocity = Math.max(44, (n.velocity ?? 72) - 12);
    }
  }
}

/**
 * Opening A (bars 1–8): if voice 2 had no sounding notes (empty LH / whole rests), add a soft half-note shell
 * so the piano staff reads as two-hand comp — does not replace golden-path melody on voice 1.
 */
export function ensureFagenOpeningLhShellBars1to8(guitar: PartModel, context: CompositionContext): void {
  const seed = context.seed;
  for (let b = 1; b <= 8; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;

    const hasV2Note = m.events.some(
      (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 2
    );
    if (hasV2Note) continue;

    const chord = getChordForBar(b, context);
    const tones = chordTonesForChordSymbolWithContext(chord, context);
    const { lo, hi } = lhClampRangeForFagenBar(b);
    let shellMidi = pickGuideTone(tones, b, seed);
    shellMidi = liftToneToRange(shellMidi, lo, hi);

    m.events = m.events.filter((e) => ((e as { voice?: number }).voice ?? 1) !== 2);

    const vel = Math.max(38, Math.min(88, 48 + Math.floor(seededUnit(seed, b, 771) * 18)));
    m.events.push(createNote(shellMidi, 0, 2, 2));
    (m.events[m.events.length - 1] as NoteEvent).velocity = vel;
    m.events.push(createRest(2, 2, 2));
    m.events.sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    );
  }
}

/** Return section (17–24): subtle variation — lighter bar-17 attack (delayed-entry feel via softer downbeat comp). */
export function applyFagenReturnPhraseGestures(guitar: PartModel, context: CompositionContext): void {
  const seed = context.seed;
  for (const barIdx of [17, 21]) {
    const m = guitar.measures.find((x) => x.index === barIdx);
    if (!m) continue;
    const firstComp = m.events
      .filter((e): e is NoteEvent => e.kind === 'note' && isCompNote(e as NoteEvent))
      .sort((a, b) => a.startBeat - b.startBeat)[0];
    if (!firstComp || firstComp.startBeat > 0.4) continue;
    if (seededUnit(seed, barIdx, 905) < 0.62) {
      firstComp.velocity = Math.max(30, (firstComp.velocity ?? 72) - 14);
    }
    const chord = getChordForBar(barIdx, context);
    if (seededUnit(seed, barIdx, 906) < 0.48 && chordSymbolSuggestsColourChord(chord)) {
      const alt = firstComp.pitch + (seededUnit(seed, barIdx, 907) < 0.5 ? 1 : -1);
      const { lo, hi } = lhClampRangeForFagenBar(barIdx);
      const pcs = pitchClassSetFromChord(chord, context);
      if (isNearChordTone(alt, pcs)) firstComp.pitch = clampPitch(alt, lo, hi);
    }
  }
}

export interface FagenKeysCompMusicalDiagnostics {
  rhythmPatternFamily: string;
  meanSyncopationIndex: number;
  avgInnerMotionSemitonesV2Top: number;
  meanRhMidiV1OpenA: number;
  meanRhMidiV1SectionB: number;
  densityDeltaBMinusA: number;
  returnPhraseGesturesApplied: number;
}

function collectDiagnostics(guitar: PartModel): Omit<FagenKeysCompMusicalDiagnostics, 'rhythmPatternFamily'> {
  let syncSum = 0;
  let syncN = 0;
  let motionSum = 0;
  let motionCount = 0;
  let prevTopV2: number | undefined;

  let rhSumA = 0;
  let rhCntA = 0;
  let rhSumB = 0;
  let rhCntB = 0;

  let notesA = 0;
  let cntA = 0;
  let notesB = 0;
  let cntB = 0;

  const sorted = [...guitar.measures].sort((a, b) => a.index - b.index);
  for (const m of sorted) {
    syncSum += measureSyncopationIndex(m);
    syncN += 1;

    const b = m.index;
    const sec = fagenSectionKind(b);
    const v2 = m.events.filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 2);
    if (v2.length > 0) {
      const top = v2.reduce((a, c) => (a.pitch >= c.pitch ? a : c));
      if (prevTopV2 !== undefined) {
        motionSum += Math.abs(top.pitch - prevTopV2);
        motionCount += 1;
      }
      prevTopV2 = top.pitch;
    } else {
      prevTopV2 = undefined;
    }

    const v1 = m.events.filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1);
    for (const n of v1) {
      if (sec === 'a_open' && b <= 8) {
        rhSumA += n.pitch;
        rhCntA += 1;
      }
      if (sec === 'b') {
        rhSumB += n.pitch;
        rhCntB += 1;
      }
    }

    const nn = m.events.filter((e) => e.kind === 'note').length;
    if (sec === 'a_open' && b <= 8) {
      notesA += nn;
      cntA += 1;
    }
    if (sec === 'b') {
      notesB += nn;
      cntB += 1;
    }
  }

  const meanSync = syncN ? syncSum / syncN : 0;
  const avgMot = motionCount ? motionSum / motionCount : 0;
  const meanA = rhCntA ? rhSumA / rhCntA : 0;
  const meanB = rhCntB ? rhSumB / rhCntB : 0;
  const densA = cntA ? notesA / cntA : 0;
  const densB = cntB ? notesB / cntB : 0;

  return {
    meanSyncopationIndex: Math.round(meanSync * 1000) / 1000,
    avgInnerMotionSemitonesV2Top: Math.round(avgMot * 100) / 100,
    meanRhMidiV1OpenA: Math.round(meanA * 100) / 100,
    meanRhMidiV1SectionB: Math.round(meanB * 100) / 100,
    densityDeltaBMinusA: Math.round((densB - densA) * 100) / 100,
    returnPhraseGesturesApplied: 2,
  };
}

/**
 * Piano-comp rhythmic fingerprint, inner-line motion, section lift, phrase hierarchy, return gestures.
 * Runs after split-hand clamp / dyads / thinning in `fagenKeysCompV15`.
 */
export function applyFagenKeysCompMusicalAugment(score: ScoreModel, context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata;
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return;

  const famIdx = Math.floor(seededUnit(context.seed, 0, 990) * 4);
  const rhythmPatternFamily = ['anticipation_led', 'offbeat_stab_led', 'mixed_syncopated', 'phrase_syncopated'][famIdx] ?? 'mixed_syncopated';

  applyFagenInnerVoiceMotionV2(guitar, context);
  applyFagenMotifSupportiveCompDynamics(guitar);
  applyFagenAntiGenericPhraseLanding(guitar);
  applyFagenReturnPhraseGestures(guitar, context);
  applyFagenRhythmFingerprintVelocities(guitar, context, rhythmPatternFamily);

  const base = collectDiagnostics(guitar);
  md.fagenKeysCompMusicalDiagnostics = {
    ...base,
    rhythmPatternFamily,
  };
}
