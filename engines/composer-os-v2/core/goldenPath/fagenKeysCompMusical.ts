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

/** Standard 4-part form regions — indices 1-based; `totalBars` typically 32 (ECM Song Mode). */
export type FagenSectionKind = 'a_open' | 'b' | 'a_return' | 'closing';

/** One quarter of the form (8 bars when totalBars=32). */
export function fagenQuarterBarSpan(totalBars: number): number {
  return Math.max(1, Math.floor(totalBars / 4));
}

/** Segment boundaries: A | B | return | closing — each span `quarter` bars when evenly divisible. */
export function fagenFormSegmentEnds(totalBars: number): { aEnd: number; bEnd: number; retEnd: number } {
  const q = fagenQuarterBarSpan(totalBars);
  return { aEnd: q, bEnd: 2 * q, retEnd: 3 * q };
}

/** Structural pivots for section lifts — quarter-based, not tied to a single export. */
export function fagenStructuralBarIndices(totalBars: number): {
  firstBarB: number;
  firstBarReturn: number;
  lastBarB: number;
  firstBarClosing: number;
} {
  const { aEnd, bEnd, retEnd } = fagenFormSegmentEnds(totalBars);
  return {
    firstBarB: aEnd + 1,
    firstBarReturn: bEnd + 1,
    lastBarB: bEnd,
    firstBarClosing: Math.min(totalBars, retEnd + 1),
  };
}

export function fagenSectionKind(barIndex: number, totalBars: number = 32): FagenSectionKind {
  const { aEnd, bEnd, retEnd } = fagenFormSegmentEnds(totalBars);
  if (barIndex > retEnd) return 'closing';
  if (barIndex > bEnd) return 'a_return';
  if (barIndex > aEnd) return 'b';
  return 'a_open';
}

/** Brighter RH window in B / closing for section lift vs cool A. */
export function rhClampRangeForFagenBar(barIndex: number, totalBars: number = 32): { lo: number; hi: number } {
  const RH_LO = 60;
  const RH_HI = 78;
  const sk = fagenSectionKind(barIndex, totalBars);
  if (sk === 'b') return { lo: RH_LO + 2, hi: RH_HI };
  if (sk === 'closing') return { lo: RH_LO + 1, hi: RH_HI };
  return { lo: RH_LO, hi: RH_HI };
}

export function lhClampRangeForFagenBar(barIndex: number, totalBars: number = 32): { lo: number; hi: number } {
  const LH_LO = 52;
  const LH_HI = 64;
  if (fagenSectionKind(barIndex, totalBars) === 'b') return { lo: LH_LO + 1, hi: Math.min(67, LH_HI + 2) };
  return { lo: LH_LO, hi: LH_HI };
}

/**
 * Density budget: A cooler/sparser; B lift; return evolved; closing can bloom.
 */
export function maxNotesFagenKeysCompBar(barIndex: number, totalBars: number = 32): number {
  const sk = fagenSectionKind(barIndex, totalBars);
  let n = 6;
  if (sk === 'a_open') n = 5;
  else if (sk === 'b') n = 8;
  else if (sk === 'a_return') n = 7;
  else n = 8;
  if (sk === 'b') n += 1;
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
export function fagenColourExtensionMidi(
  chord: string,
  context: CompositionContext,
  barIndex: number,
  totalBars: number = 32
): number | undefined {
  if (!chordSymbolSuggestsColourChord(chord)) return undefined;
  const tones = chordTonesForChordSymbolWithContext(chord, context);
  const { lo, hi } = rhClampRangeForFagenBar(barIndex, totalBars);
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
  barIndex?: number,
  totalBars: number = 32
): number | undefined {
  const basePc = ((baseMidi % 12) + 12) % 12;
  const { lo, hi } =
    barIndex !== undefined ? rhClampRangeForFagenBar(barIndex, totalBars) : { lo: 60, hi: 78 };

  const baseCandidates: number[] = [];
  /** Voicing grammar: favour 3rd / 7th / implied 9th / 5th — root-heavy stacks avoided here; bass implies root. */
  for (const src of [tones.third, tones.seventh, tones.root + 14, tones.fifth]) {
    const pc = ((src % 12) + 12) % 12;
    if (pc === basePc) continue;
    baseCandidates.push(liftToneToRange(src, lo, hi));
  }

  if (chord && context && barIndex !== undefined) {
    const ext = fagenColourExtensionMidi(chord, context, barIndex, totalBars);
    if (ext !== undefined && seededUnit(context.seed, barIndex, 663) > 0.2) {
      const epc = ((ext % 12) + 12) % 12;
      if (epc !== basePc) baseCandidates.push(ext);
    }
  }

  if (baseCandidates.length === 0) return undefined;
  const salt = barIndex ?? 0;
  /** Diversify spacing: rotate voicing shape without exceeding clamp. */
  const shape = Math.floor(seededUnit(context?.seed ?? 0, salt, 664) * 3);
  const order = shape === 0 ? baseCandidates : [...baseCandidates].reverse();
  const pick = Math.floor(seededUnit(context?.seed ?? 0, salt, 665) * order.length);
  return order[pick];
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

export function applyFagenInnerVoiceMotionV2(guitar: PartModel, context: CompositionContext, totalBars: number = 32): void {
  const seed = context.seed;
  let prevTopPc: number | undefined;
  let staticBars = 0;
  let prevTopMidi: number | undefined;

  for (let b = 1; b <= guitar.measures.length; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    const chord = getChordForBar(b, context);
    const pcs = pitchClassSetFromChord(chord, context);
    const { lo, hi } = lhClampRangeForFagenBar(b, totalBars);

    const v2notes = m.events.filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 2);
    if (v2notes.length === 0) continue;
    const top = v2notes.reduce((a, c) => (a.pitch >= c.pitch ? a : c));

    /** Prefer stepwise motion across bar boundaries when the prior bar had inner activity. */
    if (prevTopMidi !== undefined) {
      const step = Math.abs(top.pitch - prevTopMidi);
      if (step > 3 && step !== 12) {
        const toward = prevTopMidi > top.pitch ? 1 : -1;
        const np = top.pitch + toward;
        if (isNearChordTone(np, pcs)) top.pitch = clampPitch(np, lo, hi);
      }
    }

    let pc = ((top.pitch % 12) + 12) % 12;
    if (prevTopPc !== undefined && pc === prevTopPc) staticBars++;
    else staticBars = 1;

    if (staticBars >= 2) {
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

    prevTopMidi = top.pitch;
    pc = ((top.pitch % 12) + 12) % 12;
    prevTopPc = pc;
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
      if (Math.abs(n.startBeat - peakSb) > 0.38) continue;
      if ((n.velocity ?? 70) >= pkVel - 6) continue;
      n.velocity = Math.max(28, (n.velocity ?? 72) - 14);
    }
  }
}

/** Strong melody peaks / attacks — tuck comp under register and time proximity (accompaniment only). */
export function applyFagenMelodyPeakCompDucking(guitar: PartModel): void {
  for (const m of guitar.measures) {
    const v1motif = m.events.filter(
      (e): e is NoteEvent =>
        e.kind === 'note' &&
        (e.voice ?? 1) === 1 &&
        !!e.motifRef &&
        MOTIF_RE.test(e.motifRef)
    );
    if (v1motif.length === 0) continue;
    const peakPitch = Math.max(...v1motif.map((n) => n.pitch));
    const peakVel = Math.max(...v1motif.map((n) => n.velocity ?? 0));
    const peakNote = v1motif.reduce((a, c) => ((c.velocity ?? 0) >= (a.velocity ?? 0) ? c : a));
    const peakSb = peakNote.startBeat;

    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!isCompNote(n)) continue;
      if (Math.abs(n.pitch - peakPitch) <= 5 && Math.abs(n.startBeat - peakSb) < 0.32) {
        n.velocity = Math.max(24, (n.velocity ?? 72) - 20);
      } else if ((n.velocity ?? 70) >= peakVel - 8 && Math.abs(n.startBeat - peakSb) < 0.28) {
        n.velocity = Math.max(28, (n.velocity ?? 72) - 12);
      }
    }
  }
}

function extendedApproachPcs(chord: string, context: CompositionContext): Set<number> {
  const base = pitchClassSetFromChord(chord, context);
  const out = new Set(base);
  for (const p of [...base]) {
    out.add((((p + 1) % 12) + 12) % 12);
    out.add((((p + 11) % 12) + 12) % 12);
  }
  return out;
}

function pcInSet(midi: number, pcs: Set<number>): boolean {
  return pcs.has(((midi % 12) + 12) % 12);
}

/** Avoid identical close-position stacks for more than two consecutive bars when chord allows a step. */
export function applyFagenVoicingStackDiversify(guitar: PartModel, context: CompositionContext, totalBars: number): void {
  let fpPrev: string | undefined;
  let streak = 0;

  for (let b = 1; b <= guitar.measures.length; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    const comp = m.events.filter((e): e is NoteEvent => e.kind === 'note' && isCompNote(e));
    const pcsSig = [...new Set(comp.map((n) => ((n.pitch % 12) + 12) % 12))]
      .sort((a, c) => a - c)
      .join(',');
    if (pcsSig === fpPrev) streak++;
    else streak = 1;
    fpPrev = pcsSig;
    if (streak <= 2) continue;

    const chord = getChordForBar(b, context);
    const pcsLegal = pitchClassSetFromChord(chord, context);
    const pick = comp.find((n) => (n.voice ?? 1) === 2) ?? comp[0];
    if (!pick) continue;

    for (const step of [1, -1, 2, -2] as const) {
      const np = pick.pitch + step;
      if (!isNearChordTone(np, pcsLegal)) continue;
      const lo =
        (pick.voice ?? 1) === 2
          ? lhClampRangeForFagenBar(b, totalBars).lo
          : rhClampRangeForFagenBar(b, totalBars).lo;
      const hi =
        (pick.voice ?? 1) === 2
          ? lhClampRangeForFagenBar(b, totalBars).hi
          : rhClampRangeForFagenBar(b, totalBars).hi;
      pick.pitch = clampPitch(np, lo, hi);
      break;
    }
    streak = 0;
  }
}

function quantizeSixteenth(x: number): number {
  return Math.round(x * 16) / 16;
}

/** Anticipations into 2/4, shorten square pads, reinforce reply figures in bar halves with space (timing only). */
export function applyFagenCompRhythmTimingNudge(guitar: PartModel, context: CompositionContext, totalBars: number): void {
  const seed = context.seed;
  for (const m of guitar.measures) {
    const b = m.index;
    const sec = fagenSectionKind(b, totalBars);
    const sparseFirstHalf =
      m.events.filter((e) => e.kind === 'note' && isCompNote(e as NoteEvent) && (e as NoteEvent).startBeat < 2).length <= 1;

    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!isCompNote(n)) continue;
      let sb = n.startBeat;
      let dur = n.duration;

      if (dur >= 3.25 && sb <= 0.12) {
        dur = sec === 'a_open' ? Math.min(dur, 2.25) : Math.min(dur, 2.85);
        if (seededUnit(seed, b, 811) > 0.32) sb = 0.125;
      }

      if (sb >= 1.88 && sb <= 2.12 && seededUnit(seed, b, 812) > 0.22) {
        sb = quantizeSixteenth(1.38 + seededUnit(seed, b, 813) * 0.52);
      }
      if ((sb >= 3.78 || (sb >= 3.35 && sb <= 3.65)) && seededUnit(seed, b, 814) > 0.24) {
        sb = quantizeSixteenth(3.38 + seededUnit(seed, b, 815) * 0.52);
      }

      if (sparseFirstHalf && sb >= 2.05 && sb <= 3.95 && sec !== 'closing') {
        n.velocity = Math.min(126, (n.velocity ?? 72) + 4);
      }

      n.startBeat = quantizeSixteenth(sb);
      n.duration = Math.max(0.125, quantizeSixteenth(dur));
    }
    m.events.sort((a, x) => (a as NoteEvent).startBeat - (x as NoteEvent).startBeat);
  }
}

/** Phrase-level tension sculpt — force at least one clearer bar when density is uniformly high. */
export function applyFagenPhraseTensionSculpt(guitar: PartModel, totalBars: number): number[] {
  const phraseScores: number[] = [];
  const phraseLen = 4;
  const nPhrases = Math.ceil(totalBars / phraseLen);
  for (let p = 0; p < nPhrases; p++) {
    const barIdxs: number[] = [];
    for (let k = 0; k < phraseLen; k++) {
      const bi = p * phraseLen + k + 1;
      if (bi > totalBars) break;
      barIdxs.push(bi);
    }
    if (barIdxs.length === 0) continue;

    const densities = barIdxs.map((bi) => {
      const mm = guitar.measures.find((x) => x.index === bi);
      if (!mm) return 0;
      return mm.events.filter((e) => e.kind === 'note' && isCompNote(e as NoteEvent)).length;
    });
    const meanD = densities.reduce((a, c) => a + c, 0) / densities.length;
    const spread = densities.length ? Math.max(...densities) - Math.min(...densities) : 0;

    if (spread <= 1 && meanD >= 3.5) {
      const landingBar = barIdxs[barIdxs.length - 1];
      const mm = guitar.measures.find((x) => x.index === landingBar);
      if (mm) {
        for (const ev of mm.events) {
          if (ev.kind !== 'note') continue;
          const n = ev as NoteEvent;
          if (!isCompNote(n)) continue;
          if ((n.velocity ?? 70) > 72) n.velocity = Math.max(36, (n.velocity ?? 72) - 16);
        }
      }
    }

    phraseScores.push(Math.round(meanD * 100) / 100);
  }
  return phraseScores;
}

/**
 * At most one chromatic colour side-slip per form — structural pivots only (end B / pre-return / pre-outro).
 */
export function applyFagenSignatureHarmonicMoment(
  guitar: PartModel,
  context: CompositionContext,
  totalBars: number
): { applied: boolean; pivotBar: number | null; kind: string } {
  const md = context.generationMetadata as GenerationMetadata;
  if (md?.customHarmonyLocked === true) {
    return { applied: false, pivotBar: null, kind: 'skipped_locked_harmony' };
  }

  const { bEnd } = fagenFormSegmentEnds(totalBars);
  const candidates = [bEnd, bEnd + 1, totalBars].filter((x) => x >= 1 && x <= totalBars);
  const pivotBar = candidates[Math.floor(seededUnit(context.seed, 0, 920) * candidates.length)] ?? candidates[0];
  const m = guitar.measures.find((x) => x.index === pivotBar);
  if (!m) return { applied: false, pivotBar, kind: 'no_measure' };

  const chord = getChordForBar(pivotBar, context);
  if (!chordSymbolSuggestsColourChord(chord)) {
    return { applied: false, pivotBar, kind: 'harmony_not_colour_eligible' };
  }

  const legal = extendedApproachPcs(chord, context);
  const compNotes = m.events.filter((e): e is NoteEvent => e.kind === 'note' && isCompNote(e));
  const target = compNotes.find((n) => (n.voice ?? 1) === 2) ?? compNotes[0];
  if (!target) return { applied: false, pivotBar, kind: 'no_comp_note' };

  const dir = seededUnit(context.seed, pivotBar, 921) < 0.5 ? 1 : -1;
  const cand = target.pitch + dir;
  if (!pcInSet(cand, legal)) {
    return { applied: false, pivotBar, kind: 'no_legal_side_slip' };
  }

  const v = target.voice ?? 1;
  const r = v === 2 ? lhClampRangeForFagenBar(pivotBar, totalBars) : rhClampRangeForFagenBar(pivotBar, totalBars);
  target.pitch = clampPitch(cand, r.lo, r.hi);
  target.velocity = Math.min(120, (target.velocity ?? 72) + 6);
  return { applied: true, pivotBar, kind: 'chromatic_side_slip' };
}

export function applyFagenRhythmFingerprintVelocities(
  guitar: PartModel,
  context: CompositionContext,
  rhythmFamilyTag: string,
  totalBars: number = 32
): void {
  const seed = context.seed;
  const str = fagenStructuralBarIndices(totalBars);
  for (const m of guitar.measures) {
    const b = m.index;
    const sec = fagenSectionKind(b, totalBars);
    const sparseFirstHalf =
      m.events.filter((e) => e.kind === 'note' && isCompNote(e as NoteEvent) && (e as NoteEvent).startBeat < 2).length <= 1;

    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!isCompNote(n)) continue;
      let vel = n.velocity ?? 74;
      const sb = n.startBeat;
      const dur = n.duration;

      const anticipB2 = sb >= 1.35 && sb <= 1.92;
      const anticipB4 = sb >= 3.35 && sb <= 3.92;
      if (anticipB2 || anticipB4) vel = Math.min(126, vel + 11);

      const shortStab = dur <= 0.42 && sb % 1 > 0.08 && sb % 1 < 0.92 && (sb % 1 < 0.35 || sb % 1 > 0.65);
      if (shortStab) vel = Math.min(126, vel + 8);

      if (dur >= 1.15 && sb < 0.22) vel = Math.max(34, vel - 13);

      if (sec === 'b' && sb >= 2.05 && sb <= 3.85 && seededUnit(seed, b, 803) > 0.38) {
        vel = Math.min(126, vel + 7);
      }

      /** Structural section entries — lift without tying to one exported chart. */
      if ((b === str.firstBarB || b === str.firstBarReturn) && sb < 0.15 && seededUnit(seed, b, 804) < 0.55) {
        vel = Math.min(126, vel + 8);
      }

      /** Reply gestures in melody gaps (second half of bar). */
      if (sparseFirstHalf && sb >= 2.1 && sb <= 3.95 && sec !== 'closing') {
        vel = Math.min(126, vel + 5);
      }

      n.velocity = vel;
    }
    void rhythmFamilyTag;
  }
}

/** Phrase landing bars (multiples of 4): clearer, less dense comp velocity — tension/release hierarchy. */
export function applyFagenAntiGenericPhraseLanding(guitar: PartModel, totalBars: number = 32): void {
  const { retEnd } = fagenFormSegmentEnds(totalBars);
  for (const m of guitar.measures) {
    const b = m.index;
    if (b % 4 !== 0) continue;
    /** Last bar before closing — skip ducking so return/closing seam stays vivid. */
    if (b === retEnd) continue;
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
export function ensureFagenOpeningLhShellBars1to8(guitar: PartModel, context: CompositionContext, totalBars: number = 32): void {
  const seed = context.seed;
  const { aEnd } = fagenFormSegmentEnds(totalBars);
  for (let b = 1; b <= aEnd; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;

    const hasV2Note = m.events.some(
      (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 2
    );
    if (hasV2Note) continue;

    const chord = getChordForBar(b, context);
    const tones = chordTonesForChordSymbolWithContext(chord, context);
    const { lo, hi } = lhClampRangeForFagenBar(b, totalBars);
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

/**
 * Return section — evolved behaviour vs opening: softer return entry, mid-return thinning / colour nudge.
 * Bar targets are quarter-form-relative, not one-off chart positions.
 */
export function applyFagenReturnPhraseGestures(
  guitar: PartModel,
  context: CompositionContext,
  totalBars: number = 32
): { variationSummary: string; gesturesApplied: number } {
  const seed = context.seed;
  const str = fagenStructuralBarIndices(totalBars);
  const { retEnd } = fagenFormSegmentEnds(totalBars);
  const midReturn = Math.floor((str.firstBarReturn + retEnd) / 2);
  const barTargets = [str.firstBarReturn, midReturn].filter((x) => x >= str.firstBarReturn && x <= retEnd);

  let gesturesApplied = 0;
  let tag = 'return_entry_soften';

  for (const barIdx of barTargets) {
    const m = guitar.measures.find((x) => x.index === barIdx);
    if (!m) continue;
    const firstComp = m.events
      .filter((e): e is NoteEvent => e.kind === 'note' && isCompNote(e as NoteEvent))
      .sort((a, b) => a.startBeat - b.startBeat)[0];
    if (!firstComp || firstComp.startBeat > 0.45) continue;

    if (barIdx === str.firstBarReturn && seededUnit(seed, barIdx, 905) < 0.65) {
      firstComp.velocity = Math.max(28, (firstComp.velocity ?? 72) - 16);
      tag = 'delayed_entry_velocity';
      gesturesApplied += 1;
    } else if (barIdx === midReturn && seededUnit(seed, barIdx, 908) < 0.52) {
      /** Mid-return: rhythmic thinning on early downbeat cluster. */
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const n = e as NoteEvent;
        if (!isCompNote(n)) continue;
        if (n.startBeat < 0.25) n.velocity = Math.max(30, (n.velocity ?? 72) - 12);
      }
      tag = 'mid_return_thin_downbeat';
      gesturesApplied += 1;
    }

    const chord = getChordForBar(barIdx, context);
    if (seededUnit(seed, barIdx, 906) < 0.48 && chordSymbolSuggestsColourChord(chord)) {
      const alt = firstComp.pitch + (seededUnit(seed, barIdx, 907) < 0.5 ? 1 : -1);
      const { lo, hi } = lhClampRangeForFagenBar(barIdx, totalBars);
      const pcs = pitchClassSetFromChord(chord, context);
      if (isNearChordTone(alt, pcs)) {
        firstComp.pitch = clampPitch(alt, lo, hi);
        tag += '+reharm_colour';
        gesturesApplied += 1;
      }
    }
  }

  return {
    variationSummary: `${tag}|bars=${barTargets.join(',')}`,
    gesturesApplied,
  };
}

export interface FagenKeysCompMusicalDiagnostics {
  rhythmPatternFamily: string;
  meanSyncopationIndex: number;
  /** Section-mean syncopation index (displacement from grid — higher ⇒ more syncopated). */
  syncopationIndexBySection: Partial<Record<FagenSectionKind, number>>;
  avgInnerMotionSemitonesV2Top: number;
  meanRhMidiV1OpenA: number;
  meanRhMidiV1SectionB: number;
  densityDeltaBMinusA: number;
  voicingDensityBySection: Partial<Record<FagenSectionKind, number>>;
  /** Mean RH MIDI return minus opening — contrast diagnostic (not a musical claim). */
  openingVsReturnRhMeanDelta: number;
  returnVariationSummary: string;
  returnPhraseGesturesApplied: number;
  signatureMoment?: { applied: boolean; pivotBar: number | null; kind: string };
  phraseTensionMeanDensityByPhrase?: number[];
}

function collectDiagnostics(
  guitar: PartModel,
  totalBars: number,
  sig: { applied: boolean; pivotBar: number | null; kind: string },
  ret: { variationSummary: string; gesturesApplied: number },
  phraseDensities: number[]
): Omit<FagenKeysCompMusicalDiagnostics, 'rhythmPatternFamily'> {
  let syncSum = 0;
  let syncN = 0;
  let motionSum = 0;
  let motionCount = 0;
  let prevTopV2: number | undefined;

  let rhSumA = 0;
  let rhCntA = 0;
  let rhSumB = 0;
  let rhCntB = 0;
  let rhSumRet = 0;
  let rhCntRet = 0;

  let notesA = 0;
  let cntA = 0;
  let notesB = 0;
  let cntB = 0;

  const syncBySec: Partial<Record<FagenSectionKind, { sum: number; n: number }>> = {};
  const densBySec: Partial<Record<FagenSectionKind, { sum: number; n: number }>> = {};

  const sorted = [...guitar.measures].sort((a, b) => a.index - b.index);
  for (const m of sorted) {
    const si = measureSyncopationIndex(m);
    syncSum += si;
    syncN += 1;

    const b = m.index;
    const sec = fagenSectionKind(b, totalBars);
    const sb = syncBySec[sec] ?? { sum: 0, n: 0 };
    sb.sum += si;
    sb.n += 1;
    syncBySec[sec] = sb;

    const compCount = m.events.filter((e) => e.kind === 'note' && isCompNote(e as NoteEvent)).length;
    const db = densBySec[sec] ?? { sum: 0, n: 0 };
    db.sum += compCount;
    db.n += 1;
    densBySec[sec] = db;

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
      if (sec === 'a_open') {
        rhSumA += n.pitch;
        rhCntA += 1;
      }
      if (sec === 'b') {
        rhSumB += n.pitch;
        rhCntB += 1;
      }
      if (sec === 'a_return') {
        rhSumRet += n.pitch;
        rhCntRet += 1;
      }
    }

    const nn = m.events.filter((e) => e.kind === 'note').length;
    if (sec === 'a_open') {
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
  const meanRet = rhCntRet ? rhSumRet / rhCntRet : 0;
  const densA = cntA ? notesA / cntA : 0;
  const densB = cntB ? notesB / cntB : 0;

  const syncopationIndexBySection: Partial<Record<FagenSectionKind, number>> = {};
  for (const k of Object.keys(syncBySec) as FagenSectionKind[]) {
    const v = syncBySec[k];
    if (v && v.n) syncopationIndexBySection[k] = Math.round((v.sum / v.n) * 1000) / 1000;
  }

  const voicingDensityBySection: Partial<Record<FagenSectionKind, number>> = {};
  for (const k of Object.keys(densBySec) as FagenSectionKind[]) {
    const v = densBySec[k];
    if (v && v.n) voicingDensityBySection[k] = Math.round((v.sum / v.n) * 100) / 100;
  }

  return {
    meanSyncopationIndex: Math.round(meanSync * 1000) / 1000,
    syncopationIndexBySection,
    avgInnerMotionSemitonesV2Top: Math.round(avgMot * 100) / 100,
    meanRhMidiV1OpenA: Math.round(meanA * 100) / 100,
    meanRhMidiV1SectionB: Math.round(meanB * 100) / 100,
    densityDeltaBMinusA: Math.round((densB - densA) * 100) / 100,
    voicingDensityBySection,
    openingVsReturnRhMeanDelta: Math.round((meanRet - meanA) * 100) / 100,
    returnVariationSummary: ret.variationSummary,
    returnPhraseGesturesApplied: ret.gesturesApplied,
    signatureMoment: sig,
    phraseTensionMeanDensityByPhrase: phraseDensities,
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

  const totalBars = context.form?.totalBars ?? md.totalBars ?? 32;

  const famIdx = Math.floor(seededUnit(context.seed, 0, 990) * 4);
  const rhythmPatternFamily = ['anticipation_led', 'offbeat_stab_led', 'mixed_syncopated', 'phrase_syncopated'][famIdx] ?? 'mixed_syncopated';

  applyFagenInnerVoiceMotionV2(guitar, context, totalBars);
  applyFagenVoicingStackDiversify(guitar, context, totalBars);
  const sig = applyFagenSignatureHarmonicMoment(guitar, context, totalBars);
  applyFagenCompRhythmTimingNudge(guitar, context, totalBars);
  applyFagenMotifSupportiveCompDynamics(guitar);
  applyFagenMelodyPeakCompDucking(guitar);
  const phraseDensities = applyFagenPhraseTensionSculpt(guitar, totalBars);
  applyFagenAntiGenericPhraseLanding(guitar, totalBars);
  const ret = applyFagenReturnPhraseGestures(guitar, context, totalBars);
  applyFagenRhythmFingerprintVelocities(guitar, context, rhythmPatternFamily, totalBars);

  const base = collectDiagnostics(guitar, totalBars, sig, ret, phraseDensities);
  md.fagenKeysCompMusicalDiagnostics = {
    ...base,
    rhythmPatternFamily,
  };
}
